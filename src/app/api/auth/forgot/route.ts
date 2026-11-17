import { NextResponse } from "next/server";

// Simulated forgot-password flow (AUTH-05, dummy prototype)
export async function POST() {
  return NextResponse.json({ ok: true, message: "Pautan set semula kata laluan telah dihantar (simulasi)." });
}
