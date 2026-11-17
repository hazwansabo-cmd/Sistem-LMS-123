import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";
import Papa from "papaparse";

// Import attendance CSV (ATT-06)
// Expected columns: staffNo, status, checkIn(optional HH:mm), remarks(optional)
// sessionId passed as query param
export async function POST(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const url = req.nextUrl;
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Sesi diperlukan" }, { status: 400 });
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: "Sesi tidak dijumpai" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fail CSV diperlukan" }, { status: 400 });
  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) {
    // still proceed; we report row-level errors
  }
  const rows = parsed.data as Record<string, string>[];

  const allUsers = await db.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, staffNo: true, name: true } });
  const userByStaffNo = Object.fromEntries(allUsers.map((u) => [u.staffNo, u]));

  const preview: { row: number; staffNo: string; name: string | null; status: string; checkIn: string | null; remarks: string | null; valid: boolean; error: string | null }[] = [];
  const validStatuses = ["hadir", "lewat", "tidak_hadir", "cuti", "dikecualikan"];
  let validCount = 0;

  rows.forEach((row, i) => {
    const staffNo = (row.staffNo || row.StaffNo || "").trim();
    const status = (row.status || row.Status || "").trim().toLowerCase();
    const checkIn = (row.checkIn || row.CheckIn || "").trim() || null;
    const remarks = (row.remarks || row.Remarks || "").trim() || null;
    const user = userByStaffNo[staffNo];
    let valid = true;
    let error: string | null = null;
    if (!staffNo) { valid = false; error = "No. staf kosong"; }
    else if (!user) { valid = false; error = `Staf ${staffNo} tidak dijumpai`; }
    else if (!validStatuses.includes(status)) { valid = false; error = `Status tidak sah: ${status}`; }
    if (valid) validCount++;
    preview.push({ row: i + 1, staffNo, name: user?.name || null, status, checkIn, remarks, valid, error });
  });

  // Apply valid rows
  let created = 0, updated = 0;
  for (const p of preview) {
    if (!p.valid) continue;
    const user = userByStaffNo[p.staffNo];
    const existing = await db.attendance.findUnique({ where: { sessionId_userId: { sessionId, userId: user.id } } });
    const checkInAt = p.checkIn ? (() => {
      const [h, m] = p.checkIn.split(":").map(Number);
      const d = new Date(session.date);
      d.setHours(h || 0, m || 0, 0, 0);
      return d;
    })() : (p.status === "hadir" || p.status === "lewat" ? new Date() : null);
    if (existing) {
      if (existing.status !== p.status) {
        await db.attendance.update({
          where: { id: existing.id },
          data: { status: p.status, remarks: p.remarks, method: "import", recordedById: sess.id, checkInAt, updatedAt: new Date() },
        });
        updated++;
      }
    } else {
      await db.attendance.create({
        data: { sessionId, userId: user.id, status: p.status, remarks: p.remarks, method: "import", recordedById: sess.id, checkInAt },
      });
      created++;
    }
  }
  await logAudit({ userId: sess.id, action: "IMPORT_CSV", entity: "Attendance", entityId: sessionId, after: { rows: rows.length, valid: validCount, created, updated } });
  return NextResponse.json({ ok: true, totalRows: rows.length, valid: validCount, created, updated, preview });
}
