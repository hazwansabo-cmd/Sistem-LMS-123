"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, StatCard, EmptyState,
  statusStyles, initials,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  QrCode, CalendarCheck, Clock, MapPin, Users, Plus,
  CalendarDays, Monitor, Building2, List, Upload, Download,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateMY } from "@/lib/lms/audit";
import { cn } from "@/lib/utils";

interface SessionTrainer { id: string; name: string }

interface SessionListItem {
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
  trainer: SessionTrainer | null;
  attendanceCount: number;
  myStatus: string | null;
}

interface SessionsResponse { sessions: SessionListItem[] }

type FilterKey = "all" | "upcoming" | "today" | "past" | "mine";

const FILTER_LABELS: Record<FilterKey, DictKey> = {
  all: "all",
  upcoming: "upcomingSessions",
  today: "todaySessions",
  past: "sessions",
  mine: "myStudents",
};

export function AttendanceView() {
  const { t } = useI18n();
  const role = useSession((s) => s.effectiveRole());
  const setView = useUI((s) => s.setView);
  const qc = useQueryClient();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [newOpen, setNewOpen] = useState(false);

  const canManage = role === "TRAINER" || role === "ADMIN" || role === "HR";
  const filters: FilterKey[] = canManage
    ? ["all", "upcoming", "today", "past", "mine"]
    : ["all", "upcoming", "today", "past"];

  const sessionsQuery = useQuery<SessionsResponse>({
    queryKey: ["sessions", filter],
    queryFn: async () => {
      const res = await fetch(`/api/sessions?filter=${filter}`);
      const data = await res.json();
      return data as SessionsResponse;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencipta sesi");
      return data;
    },
    onSuccess: () => {
      toast.success(t("sessionCode") + " - sesi dicipta");
      qc.invalidateQueries({ queryKey: ["sessions"] });
      setNewOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sessions = sessionsQuery.data?.sessions ?? [];
  const upcomingCount = sessions.filter((s) => new Date(s.date) >= new Date(new Date().toDateString())).length;
  const todayCount = sessions.filter((s) => {
    const today = new Date();
    const sd = new Date(s.date);
    return sd.getDate() === today.getDate() && sd.getMonth() === today.getMonth() && sd.getFullYear() === today.getFullYear();
  }).length;
  const totalAttendance = sessions.reduce((acc, s) => acc + s.attendanceCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("sessions")}
        subtitle={t("attendance")}
        icon={<QrCode className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            {role === "STAFF" && (
              <Button variant="outline" onClick={() => setView("my-attendance")} className="gap-1.5">
                <QrCode className="h-4 w-4" /> {t("scanQr")}
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setNewOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> {t("newSession")}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("sessions")}
          value={sessions.length}
          icon={<CalendarDays className="h-5 w-5" />}
          sub={`${upcomingCount} ${t("upcomingSessions").toLowerCase()}`}
        />
        <StatCard
          label={t("todaySessions")}
          value={todayCount}
          icon={<CalendarCheck className="h-5 w-5" />}
          accent="accent"
        />
        <StatCard
          label={t("present")}
          value={totalAttendance}
          icon={<Users className="h-5 w-5" />}
          accent="warn"
        />
      </div>

      <GlassCard className="p-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}
            >
              {t(FILTER_LABELS[f])}
            </button>
          ))}
        </div>
      </GlassCard>

      {sessionsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-6 w-6" />}
          title={t("noData")}
          hint={canManage ? t("newSession") : t("noSessions")}
          action={
            canManage ? (
              <Button onClick={() => setNewOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> {t("newSession")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              role={role}
              t={t}
              onQr={() => setView("session-qr", { sessionId: s.id })}
              onList={() => setView("attendance-list", { sessionId: s.id })}
              onBulk={() => setView("attendance-bulk", { sessionId: s.id })}
              onImport={() => setView("attendance-import", { sessionId: s.id })}
              onCheckIn={() => setView("my-attendance")}
              onExport={() => window.open(`/api/attendance/export?sessionId=${s.id}&format=csv`, "_blank")}
            />
          ))}
        </div>
      )}

      <NewSessionDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSubmit={(payload) => createMutation.mutate(payload)}
        submitting={createMutation.isPending}
        t={t}
      />
    </div>
  );
}

function SessionCard({
  session, role, t, onQr, onList, onBulk, onImport, onCheckIn, onExport,
}: {
  session: SessionListItem;
  role: string;
  t: (k: DictKey) => string;
  onQr: () => void;
  onList: () => void;
  onBulk: () => void;
  onImport: () => void;
  onCheckIn: () => void;
  onExport: () => void;
}) {
  const isOnline = session.mode === "dalam_talian";
  const myStatusStyle = session.myStatus ? statusStyles[session.myStatus] : null;
  const capacityPct = session.capacity > 0 ? Math.min(100, Math.round((session.attendanceCount / session.capacity) * 100)) : 0;

  return (
    <GlassCard className="flex flex-col p-5" hover>
      <div className="flex items-start justify-between gap-2 mb-2">
        {session.code ? (
          <Badge variant="outline" className="font-mono text-[11px]">{session.code}</Badge>
        ) : (
          <span className="text-[11px] text-muted-foreground">{t("sessions")}</span>
        )}
        <Badge variant="outline" className={cn("text-[10px]", isOnline ? "bg-sky-500/15 text-sky-600 border-sky-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30")}>
          {isOnline ? <Monitor className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
          {isOnline ? t("online") : t("faceToFace")}
        </Badge>
      </div>

      <h3 className="font-semibold text-base leading-snug line-clamp-2 min-h-[2.6rem]">
        {session.title}
      </h3>

      <div className="grid grid-cols-1 gap-y-1.5 gap-x-3 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
          <span>{formatDateMY(session.date)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{session.startTime} - {session.endTime}</span>
        </div>
        {!isOnline && session.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{session.location}</span>
          </div>
        )}
        {isOnline && session.url && (
          <div className="flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{session.url}</span>
          </div>
        )}
        {session.trainer && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{session.trainer.name}</span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
          <span>{session.attendanceCount} / {session.capacity}</span>
          <span>{capacityPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", capacityPct >= 100 ? "bg-rose-500" : capacityPct >= 75 ? "bg-amber-500" : "bg-emerald-500")}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      </div>

      {myStatusStyle && (
        <div className="mt-3">
          <Badge variant="outline" className={cn("text-[10px]", myStatusStyle.cls)}>
            {myStatusStyle.label}
          </Badge>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-border/30">
        {(role === "TRAINER" || role === "ADMIN" || role === "HR") ? (
          <>
            <Button size="sm" variant="default" onClick={onQr} className="gap-1">
              <QrCode className="h-3.5 w-3.5" /> {t("qrCode")}
            </Button>
            <Button size="sm" variant="outline" onClick={onList} className="gap-1">
              <List className="h-3.5 w-3.5" /> {t("sessions")}
            </Button>
            <Button size="sm" variant="outline" onClick={onBulk} className="gap-1">
              <Users className="h-3.5 w-3.5" /> {t("bulkEntry")}
            </Button>
            <Button size="sm" variant="outline" onClick={onImport} className="gap-1">
              <Upload className="h-3.5 w-3.5" /> {t("importCsv")}
            </Button>
            <Button size="sm" variant="ghost" onClick={onExport} className="gap-1">
              <Download className="h-3.5 w-3.5" /> {t("exportCsv")}
            </Button>
          </>
        ) : (
          <>
            {!myStatusStyle && (
              <Button size="sm" onClick={onCheckIn} className="gap-1">
                {t("checkIn")} <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
    </GlassCard>
  );
}

function NewSessionDialog({
  open, onOpenChange, onSubmit, submitting, t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  submitting: boolean;
  t: (k: DictKey) => string;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [mode, setMode] = useState("bersemuka");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("30");
  const [lateAfterMin, setLateAfterMin] = useState("15");

  const handleSubmit = () => {
    if (!title.trim() || !date) {
      toast.error("Tajuk dan tarikh diperlukan");
      return;
    }
    const payload: Record<string, unknown> = {
      title: title.trim(),
      date,
      startTime,
      endTime,
      mode,
      capacity: Number(capacity) || 30,
      lateAfterMin: Number(lateAfterMin) || 15,
    };
    if (mode === "bersemuka" && location.trim()) payload.location = location.trim();
    if (mode === "dalam_talian" && location.trim()) payload.url = location.trim();
    onSubmit(payload);
  };

  const reset = () => {
    setTitle("");
    setDate("");
    setStartTime("09:00");
    setEndTime("17:00");
    setMode("bersemuka");
    setLocation("");
    setCapacity("30");
    setLateAfterMin("15");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gradient">{t("newSession")}</DialogTitle>
          <DialogDescription>{t("sessions")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ns-title">{t("name")}</Label>
            <Input id="ns-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tajuk sesi latihan" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ns-date">{t("date")}</Label>
              <Input id="ns-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ns-mode">{t("mode")}</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="ns-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bersemuka">{t("faceToFace")}</SelectItem>
                  <SelectItem value="dalam_talian">{t("online")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ns-start">{t("time")} mula</Label>
              <Input id="ns-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ns-end">{t("time")} tamat</Label>
              <Input id="ns-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ns-loc">{mode === "dalam_talian" ? "URL" : t("location")}</Label>
            <Input
              id="ns-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={mode === "dalam_talian" ? "https://meet.example/xyz" : "Bilik Latihan A"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ns-cap">{t("capacity")}</Label>
              <Input id="ns-cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ns-late">Lewat (min)</Label>
              <Input id="ns-late" type="number" min={0} value={lateAfterMin} onChange={(e) => setLateAfterMin(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("loading") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
