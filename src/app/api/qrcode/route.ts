import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text") || "LMS-Al-Amin";
  const size = Number(req.nextUrl.searchParams.get("size") || "256");
  try {
    const png = await QRCode.toBuffer(text, {
      width: size,
      margin: 2,
      color: { dark: "#0f3460", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    return new NextResponse(png, {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json({ error: "QR generation failed" }, { status: 500 });
  }
}
