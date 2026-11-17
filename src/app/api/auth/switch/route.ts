import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, createSession, setSessionCookie } from "@/lib/auth";

// "Login as" demo: switch effective role without changing the underlying user
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const targetRole = String(body.role || "").toUpperCase() as "ADMIN" | "HR" | "TRAINER" | "STAFF" | null;
  const current = await getSessionUser();
  if (!current) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const validRoles = ["ADMIN", "HR", "TRAINER", "STAFF"];
  const demoRole = targetRole && validRoles.includes(targetRole) ? targetRole : null;
  const token = await createSession(current.id, current.role);
  // re-encode with demoRole
  const newToken = Buffer.from(JSON.stringify({ uid: current.id, role: current.role, demoRole, issued: Date.now(), sig: "alamin-l" })).toString("base64url");
  await setSessionCookie(newToken);
  return NextResponse.json({ ok: true, demoRole });
}

export async function DELETE() {
  const current = await getSessionUser();
  if (!current) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const token = await createSession(current.id, current.role);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, demoRole: null });
}
