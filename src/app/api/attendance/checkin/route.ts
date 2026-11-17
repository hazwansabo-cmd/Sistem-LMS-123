import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logAudit, toKLDate } from "@/lib/lms/audit";

// Staff check-in via QR token OR session code (ATT-02, ATT-03)
export async function POST(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const qrToken = String(body.qrToken || "");
  const code = String(body.code || "").trim();
  if (!qrToken && !code) return NextResponse.json({ error: "QR atau kod sesi diperlukan" }, { status: 400 });

  const session = qrToken
    ? await db.session.findUnique({ where: { qrToken }, include: { course: true } })
    : await db.session.findUnique({ where: { sessionCode: code }, include: { course: true } });
  if (!session) return NextResponse.json({ error: "Sesi tidak dijumpai" }, { status: 404 });

  // Validate session is active today
  const klNow = toKLDate(new Date());
  const todayStart = new Date(klNow.getFullYear(), klNow.getMonth(), klNow.getDate());
  const sessDay = new Date(session.date.getFullYear(), session.date.getMonth(), session.date.getDate());
  const isToday = sessDay.getTime() === todayStart.getTime();
  if (!isToday) {
    return NextResponse.json({ error: "Sesi ini bukan untuk hari ini" }, { status: 400 });
  }
  // Code expiry check (only for code-based)
  if (code && !qrToken) {
    if (klNow > session.codeExpiry) {
      return NextResponse.json({ error: "Kod sesi telah luput. Sila minta kod baharu." }, { status: 400 });
    }
  }

  // Check existing
  const existing = await db.attendance.findUnique({
    where: { sessionId_userId: { sessionId: session.id, userId: sess.id } },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyCheckedIn: true,
      attendance: existing,
      message: "Anda telah daftar masuk untuk sesi ini",
    });
  }

  // Determine late
  const [sh, sm] = session.startTime.split(":").map(Number);
  const sessionStart = new Date(klNow.getFullYear(), klNow.getMonth(), klNow.getDate(), sh, sm);
  const lateAfterMs = session.lateAfterMin * 60000;
  const isLate = klNow.getTime() > sessionStart.getTime() + lateAfterMs;
  const status = isLate ? "lewat" : "hadir";
  const method = qrToken ? "QR" : "code";

  const attendance = await db.attendance.create({
    data: {
      sessionId: session.id,
      userId: sess.id,
      status,
      checkInAt: new Date(),
      method,
      remarks: isLate ? `Lewat ${Math.round((klNow.getTime() - sessionStart.getTime() - lateAfterMs) / 60000)} min` : null,
    },
  });
  await logAudit({ userId: sess.id, action: "CHECK_IN", entity: "Attendance", entityId: attendance.id, after: { status, method, sessionId: session.id } });
  return NextResponse.json({
    ok: true,
    attendance,
    session: { id: session.id, title: session.title, code: session.course?.code, startTime: session.startTime, mode: session.mode, location: session.location, url: session.url },
    message: `Kehadiran direkod: ${status === "lewat" ? "Lewat" : "Hadir"} (${method})`,
  });
}
