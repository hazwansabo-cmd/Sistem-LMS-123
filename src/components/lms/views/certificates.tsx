"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader, EmptyState, StatCard } from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDateMY } from "@/lib/lms/audit";
import {
  Award, ShieldCheck, Download, Copy, BookOpen, CalendarClock,
  CalendarCheck, FileBadge, Sparkles,
} from "lucide-react";

interface CertificateCourse {
  id: string;
  code: string;
  title: string;
}

interface CertificateItem {
  id: string;
  certNo: string;
  verifyCode: string;
  issuedAt: string;
  expiresAt: string | null;
  course: CertificateCourse;
}

interface CertificatesResponse {
  certificates: CertificateItem[];
}

export function CertificatesView() {
  const { t, lang } = useI18n();
  const setView = useUI((s) => s.setView);

  const query = useQuery<CertificatesResponse>({
    queryKey: ["certificates"],
    queryFn: async () => {
      const res = await fetch("/api/certificates");
      if (!res.ok) throw new Error("Failed to load certificates");
      return (await res.json()) as CertificatesResponse;
    },
  });

  const certs = query.data?.certificates ?? [];

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("certificates")}
        subtitle={
          certs.length > 0
            ? lang === "ms"
              ? `${certs.length} sijil diperoleh`
              : `${certs.length} certificates earned`
            : lang === "ms"
              ? "Sijil penyiapan kursus anda"
              : "Your course completion certificates"
        }
        icon={<Award className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => setView("verify-cert")}>
            <ShieldCheck className="mr-1.5 h-4 w-4" /> {t("verifyCertTitle")}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("total")}
          value={certs.length}
          icon={<Award className="h-5 w-5" />}
          accent="accent"
          sub={lang === "ms" ? "sijil diperoleh" : "certificates earned"}
        />
        <StatCard
          label={lang === "ms" ? "Sah Kini" : "Currently Valid"}
          value={certs.filter((c) => !c.expiresAt || new Date(c.expiresAt) >= new Date()).length}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="primary"
          sub={lang === "ms" ? "dalam tempoh sah" : "within validity"}
        />
        <StatCard
          label={lang === "ms" ? "Tahun Ini" : "This Year"}
          value={
            certs.filter((c) => new Date(c.issuedAt).getFullYear() === new Date().getFullYear()).length
          }
          icon={<Sparkles className="h-5 w-5" />}
          accent="warn"
          sub={lang === "ms" ? "baru dikeluarkan" : "newly issued"}
        />
      </div>

      {certs.length === 0 ? (
        <EmptyState
          icon={<Award className="h-6 w-6" />}
          title={t("noCertificates")}
          hint={t("notEligible")}
          action={
            <Button onClick={() => setView("my-courses")}>
              <BookOpen className="mr-1.5 h-4 w-4" />
              {lang === "ms" ? "Lihat Kursus Saya" : "View My Courses"}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((cert) => (
            <CertificateCard
              key={cert.id}
              cert={cert}
              lang={lang}
              onVerify={() => setView("verify-cert", { code: cert.verifyCode })}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CertificateCard({
  cert,
  lang,
  onVerify,
  t,
}: {
  cert: CertificateItem;
  lang: "ms" | "en";
  onVerify: () => void;
  t: (k: DictKey) => string;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(cert.verifyCode);
      setCopied(true);
      toast.success(lang === "ms" ? "Kod disalin" : "Code copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(lang === "ms" ? "Gagal menyalin kod" : "Failed to copy code");
    }
  };

  const downloadPdf = () => {
    window.open("/api/certificates/" + cert.id + "/pdf", "_blank");
  };

  const issued = formatDateMY(cert.issuedAt);
  const expires = cert.expiresAt ? formatDateMY(cert.expiresAt) : null;
  const isExpired = cert.expiresAt ? new Date(cert.expiresAt) < new Date() : false;

  return (
    <GlassCard className="p-0 overflow-hidden" hover>
      {/* Accent header strip */}
      <div className="relative h-24 bg-gradient-to-br from-[oklch(0.42_0.12_235)] via-[oklch(0.5_0.13_220)] to-[oklch(0.72_0.16_160)]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0px, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0px, transparent 45%)" }} />
        <div className="absolute inset-0 flex items-center justify-between px-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
            <Award className="h-6 w-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
              {lang === "ms" ? "Al Amin Edu Oasis" : "Al Amin Edu Oasis"}
            </p>
            <p className="text-[10px] text-white/70">
              {lang === "ms" ? "Sijil Penyiapan" : "Completion Certificate"}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
              {cert.course.code}
            </Badge>
            <h3 className="font-semibold text-sm leading-snug mt-1.5 line-clamp-2">
              {cert.course.title}
            </h3>
          </div>
          <FileBadge className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>

        {/* Cert number */}
        <div className="rounded-lg glass p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("certNo")}</p>
          <p className="font-mono text-sm font-bold tracking-tight">{cert.certNo}</p>
        </div>

        {/* Verify code with copy */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 rounded-lg glass p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("verifyCode")}</p>
            <p className="font-mono text-sm font-semibold tracking-wider truncate">{cert.verifyCode}</p>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0"
            onClick={copyCode}
            aria-label={lang === "ms" ? "Salin kod" : "Copy code"}
          >
            <Copy className={cn("h-4 w-4", copied && "text-emerald-500")} />
          </Button>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg glass p-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarCheck className="h-3 w-3" />
              <p className="text-[10px] uppercase tracking-wide">{t("issuedAt")}</p>
            </div>
            <p className="text-sm font-medium mt-0.5">{issued}</p>
          </div>
          <div className="rounded-lg glass p-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              <p className="text-[10px] uppercase tracking-wide">{t("expiresAt")}</p>
            </div>
            <p className={cn("text-sm font-medium mt-0.5", isExpired && "text-rose-500")}>
              {expires || (lang === "ms" ? "Selama-lamanya" : "Permanent")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="flex-1 gap-1.5" onClick={downloadPdf}>
            <Download className="h-3.5 w-3.5" /> {lang === "ms" ? "Muat Turun PDF" : "Download PDF"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onVerify}>
            <ShieldCheck className="h-3.5 w-3.5" /> {t("verify")}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
