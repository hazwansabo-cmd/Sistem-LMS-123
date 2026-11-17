import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public certificate verification (CERT-02) - no auth required
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  if (!code) return NextResponse.json({ valid: false, message: "Kod diperlukan" });
  const cert = await db.certificate.findFirst({
    where: { OR: [{ verifyCode: code.toUpperCase() }, { certNo: code }] },
    include: { user: true, course: true },
  });
  if (!cert) {
    return NextResponse.json({ valid: false, message: "Sijil tidak sah atau tidak dijumpai" });
  }
  return NextResponse.json({
    valid: true,
    certificate: {
      certNo: cert.certNo,
      verifyCode: cert.verifyCode,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
      recipientName: cert.user.name,
      staffNo: cert.user.staffNo,
      courseCode: cert.course.code,
      courseTitle: cert.course.title,
      courseDurationHours: cert.course.durationHours,
    },
  });
}
