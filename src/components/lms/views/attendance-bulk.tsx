"use client";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, EmptyState, initials,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Users, Save, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTimeMY } from "@/lib/lms/audit";
import { cn } from "@/lib/utils";

interface SessionDetail {
  id: string;
  title: string;
  code: string | null;
  date: string;
  startTime: string;
  endTime: string;
}

interface RosterEntry {
  id: string;
  staffNo: string;
  name: string;
  department: string | null;
  position: string | null;
  avatarColor: string;
  attendance: {
    id: string;
    status: string;
    method: string;
    checkInAt: string | null;
    remarks: string | null;
  } | null;
}

interface SessionDetailResponse {
  session: SessionDetail;
  roster: RosterEntry[];
}

const STATUS_OPTIONS: { value: string; key: DictKey }[] = [
  { value: "hadir", key: "present" },
  { value: "lewat", key: "late" },
  { value: "tidak_hadir", key: "absent" },
  { value: "cuti", key: "leave" },
  { value: "dikecualikan", key: "excused" },
];

interface EntryDraft {
  status: string;
  remarks: string;
}

const statusMap: Record<string, string> = {
  hadir: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  lewat: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  tidak_hadir: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  cuti: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  dikecualikan: "bg-slate-500/15 text-slate-600 border-slate-500/30",
};

function statusLabel(status: string, t: (k: DictKey) => string): string {
  const map: Record<string, DictKey> = {
    hadir: "present",
    lewat: "late",
    tidak_hadir: "absent",
    cuti: "leave",
    dikecualikan: "excused",
  };
  return t(map[status] || "status");
}

export function AttendanceBulkView() {
  const { t } = useI18n();
  const viewParams = useUI((s) => s.viewParams);
  const setView = useUI((s) => s.setView);
  const sessionId = viewParams.sessionId;

  const detailQuery = useQuery<SessionDetailResponse>({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sesi tidak dijumpai");
      return data as SessionDetailResponse;
    },
    enabled: !!sessionId,
  });

  if (!sessionId) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title={t("noData")}
        action={<Button onClick={() => setView("attendance")} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> {t("back")}</Button>}
      />
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title={detailQuery.error?.message || t("noData")}
        action={<Button onClick={() => setView("attendance")} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> {t("back")}</Button>}
      />
    );
  }

  const data = detailQuery.data;
  return (
    <BulkEditor
      key={data.session.id}
      sessionId={data.session.id}
      session={data.session}
      roster={data.roster}
    />
  );
}

function BulkEditor({
  sessionId, session, roster,
}: {
  sessionId: string;
  session: SessionDetail;
  roster: RosterEntry[];
}) {
  const { t } = useI18n();
  const setView = useUI((s) => s.setView);
  const qc = useQueryClient();

  const [draft, setDraft] = useState<Record<string, EntryDraft>>(() => {
    const initial: Record<string, EntryDraft> = {};
    for (const r of roster) {
      initial[r.id] = {
        status: r.attendance?.status || "hadir",
        remarks: r.attendance?.remarks || "",
      };
    }
    return initial;
  });

  const saveMutation = useMutation({
    mutationFn: async (entries: { userId: string; status: string; remarks?: string }[]) => {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      return data as { processed: number; created: number; updated: number };
    },
    onSuccess: (data) => {
      toast.success(`${t("save")}: ${data.created} dicipta, ${data.updated} dikemas kini`);
      qc.invalidateQueries({ queryKey: ["session", sessionId] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      setView("attendance-list", { sessionId });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const summary = useMemo(() => {
    const counts: Record<string, number> = { hadir: 0, lewat: 0, tidak_hadir: 0, cuti: 0, dikecualikan: 0 };
    for (const r of roster) {
      const d = draft[r.id];
      if (d) counts[d.status] = (counts[d.status] || 0) + 1;
    }
    return counts;
  }, [draft, roster]);

  const updateEntry = useCallback((userId: string, patch: Partial<EntryDraft>) => {
    setDraft((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], ...patch },
    }));
  }, []);

  const markAllPresent = () => {
    setDraft((prev) => {
      const next: Record<string, EntryDraft> = { ...prev };
      for (const r of roster) {
        next[r.id] = { ...next[r.id], status: "hadir" };
      }
      return next;
    });
    toast.success(t("markAllPresent"));
  };

  const handleSave = () => {
    const entries = roster.map((r) => {
      const d = draft[r.id];
      return {
        userId: r.id,
        status: d?.status || "hadir",
        remarks: d?.remarks?.trim() || undefined,
      };
    });
    saveMutation.mutate(entries);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("bulkEntry")}
        subtitle={`${session.title}${session.code ? " - " + session.code : ""}`}
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button variant="ghost" size="sm" onClick={() => setView("attendance-list", { sessionId })} className="gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("back")}
          </Button>
        }
      />

      <GlassCard className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((o) => {
              const count = summary[o.value] || 0;
              const sty = statusMap[o.value];
              return (
                <Badge key={o.value} variant="outline" className={cn("text-[11px]", sty)}>
                  {t(o.key)}: <span className="font-bold ml-1">{count}</span>
                </Badge>
              );
            })}
          </div>
          <Button variant="outline" size="sm" onClick={markAllPresent} className="gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="h-4 w-4" /> {t("markAllPresent")}
          </Button>
        </div>
      </GlassCard>

      {roster.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title={t("noData")} hint={t("sessions")} />
      ) : (
        <GlassCard className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-border/30">
            <h2 className="font-semibold text-sm">{roster.length} {t("staffNo").toLowerCase()}</h2>
          </div>
          <ScrollArea className="max-h-[60vh] w-full">
            <div className="divide-y divide-border/20">
              {roster.map((r) => {
                const d = draft[r.id];
                if (!d) return null;
                const sty = statusMap[d.status];
                return (
                  <div key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback
                          style={{ backgroundColor: r.avatarColor, color: "white" }}
                          className="text-[11px] font-semibold"
                        >
                          {initials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <Badge variant="outline" className={cn("text-[9px] shrink-0", sty)}>{statusLabel(d.status, t)}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          <span className="font-mono">{r.staffNo}</span>
                          {r.department && <span className="mx-1">·</span>}
                          {r.department}
                          {r.attendance?.checkInAt && (
                            <>
                              <span className="mx-1">·</span>
                              {formatDateTimeMY(r.attendance.checkInAt)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:w-[420px]">
                      <Select value={d.status} onValueChange={(v) => updateEntry(r.id, { status: v })}>
                        <SelectTrigger className="h-9 w-full sm:w-[160px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="text-xs">
                              {t(o.key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={d.remarks}
                        onChange={(e) => updateEntry(r.id, { remarks: e.target.value })}
                        placeholder={t("reason")}
                        className="h-9 text-xs flex-1"
                        aria-label={t("reason")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </GlassCard>
      )}

      <div className="sticky bottom-0 z-10">
        <GlassCard strong className="p-4">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setView("attendance-list", { sessionId })}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-1.5">
              {saveMutation.isPending ? (
                t("loading")
              ) : (
                <>
                  <Save className="h-4 w-4" /> {t("save")}
                </>
              )}
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
