import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const notifs = await db.notification.findMany({ where: { userId: sess.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return NextResponse.json({ notifications: notifs });
}

export async function POST(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  // mark read
  if (body.markAllRead) {
    await db.notification.updateMany({ where: { userId: sess.id, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }
  if (body.id) {
    await db.notification.update({ where: { id: body.id }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false });
}
