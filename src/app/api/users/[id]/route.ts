import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, effectiveRole } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const role = effectiveRole(sess);
  const { id } = await params;
  if (role !== "ADMIN" && !(role === "HR" && sess.id === id)) {
    return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  }
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Pengguna tidak dijumpai" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name);
  if (body.email !== undefined) data.email = String(body.email).toLowerCase();
  if (body.position !== undefined) data.position = body.position;
  if (body.departmentId !== undefined) data.departmentId = body.departmentId;
  if (body.language !== undefined) data.language = body.language;
  if (body.status !== undefined) data.status = body.status;
  if (role === "ADMIN") {
    if (body.role !== undefined) data.role = body.role;
  }
  const updated = await db.user.update({ where: { id }, data });
  await logAudit({ userId: sess.id, action: "UPDATE_USER", entity: "User", entityId: id, before: existing, after: updated });
  return NextResponse.json({ ok: true, user: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const role = effectiveRole(sess);
  if (role !== "ADMIN") return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  const { id } = await params;
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Pengguna tidak dijumpai" }, { status: 404 });
  // Deactivate instead of delete
  await db.user.update({ where: { id }, data: { status: "INACTIVE" } });
  await logAudit({ userId: sess.id, action: "DEACTIVATE_USER", entity: "User", entityId: id });
  return NextResponse.json({ ok: true });
}
