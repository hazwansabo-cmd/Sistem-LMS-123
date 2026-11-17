import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";

// Mark lesson complete + auto-update enrollment progress (LRN-01, LRN-02)
export async function POST(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const { lessonId } = await params;
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!lesson) return NextResponse.json({ error: "Pelajaran tidak dijumpai" }, { status: 404 });
  const courseId = lesson.module.courseId;
  const enrollment = await db.enrollment.findFirst({ where: { userId: sess.id, courseId } });
  if (!enrollment) return NextResponse.json({ error: "Tidak didaftar" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const completed = body.completed !== false;
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: sess.id, lessonId } },
    update: { completed, lastPosition: completed ? "end" : "mid", updatedAt: new Date() },
    create: { userId: sess.id, lessonId, completed, lastPosition: completed ? "end" : "mid" },
  });

  // Recompute progress
  const allLessons = await db.lesson.findMany({ where: { module: { courseId } }, select: { id: true } });
  const done = await db.lessonProgress.count({ where: { userId: sess.id, lessonId: { in: allLessons.map((l) => l.id) }, completed: true } });
  const pct = allLessons.length ? Math.round((done / allLessons.length) * 100) : 0;
  const newStatus = pct === 100 ? "COMPLETED" : pct > 0 ? "IN_PROGRESS" : "ENROLLED";
  await db.enrollment.update({
    where: { id: enrollment.id },
    data: { progressPct: pct, status: newStatus, completedAt: newStatus === "COMPLETED" ? new Date() : null },
  });
  if (newStatus === "COMPLETED" && enrollment.status !== "COMPLETED") {
    await logAudit({ userId: sess.id, action: "COMPLETE_COURSE", entity: "Enrollment", entityId: enrollment.id });
  }
  return NextResponse.json({ ok: true, progressPct: pct, status: newStatus, completedLessons: done, totalLessons: allLessons.length });
}
