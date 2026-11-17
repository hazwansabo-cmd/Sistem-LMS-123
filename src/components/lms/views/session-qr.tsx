"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import { GlassCard, EmptyState, StatCard } from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  QrCode, Clock, MapPin, Monitor, Building2, Users, List,
  Copy, Check, Download, ArrowLeft, CalendarCheck, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateMY, formatDateTimeMY } from "@/lib/lms/audit";
import { cn } from "@/lib/utils";

interface SessionDetail {
  id: string;
  title: string;
  code: string | null;
  courseId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  mode: string;
  location: string | null;
  url: string | null;
  capacity: number;
  sessionCode: string;
  qrToken: string;
  codeExpiry: string;
  lateAfterMin: number;
  trainer: { id: string; name: string } | null;
}

interface SessionDetailResponse {
  session: SessionDetail;
  roster: unknown[];
  attendanceCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  leaveCount: number;
  excusedCount: number;
}

export function SessionQrView() {
  const { t } = useI18n();
  const viewParams = useUI((s) => s.viewParams);
  const setView = useUI((s) => s.setView);
  const sessionId = viewParams.sessionId;
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<string>("");

  const detailQuery = useQuery<SessionDetailResponse>({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sesi tidak dijumpai");
      return data as SessionDetailResponse;
    },
    enabled: !!sessionId,
    refetchInterval: 15000,
  });

  const session = detailQuery.data?.session;
  const expiry = session ? new Date(session.codeExpiry) : null;

  useEffect(() => {
    if (!expiry) return;
    const tick = () => {
      const now = new Date();
      const diff = expiry.getTime() - now.getTime();
      if (diff <= 0) {
        setRemaining(t("codeExpired"));
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}m ${String(secs).padStart(2, "0")}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiry, t]);

  if (!sessionId) {
    return (
      <EmptyState
        icon={<QrCode className="h-6 w-6" />}
        title={t("noData")}
        action={<Button onClick={() => setView("attendance")} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> {t("back")}</Button>}
      />
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-[600px] rounded-2xl" />
      </div>
    );
  }

  if (detailQuery.error || !session) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title={detailQuery.error?.message || t("noData")}
        action={<Button onClick={() => setView("attendance")} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> {t("back")}</Button>}
      />
    );
  }

  const isOnline = session.mode === "dalam_talian";
  const qrSrc = `/api/qrcode?text=${encodeURIComponent(session.qrToken)}&size=480`;
  const expired = remaining === t("codeExpired");

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.sessionCode);
      setCopied(true);
      toast.success(t("sessionCode") + " disalin");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin kod");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => setView("attendance")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setView("attendance-list", { sessionId })} className="gap-1">
            <List className="h-3.5 w-3.5" /> {t("sessions")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView("attendance-bulk", { sessionId })} className="gap-1">
            <Users className="h-3.5 w-3.5" /> {t("bulkEntry")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.open(`/api/attendance/export?sessionId=${sessionId}&format=csv`, "_blank")} className="gap-1">
            <Download className="h-3.5 w-3.5" /> {t("exportCsv")}
          </Button>
        </div>
      </div>

      <GlassCard strong className="p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-4 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
              {session.code && (
                <Badge variant="outline" className="font-mono text-sm px-3 py-1">{session.code}</Badge>
              )}
              <Badge variant="outline" className={cn("text-xs", isOnline ? "bg-sky-500/15 text-sky-600 border-sky-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30")}>
                {isOnline ? <Monitor className="h-3.5 w-3.5 mr-1" /> : <Building2 className="h-3.5 w-3.5 mr-1" />}
                {isOnline ? t("online") : t("faceToFace")}
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gradient leading-tight">
              {session.title}
            </h1>
            <div className="grid gap-2 text-sm text-muted-foreground sm:text-base">
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <CalendarCheck className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium text-foreground">{formatDateMY(session.date)}</span>
              </div>
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                <span>{session.startTime} - {session.endTime}</span>
              </div>
              {!isOnline && session.location && (
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span>{session.location}</span>
                </div>
              )}
              {isOnline && session.url && (
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <Monitor className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate max-w-xs">{session.url}</span>
                </div>
              )}
              {session.trainer && (
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <Users className="h-4 w-4 shrink-0 text-primary" />
                  <span>{session.trainer.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-white p-4 shadow-xl">
              <img src={qrSrc} alt="QR Code" width={360} height={360} className="h-[240px] w-[240px] sm:h-[320px] sm:w-[320px] lg:h-[360px] lg:w-[360px]" />
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Imbas kod QR ini dengan kamera telefon untuk daftar masuk secara automatik.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/30">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("sessionCode")}</p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-4xl sm:text-5xl font-bold tracking-[0.3em] text-gradient">
                {session.sessionCode}
              </span>
              <Button size="icon" variant="outline" onClick={copyCode} aria-label="Salin kod">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", expired ? "bg-rose-500/15 text-rose-600" : "bg-amber-500/15 text-amber-600")}>
              <Clock className="h-3 w-3" />
              {expired ? t("codeExpired") : `${t("codeExpired")}: ${remaining}`}
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("present")}
          value={detailQuery.data?.presentCount ?? 0}
          icon={<Users className="h-5 w-5" />}
          sub={`${detailQuery.data?.attendanceCount ?? 0} ${t("total").toLowerCase()}`}
        />
        <StatCard
          label={t("late")}
          value={detailQuery.data?.lateCount ?? 0}
          icon={<Clock className="h-5 w-5" />}
          accent="warn"
        />
        <StatCard
          label={t("absent")}
          value={(detailQuery.data?.absentCount ?? 0) + (detailQuery.data?.leaveCount ?? 0) + (detailQuery.data?.excusedCount ?? 0)}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="danger"
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("auditTrail")} - {formatDateTimeMY(session.date)} | {session.startTime} - {session.endTime}
      </p>
    </div>
  );
}
