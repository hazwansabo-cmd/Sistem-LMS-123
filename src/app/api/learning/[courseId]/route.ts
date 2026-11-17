import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Get learning data: modules/lessons with my progress + quiz info
export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const { courseId } = await params;
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      quizzes: { include: { questions: { orderBy: { order: "asc" }, select: { id: true, type: true, text: true, options: true, points: true, order: true } } } },
    },
  });
  if (!course) return NextResponse.json({ error: "Kursus tidak dijumpai" }, { status: 404 });
  const enrollment = await db.enrollment.findFirst({ where: { userId: sess.id, courseId } });
  if (!enrollment) return NextResponse.json({ error: "Tidak didaftar" }, { status: 403 });
  const progress = await db.lessonProgress.findMany({ where: { userId: sess.id, lesson: { module: { courseId } } } });
  const attempts = await db.quizAttempt.findMany({ where: { userId: sess.id, quiz: { courseId } }, orderBy: { submittedAt: "desc" } });
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const completedLessons = progress.filter((p) => p.completed).length;
  const lessonPct = allLessons.length ? Math.round((completedLessons / allLessons.length) * 100) : 0;
  return NextResponse.json({
    course: {
      id: course.id,
      code: course.code,
      title: course.title,
      passMark: course.passMark,
      minAttendancePct: course.minAttendancePct,
    },
    modules: course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        type: l.type,
        content: l.content,
        durationMin: l.durationMin,
        order: l.order,
        completed: progress.find((p) => p.lessonId === l.id)?.completed || false,
      })),
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
    myAttempts: attempts.map((a) => ({ id: a.id, quizId: a.quizId, score: a.score, passed: a.passed, submittedAt: a.submittedAt })),
    progress: { completedLessons, totalLessons: allLessons.length, lessonPct, enrollmentStatus: enrollment.status, progressPct: enrollment.progressPct },
  });
}
