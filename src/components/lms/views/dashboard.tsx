"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession, useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import { GlassCard, StatCard, PageHeader, roleStyles, statusStyles } from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from "recharts";
import {
  Users, BookOpen, CalendarCheck, Award, TrendingUp, Clock, GraduationCap,
  QrCode, FileBarChart, Bell, ChevronRight, CheckCircle2, AlertCircle,
} from "lucide-react";
import { formatDateMY } from "@/lib/lms/audit";

const CHART_HEX = ["#1d5b8a", "#2a9d8f", "#e9b44c", "#7b2cbf", "#c44569"];

export function DashboardView() {
  const { t, lang } = useI18n();
  const user = useSession((s) => s.user)!;
  const role = useSession((s) => s.effectiveRole());
  const setView = useUI((s) => s.setView);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", role, user.id],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      const d = await res.json();
      return d;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 rounded-lg bg-muted/40 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t("welcome")}, ${user.name.split(" ").slice(0, 2).join(" ")}`}
        subtitle={lang === "ms" ? `Anda log masuk sebagai ${roleStyles[role].label}` : `Signed in as ${roleStyles[role].label}`}
        icon={<TrendingUp className="h-5 w-5" />}
        actions={
          <Badge variant="outline" className={roleStyles[role].cls}>
            {roleStyles[role].label}
            {user.demoRole && user.demoRole !== user.role && <span className="ml-1 opacity-70">(demo)</span>}
          </Badge>
        }
      />

      {role === "STAFF" && <StaffDashboard data={data} setView={setView} t={t} lang={lang} />}
      {role === "TRAINER" && <TrainerDashboard data={data} setView={setView} t={t} lang={lang} />}
      {(role === "HR" || role === "ADMIN") && <ManagerDashboard data={data} setView={setView} t={t} lang={lang} role={role} />}
    </div>
  );
}

function StaffDashboard({ data, setView, t, lang }: any) {
  const s = data.stats;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("myCourses")} value={s.totalCourses} icon={<GraduationCap className="h-5 w-5" />} sub={`${s.inProgress} ${t("inProgress").toLowerCase()}`} />
        <StatCard label={t("completed")} value={s.completed} icon={<CheckCircle2 className="h-5 w-5" />} accent="accent" />
        <StatCard label={t("earnedCerts")} value={s.earnedCerts} icon={<Award className="h-5 w-5" />} accent="accent" />
        <StatCard label={t("upcomingSessions")} value={s.upcomingSessions} icon={<CalendarCheck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {t("inProgress")}</h3>
            <Button variant="ghost" size="sm" onClick={() => setView("my-courses")}>{t("view")} <ChevronRight className="ml-1 h-3 w-3" /></Button>
          </div>
          <div className="space-y-3">
            {data.inProgress?.length ? data.inProgress.slice(0, 5).map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl glass p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg glass text-primary font-bold text-xs">{c.code}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={c.progress} className="h-1.5" />
                    <span className="text-[11px] text-muted-foreground shrink-0">{c.progress}%</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setView("learning", { courseId: c.courseId })}>{t("continue")}</Button>
              </div>
            )) : <p className="text-sm text-muted-foreground py-6 text-center">{t("noData")}</p>}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> {t("upcomingSessions")}</h3>
            <Button variant="ghost" size="sm" onClick={() => setView("attendance")}>{t("view")}</Button>
          </div>
          <div className="space-y-3">
            {data.mySessions?.length ? data.mySessions.slice(0, 4).map((s: any) => (
              <div key={s.id} className="rounded-xl glass p-3">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {s.startTime}
                  {s.mode === "dalam_talian" ? <Badge variant="outline" className="text-[10px] py-0 px-1.5">{t("online")}</Badge> : <Badge variant="outline" className="text-[10px] py-0 px-1.5">{t("faceToFace")}</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{formatDateMY(s.date)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground py-6 text-center">{t("noData")}</p>}
          </div>
          <Button className="w-full mt-3" variant="outline" onClick={() => setView("my-attendance")}>
            <QrCode className="mr-2 h-4 w-4" /> {t("scanQr")} / {t("enterCode")}
          </Button>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> {t("attendance")}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.myAttendance?.length ? data.myAttendance.slice(0, 6).map((a: any) => {
            const st = statusStyles[a.status];
            return (
              <div key={a.id} className="rounded-xl glass p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{a.sessionTitle}</p>
                  <Badge variant="outline" className={st.cls + " text-[10px] py-0 px-1.5"}>{st.label}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{formatDateMY(a.date)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{lang === "ms" ? "Kaedah" : "Method"}: {a.method}</p>
              </div>
            );
          }) : <p className="text-sm text-muted-foreground col-span-full py-6 text-center">{t("noData")}</p>}
        </div>
      </GlassCard>
    </div>
  );
}

function TrainerDashboard({ data, setView, t, lang }: any) {
  const s = data.stats;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("myCourses")} value={s.myCourses} icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label={t("myStudents")} value={s.myStudents} icon={<Users className="h-5 w-5" />} accent="accent" />
        <StatCard label={t("todaySessions")} value={s.todaySessions} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label={t("pendingQuizzes")} value={s.pendingQuizzes} icon={<Clock className="h-5 w-5" />} accent="warn" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> {t("todaySessions")}</h3>
            <Button variant="ghost" size="sm" onClick={() => setView("attendance")}>{t("view")}</Button>
          </div>
          <div className="space-y-3">
            {data.mySessionsToday?.length ? data.mySessionsToday.map((s: any) => (
              <div key={s.id} className="rounded-xl glass p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">{s.startTime} • {s.attendanceCount} {lang === "ms" ? "hadir" : "attended"}</p>
                </div>
                <Button size="sm" onClick={() => setView("session-qr", { sessionId: s.id })}>
                  <QrCode className="mr-1 h-3.5 w-3.5" /> {t("qrCode")}
                </Button>
              </div>
            )) : <p className="text-sm text-muted-foreground py-6 text-center">{lang === "ms" ? "Tiada sesi hari ini" : "No sessions today"}</p>}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {t("myCourses")}</h3>
            <Button variant="ghost" size="sm" onClick={() => setView("courses")}>{t("view")}</Button>
          </div>
          <div className="space-y-3">
            {data.myCourses?.slice(0, 5).map((c: any) => (
              <div key={c.id} className="rounded-xl glass p-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg glass text-primary font-bold text-xs">{c.code}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{c.students} {lang === "ms" ? "pelajar" : "students"} • {c.sessions} {lang === "ms" ? "sesi" : "sessions"}</p>
                </div>
                <Badge variant="outline" className={statusStyles[c.status].cls + " text-[10px] py-0 px-1.5"}>{statusStyles[c.status].label}</Badge>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ManagerDashboard({ data, setView, t, lang, role }: any) {
  const s = data.stats;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalStaff")} value={s.totalStaff} icon={<Users className="h-5 w-5" />} />
        <StatCard label={t("totalCourses")} value={s.totalCourses} icon={<BookOpen className="h-5 w-5" />} accent="accent" />
        <StatCard label={t("completionRate")} value={`${s.completionRate}%`} icon={<CheckCircle2 className="h-5 w-5" />} accent="accent" sub={`${s.activeLearners} ${t("activeLearners").toLowerCase()}`} />
        <StatCard label={t("attendanceRate")} value={`${s.attendanceRate}%`} icon={<CalendarCheck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("avgScore")} value={`${s.avgScore}%`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label={t("totalSessions")} value={s.totalSessions} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label={t("todaySessions")} value={s.todaySessions} icon={<Clock className="h-5 w-5" />} accent="warn" />
        <StatCard label={t("earnedCerts")} value={s.totalCerts} icon={<Award className="h-5 w-5" />} accent="accent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><FileBarChart className="h-4 w-4 text-primary" /> {t("completionReport")} - {t("byDepartment")}</h3>
            <Button variant="ghost" size="sm" onClick={() => setView("reports")}>{t("reports")} <ChevronRight className="ml-1 h-3 w-3" /></Button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.completionByDept} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.03 245 / 0.9)", border: "1px solid oklch(0.5 0 0 / 0.2)", borderRadius: 12, color: "white", fontSize: 12 }} />
              <Bar dataKey="rate" name={t("completionRate")} radius={[6, 6, 0, 0]}>
                {data.completionByDept.map((_: any, i: number) => <Cell key={i} fill={CHART_HEX[i % CHART_HEX.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> {t("popularCourses")}</h3>
          <div className="space-y-2.5">
            {data.popularCourses?.map((c: any, i: number) => (
              <div key={c.code} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: `color-mix(in oklch, ${CHART_HEX[i % CHART_HEX.length]} 20%, transparent)`, color: CHART_HEX[i % CHART_HEX.length] }}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{c.code} - {c.title}</p>
                  <p className="text-[10px] text-muted-foreground">{c.count} {lang === "ms" ? "pendaftaran" : "enrollments"}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {role === "ADMIN" && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><FileBarChart className="h-4 w-4 text-primary" /> {t("auditLog")}</h3>
            <Button variant="ghost" size="sm" onClick={() => setView("audit-log")}>{t("view")} <ChevronRight className="ml-1 h-3 w-3" /></Button>
          </div>
          <div className="space-y-2">
            {data.recentAudit?.slice(0, 6).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg glass px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg glass text-primary"><Bell className="h-3.5 w-3.5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs"><span className="font-medium">{a.action}</span> • <span className="text-muted-foreground">{a.entity}</span></p>
                  <p className="text-[10px] text-muted-foreground">{a.user}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{formatDateMY(a.timestamp)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
