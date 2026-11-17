import { NextResponse } from "next/server";
import { getSessionUser, effectiveRole } from "@/lib/auth";
import { logAudit } from "@/lib/lms/audit";
import { execSync } from "child_process";

// Reset & reseed dummy data (ADM-04)
export async function POST() {
  const sess = await getSessionUser();
  if (!sess) return NextResponse.json({ error: "Tidak log masuk" }, { status: 401 });
  const role = effectiveRole(sess);
  if (role !== "ADMIN") return NextResponse.json({ error: "Tiada kebenaran" }, { status: 403 });
  try {
    await logAudit({ userId: sess.id, action: "RESET_DUMMY_DATA", entity: "System", entityId: "all" });
    // Run seed via bun
    execSync("bun run prisma/seed.ts", { cwd: process.cwd(), timeout: 60000, stdio: "pipe" });
    return NextResponse.json({ ok: true, message: "Data dummy telah dikosongkan dan disemai semula." });
  } catch (e) {
    return NextResponse.json({ error: "Gagal reset: " + String(e) }, { status: 500 });
  }
}
