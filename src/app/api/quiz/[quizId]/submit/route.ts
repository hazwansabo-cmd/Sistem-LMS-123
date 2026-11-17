import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";

// Submit quiz: grade answers, update attempts, issue certificate if eligible (LRN-03/04, CERT-01)
export async function POST(req: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const { quizId } = await params;
  const quiz = await db.quiz.findUnique({ where: { id: quizId }, include: { questions: true, course: true } });
  if (!quiz) return NextResponse.json({ error: "Kuiz tidak dijumpai" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const answers: Record<string, string> = body.answers || {};

  // Enforce attempts
  const attempts = await db.quizAttempt.count({ where: { userId: sess.id, quizId } });
  if (attempts >= quiz.maxAttempts) {
    return NextResponse.json({ error: `Had cubaan tercapai (${quiz.maxAttempts})` }, { status: 400 });
  }

  let earned = 0;
  let maxPoints = 0;
  const breakdown: { questionId: string; correct: boolean; correctAnswer: string; yourAnswer: string; explanation: string | null }[] = [];
  for (const q of quiz.questions) {
    maxPoints += q.points;
    const yourAns = (answers[q.id] || "").trim();
    const correct = yourAns.toLowerCase() === q.correctAnswer.trim().toLowerCase();
    if (correct) earned += q.points;
    breakdown.push({
      questionId: q.id,
      correct,
      correctAnswer: q.correctAnswer,
      yourAnswer: yourAns,
      explanation: q.explanation,
    });
  }
  const score = maxPoints > 0 ? Math.round((earned / maxPoints) * 100) : 0;
  const passed = score >= quiz.passMark;

  const attempt = await db.quizAttempt.create({
    data: {
      userId: sess.id,
      quizId,
      score,
      passed,
      answers: JSON.stringify(answers),
      submittedAt: new Date(),
    },
  });
  await logAudit({ userId: sess.id, action: "SUBMIT_QUIZ", entity: "QuizAttempt", entityId: attempt.id, after: { score, passed } });

  // Issue certificate if passed AND all lessons completed AND attendance met
  let certificateIssued = null;
  if (passed) {
    const enrollment = await db.enrollment.findFirst({ where: { userId: sess.id, courseId: quiz.courseId } });
    if (enrollment) {
      const allLessons = await db.lesson.findMany({ where: { module: { courseId: quiz.courseId } }, select: { id: true } });
      const done = await db.lessonProgress.count({ where: { userId: sess.id, lessonId: { in: allLessons.map((l) => l.id) }, completed: true } });
      const allDone = done === allLessons.length;
      // Attendance check
      let attendanceOk = true;
      if (quiz.course.minAttendancePct > 0) {
        const sessions = await db.session.findMany({ where: { courseId: quiz.courseId }, select: { id: true } });
        if (sessions.length) {
          const present = await db.attendance.count({ where: { userId: sess.id, sessionId: { in: sessions.map((s) => s.id) }, status: { in: ["hadir", "lewat"] } } });
          const rate = Math.round((present / sessions.length) * 100);
          attendanceOk = rate >= quiz.course.minAttendancePct;
        }
      }
      if (allDone && attendanceOk) {
        const existing = await db.certificate.findFirst({ where: { userId: sess.id, courseId: quiz.courseId } });
        if (!existing) {
          const certCount = await db.certificate.count();
          const certNo = `LMS-AM-${String(certCount + 1).padStart(5, "0")}-${new Date().getFullYear()}`;
          const verifyCode = (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)).toUpperCase();
          certificateIssued = await db.certificate.create({
            data: {
              userId: sess.id,
              courseId: quiz.courseId,
              certNo,
              verifyCode,
              expiresAt: new Date(Date.now() + 365 * 86400000),
            },
          });
          await db.notification.create({
            data: { userId: sess.id, type: "certificate", message: `Sijil ${certNo} untuk ${quiz.course.code} sedia dimuat turun` },
          });
          await logAudit({ userId: sess.id, action: "ISSUE_CERTIFICATE", entity: "Certificate", entityId: certificateIssued.id });
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    score,
    passed,
    maxAttempts: quiz.maxAttempts,
    attemptsUsed: attempts + 1,
    breakdown,
    certificateIssued: certificateIssued ? { id: certificateIssued.id, certNo: certificateIssued.certNo } : null,
  });
}
