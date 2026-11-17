"use client";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Users, CheckCircle2, Clock, XCircle, CalendarOff,
  ShieldCheck, Download, ListChecks, QrCode, AlertTriangle,
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
  mode: string;
  location: string | null;
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
  attendanceCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  leaveCount: number;
  excusedCount: number;
}

const STATUS_OPTIONS: { value: string; key: DictKey }[] = [
  { value: "hadir", key: "present" },
  { value: "lewat", key: "late" },
  { value: "tidak_hadir", key: "absent" },
  { value: "cuti", key: "leave" },
  { value: "dikecualikan", key: "excused" },
];

export function AttendanceListView() {
  const { t } = useI18n();
  const role = useSession((s) => s.effectiveRole());
  const viewParams = useUI((s) => s.viewParams);
  const setView = useUI((s) => s.setView);
  const qc = useQueryClient();
  const sessionId = viewParams.sessionId;

  const canManage = role === "TRAINER" || role === "ADMIN" || role === "HR";

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

  const updateMutation = useMutation({
    mutationFn: async (entries: { userId: string; status: string; remarks?: string }[]) => {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengemas kini");
      return data;
    },
    onSuccess: () => {
      toast.success(t("save") + " - " + t("status"));
      qc.invalidateQueries({ queryKey: ["session", sessionId] });
    },
    onError: (err: Error) => toast.error(err.message),
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
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
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
  const session = data.session;
  const roster = data.roster;
  const totalRoster = roster.length;
  const recordedCount = roster.filter((r) => r.attendance).length;
  const ratePct = totalRoster > 0 ? Math.round((data.presentCount + data.lateCount) / totalRoster * 100) : 0;

  const onStatusChange = (userId: string, status: string, remarks?: string) => {
    updateMutation.mutate([{ userId, status, remarks }]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={session.title}
        subtitle={`${session.code ? session.code + " - " : ""}${formatDateTimeMY(session.date)} | ${session.startTime} - ${session.endTime}`}
        icon={<ListChecks className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            {canManage && (
              <>
                <Button variant="outline" size="sm" onClick={() => setView("session-qr", { sessionId })} className="gap-1">
                  <QrCode className="h-3.5 w-3.5" /> {t("qrCode")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setView("attendance-bulk", { sessionId })} className="gap-1">
                  <Users className="h-3.5 w-3.5" /> {t("bulkEntry")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => window.open(`/api/attendance/export?sessionId=${sessionId}&format=csv`, "_blank")} className="gap-1">
                  <Download className="h-3.5 w-3.5" /> {t("exportCsv")}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => setView("attendance")} className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> {t("back")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("total")} value={totalRoster} icon={<Users className="h-5 w-5" />} sub={`${recordedCount}/${totalRoster}`} />
        <StatCard label={t("present")} value={data.presentCount} icon={<CheckCircle2 className="h-5 w-5" />} accent="accent" />
        <StatCard label={t("late")} value={data.lateCount} icon={<Clock className="h-5 w-5" />} accent="warn" />
        <StatCard label={t("absent")} value={data.absentCount} icon={<XCircle className="h-5 w-5" />} accent="danger" />
        <StatCard label={t("leave")} value={data.leaveCount} icon={<CalendarOff className="h-5 w-5" />} />
        <StatCard label={t("excused")} value={data.excusedCount} icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">{t("attendanceRate")}</p>
          <span className="text-sm font-bold text-gradient">{ratePct}%</span>
        </div>
        <Progress value={ratePct} className="h-2.5" />
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-base">{t("sessions")} - {roster.length}</h2>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setView("attendance-bulk", { sessionId })} className="gap-1">
              <Users className="h-3.5 w-3.5" /> {t("bulkEntry")}
            </Button>
          )}
        </div>

        {roster.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title={t("noData")} hint={t("sessions")} />
        ) : (
          <ScrollArea className="max-h-[600px] w-full">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">{t("staffNo")}</TableHead>
                    <TableHead className="min-w-[180px]">{t("name")}</TableHead>
                    <TableHead className="min-w-[120px] hidden sm:table-cell">{t("department")}</TableHead>
                    <TableHead className="min-w-[160px]">{t("status")}</TableHead>
                    <TableHead className="min-w-[140px] hidden md:table-cell">{t("time")}</TableHead>
                    <TableHead className="min-w-[160px] hidden lg:table-cell">{t("reason")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((r) => {
                    const sty = r.attendance?.status ? statusStyles[r.attendance.status] : null;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.staffNo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback
                                style={{ backgroundColor: r.avatarColor, color: "white" }}
                                className="text-[10px] font-semibold"
                              >
                                {initials(r.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{r.name}</p>
                              {r.position && <p className="text-[10px] text-muted-foreground truncate">{r.position}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{r.department || "-"}</TableCell>
                        <TableCell>
                          {canManage ? (
                            <Select
                              value={r.attendance?.status || ""}
                              onValueChange={(v) => onStatusChange(r.id, v, r.attendance?.remarks || undefined)}
                              disabled={updateMutation.isPending}
                            >
                              <SelectTrigger className="h-8 w-full min-w-[140px] text-xs">
                                <SelectValue placeholder={t("status")} />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value} className="text-xs">
                                    {t(o.key)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : sty ? (
                            <Badge variant="outline" className={cn("text-[10px]", sty.cls)}>{sty.label}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-slate-500/15 text-slate-600 border-slate-500/30">-</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell">
                          {r.attendance?.checkInAt ? formatDateTimeMY(r.attendance.checkInAt) : "-"}
                          {r.attendance?.method && (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">{r.attendance.method}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                          {r.attendance?.remarks || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        )}
      </GlassCard>
    </div>
  );
}
