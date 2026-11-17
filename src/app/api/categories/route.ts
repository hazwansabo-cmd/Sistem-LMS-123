import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const categories = await db.category.findMany({ include: { _count: { select: { courses: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name, description: c.description, courseCount: c._count.courses })),
  });
}
