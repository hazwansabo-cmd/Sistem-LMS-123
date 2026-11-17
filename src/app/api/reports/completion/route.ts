import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Completion report (RPT-01): by staff / department / period
export async function GET(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const url = req.nextUrl;
  const departmentId = url.searchParams.get("departmentId");
  const format = url.searchParams.get("format");

  const where: Record<string, unknown> = {};
  if (departmentId) where.user = { departmentId };

  const enrollments = await db.enrollment.findMany({
    where,
    include: { user: { include: { department: true } }, course: true },
    orderBy: { user: { name: "asc" } },
    take: 500,
  });

  const rows = enrollments.map((e) => ({
    staffNo: e.user.staffNo,
    name: e.user.name,
    department: e.user.department?.name || "",
    courseCode: e.course.code,
    courseTitle: e.course.title,
    level: e.course.level,
    status: e.status,
    progressPct: e.progressPct,
    completedAt: e.completedAt ? e.completedAt.toISOString().slice(0, 10) : "",
    dueDate: e.dueDate ? e.dueDate.toISOString().slice(0, 10) : "",
  }));

  if (format === "csv") {
    const headers = ["staffNo", "name", "department", "courseCode", "courseTitle", "level", "status", "progressPct", "completedAt", "dueDate"];
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="laporan-penyiapan-${Date.now()}.csv"` } });
  }

  return NextResponse.json({ rows, total: rows.length, completed: rows.filter((r) => r.status === "COMPLETED").length });
}
