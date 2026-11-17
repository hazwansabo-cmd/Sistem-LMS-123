import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Get session detail with attendance list (ATT-05)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const { id } = await params;
  const session = await db.session.findUnique({
    where: { id },
    include: {
      course: true,
      trainer: true,
      attendance: { include: { user: { include: { department: true } } } },
    },
  });
  if (!session) return NextResponse.json({ error: "Sesi tidak dijumpai" }, { status: 404 });

  // If course linked, also return enrolled users not yet recorded
  let enrolledUsers: { id: string; staffNo: string; name: string; department: string | null; position: string | null; avatarColor: string }[] = [];
  if (session.courseId) {
    const ens = await db.enrollment.findMany({
      where: { courseId: session.courseId },
      include: { user: { include: { department: true } } },
    });
    enrolledUsers = ens.map((e) => ({
      id: e.user.id,
      staffNo: e.user.staffNo,
      name: e.user.name,
      department: e.user.department?.name || null,
      position: e.user.position,
      avatarColor: e.user.avatarColor,
    }));
  } else {
    // No course: list all active staff
    const users = await db.user.findMany({ where: { role: "STAFF", status: "ACTIVE" }, include: { department: true } });
    enrolledUsers = users.map((u) => ({
      id: u.id,
      staffNo: u.staffNo,
      name: u.name,
      department: u.department?.name || null,
      position: u.position,
      avatarColor: u.avatarColor,
    }));
  }

  const attendanceMap = Object.fromEntries(session.attendance.map((a) => [a.userId, a]));

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      code: session.course?.code,
      courseId: session.courseId,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      mode: session.mode,
      location: session.location,
      url: session.url,
      capacity: session.capacity,
      sessionCode: session.sessionCode,
      qrToken: session.qrToken,
      codeExpiry: session.codeExpiry,
      lateAfterMin: session.lateAfterMin,
      trainer: session.trainer ? { id: session.trainer.id, name: session.trainer.name } : null,
    },
    roster: enrolledUsers.map((u) => ({
      ...u,
      attendance: attendanceMap[u.id]
        ? {
            id: attendanceMap[u.id].id,
            status: attendanceMap[u.id].status,
            method: attendanceMap[u.id].method,
            checkInAt: attendanceMap[u.id].checkInAt,
            remarks: attendanceMap[u.id].remarks,
          }
        : null,
    })),
    attendanceCount: session.attendance.length,
    presentCount: session.attendance.filter((a) => a.status === "hadir").length,
    lateCount: session.attendance.filter((a) => a.status === "lewat").length,
    absentCount: session.attendance.filter((a) => a.status === "tidak_hadir").length,
    leaveCount: session.attendance.filter((a) => a.status === "cuti").length,
    excusedCount: session.attendance.filter((a) => a.status === "dikecualikan").length,
  });
}
