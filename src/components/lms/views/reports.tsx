"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import {
  GlassCard, PageHeader, StatCard, EmptyState, statusStyles, levelStyles,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { toast } from "sonner";
import { formatDateMY } from "@/lib/lms/audit";
import {
  FileBarChart, Download, Building2, CheckCircle2, Users, CalendarCheck,
  TrendingUp, AlertTriangle, FileSpreadsheet, BarChart3,
} from "lucide-react";

const CHART_HEX = ["#c44569", "#e9b44c", "#7b2cbf", "#2a9d8f", "#1d5b8a"];

interface Department {
  id: string;
  name: string;
  userCount: number;
}
interface DepartmentsResponse {
  departments: Department[];
  categories: unknown[];
}

interface CompletionRow {
  staffNo: string;
  name: string;
  department: string;
  courseCode: string;
  courseTitle: string;
  level: string;
  status: string;
  progressPct: number;
  completedAt: string;
  dueDate: string;
}
interface CompletionResponse {
  rows: CompletionRow[];
  total: number;
  completed: number;
}

interface AttendanceRow {
  staffNo: string;
  name: string;
  department: string;
  sessionTitle: string;
  courseCode: string;
  date: string;
  startTime: string;
  status: string;
  method: string;
  checkInAt: string;
  remarks: string;
}
interface AttendanceSummary {
  name: string;
  staffNo: string;
  department: string;
  total: number;
  hadir: number;
  lewat: number;
  tidakHadir: number;
  cuti: number;
  rate: number;
}
interface AttendanceResponse {
  rows: AttendanceRow[];
  summary: AttendanceSummary[];
  totalRecords: number;
  overallRate: number;
}

const TOOLTIP_STYLE = {
  background: "oklch(0.2 0.03 245 / 0.92)",
  border: "1px solid oklch(0.5 0 0 / 0.2)",
  borderRadius: 12,
  color: "white",
  fontSize: 12,
};

