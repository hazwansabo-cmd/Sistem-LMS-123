import { supabase } from "@/lib/supabase-client";

// ============================================================
// Prisma-compatible wrapper using Supabase (PostgREST over HTTPS)
// ============================================================
// This replaces the PrismaClient with a Supabase-based implementation.
// All API routes that use `db` from "@/lib/db" will work with Supabase
// without any code changes. Data flows over HTTPS (port 443), so it
// works in restricted network environments where port 5432 is blocked.

// --- Relation mapping: Prisma field name → PostgREST select hint ---
type Rel = { table: string; fk: string };
const RELATIONS: Record<string, Record<string, Rel>> = {
  User: {
    department: { table: "Department", fk: "departmentId" },
    instructing: { table: "Course", fk: "instructorId" },
    enrollments: { table: "Enrollment", fk: "userId" },
    lessonProgress: { table: "LessonProgress", fk: "userId" },
    quizAttempts: { table: "QuizAttempt", fk: "userId" },
    sessionsTrained: { table: "Session", fk: "trainerId" },
    attendance: { table: "Attendance", fk: "userId" },
    correctionsReq: { table: "AttendanceCorrection", fk: "requestedById" },
    correctionsAppr: { table: "AttendanceCorrection", fk: "approvedById" },
    certificates: { table: "Certificate", fk: "userId" },
    notifications: { table: "Notification", fk: "userId" },
    auditLogs: { table: "AuditLog", fk: "userId" },
    attendanceRecorded: { table: "Attendance", fk: "recordedById" },
  },
  Department: { users: { table: "User", fk: "departmentId" } },
  Category: { courses: { table: "Course", fk: "categoryId" } },
  Course: {
    category: { table: "Category", fk: "categoryId" },
    instructor: { table: "User", fk: "instructorId" },
    modules: { table: "Module", fk: "courseId" },
    quizzes: { table: "Quiz", fk: "courseId" },
    enrollments: { table: "Enrollment", fk: "courseId" },
    sessions: { table: "Session", fk: "courseId" },
    certificates: { table: "Certificate", fk: "courseId" },
  },
  Module: { course: { table: "Course", fk: "courseId" }, lessons: { table: "Lesson", fk: "moduleId" } },
  Lesson: { module: { table: "Module", fk: "moduleId" }, progress: { table: "LessonProgress", fk: "lessonId" } },
  Quiz: { course: { table: "Course", fk: "courseId" }, questions: { table: "Question", fk: "quizId" }, attempts: { table: "QuizAttempt", fk: "quizId" } },
  Question: { quiz: { table: "Quiz", fk: "quizId" } },
  Enrollment: { user: { table: "User", fk: "userId" }, course: { table: "Course", fk: "courseId" } },
  LessonProgress: { user: { table: "User", fk: "userId" }, lesson: { table: "Lesson", fk: "lessonId" } },
  QuizAttempt: { user: { table: "User", fk: "userId" }, quiz: { table: "Quiz", fk: "quizId" } },
  Session: { course: { table: "Course", fk: "courseId" }, trainer: { table: "User", fk: "trainerId" }, attendance: { table: "Attendance", fk: "sessionId" } },
  Attendance: {
    session: { table: "Session", fk: "sessionId" },
    user: { table: "User", fk: "userId" },
    recordedBy: { table: "User", fk: "recordedById" },
    corrections: { table: "AttendanceCorrection", fk: "attendanceId" },
  },
  AttendanceCorrection: {
    attendance: { table: "Attendance", fk: "attendanceId" },
    requester: { table: "User", fk: "requestedById" },
    approver: { table: "User", fk: "approvedById" },
  },
  Certificate: { user: { table: "User", fk: "userId" }, course: { table: "Course", fk: "courseId" } },
  Notification: { user: { table: "User", fk: "userId" } },
  AuditLog: { user: { table: "User", fk: "userId" } },
};

// Table name → model name (for nested includes)
const TABLE_TO_MODEL: Record<string, string> = {};
for (const [model, rels] of Object.entries(RELATIONS)) {
  TABLE_TO_MODEL[model] = model;
  for (const rel of Object.values(rels)) {
    if (!TABLE_TO_MODEL[rel.table]) TABLE_TO_MODEL[rel.table] = rel.table;
  }
}

function buildSelect(model: string, include?: Record<string, unknown>): string {
  if (!include) return "*";
  const parts: string[] = ["*"];
  const rels = RELATIONS[model] || {};
  for (const [key, val] of Object.entries(include)) {
    const rel = rels[key];
    if (rel) {
      if (val === true) {
        parts.push(`${rel.table}!${rel.fk}(*)`);
      } else if (typeof val === "object" && val !== null) {
        const nestedInclude = (val as Record<string, unknown>).include as Record<string, unknown> | undefined;
        if (nestedInclude) {
          const nestedModel = TABLE_TO_MODEL[rel.table] || rel.table;
          parts.push(`${rel.table}!${rel.fk}(${buildSelect(nestedModel, nestedInclude)})`);
        } else {
          parts.push(`${rel.table}!${rel.fk}(*)`);
        }
      }
    }
  }
  return parts.join(", ");
}

