import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { jsPDF } from "jspdf";

// Generate certificate PDF (CERT-01, CERT-03)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const { id } = await params;
  const cert = await db.certificate.findUnique({
    where: { id },
    include: { user: true, course: { include: { instructor: true } } },
  });
  if (!cert) return NextResponse.json({ error: "Sijil tidak dijumpai" }, { status: 404 });
  // Only owner or admin/hr can view
  if (cert.userId !== sess.id && sess.role !== "ADMIN" && sess.role !== "HR") {
    return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.getWidth();
  const h = doc.internal.getHeight();

  // Outer border (deep teal)
  doc.setDrawColor(15, 76, 117);
  doc.setLineWidth(2);
  doc.rect(8, 8, w - 16, h - 16);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, w - 22, h - 22);

  // Emerald accent line
  doc.setDrawColor(11, 132, 87);
  doc.setLineWidth(1.5);
  doc.line(40, 50, w - 40, 50);

  // Header
  doc.setTextColor(15, 76, 117);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("AL AMIN EDU OASIS", w / 2, 30, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("Sistem Pengurusan Pembelajaran Latihan AI | Malaysia", w / 2, 38, { align: "center" });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(11, 132, 87);
  doc.text("SIJIL PENYIAPAN KURSUS", w / 2, 60, { align: "center" });
  doc.setFontSize(13);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text("Certificate of Course Completion", w / 2, 67, { align: "center" });

  // Recipient
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text("Dengan bangganya dianugerahkan kepada", w / 2, 82, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(15, 76, 117);
  doc.text(cert.user.name, w / 2, 93, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`No. Staf: ${cert.user.staffNo}`, w / 2, 100, { align: "center" });

  // Course
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text("atas penyempurnaan kursus latihan", w / 2, 115, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 76, 117);
  doc.text(`${cert.course.code}: ${cert.course.title}`, w / 2, 124, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tempoh: ${cert.course.durationHours} jam | Markah Lulus: ${cert.course.passMark}%`, w / 2, 131, { align: "center" });

  // Footer: cert no, verify code, date
  doc.setDrawColor(15, 76, 117);
  doc.setLineWidth(0.8);
  doc.line(40, 150, w - 40, 150);

  const issued = cert.issuedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const expires = cert.expiresAt ? cert.expiresAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "-";

  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text("No. Sijil", 40, 158);
  doc.text("Kod Pengesahan", w / 2 - 20, 158);
  doc.text("Dikeluarkan", w - 60, 158);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 76, 117);
  doc.text(cert.certNo, 40, 164);
  doc.text(cert.verifyCode, w / 2 - 20, 164);
  doc.text(issued, w - 60, 164);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Tamat: ${expires}`, w - 60, 169);

  // Signature line
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.4);
  doc.line(40, 180, 90, 180);
  doc.line(w - 90, 180, w - 40, 180);
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Jurulatih", 65, 185, { align: "center" });
  doc.text(cert.course.instructor?.name || "Al Amin Edu Oasis", w - 65, 185, { align: "center" });

  // QR note
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Sahkan ketulenan sijil di LMS Al Amin menggunakan kod pengesahan.`, w / 2, h - 14, { align: "center" });
  doc.text("Powered by z.ai", w / 2, h - 10, { align: "center" });

  const pdf = doc.output("arraybuffer");
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${cert.certNo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
