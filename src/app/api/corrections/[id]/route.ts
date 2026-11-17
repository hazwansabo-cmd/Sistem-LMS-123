import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, effectiveRole } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";

// Approve / reject correction (ATT-09)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const role = effectiveRole(sess);
  if (role !== "HR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || ""); // approve | reject
  const correction = await db.attendanceCorrection.findUnique({
    where: { id },
    include: { attendance: true },
  });
  if (!correction) return NextResponse.json({ error: "Pembetulan tidak dijumpai" }, { status: 404 });
  if (correction.state !== "PENDING") return NextResponse.json({ error: "Pembetulan telah diselesaikan" }, { status: 400 });

  if (action === "approve") {
    await db.$transaction([
      db.attendanceCorrection.update({
        where: { id },
        data: { state: "APPROVED", approvedById: sess.id, updatedAt: new Date() },
      }),
      db.attendance.update({
        where: { id: correction.attendanceId },
        data: { status: correction.newStatus, updatedAt: new Date() },
      }),
    ]);
    await logAudit({ userId: sess.id, action: "APPROVE_CORRECTION", entity: "AttendanceCorrection", entityId: id, before: { status: correction.oldStatus }, after: { status: correction.newStatus } });
    return NextResponse.json({ ok: true, state: "APPROVED" });
  } else if (action === "reject") {
    await db.attendanceCorrection.update({
      where: { id },
      data: { state: "REJECTED", approvedById: sess.id, updatedAt: new Date() },
    });
    await logAudit({ userId: sess.id, action: "REJECT_CORRECTION", entity: "AttendanceCorrection", entityId: id });
    return NextResponse.json({ ok: true, state: "REJECTED" });
  }
  return NextResponse.json({ error: "Tindakan tidak sah" }, { status: 400 });
}
