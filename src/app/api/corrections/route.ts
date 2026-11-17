import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, effectiveRole } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";

// List pending corrections (ATT-09)
export async function GET() {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const role = effectiveRole(sess);
  if (role !== "HR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  }
  const corrections = await db.attendanceCorrection.findMany({
    where: { state: "PENDING" },
    include: {
      attendance: { include: { session: { include: { course: true } }, user: true } },
      requester: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    corrections: corrections.map((c) => ({
      id: c.id,
      oldStatus: c.oldStatus,
      newStatus: c.newStatus,
      reason: c.reason,
      state: c.state,
      createdAt: c.createdAt,
      requester: c.requester.name,
      staffNo: c.attendance.user.staffNo,
      staffName: c.attendance.user.name,
      sessionTitle: c.attendance.session.title,
      sessionCode: c.attendance.session.sessionCode,
      sessionDate: c.attendance.session.date,
      courseCode: c.attendance.session.course?.code,
    })),
  });
}
