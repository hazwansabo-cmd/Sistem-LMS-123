import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      category: true,
      instructor: true,
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
      quizzes: { include: { questions: { orderBy: { order: "asc" } } } },
      sessions: { orderBy: { date: "asc" }, include: { trainer: true } },
    },
  });
  if (!course) return NextResponse.json({ error: "Kursus tidak dijumpai" }, { status: 404 });

  const myEnrollment = await db.enrollment.findFirst({ where: { userId: sess.id, courseId: id } });
  const myAttempts = await db.quizAttempt.findMany({
    where: { userId: sess.id, quiz: { courseId: id } },
    orderBy: { submittedAt: "desc" },
  });
  const myLessonProgress = await db.lessonProgress.findMany({
    where: { userId: sess.id, lesson: { module: { courseId: id } } },
  });
  const myAttendance = await db.attendance.findMany({
    where: { userId: sess.id, session: { courseId: id } },
    include: { session: true },
  });

  return NextResponse.json({
    course: {
      id: course.id,
      code: course.code,
      title: course.title,
      description: course.description,
      level: course.level,
      language: course.language,
      durationHours: course.durationHours,
      status: course.status,
      passMark: course.passMark,
      minAttendancePct: course.minAttendancePct,
      learningPath: course.learningPath,
      category: course.category,
      instructor: course.instructor,
      modules: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        order: m.order,
        lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, content: l.content, durationMin: l.durationMin, order: l.order })),
      })),
      quizzes: course.quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        timeLimitMin: q.timeLimitMin,
        maxAttempts: q.maxAttempts,
        passMark: q.passMark,
        questions: q.questions.map((qq) => ({
          id: qq.id,
          type: qq.type,
          text: qq.text,
          options: qq.options ? JSON.parse(qq.options) : [],
          points: qq.points,
        })),
      })),
      sessions: course.sessions.map((s) => ({
        id: s.id,
        title: s.title,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        mode: s.mode,
        location: s.location,
        url: s.url,
        capacity: s.capacity,
        sessionCode: s.sessionCode,
        trainer: s.trainer?.name,
      })),
    },
    myEnrollment,
    myAttempts: myAttempts.map((a) => ({ id: a.id, quizId: a.quizId, score: a.score, passed: a.passed, submittedAt: a.submittedAt })),
    myLessonProgress: Object.fromEntries(myLessonProgress.map((p) => [p.lessonId, p.completed])),
    myAttendance: myAttendance.map((a) => ({ id: a.id, status: a.status, method: a.method, sessionTitle: a.session.title, date: a.session.date, checkInAt: a.checkInAt })),
  });
}

// Update course (trainer/admin)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const { id } = await params;
  const existing = await db.course.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Kursus tidak dijumpai" }, { status: 404 });
  if (sess.role !== "ADMIN" && existing.instructorId !== sess.id) {
    return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const updated = await db.course.update({
    where: { id },
    data: {
      title: body.title !== undefined ? String(body.title) : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      level: body.level !== undefined ? String(body.level) : undefined,
      durationHours: body.durationHours !== undefined ? Number(body.durationHours) : undefined,
      status: body.status !== undefined ? String(body.status) : undefined,
      passMark: body.passMark !== undefined ? Number(body.passMark) : undefined,
      minAttendancePct: body.minAttendancePct !== undefined ? Number(body.minAttendancePct) : undefined,
      categoryId: body.categoryId !== undefined ? body.categoryId : undefined,
    },
  });
  await logAudit({ userId: sess.id, action: "UPDATE_COURSE", entity: "Course", entityId: id, before: existing, after: updated });
  return NextResponse.json({ ok: true, course: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const { id } = await params;
  const existing = await db.course.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Kursus tidak dijumpai" }, { status: 404 });
  if (sess.role !== "ADMIN" && existing.instructorId !== sess.id) {
    return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  }
  await db.course.update({ where: { id }, data: { status: "ARCHIVED" } });
  await logAudit({ userId: sess.id, action: "ARCHIVE_COURSE", entity: "Course", entityId: id });
  return NextResponse.json({ ok: true });
}
