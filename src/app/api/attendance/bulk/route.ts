import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";

// Bulk attendance entry (ATT-05): { sessionId, entries: [{ userId, status, remarks }] }
export async function POST(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || "");
  const entries: { userId: string; status: string; remarks?: string }[] = body.entries || [];
  const markAllPresent = Boolean(body.markAllPresent);
  if (!sessionId) return NextResponse.json({ error: "Sesi diperlukan" }, { status: 400 });
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: "Sesi tidak dijumpai" }, { status: 404 });

  let processed = 0;
  let created = 0;
  let updated = 0;
  const before: Record<string, string> = {};
  const after: Record<string, string> = {};

  for (const e of entries) {
    const status = e.status;
    if (!["hadir", "lewat", "tidak_hadir", "cuti", "dikecualikan"].includes(status)) continue;
    const existing = await db.attendance.findUnique({
      where: { sessionId_userId: { sessionId, userId: e.userId } },
    });
    if (existing) {
      if (existing.status !== status) {
        before[e.userId] = existing.status;
        after[e.userId] = status;
        await db.attendance.update({
          where: { id: existing.id },
          data: {
            status,
            remarks: e.remarks || existing.remarks,
            recordedById: sess.id,
            method: "manual",
            updatedAt: new Date(),
          },
        });
        updated++;
      }
    } else {
      after[e.userId] = status;
      await db.attendance.create({
        data: {
          sessionId,
          userId: e.userId,
          status,
          method: "manual",
          recordedById: sess.id,
          remarks: e.remarks || null,
          checkInAt: status === "hadir" || status === "lewat" ? new Date() : null,
        },
      });
      created++;
    }
    processed++;
  }

  await logAudit({
    userId: sess.id,
    action: "BULK_ATTENDANCE",
    entity: "Attendance",
    entityId: sessionId,
    before,
    after: { markAllPresent, count: processed, after },
  });
  return NextResponse.json({ ok: true, processed, created, updated });
}
