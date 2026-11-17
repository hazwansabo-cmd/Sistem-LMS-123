import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const departments = await db.department.findMany({ include: { _count: { select: { users: true } } }, orderBy: { name: "asc" } });
  const categories = await db.category.findMany({ include: { _count: { select: { courses: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json({
    departments: departments.map((d) => ({ id: d.id, name: d.name, headUserId: d.headUserId, userCount: d._count.users })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, description: c.description, courseCount: c._count.courses })),
  });
}