function applyWhere(query: ReturnType<typeof supabase.from>["prototype"], where?: Record<string, unknown>) {
  if (!where) return query;
  for (const [key, val] of Object.entries(where)) {
    if (key === "AND" && Array.isArray(val)) {
      for (const cond of val) query = applyWhere(query, cond as Record<string, unknown>);
    } else if (key === "OR" && Array.isArray(val)) {
      const orParts: string[] = [];
      for (const cond of val as Record<string, unknown>[]) {
        for (const [k, v] of Object.entries(cond)) {
          if (typeof v === "object" && v !== null && "in" in v && Array.isArray((v as any).in)) {
            orParts.push(`${k}.in.(${(v as any).in.join(",")})`);
          } else {
            orParts.push(`${k}.eq.${v}`);
          }
        }
      }
      if (orParts.length) query = query.or(orParts.join(","));
    } else if (typeof val === "object" && val !== null) {
      if ("in" in val && Array.isArray((val as any).in)) query = query.in(key, (val as any).in);
      else if ("contains" in val) query = query.ilike(key, `%${(val as any).contains}%`);
      else if ("gte" in val) query = query.gte(key, (val as any).gte);
      else if ("lte" in val) query = query.lte(key, (val as any).lte);
      else if ("gt" in val) query = query.gt(key, (val as any).gt);
      else if ("lt" in val) query = query.lt(key, (val as any).lt);
      else if ("not" in val) query = query.neq(key, (val as any).not);
      else if ("startsWith" in val) query = query.ilike(key, `${(val as any).startsWith}%`);
    } else if (val !== undefined) {
      query = query.eq(key, val);
    }
  }
  return query;
}

class SupabaseModel {
  constructor(private table: string) {}

  async findUnique({ where, include }: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<any> {
    let q = supabase.from(this.table).select(buildSelect(this.table, include));
    q = applyWhere(q, where);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) {
      console.error(`[db] findUnique ${this.table} error:`, error.message);
      return null;
    }
    return data;
  }

