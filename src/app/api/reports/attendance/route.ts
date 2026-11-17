import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Attendance report (RPT-02, ATT-11): per staff / department / period
export async function GET(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const url = req.nextUrl;
  const departmentId = url.searchParams.get("departmentId");
  const format = url.searchParams.get("format");

  const where: Record<string, unknown> = {};
  if (departmentId) where.user = { departmentId };

  const records = await db.attendance.findMany({
    where,
    include: { user: { include: { department: true } }, session: { include: { course: true } } },
    orderBy: { session: { date: "desc" } },
    take: 2000,
  });

  const rows = records.map((a) => ({
    staffNo: a.user.staffNo,
    name: a.user.name,
    department: a.user.department?.name || "",
    sessionTitle: a.session.title,
    courseCode: a.session.course?.code || "",
    date: a.session.date.toISOString().slice(0, 10),
    startTime: a.session.startTime,
    status: a.status,
    method: a.method,
    checkInAt: a.checkInAt ? a.checkInAt.toISOString() : "",
    remarks: a.remarks || "",
  }));

  // Summary by staff
  const byStaff: Record<string, { name: string; staffNo: string; department: string; total: number; hadir: number; lewat: number; tidakHadir: number; cuti: number; rate: number }> = {};
  for (const r of rows) {
    const key = r.staffNo;
    if (!byStaff[key]) byStaff[key] = { name: r.name, staffNo: r.staffNo, department: r.department, total: 0, hadir: 0, lewat: 0, tidakHadir: 0, cuti: 0, rate: 0 };
    byStaff[key].total++;
    if (r.status === "hadir") byStaff[key].hadir++;
    if (r.status === "lewat") byStaff[key].lewat++;
    if (r.status === "tidak_hadir") byStaff[key].tidakHadir++;
    if (r.status === "cuti") byStaff[key].cuti++;
  }
  Object.values(byStaff).forEach((s) => {
    const present = s.hadir + s.lewat;
    s.rate = s.total ? Math.round((present / s.total) * 100) : 0;
  });

  if (format === "csv") {
    const headers = ["staffNo", "name", "department", "sessionTitle", "courseCode", "date", "startTime", "status", "method", "checkInAt", "remarks"];
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="laporan-kehadiran-${Date.now()}.csv"` } });
  }

  return NextResponse.json({
    rows,
    summary: Object.values(byStaff).sort((a, b) => a.rate - b.rate),
    totalRecords: rows.length,
    overallRate: rows.length ? Math.round((rows.filter((r) => r.status === "hadir" || r.status === "lewat").length / rows.length) * 100) : 0,
  });
}
