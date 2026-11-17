import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, effectiveRole } from "@/lib/auth";
import { toKLDate, logAudit } from "@/lib/lms/audit";

// List sessions (ATT-01)
export async function GET(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const role = effectiveRole(sess);
  const url = req.nextUrl;
  const filter = url.searchParams.get("filter") || "all"; // all | upcoming | today | past | mine
  const courseId = url.searchParams.get("courseId");
  const klNow = toKLDate(new Date());
  const todayStart = new Date(klNow.getFullYear(), klNow.getMonth(), klNow.getDate());

  const where: Record<string, unknown> = {};
  if (courseId) where.courseId = courseId;
  if (filter === "upcoming") where.date = { gt: todayStart };
  if (filter === "past") where.date = { lt: todayStart };
  if (filter === "today") where.date = todayStart;
  if (filter === "mine" && role === "TRAINER") where.trainerId = sess.id;

  const sessions = await db.session.findMany({
    where,
    include: { course: true, trainer: true, _count: { select: { attendance: true } } },
    orderBy: { date: "asc" },
    take: 60,
  });

  // For staff: include my attendance status
  let myAttendanceMap: Record<string, string> = {};
  if (role === "STAFF") {
    const att = await db.attendance.findMany({ where: { userId: sess.id }, select: { sessionId: true, status: true } });
    myAttendanceMap = Object.fromEntries(att.map((a) => [a.sessionId, a.status]));
  }

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      code: s.course?.code,
      courseId: s.courseId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      mode: s.mode,
      location: s.location,
      url: s.url,
      capacity: s.capacity,
      sessionCode: s.sessionCode,
      qrToken: s.qrToken,
      codeExpiry: s.codeExpiry,
      lateAfterMin: s.lateAfterMin,
      trainer: s.trainer ? { id: s.trainer.id, name: s.trainer.name } : null,
      attendanceCount: s._count.attendance,
      myStatus: myAttendanceMap[s.id] || null,
    })),
  });
}

// Create session (ATT-01) - trainer/admin
export async function POST(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const role = effectiveRole(sess);
  if (role !== "TRAINER" && role !== "ADMIN" && role !== "HR") {
    return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const dateStr = String(body.date || "");
  const startTime = String(body.startTime || "09:00");
  const endTime = String(body.endTime || "17:00");
  if (!title || !dateStr) return NextResponse.json({ error: "Tajuk dan tarikh diperlukan" }, { status: 400 });
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) return NextResponse.json({ error: "Tarikh tidak sah" }, { status: 400 });

  const qrToken = `qrtok-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const sessionCode = String(100000 + Math.floor(Math.random() * 899999));
  const codeExpiry = new Date(date.getTime() + (Number(startTime.split(":")[0]) + 1) * 60000 + 15 * 60000);

  const session = await db.session.create({
    data: {
      courseId: body.courseId || null,
      title,
      date,
      startTime,
      endTime,
      mode: String(body.mode || "bersemuka"),
      location: body.location || null,
      url: body.url || null,
      capacity: Number(body.capacity || 30),
      qrToken,
      sessionCode,
      codeExpiry,
      lateAfterMin: Number(body.lateAfterMin || 15),
      trainerId: sess.id,
    },
  });
  await logAudit({ userId: sess.id, action: "CREATE_SESSION", entity: "Session", entityId: session.id, after: session });
  return NextResponse.json({ ok: true, session });
}
