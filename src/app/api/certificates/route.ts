import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// My certificates
export async function GET() {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const certs = await db.certificate.findMany({
    where: { userId: sess.id },
    include: { course: true },
    orderBy: { issuedAt: "desc" },
  });
  return NextResponse.json({
    certificates: certs.map((c) => ({
      id: c.id,
      certNo: c.certNo,
      verifyCode: c.verifyCode,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      course: { id: c.course.id, code: c.course.code, title: c.course.title },
    })),
  });
}
