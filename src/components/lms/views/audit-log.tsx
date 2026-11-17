"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, StatCard, EmptyState,
} from "@/components/lms/ui";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ScrollText, Search, Activity, ChevronRight, X,
} from "lucide-react";
import { formatDateTimeMY } from "@/lib/lms/audit";
import { cn } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  user: string;
  timestamp: string;
  before: string | null;
  after: string | null;
}

interface AuditResponse { logs: AuditLogItem[] }

function actionStyle(action: string): { cls: string; label?: string } {
  const a = action.toUpperCase();
  if (a.startsWith("CREATE")) return { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  if (a.startsWith("UPDATE")) return { cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  if (a.startsWith("DELETE") || a.startsWith("ARCHIVE")) return { cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" };
  if (a.startsWith("CHECK_IN") || a.startsWith("CHECKOUT") || a.startsWith("CHECK_OUT")) return { cls: "bg-sky-500/15 text-sky-600 border-sky-500/30" };
  if (a.startsWith("RESET") || a.startsWith("SEED")) return { cls: "bg-violet-500/15 text-violet-600 border-violet-500/30" };
  if (a.startsWith("LOGIN") || a.startsWith("LOGOUT") || a.startsWith("SWITCH")) return { cls: "bg-[oklch(0.72_0.16_160)]/15 text-[oklch(0.45_0.14_160)] border-[oklch(0.72_0.16_160)]/30" };
  if (a.startsWith("SUBMIT") || a.startsWith("ENROLL")) return { cls: "bg-sky-500/15 text-sky-600 border-sky-500/30" };
  if (a.startsWith("APPROVE")) return { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  if (a.startsWith("REJECT")) return { cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" };
  return { cls: "bg-slate-500/15 text-slate-600 border-slate-500/30" };
}

function prettyJson(raw: string | null): string {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function AuditLogView() {
  const { t, lang } = useI18n();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const query = useQuery<AuditResponse>({
    queryKey: ["audit"],
    queryFn: async () => {
      const res = await fetch("/api/audit");
      const data = await res.json();
      return data as AuditResponse;
    },
  });

  const logs = query.data?.logs ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      l.action.toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q) ||
      l.user.toLowerCase().includes(q) ||
      (l.entityId || "").toLowerCase().includes(q)
    );
  }, [logs, search]);

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("auditLog")}
        subtitle={t("auditLogDesc")}
        icon={<ScrollText className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={lang === "ms" ? "Jumlah Log" : "Total Logs"}
          value={logs.length}
          icon={<ScrollText className="h-5 w-5" />}
        />
        <StatCard
          label={lang === "ms" ? "Ditapis" : "Filtered"}
          value={filtered.length}
          icon={<Activity className="h-5 w-5" />}
          accent="warn"
          sub={lang === "ms" ? "dengan carian semasa" : "with current search"}
        />
        <StatCard
          label={lang === "ms" ? "Pengguna Aktif" : "Active Users"}
          value={new Set(logs.map((l) => l.user)).size}
          icon={<Activity className="h-5 w-5" />}
          accent="accent"
        />
      </div>

      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ms"
              ? "Cari tindakan / entiti / pengguna..."
              : "Search action / entity / user..."}
            className="pl-9"
            aria-label={t("search")}
          />
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-6 w-6" />}
            title={t("noData")}
            hint={lang === "ms"
              ? "Tiada log audit dijumpai."
              : "No audit logs found."}
          />
        ) : (
          <ScrollArea className="max-h-[28rem]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("actions")}</TableHead>
                  <TableHead>{lang === "ms" ? "Entiti" : "Entity"}</TableHead>
                  <TableHead className="hidden md:table-cell">{lang === "ms" ? "ID Entiti" : "Entity ID"}</TableHead>
                  <TableHead>{lang === "ms" ? "Pengguna" : "User"}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("time")}</TableHead>
                  <TableHead className="text-right">{t("view")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <AuditRow key={l.id} l={l} onView={() => setSelected(l)} t={t} lang={lang} />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </GlassCard>

      <LogDetailDialog log={selected} onClose={() => setSelected(null)} lang={lang} t={t} />
    </div>
  );
}

function AuditRow({
  l, onView, t, lang,
}: {
  l: AuditLogItem;
  onView: () => void;
  t: (k: DictKey) => string;
  lang: string;
}) {
  const style = actionStyle(l.action);
  return (
    <TableRow className="hover:bg-accent/10 cursor-pointer" onClick={onView}>
      <TableCell>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 font-mono", style.cls)}>
          {l.action}
        </Badge>
      </TableCell>
      <TableCell className="text-xs font-medium">{l.entity}</TableCell>
      <TableCell className="hidden md:table-cell font-mono text-[11px] text-muted-foreground truncate max-w-[10rem]">
        {l.entityId ? l.entityId.slice(-8) : "-"}
      </TableCell>
      <TableCell className="text-xs">{l.user}</TableCell>
      <TableCell className="hidden sm:table-cell text-[11px] text-muted-foreground whitespace-nowrap">
        {formatDateTimeMY(l.timestamp)}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={(e) => { e.stopPropagation(); onView(); }}>
          <ChevronRight className="h-3.5 w-3.5" /> {t("view")}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function LogDetailDialog({
  log, onClose, lang, t,
}: {
  log: AuditLogItem | null;
  onClose: () => void;
  lang: string;
  t: (k: DictKey) => string;
}) {
  const before = prettyJson(log?.before ?? null);
  const after = prettyJson(log?.after ?? null);
  return (
    <Dialog open={!!log} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="glass-strong border-border/40 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-gradient flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            {log?.action}
          </DialogTitle>
          <DialogDescription>
            {lang === "ms" ? "Butiran log audit" : "Audit log details"}
          </DialogDescription>
        </DialogHeader>

        {log && (
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label={lang === "ms" ? "Entiti" : "Entity"} value={log.entity} />
              <DetailRow
                label={lang === "ms" ? "ID Entiti" : "Entity ID"}
                value={log.entityId || "-"}
                mono
              />
              <DetailRow label={lang === "ms" ? "Pengguna" : "User"} value={log.user} />
              <DetailRow label={t("time")} value={formatDateTimeMY(log.timestamp)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {lang === "ms" ? "Sebelum" : "Before"}
                </p>
                <pre className="max-h-64 overflow-auto rounded-lg glass p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                  {before || (lang === "ms" ? "Tiada data" : "No data")}
                </pre>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {lang === "ms" ? "Selepas" : "After"}
                </p>
                <pre className="max-h-64 overflow-auto rounded-lg glass p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                  {after || (lang === "ms" ? "Tiada data" : "No data")}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" /> {t("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg glass p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm mt-0.5 truncate", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}