export function ReportsView() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<"completion" | "attendance">("completion");
  const [departmentId, setDepartmentId] = useState<string>("all");

  const deptQuery = useQuery<DepartmentsResponse>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to load departments");
      return (await res.json()) as DepartmentsResponse;
    },
  });

  const completionQuery = useQuery<CompletionResponse>({
    queryKey: ["reports", "completion", departmentId],
    queryFn: async () => {
      const url =
        "/api/reports/completion" +
        (departmentId !== "all" ? "?departmentId=" + departmentId : "");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load completion report");
      return (await res.json()) as CompletionResponse;
    },
    enabled: tab === "completion",
  });

  const attendanceQuery = useQuery<AttendanceResponse>({
    queryKey: ["reports", "attendance", departmentId],
    queryFn: async () => {
      const url =
        "/api/reports/attendance" +
        (departmentId !== "all" ? "?departmentId=" + departmentId : "");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load attendance report");
      return (await res.json()) as AttendanceResponse;
    },
    enabled: tab === "attendance",
  });

  const exportCompletionCsv = () => {
    const url =
      "/api/reports/completion?format=csv" +
      (departmentId !== "all" ? "&departmentId=" + departmentId : "");
    window.open(url, "_blank");
    toast.success(lang === "ms" ? "Mengeksport CSV..." : "Exporting CSV...");
  };

  const exportAttendanceCsv = () => {
    const url =
      "/api/reports/attendance?format=csv" +
      (departmentId !== "all" ? "&departmentId=" + departmentId : "");
    window.open(url, "_blank");
    toast.success(lang === "ms" ? "Mengeksport CSV..." : "Exporting CSV...");
  };

  const completionData = completionQuery.data;
  const completionRate =
    completionData && completionData.total > 0
      ? Math.round((completionData.completed / completionData.total) * 100)
      : 0;

  const attendanceData = attendanceQuery.data;
  const overallRate = attendanceData?.overallRate ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("reports")}
        subtitle={
          lang === "ms"
            ? "Analitik penyiapan & kehadiran latihan kakitangan"
            : "Staff training completion & attendance analytics"
        }
        icon={<FileBarChart className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-[180px] sm:w-[220px]" size="sm">
                <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder={t("byDepartment")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")} - {t("byDepartment")}</SelectItem>
                {deptQuery.data?.departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.userCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "completion" | "attendance")}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="completion" className="gap-1.5 flex-1 sm:flex-none">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("completionReport")}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5 flex-1 sm:flex-none">
            <CalendarCheck className="h-3.5 w-3.5" />
            {t("attendanceReport")}
          </TabsTrigger>
        </TabsList>

        {/* ============ COMPLETION TAB ============ */}
        <TabsContent value="completion" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label={lang === "ms" ? "Jumlah Pendaftaran" : "Total Enrollments"}
              value={completionQuery.isLoading ? <Skeleton className="h-8 w-16" /> : (completionData?.total ?? 0)}
              icon={<Users className="h-5 w-5" />}
              sub={lang === "ms" ? "rekod kemajuan" : "progress records"}
            />
            <StatCard
              label={t("completed")}
              value={completionQuery.isLoading ? <Skeleton className="h-8 w-16" /> : (completionData?.completed ?? 0)}
              icon={<CheckCircle2 className="h-5 w-5" />}
              accent="accent"
              sub={lang === "ms" ? "kursus disempurnakan" : "courses completed"}
            />
            <StatCard
              label={t("completionRate")}
              value={completionQuery.isLoading ? <Skeleton className="h-8 w-16" /> : `${completionRate}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              accent="primary"
              sub={lang === "ms" ? "kadar penyiapan keseluruhan" : "overall completion rate"}
            />
          </div>

          {/* Toolbar + table */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border/30">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t("completionReport")} - {t("byStaff")}
              </h3>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCompletionCsv}>
                <Download className="h-3.5 w-3.5" /> {t("exportCsv")}
              </Button>
            </div>

            {completionQuery.isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !completionData || completionData.rows.length === 0 ? (
              <EmptyState
                icon={<FileBarChart className="h-6 w-6" />}
                title={t("noData")}
                hint={lang === "ms" ? "Tiada rekod penyiapan dijumpai." : "No completion records found."}
              />
            ) : (
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                    <TableRow>
                      <TableHead className="min-w-[90px]">{t("staffNo")}</TableHead>
                      <TableHead className="min-w-[140px]">{t("name")}</TableHead>
                      <TableHead className="min-w-[120px]">{t("department")}</TableHead>
                      <TableHead className="min-w-[80px]">{t("courseCode")}</TableHead>
                      <TableHead className="min-w-[180px]">{lang === "ms" ? "Tajuk Kursus" : "Course Title"}</TableHead>
                      <TableHead className="min-w-[100px]">{t("level")}</TableHead>
                      <TableHead className="min-w-[110px]">{t("status")}</TableHead>
                      <TableHead className="min-w-[140px]">{t("progress")}</TableHead>
                      <TableHead className="min-w-[100px]">{t("completed")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completionData.rows.map((r, idx) => {
                      const st = statusStyles[r.status] || statusStyles.ENROLLED;
                      const lvl = levelStyles[r.level] || levelStyles.SEMUA;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{r.staffNo}</TableCell>
                          <TableCell className="font-medium text-sm">{r.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.department || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
                              {r.courseCode}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[260px] truncate" title={r.courseTitle}>
                            {r.courseTitle}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", lvl)}>
                              {r.level}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", st.cls)}>
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress value={r.progressPct} className="h-1.5 flex-1" />
                              <span className="text-[11px] font-medium tabular-nums shrink-0">{r.progressPct}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.completedAt ? formatDateMY(r.completedAt) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </GlassCard>
        </TabsContent>

        {/* ============ ATTENDANCE TAB ============ */}
        <TabsContent value="attendance" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label={lang === "ms" ? "Jumlah Rekod" : "Total Records"}
              value={attendanceQuery.isLoading ? <Skeleton className="h-8 w-16" /> : (attendanceData?.totalRecords ?? 0)}
              icon={<FileSpreadsheet className="h-5 w-5" />}
              sub={lang === "ms" ? "rekod kehadiran" : "attendance records"}
            />
            <StatCard
              label={lang === "ms" ? "Bilangan Staf" : "Unique Staff"}
              value={attendanceQuery.isLoading ? <Skeleton className="h-8 w-16" /> : (attendanceData?.summary.length ?? 0)}
              icon={<Users className="h-5 w-5" />}
              accent="accent"
              sub={lang === "ms" ? "staf dengan rekod" : "staff with records"}
            />
            <StatCard
              label={t("attendanceRate")}
              value={attendanceQuery.isLoading ? <Skeleton className="h-8 w-16" /> : `${overallRate}%`}
              icon={<CalendarCheck className="h-5 w-5" />}
              accent={overallRate >= 80 ? "accent" : overallRate >= 60 ? "warn" : "danger"}
              sub={lang === "ms" ? "kadar kehadiran keseluruhan" : "overall attendance rate"}
            />
          </div>

          {/* Chart - top 10 worst */}
          {attendanceData && attendanceData.summary.length > 0 && (
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {lang === "ms"
                    ? "10 Staf Kehadiran Terendah"
                    : "Bottom 10 Staff by Attendance"}
                </h3>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {t("attendanceRate")} %
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={attendanceData.summary.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={110}
                    tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 14) + "..." : v)}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "oklch(0.5 0 0 / 0.05)" }}
                    formatter={(value: number) => [`${value}%`, t("attendanceRate")]}
                  />
                  <Bar dataKey="rate" name={t("attendanceRate")} radius={[0, 6, 6, 0]}>
                    {attendanceData.summary.slice(0, 10).map((s, i) => (
                      <Cell
                        key={i}
                        fill={
                          s.rate >= 80 ? "#2a9d8f" : s.rate >= 60 ? "#e9b44c" : "#c44569"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          {/* Summary by staff table */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border/30">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {t("attendanceReport")} - {t("byStaff")}
              </h3>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={exportAttendanceCsv}>
                <Download className="h-3.5 w-3.5" /> {t("exportCsv")}
              </Button>
            </div>

            {attendanceQuery.isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !attendanceData || attendanceData.summary.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="h-6 w-6" />}
                title={t("noData")}
                hint={lang === "ms" ? "Tiada rekod kehadiran dijumpai." : "No attendance records found."}
              />
            ) : (
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                    <TableRow>
                      <TableHead className="min-w-[90px]">{t("staffNo")}</TableHead>
                      <TableHead className="min-w-[140px]">{t("name")}</TableHead>
                      <TableHead className="min-w-[110px]">{t("department")}</TableHead>
                      <TableHead className="text-center min-w-[60px]">{t("total")}</TableHead>
                      <TableHead className="text-center min-w-[60px]">{t("present")}</TableHead>
                      <TableHead className="text-center min-w-[60px]">{t("late")}</TableHead>
                      <TableHead className="text-center min-w-[60px]">{t("absent")}</TableHead>
                      <TableHead className="text-center min-w-[60px]">{t("leave")}</TableHead>
                      <TableHead className="min-w-[150px]">{t("attendanceRate")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceData.summary.map((s, idx) => {
                      const rateColor =
                        s.rate >= 80
                          ? "text-emerald-600"
                          : s.rate >= 60
                            ? "text-amber-500"
                            : "text-rose-500";
                      const rateBarColor =
                        s.rate >= 80
                          ? "bg-emerald-500"
                          : s.rate >= 60
                            ? "bg-amber-500"
                            : "bg-rose-500";
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{s.staffNo}</TableCell>
                          <TableCell className="font-medium text-sm">{s.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.department || "-"}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">{s.total}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums text-emerald-600">{s.hadir}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums text-amber-500">{s.lewat}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums text-rose-500">{s.tidakHadir}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums text-sky-500">{s.cuti}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[130px]">
                              <div className="relative h-2 flex-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn("absolute inset-y-0 left-0 rounded-full", rateBarColor)}
                                  style={{ width: `${s.rate}%` }}
                                />
                              </div>
                              <span className={cn("text-xs font-bold tabular-nums shrink-0", rateColor)}>
                                {s.rate}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </GlassCard>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {lang === "ms" ? "Baik (>=80%)" : "Good (>=80%)"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> {lang === "ms" ? "Sederhana (60-79%)" : "Moderate (60-79%)"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> {lang === "ms" ? "Rendah (<60%)" : "Low (<60%)"}
            </span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
