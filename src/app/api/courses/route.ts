import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const url = req.nextUrl;
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "";
  const level = url.searchParams.get("level") || "";
  const language = url.searchParams.get("language") || "";
  const sort = url.searchParams.get("sort") || "code";
  const status = url.searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (category) where.categoryId = category;
  if (level) where.level = level;
  if (language) where.language = language;
  if (status) where.status = status;
  else where.status = { in: ["PUBLISHED", "DRAFT"] };

  let orderBy: Record<string, string> = { code: "asc" };
  if (sort === "title") orderBy = { title: "asc" };
  if (sort === "duration") orderBy = { durationHours: "asc" };
  if (sort === "newest") orderBy = { createdAt: "desc" };

  const courses = await db.course.findMany({
    where,
    include: {
      category: true,
      instructor: true,
      modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      quizzes: true,
      _count: { select: { enrollments: true, sessions: true } },
    },
    orderBy,
  });

  // Mark enrollments for current user if staff/trainer
  let myEnrollments: Record<string, { status: string; progressPct: number }> = {};
  if (sess.role === "STAFF" || sess.role === "TRAINER") {
    const ens = await db.enrollment.findMany({ where: { userId: sess.id } });
    myEnrollments = Object.fromEntries(ens.map((e) => [e.courseId, { status: e.status, progressPct: e.progressPct }]));
  }

  return NextResponse.json({
    courses: courses.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      level: c.level,
      language: c.language,
      durationHours: c.durationHours,
      status: c.status,
      passMark: c.passMark,
      minAttendancePct: c.minAttendancePct,
      learningPath: c.learningPath,
      thumbnail: c.thumbnail,
      category: c.category?.name,
      categoryId: c.categoryId,
      instructor: c.instructor ? { id: c.instructor.id, name: c.instructor.name, position: c.instructor.position, avatarColor: c.instructor.avatarColor } : null,
      moduleCount: c.modules.length,
      lessonCount: c.modules.reduce((a, m) => a + m.lessons.length, 0),
      quizCount: c.quizzes.length,
      enrollmentCount: c._count.enrollments,
      sessionCount: c._count.sessions,
      myEnrollment: myEnrollments[c.id] || null,
    })),
  });
}

// Trainer create course (CRS-04)
export async function POST(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  if (sess.role !== "TRAINER" && sess.role !== "ADMIN") {
    return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim();
  const title = String(body.title || "").trim();
  if (!code || !title) return NextResponse.json({ error: "Kod dan tajuk diperlukan" }, { status: 400 });
  const existing = await db.course.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "Kod kursus telah wujud" }, { status: 400 });
  const course = await db.course.create({
    data: {
      code,
      title,
      description: String(body.description || ""),
      categoryId: body.categoryId || null,
      level: String(body.level || "PEMULA"),
      language: String(body.language || "bilingual"),
      durationHours: Number(body.durationHours || 4),
      instructorId: sess.id,
      status: String(body.status || "DRAFT"),
      passMark: Number(body.passMark || 70),
      minAttendancePct: Number(body.minAttendancePct || 0),
      learningPath: body.learningPath || "ALL",
    },
  });
  return NextResponse.json({ ok: true, course });
}
