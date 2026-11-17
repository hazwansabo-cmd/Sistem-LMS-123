import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, effectiveRole } from "@/lib/auth";
import { toKLDate, isSameDay } from "@/lib/lms/audit";

export async function GET() {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const role = effectiveRole(sess);
  const klNow = toKLDate(new Date());
  const todayStart = new Date(klNow.getFullYear(), klNow.getMonth(), klNow.getDate());

  const totalStaff = await db.user.count({ where: { role: "STAFF", status: "ACTIVE" } });
  const totalCourses = await db.course.count();
  const publishedCourses = await db.course.count({ where: { status: "PUBLISHED" } });
  const totalSessions = await db.session.count();
  const todaySessions = await db.session.count({ where: { date: todayStart } });
  const upcomingSessions = await db.session.count({ where: { date: { gt: todayStart } } });

  if (role === "STAFF") {
    const enrollments = await db.enrollment.findMany({
      where: { userId: sess.id },
      include: { course: true },
    });
    const inProgress = enrollments.filter((e) => e.status === "IN_PROGRESS");
    const completed = enrollments.filter((e) => e.status === "COMPLETED");
    const mySessions = await db.session.findMany({
      where: { date: { gte: todayStart } },
      include: { course: true, trainer: true },
      orderBy: { date: "asc" },
      take: 5,
    });
    const myCerts = await db.certificate.count({ where: { userId: sess.id } });
    const myAttendance = await db.attendance.findMany({
      where: { userId: sess.id },
      include: { session: { include: { course: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    const notifs = await db.notification.findMany({ where: { userId: sess.id, read: false }, orderBy: { createdAt: "desc" }, take: 6 });
    return NextResponse.json({
      role,
      stats: {
        totalCourses: enrollments.length,
        inProgress: inProgress.length,
        completed: completed.length,
        earnedCerts: myCerts,
        upcomingSessions: mySessions.length,
      },
      inProgress: inProgress.map((e) => ({ id: e.id, courseId: e.courseId, code: e.course.code, title: e.course.title, progress: e.progressPct, level: e.course.level })),
      mySessions: mySessions.map((s) => ({ id: s.id, title: s.title, code: s.course?.code, date: s.date, startTime: s.startTime, mode: s.mode, location: s.location })),
      myAttendance: myAttendance.map((a) => ({ id: a.id, status: a.status, method: a.method, sessionTitle: a.session.title, date: a.session.date, checkInAt: a.checkInAt })),
      notifications: notifs,
    });
  }

  if (role === "TRAINER") {
    const myCourses = await db.course.findMany({
      where: { instructorId: sess.id },
      include: { _count: { select: { enrollments: true, sessions: true } } },
    });
    const mySessionsToday = await db.session.findMany({
      where: { trainerId: sess.id, date: todayStart },
      include: { course: true, _count: { select: { attendance: true } } },
    });
    const mySessionsUpcoming = await db.session.findMany({
      where: { trainerId: sess.id, date: { gt: todayStart } },
      include: { course: true },
      orderBy: { date: "asc" },
      take: 5,
    });
    // Pending quizzes = enrollments IN_PROGRESS in trainer's courses
    const pendingCount = await db.enrollment.count({
      where: { course: { instructorId: sess.id }, status: "IN_PROGRESS" },
    });
    return NextResponse.json({
      role,
      stats: {
        myCourses: myCourses.length,
        myStudents: myCourses.reduce((a, c) => a + c._count.enrollments, 0),
        todaySessions: mySessionsToday.length,
        pendingQuizzes: pendingCount,
      },
      myCourses: myCourses.map((c) => ({ id: c.id, code: c.code, title: c.title, students: c._count.enrollments, sessions: c._count.sessions, status: c.status, level: c.level })),
      mySessionsToday: mySessionsToday.map((s) => ({ id: s.id, title: s.title, code: s.course?.code, startTime: s.startTime, mode: s.mode, attendanceCount: s._count.attendance, sessionCode: s.sessionCode, qrToken: s.qrToken })),
      mySessionsUpcoming: mySessionsUpcoming.map((s) => ({ id: s.id, title: s.title, code: s.course?.code, date: s.date, startTime: s.startTime })),
    });
  }

  // HR / Admin
  const enrollments = await db.enrollment.findMany();
  const completedCount = enrollments.filter((e) => e.status === "COMPLETED").length;
  const completionRate = enrollments.length ? Math.round((completedCount / enrollments.length) * 100) : 0;
  const attendanceRecords = await db.attendance.findMany();
  const presentCount = attendanceRecords.filter((a) => a.status === "hadir" || a.status === "lewat").length;
  const attendanceRate = attendanceRecords.length ? Math.round((presentCount / attendanceRecords.length) * 100) : 0;
  const quizAttempts = await db.quizAttempt.findMany();
  const avgScore = quizAttempts.length ? Math.round(quizAttempts.reduce((a, q) => a + q.score, 0) / quizAttempts.length) : 0;
  const activeLearners = await db.enrollment.count({ where: { status: "IN_PROGRESS" } });
  const totalCerts = await db.certificate.count();

  // Completion by department
  const departments = await db.department.findMany({ include: { users: { where: { role: "STAFF" } } } });
  const completionByDept = await Promise.all(
    departments.map(async (d) => {
      const userIds = d.users.map((u) => u.id);
      const en = await db.enrollment.count({ where: { userId: { in: userIds } } });
      const comp = await db.enrollment.count({ where: { userId: { in: userIds }, status: "COMPLETED" } });
      return { name: d.name, total: en, completed: comp, rate: en ? Math.round((comp / en) * 100) : 0 };
    })
  );

  // Attendance trend (last 6 sessions by month) - simplified: by course
  const courses = await db.course.findMany({ include: { _count: { select: { enrollments: true } } }, orderBy: { code: "asc" } });
  const popularCourses = courses
    .map((c) => ({ code: c.code, title: c.title, count: c._count.enrollments }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent audit logs
  const recentAudit = await db.auditLog.findMany({ include: { user: true }, orderBy: { timestamp: "desc" }, take: 8 });

  return NextResponse.json({
    role,
    stats: {
      totalStaff,
      totalCourses: publishedCourses,
      totalSessions,
      completionRate,
      attendanceRate,
      avgScore,
      activeLearners,
      totalCerts,
      todaySessions,
      upcomingSessions,
    },
    completionByDept,
    popularCourses,
    recentAudit: recentAudit.map((a) => ({ id: a.id, action: a.action, entity: a.entity, user: a.user?.name || "Sistem", timestamp: a.timestamp })),
    notifications: [],
  });
}
