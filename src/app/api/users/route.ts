import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, effectiveRole } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";
import { createHash } from "crypto";

// List users (ADM-01)
export async function GET(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const role = effectiveRole(sess);
  if (role !== "ADMIN" && role !== "HR") return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  const url = req.nextUrl;
  const search = url.searchParams.get("search") || "";
  const roleFilter = url.searchParams.get("role");
  const deptFilter = url.searchParams.get("departmentId");
  const where: Record<string, unknown> = {};
  if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { staffNo: { contains: search } }];
  if (roleFilter) where.role = roleFilter;
  if (deptFilter) where.departmentId = deptFilter;
  const users = await db.user.findMany({
    where,
    include: { department: true },
    orderBy: { staffNo: "asc" },
    take: 200,
  });
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      staffNo: u.staffNo,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department?.name,
      departmentId: u.departmentId,
      position: u.position,
      language: u.language,
      status: u.status,
      avatarColor: u.avatarColor,
      createdAt: u.createdAt,
    })),
  });
}

// Add user (ADM-01)
export async function POST(req: NextRequest) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const role = effectiveRole(sess);
  if (role !== "ADMIN") return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const staffNo = String(body.staffNo || "").trim();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!staffNo || !name || !email) return NextResponse.json({ error: "No. staf, nama dan e-mel diperlukan" }, { status: 400 });
  const dup = await db.user.findFirst({ where: { OR: [{ staffNo }, { email }] } });
  if (dup) return NextResponse.json({ error: "No. staf atau e-mel telah wujud" }, { status: 400 });
  const user = await db.user.create({
    data: {
      staffNo,
      name,
      email,
      passwordHash: "demo$" + createHash("sha256").update(String(body.password || "password123")).digest("hex").slice(0, 16),
      role: String(body.role || "STAFF"),
      departmentId: body.departmentId || null,
      position: body.position || null,
      language: body.language || "ms",
      status: "ACTIVE",
      avatarColor: body.avatarColor || "#0f4c75",
    },
  });
  await logAudit({ userId: sess.id, action: "CREATE_USER", entity: "User", entityId: user.id, after: { staffNo, name, role: user.role } });
  return NextResponse.json({ ok: true, user });
}
