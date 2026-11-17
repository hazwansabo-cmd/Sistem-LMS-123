import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) {
    return NextResponse.json({ error: "E-mel dan kata laluan diperlukan" }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { email } });
  const hash = "demo$" + createHash("sha256").update(password).digest("hex").slice(0, 16);
  if (!user || user.passwordHash !== hash) {
    return NextResponse.json({ error: "E-mel atau kata laluan tidak sah" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Akaun tidak aktif" }, { status: 403 });
  }
  const token = await createSession(user.id, user.role);
  await setSessionCookie(token);
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      staffNo: user.staffNo,
      name: user.name,
      email: user.email,
      role: user.role,
      demoRole: null,
      departmentId: user.departmentId,
      position: user.position,
      language: user.language,
      avatarColor: user.avatarColor,
    },
  });
}
