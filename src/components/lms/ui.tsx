"use client";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

export function GlassCard({ className, children, hover, strong, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean; strong?: boolean }) {
  return (
    <Card
      className={cn(
        strong ? "glass-strong" : "glass-card",
        "border-0",
        hover && "glass-hover",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function PageHeader({ title, subtitle, icon, actions }: { title: string; subtitle?: string; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 animate-float-in">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl glass text-primary">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon, accent, sub }: { label: string; value: ReactNode; icon?: ReactNode; accent?: "primary" | "accent" | "warn" | "danger"; sub?: string }) {
  const accentClass =
    accent === "accent" ? "text-[oklch(0.72_0.16_160)]" :
    accent === "warn" ? "text-amber-500" :
    accent === "danger" ? "text-rose-500" :
    "text-primary";
  return (
    <GlassCard className="p-5" hover>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">{label}</p>
          <div className={cn("text-3xl font-bold mt-1", accentClass)}>{value}</div>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        {icon && <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg glass", accentClass)}>{icon}</div>}
      </div>
    </GlassCard>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl glass text-muted-foreground">{icon}</div>}
      <p className="text-base font-medium text-foreground">{title}</p>
      {hint && <p className="text-sm text-muted-foreground mt-1 max-w-md">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const roleStyles: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: "Pentadbir", cls: "bg-[oklch(0.72_0.16_160)]/15 text-[oklch(0.45_0.14_160)] border-[oklch(0.72_0.16_160)]/30" },
  HR: { label: "HR / Pengurus", cls: "bg-violet-500/15 text-violet-600 border-violet-500/30" },
  TRAINER: { label: "Jurulatih", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  STAFF: { label: "Staf", cls: "bg-primary/15 text-primary border-primary/30" },
};

export const statusStyles: Record<string, { label: string; cls: string }> = {
  hadir: { label: "Hadir", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  lewat: { label: "Lewat", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  tidak_hadir: { label: "Tidak Hadir", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  cuti: { label: "Cuti", cls: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  dikecualikan: { label: "Dikecualikan", cls: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
  COMPLETED: { label: "Selesai", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  IN_PROGRESS: { label: "Berjalan", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  ENROLLED: { label: "Didaftar", cls: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
  PUBLISHED: { label: "Diterbitkan", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  DRAFT: { label: "Draf", cls: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
  ARCHIVED: { label: "Diarkibkan", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  PENDING: { label: "Menunggu", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  APPROVED: { label: "Diluluskan", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  REJECTED: { label: "Ditolak", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
};

export const levelStyles: Record<string, string> = {
  PEMULA: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  PERTENGAHAN: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  LANJUTAN: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  SEMUA: "bg-sky-500/15 text-sky-600 border-sky-500/30",
};

export function initials(name: string) {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
