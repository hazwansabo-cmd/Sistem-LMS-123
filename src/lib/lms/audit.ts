import { db } from "@/lib/db";

export async function logAudit(opts: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: opts.userId || null,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId || null,
        before: opts.before ? JSON.stringify(opts.before) : null,
        after: opts.after ? JSON.stringify(opts.after) : null,
      },
    });
  } catch {
    // ignore audit failures
  }
}

// Kuala Lumpur time helpers (UTC+8)
export function toKLDate(d: Date): Date {
  // Convert to KL wall-clock by shifting
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utcMs + 8 * 3600000);
}
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function formatDateMY(d: Date | string | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
export function formatDateTimeMY(d: Date | string | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${formatDateMY(date)} ${hh}:${min}`;
}
