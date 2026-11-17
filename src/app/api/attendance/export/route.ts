import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Export attendance CSV (ATT-07). Query: ?sessionId=... or ?userId=... or ?departmentId=... or ?from=&to=
export async function GET(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const url = req.nextUrl;
  const sessionId = url.searchParams.get("sessionId");
  const userId = url.searchParams.get("userId");
  const departmentId = url.searchParams.get("departmentId");
  const format = url.searchParams.get("format") || "csv";

  const where: Record<string, unknown> = {};
  if (sessionId) where.sessionId = sessionId;
  if (userId) where.userId = userId;
  if (departmentId) where.user = { departmentId };

  const records = await db.attendance.findMany({
    where,
    include: { session: { include: { course: true } }, user: { include: { department: true } } },
    orderBy: { session: { date: "desc" } },
    take: 2000,
  });

  const rows = records.map((a) => ({
    staffNo: a.user.staffNo,
    name: a.user.name,
    department: a.user.department?.name || "",
    sessionTitle: a.session.title,
    sessionCode: a.session.sessionCode,
    date: a.session.date.toISOString().slice(0, 10),
    startTime: a.session.startTime,
    status: a.status,
    method: a.method,
    checkInAt: a.checkInAt ? a.checkInAt.toISOString() : "",
    remarks: a.remarks || "",
  }));

  if (format === "json") {
    return NextResponse.json({ rows });
  }

  // CSV
  const headers = ["staffNo", "name", "department", "sessionTitle", "sessionCode", "date", "startTime", "status", "method", "checkInAt", "remarks"];
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] || "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kehadiran-${sessionId || "all"}-${Date.now()}.csv"`,
    },
  });
}
