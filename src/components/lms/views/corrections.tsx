"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, EmptyState, StatCard,
  statusStyles, initials,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardList, CheckCircle2, XCircle, ArrowRight, Clock,
  Building2, FileText, AlertTriangle, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateMY, formatDateTimeMY } from "@/lib/lms/audit";
import { cn } from "@/lib/utils";

interface CorrectionItem {
  id: string;
  oldStatus: string;
  newStatus: string;
  reason: string;
  state: string;
  createdAt: string;
  requester: string;
  staffNo: string;
  staffName: string;
  sessionTitle: string;
  sessionCode: string;
  sessionDate: string;
  courseCode: string | null;
}

interface CorrectionsResponse { corrections: CorrectionItem[] }

export function CorrectionsView() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [pending, setPending] = useState<{ id: string; action: "approve" | "reject" } | null>(null);

  const listQuery = useQuery<CorrectionsResponse>({
    queryKey: ["corrections"],
    queryFn: async () => {
      const res = await fetch("/api/corrections");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tiada kebenaran");
      return data as CorrectionsResponse;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const res = await fetch(`/api/corrections/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses");
      return data as { ok: boolean; state: string };
    },
    onSuccess: (data, vars) => {
      toast.success(vars.action === "approve" ? t("approve") : t("reject"));
      qc.invalidateQueries({ queryKey: ["corrections"] });
      setPending(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const corrections = listQuery.data?.corrections ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("corrections")}
        subtitle={t("auditTrail")}
        icon={<ClipboardList className="h-5 w-5" />}
      />

      {listQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : listQuery.error ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title={listQuery.error.message}
          hint="HR / Admin sahaja boleh meluluskan pembetulan."
        />
      ) : corrections.length === 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t("corrections")} value={0} icon={<ClipboardList className="h-5 w-5" />} sub="Menunggu" />
            <StatCard label={t("approve")} value={0} icon={<CheckCircle2 className="h-5 w-5" />} accent="accent" />
            <StatCard label={t("reject")} value={0} icon={<XCircle className="h-5 w-5" />} accent="danger" />
          </div>
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="Tiada pembetulan menunggu kelulusan"
            hint="Semua permintaan pembetulan kehadiran telah diselesaikan."
          />
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Menunggu" value={corrections.length} icon={<ClipboardList className="h-5 w-5" />} sub={t("corrections")} accent="warn" />
            <StatCard label={t("approve")} value={0} icon={<CheckCircle2 className="h-5 w-5" />} accent="accent" />
            <StatCard label={t("reject")} value={0} icon={<XCircle className="h-5 w-5" />} accent="danger" />
          </div>

          <ScrollArea className="max-h-[calc(100vh-280px)] w-full">
            <div className="grid gap-4 sm:grid-cols-2">
              {corrections.map((c) => (
                <CorrectionCard
                  key={c.id}
                  correction={c}
                  t={t}
                  onApprove={() => setPending({ id: c.id, action: "approve" })}
                  onReject={() => setPending({ id: c.id, action: "reject" })}
                  disabled={actionMutation.isPending}
                />
              ))}
            </div>
          </ScrollArea>
        </>
      )}

      <AlertDialog open={!!pending} onOpenChange={(v) => { if (!v) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.action === "approve" ? t("approve") : t("reject")} {t("corrections")}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.action === "approve"
                ? "Status kehadiran akan dikemas kini kepada nilai baharu yang diminta."
                : "Permintaan pembetulan akan ditolak. Status kehadiran kekal tidak berubah."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pending && actionMutation.mutate(pending)}
              disabled={actionMutation.isPending}
              className={cn(
                pending?.action === "approve"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              )}
            >
              {actionMutation.isPending ? t("loading") : pending?.action === "approve" ? t("approve") : t("reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CorrectionCard({
  correction, t, onApprove, onReject, disabled,
}: {
  correction: CorrectionItem;
  t: (k: DictKey) => string;
  onApprove: () => void;
  onReject: () => void;
  disabled: boolean;
}) {
  const oldSty = statusStyles[correction.oldStatus];
  const newSty = statusStyles[correction.newStatus];

  return (
    <GlassCard className="p-5" hover>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-9 w-9 shrink-0 border border-border/40">
            <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
              {initials(correction.staffName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{correction.staffName}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{correction.staffNo}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30 shrink-0">
          {t("status")} - {correction.state}
        </Badge>
      </div>

      <div className="rounded-lg glass p-3 mb-3">
        <p className="text-xs font-medium text-foreground/90 line-clamp-2">{correction.sessionTitle}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
          <span className="font-mono">{correction.sessionCode}</span>
          {correction.courseCode && (
            <>
              <span>·</span>
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">{correction.courseCode}</Badge>
            </>
          )}
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatDateMY(correction.sessionDate)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {oldSty && (
          <Badge variant="outline" className={cn("text-[10px]", oldSty.cls)}>
            {oldSty.label}
          </Badge>
        )}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        {newSty && (
          <Badge variant="outline" className={cn("text-[10px]", newSty.cls)}>
            {newSty.label}
          </Badge>
        )}
      </div>

      <div className="rounded-lg bg-muted/30 p-3 mb-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
          <FileText className="h-3 w-3" /> {t("reason")}
        </p>
        <p className="text-xs text-foreground/90 whitespace-pre-wrap">{correction.reason}</p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/30">
        <div className="text-[11px] text-muted-foreground min-w-0">
          <p className="truncate">Diminta oleh: <span className="font-medium text-foreground/80">{correction.requester}</span></p>
          <p>{formatDateTimeMY(correction.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={onReject} disabled={disabled} className="gap-1 text-rose-600 border-rose-500/30 hover:bg-rose-500/10">
            <XCircle className="h-3.5 w-3.5" /> {t("reject")}
          </Button>
          <Button size="sm" onClick={onApprove} disabled={disabled} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t("approve")}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
