"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, EmptyState, statusStyles,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  QrCode, CalendarCheck, Clock, MapPin, Monitor, Building2,
  History, LogIn, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateMY, formatDateTimeMY } from "@/lib/lms/audit";
import { cn } from "@/lib/utils";

interface SessionListItem {
  id: string;
  title: string;
  code: string | null;
  date: string;
  startTime: string;
  endTime: string;
  mode: string;
  location: string | null;
  url: string | null;
  sessionCode: string;
  trainer: { id: string; name: string } | null;
  myStatus: string | null;
}

interface SessionsResponse { sessions: SessionListItem[] }

interface CheckInResponse {
  ok: boolean;
  alreadyCheckedIn?: boolean;
  attendance?: { id: string; status: string; method: string; checkInAt: string | null };
  session?: { id: string; title: string; code: string | null; startTime: string; mode: string; location: string | null; url: string | null };
  message?: string;
}

export function MyAttendanceView() {
  const { t } = useI18n();
  const setView = useUI((s) => s.setView);
  const qc = useQueryClient();
  const [code, setCode] = useState("");

  const upcomingQuery = useQuery<SessionsResponse>({
    queryKey: ["sessions", "upcoming"],
    queryFn: async () => {
      const res = await fetch("/api/sessions?filter=upcoming");
      return (await res.json()) as SessionsResponse;
    },
  });

  const pastQuery = useQuery<SessionsResponse>({
    queryKey: ["sessions", "past"],
    queryFn: async () => {
      const res = await fetch("/api/sessions?filter=past");
      return (await res.json()) as SessionsResponse;
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (payload: { code?: string; qrToken?: string }) => {
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as CheckInResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal daftar masuk");
      return data;
    },
    onSuccess: (data) => {
      if (data.alreadyCheckedIn) {
        toast.info(t("alreadyCheckedIn"));
      } else {
        const statusLabel = data.attendance?.status ? statusStyles[data.attendance.status]?.label : t("checkInSuccess");
        toast.success(`${t("checkInSuccess")} - ${statusLabel}`);
      }
      setCode("");
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCheckIn = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Masukkan kod sesi");
      return;
    }
    checkinMutation.mutate({ code: trimmed });
  };

  const upcomingSessions = (upcomingQuery.data?.sessions ?? []).slice(0, 8);
  const historySessions = (pastQuery.data?.sessions ?? []).filter((s) => s.myStatus).slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("scanQr")}
        subtitle={t("checkIn")}
        icon={<QrCode className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => setView("attendance")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> {t("back")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard strong className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl glass text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">{t("enterCode")}</h2>
              <p className="text-xs text-muted-foreground">6-digit {t("sessionCode").toLowerCase()}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="code-input">{t("sessionCode")}</Label>
              <Input
                id="code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                onKeyDown={(e) => { if (e.key === "Enter") handleCheckIn(); }}
                placeholder="000000"
                inputMode="numeric"
                className="text-center text-2xl font-mono tracking-[0.4em] h-14"
                aria-label={t("sessionCode")}
              />
            </div>
            <Button onClick={handleCheckIn} disabled={checkinMutation.isPending} className="w-full gap-2 h-11">
              {checkinMutation.isPending ? (
                t("loading")
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> {t("checkIn")}
                </>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Petunjuk: Anda juga boleh imbas kod QR menggunakan kamera telefon anda. Sistem akan automatik daftarkan kehadiran.
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl glass text-primary">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">{t("upcomingSessions")}</h2>
              <p className="text-xs text-muted-foreground">{t("sessions")}</p>
            </div>
          </div>
          {upcomingQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : upcomingSessions.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck className="h-6 w-6" />}
              title={t("noSessions")}
              hint={t("upcomingSessions")}
            />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {upcomingSessions.map((s) => (
                <UpcomingRow key={s.id} session={s} t={t} />
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl glass text-primary">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-base">Sejarah Kehadiran</h2>
            <p className="text-xs text-muted-foreground">{t("auditTrail")}</p>
          </div>
        </div>
        {pastQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : historySessions.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title={t("noData")}
            hint="Belum ada rekod kehadiran."
          />
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {historySessions.map((s) => {
              const sty = s.myStatus ? statusStyles[s.myStatus] : null;
              const isOnline = s.mode === "dalam_talian";
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-lg glass p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <CalendarCheck className="h-3 w-3" /> {formatDateMY(s.date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {s.startTime}
                      </span>
                      {isOnline ? (
                        s.url && <span className="inline-flex items-center gap-1 truncate max-w-[140px]"><Monitor className="h-3 w-3" /> {s.url}</span>
                      ) : (
                        s.location && <span className="inline-flex items-center gap-1 truncate max-w-[140px]"><MapPin className="h-3 w-3" /> {s.location}</span>
                      )}
                    </div>
                  </div>
                  {sty && (
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", sty.cls)}>
                      {sty.label}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function UpcomingRow({ session, t }: { session: SessionListItem; t: (k: DictKey) => string }) {
  const sty = session.myStatus ? statusStyles[session.myStatus] : null;
  const isOnline = session.mode === "dalam_talian";
  return (
    <div className="flex items-center gap-3 rounded-lg glass p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{session.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1">
            <CalendarCheck className="h-3 w-3" /> {formatDateMY(session.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {session.startTime} - {session.endTime}
          </span>
          <span className="inline-flex items-center gap-1">
            {isOnline ? <Monitor className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
            {isOnline ? t("online") : t("faceToFace")}
          </span>
        </div>
      </div>
      {sty ? (
        <Badge variant="outline" className={cn("text-[10px] shrink-0", sty.cls)}>
          {sty.label}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] shrink-0 bg-slate-500/15 text-slate-600 border-slate-500/30">
          {t("checkIn")}
        </Badge>
      )}
    </div>
  );
}
