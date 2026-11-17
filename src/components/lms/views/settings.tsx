"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import {
  GlassCard, PageHeader, StatCard,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings, Building2, Palette, Languages, Database, ShieldAlert,
  Info, Sun, Moon, RefreshCw, Loader2, Globe, Clock,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DashboardData {
  stats: {
    totalStaff?: number;
    totalCourses?: number;
    totalSessions?: number;
    attendanceRate?: number;
    completionRate?: number;
    activeLearners?: number;
    totalCerts?: number;
  };
}

export function SettingsView() {
  const { t, lang } = useI18n();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const [resetting, setResetting] = useState(false);

  const dashboardQuery = useQuery<DashboardData>({
    queryKey: ["dashboard", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      return data as DashboardData;
    },
  });

  const stats = dashboardQuery.data?.stats;

  const resetMutation = useMutation({
    mutationFn: async () => {
      setResetting(true);
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      return data;
    },
    onSuccess: (data: { message?: string }) => {
      toast.success(data.message || (lang === "ms"
        ? "Data dummy telah dikosongkan dan disemai semula."
        : "Dummy data has been wiped and reseeded."));
      qc.clear();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setResetting(false),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings")}
        subtitle={lang === "ms"
          ? "Tetapan sistem dan organisasi"
          : "System and organisation settings"}
        icon={<Settings className="h-5 w-5" />}
      />

      {/* Organisation */}
      <GlassCard className="p-5">
        <SectionHeader
          icon={<Building2 className="h-4 w-4" />}
          title={lang === "ms" ? "Organisasi" : "Organisation"}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoRow label={lang === "ms" ? "Nama" : "Name"} value="Al Amin Edu Oasis" />
          <InfoRow label={lang === "ms" ? "Sistem" : "System"} value={t("brandSub")} />
          <InfoRow label={lang === "ms" ? "Negara" : "Country"} value="Malaysia" />
          <InfoRow
            label={lang === "ms" ? "Zon Waktu" : "Timezone"}
            value="Asia/Kuala_Lumpur (UTC+8)"
            icon={<Clock className="h-3.5 w-3.5" />}
          />
        </div>
      </GlassCard>

      {/* Theme & Language */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <SectionHeader
            icon={<Palette className="h-4 w-4" />}
            title={lang === "ms" ? "Tema" : "Theme"}
          />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg glass p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg glass">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{theme === "dark" ? t("darkMode") : t("lightMode")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "ms" ? "Tukar antara mod cerah / gelap" : "Toggle light / dark mode"}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                aria-label={lang === "ms" ? "Tukar tema" : "Toggle theme"}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4" /> {t("lightMode")}
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" /> {t("darkMode")}
              </Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader
            icon={<Languages className="h-4 w-4" />}
            title={t("language")}
          />
          <div className="mt-4 space-y-3">
            <div className="rounded-lg glass p-3">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {lang === "ms" ? "Bahasa Melayu / English" : "Malay / English"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "ms"
                      ? "Bahasa boleh ditukar di bahagian Profil pengguna"
                      : "Language can be changed from the user Profile section"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={lang === "ms" ? "default" : "outline"} size="sm" className="flex-1" disabled>
                {t("langMs")}
              </Button>
              <Button variant={lang === "en" ? "default" : "outline"} size="sm" className="flex-1" disabled>
                {t("langEn")}
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Dummy data */}
      <GlassCard className="p-5">
        <SectionHeader
          icon={<Database className="h-4 w-4" />}
          title={lang === "ms" ? "Data Dummy" : "Dummy Data"}
        />

        {dashboardQuery.isLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("totalStaff")} value={stats?.totalStaff ?? 0} icon={<Database className="h-5 w-5" />} />
            <StatCard label={t("totalCourses")} value={stats?.totalCourses ?? 0} icon={<Database className="h-5 w-5" />} accent="accent" />
            <StatCard label={t("totalSessions")} value={stats?.totalSessions ?? 0} icon={<Database className="h-5 w-5" />} />
            <StatCard
              label={lang === "ms" ? "Kadar Kehadiran" : "Attendance Rate"}
              value={`${stats?.attendanceRate ?? 0}%`}
              icon={<Database className="h-5 w-5" />}
              accent="warn"
            />
          </div>
        )}

        <Separator className="my-4" />

        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-600">
                {lang === "ms" ? "Amaran: Tindakan ini memadam semua data" : "Warning: This action wipes all data"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === "ms"
                  ? "Semua pengguna, kursus, sesi, kehadiran, sijil dan log audit akan dikosongkan dan disemai semula dengan data contoh. Tindakan ini tidak boleh dibuat asal."
                  : "All users, courses, sessions, attendance, certificates and audit logs will be wiped and reseeded with sample data. This action cannot be undone."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-1.5" disabled={resetting}>
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {t("resetDummyData")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-strong border-border/40">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gradient">
                  {t("resetConfirm")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {lang === "ms"
                    ? "Operasi ini mengambil beberapa saat. Jangan tutup tetingkap sehingga selesai."
                    : "This operation takes a few seconds. Do not close the window until it completes."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={resetting}>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate()}
                  disabled={resetting}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-1.5" disabled={resetting}>
                <RefreshCw className="h-4 w-4" /> {t("reseedData")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-strong border-border/40">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gradient">
                  {t("reseedData")}?
                </AlertDialogTitle>
                <AlertDialogDescription>{t("resetConfirm")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={resetting}>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate()}
                  disabled={resetting}
                >
                  {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {resetting && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {lang === "ms" ? "Menyemai semula..." : "Reseeding..."}
            </span>
          )}
        </div>
      </GlassCard>

      {/* PDPA & Privacy */}
      <GlassCard className="p-5">
        <SectionHeader
          icon={<ShieldAlert className="h-4 w-4" />}
          title={lang === "ms" ? "PDPA / Privasi" : "PDPA / Privacy"}
        />
        <div className="mt-4 space-y-3">
          <div className="rounded-lg glass p-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{t("pdpaNotice")}</Badge>
              <span className="text-xs text-muted-foreground">
                {lang === "ms" ? "Akta Perlindungan Data Peribadi 2010" : "Personal Data Protection Act 2010"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {lang === "ms"
                ? "Sistem ini mematuhi PDPA 2010. Data peribadi kakitangan hanya digunakan untuk tujuan latihan dan pembangunan profesional. Data demo akan dipadam selepas tempoh penilaian."
                : "This system complies with PDPA 2010. Staff personal data is used only for training and professional development. Demo data will be deleted after the evaluation period."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow
              label={lang === "ms" ? "Tempoh Simpan" : "Retention"}
              value={lang === "ms" ? "90 hari (demo)" : "90 days (demo)"}
            />
            <InfoRow
              label={lang === "ms" ? "Lokasi Pelayan" : "Server Location"}
              value="Malaysia"
            />
          </div>
        </div>
      </GlassCard>

      {/* About */}
      <GlassCard className="p-5">
        <SectionHeader
          icon={<Info className="h-4 w-4" />}
          title={lang === "ms" ? "Mengenai" : "About"}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoRow label={lang === "ms" ? "Versi" : "Version"} value="1.0.0" />
          <InfoRow label={lang === "ms" ? "Pembangun" : "Developer"} value={t("poweredBy")} />
          <InfoRow label={lang === "ms" ? "Model AI" : "AI Model"} value="GLM" />
          <InfoRow
            label={lang === "ms" ? "Lesen" : "License"}
            value={lang === "ms" ? "Demo / Penilaian" : "Demo / Evaluation"}
          />
        </div>
      </GlassCard>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg glass text-primary">
        {icon}
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg glass p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={cn("text-sm font-medium mt-0.5")}>{value}</p>
    </div>
  );
}