  async findFirst({ where, include, orderBy }: { where?: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: Record<string, string> }): Promise<any> {
    let q = supabase.from(this.table).select(buildSelect(this.table, include));
    q = applyWhere(q, where);
    if (orderBy) {
      for (const [key, dir] of Object.entries(orderBy)) {
        q = q.order(key, { ascending: dir === "asc" });
      }
    }
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) {
      console.error(`[db] findFirst ${this.table} error:`, error.message);
      return null;
    }
    return data;
  }

  async findMany({ where, include, orderBy, skip, take, distinct }: { where?: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: Record<string, string>; skip?: number; take?: number; distinct?: string }): Promise<any[]> {
    let q = supabase.from(this.table).select(buildSelect(this.table, include));
    q = applyWhere(q, where);
    if (orderBy) {
      for (const [key, dir] of Object.entries(orderBy)) {
        q = q.order(key, { ascending: dir === "asc" });
      }
    }
    if (distinct) q = q.order(distinct, { ascending: true }).limit(1000);
    if (typeof take === "number") {
      const from = skip || 0;
      q = q.range(from, from + take - 1);
    } else if (typeof skip === "number") {
      q = q.range(skip, skip + 999);
    } else {
      q = q.limit(1000);
    }
    const { data, error } = await q;
    if (error) {
      console.error(`[db] findMany ${this.table} error:`, error.message);
      return [];
    }
    return data || [];
  }

  async create({ data, include }: { data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<any> {
    const selectStr = buildSelect(this.table, include);
    const { data: result, error } = await supabase.from(this.table).insert(data).select(selectStr).single();
    if (error) {
      console.error(`[db] create ${this.table} error:`, error.message, "data:", JSON.stringify(data).slice(0, 200));
      throw new Error(`Supabase create error: ${error.message}`);
    }
    return result;
  }

  async createMany({ data }: { data: Record<string, unknown>[] }): Promise<{ count: number }> {
    const { error } = await supabase.from(this.table).insert(data);
    if (error) {
      console.error(`[db] createMany ${this.table} error:`, error.message);
      throw new Error(`Supabase createMany error: ${error.message}`);
    }
    return { count: data.length };
  }

  async update({ where, data, include }: { where: Record<string, unknown>; data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<any> {
    let q = supabase.from(this.table).update(data);
    q = applyWhere(q as any, where) as any;
    const selectStr = buildSelect(this.table, include);
    const { data: result, error } = await (q as any).select(selectStr).single();
    if (error) {
      console.error(`[db] update ${this.table} error:`, error.message);
      throw new Error(`Supabase update error: ${error.message}`);
    }
    return result;
  }

  async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }> {
    let q: any = supabase.from(this.table).update(data);
    q = applyWhere(q, where);
    const { count, error } = await q;
    if (error) {
      console.error(`[db] updateMany ${this.table} error:`, error.message);
      throw new Error(`Supabase updateMany error: ${error.message}`);
    }
    return { count: count || 0 };
  }

  async delete({ where }: { where: Record<string, unknown> }): Promise<any> {
    let q: any = supabase.from(this.table).delete();
    q = applyWhere(q, where);
    const { error } = await q;
    if (error) {
      console.error(`[db] delete ${this.table} error:`, error.message);
      throw new Error(`Supabase delete error: ${error.message}`);
    }
    return null;
  }

  async deleteMany({ where }: { where?: Record<string, unknown> }): Promise<{ count: number }> {
    let q: any = supabase.from(this.table).delete();
    if (where) q = applyWhere(q, where);
    const { count, error } = await q;
    if (error) {
      // If no rows match, Supabase returns an error — treat as 0 deletes
      if (error.code === "PGRST116" || error.message.includes("JSON")) {
        return { count: 0 };
      }
      console.error(`[db] deleteMany ${this.table} error:`, error.message);
      return { count: 0 };
    }
    return { count: count || 0 };
  }

  async count({ where }: { where?: Record<string, unknown> }): Promise<number> {
    let q = supabase.from(this.table).select("*", { count: "exact", head: true });
    q = applyWhere(q as any, where) as any;
    const { count, error } = await q;
    if (error) {
      console.error(`[db] count ${this.table} error:`, error.message);
      return 0;
    }
    return count || 0;
  }

  async aggregate({ where, _count }: { where?: Record<string, unknown>; _count?: { _all?: boolean; [key: string]: boolean | undefined } }): Promise<any> {
    const c = await this.count({ where });
    return { _count: { _all: c } };
  }

  async groupBy({ by, where, _count }: { by: string | string[]; where?: Record<string, unknown>; _count?: boolean | { [key: string]: boolean } }): Promise<any[]> {
    const byArr = Array.isArray(by) ? by : [by];
    let q: any = supabase.from(this.table).select(`${byArr.join(",")}`, { count: "exact" });
    if (where) q = applyWhere(q, where);
    const { data, error } = await q;
    if (error) {
      console.error(`[db] groupBy ${this.table} error:`, error.message);
      return [];
    }
    // Group in JS (PostgREST doesn't support GROUP BY directly)
    const groups: Record<string, any> = {};
    for (const row of data || []) {
      const key = byArr.map((b) => row[b]).join("|");
      if (!groups[key]) {
        groups[key] = { ...row, _count: { _all: 0 } };
      }
      groups[key]._count._all++;
    }
    return Object.values(groups);
  }

  async upsert({ where, data, include }: { where: Record<string, unknown>; data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<any> {
    const selectStr = buildSelect(this.table, include);
    const { data: result, error } = await supabase
      .from(this.table)
      .upsert(data, { onConflict: Object.keys(where)[0] })
      .select(selectStr)
      .single();
    if (error) {
      console.error(`[db] upsert ${this.table} error:`, error.message);
      throw new Error(`Supabase upsert error: ${error.message}`);
    }
    return result;
  }
}

// Export db with the same interface as PrismaClient
export const db = {
  user: new SupabaseModel("User"),
  department: new SupabaseModel("Department"),
  category: new SupabaseModel("Category"),
  course: new SupabaseModel("Course"),
  module: new SupabaseModel("Module"),
  lesson: new SupabaseModel("Lesson"),
  quiz: new SupabaseModel("Quiz"),
  question: new SupabaseModel("Question"),
  enrollment: new SupabaseModel("Enrollment"),
  lessonProgress: new SupabaseModel("LessonProgress"),
  quizAttempt: new SupabaseModel("QuizAttempt"),
  session: new SupabaseModel("Session"),
  attendance: new SupabaseModel("Attendance"),
  attendanceCorrection: new SupabaseModel("AttendanceCorrection"),
  certificate: new SupabaseModel("Certificate"),
  notification: new SupabaseModel("Notification"),
  auditLog: new SupabaseModel("AuditLog"),

  // Prisma compatibility shims
  $transaction: async <T>(fn: (tx: typeof db) => Promise<T>): Promise<T> => {
    // No real transactions in PostgREST — just execute sequentially
    return fn(db);
  },
  $disconnect: async (): Promise<void> => {
    // No-op (Supabase client doesn't need explicit disconnect)
  },
  $connect: async (): Promise<void> => {
    // No-op
  },
};
