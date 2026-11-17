import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";

// Enroll self (CRS-03)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const { id: courseId } = await params;
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Kursus tidak dijumpai" }, { status: 404 });
  if (course.status !== "PUBLISHED") return NextResponse.json({ error: "Kursus tidak diterbitkan" }, { status: 400 });

  const existing = await db.enrollment.findFirst({ where: { userId: sess.id, courseId } });
  if (existing) return NextResponse.json({ ok: true, enrollment: existing, message: "Telah didaftar" });

  const enrollment = await db.enrollment.create({
    data: {
      userId: sess.id,
      courseId,
      assignedBy: null,
      status: "ENROLLED",
      progressPct: 0,
      dueDate: new Date(Date.now() + 30 * 86400000),
    },
  });
  await db.notification.create({
    data: { userId: sess.id, type: "assigned", message: `Anda telah mendaftar kursus ${course.code}: ${course.title}` },
  });
  await logAudit({ userId: sess.id, action: "ENROLL_COURSE", entity: "Enrollment", entityId: enrollment.id });
  return NextResponse.json({ ok: true, enrollment });
}
