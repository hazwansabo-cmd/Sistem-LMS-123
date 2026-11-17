import { db } from "@/lib/db";
import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  staffNo: string;
  name: string;
  email: string;
  role: "ADMIN" | "HR" | "TRAINER" | "STAFF";
  demoRole?: "ADMIN" | "HR" | "TRAINER" | "STAFF" | null;
  departmentId: string | null;
  position: string | null;
  language: "ms" | "en";
  avatarColor: string;
};

export const SESSION_COOKIE = "lms_session";
const SECRET = "alamin-lms-demo-secret-2026";

// Simple base64 session encoding (dummy demo only - NOT for production)
function encode(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}
function decode(token: string): Record<string, unknown> | null {
  try {
    const json = Buffer.from(token, "base64url").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function createSession(userId: string, role: string): Promise<string> {
  return encode({ uid: userId, role, demoRole: null, issued: Date.now(), sig: SECRET.slice(0, 8) });
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const payload = decode(token);
  if (!payload || payload.sig !== SECRET.slice(0, 8)) return null;
  const uid = payload.uid as string;
  const user = await db.user.findUnique({ where: { id: uid } });
  if (!user || user.status !== "ACTIVE") return null;
  const effectiveRole = (payload.demoRole as string) || user.role;
  return {
    id: user.id,
    staffNo: user.staffNo,
    name: user.name,
    email: user.email,
    role: user.role as SessionUser["role"],
    demoRole: (payload.demoRole as SessionUser["demoRole"]) || null,
    departmentId: user.departmentId,
    position: user.position,
    language: user.language as "ms" | "en",
    avatarColor: user.avatarColor,
  };
}

// Effective role (demo override if set)
export function effectiveRole(u: SessionUser): SessionUser["role"] {
  return (u.demoRole || u.role) as SessionUser["role"];
}
