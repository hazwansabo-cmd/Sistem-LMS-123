"use client";
import { useEffect, useRef, useState } from "react";
import { useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateMY } from "@/lib/lms/audit";
import { toast } from "sonner";
import {
  ShieldCheck, Search, CheckCircle2, XCircle, Loader2, Award,
  User, IdCard, BookOpen, Clock, FileBadge, CalendarCheck, CalendarClock,
  ShieldAlert, Lock,
} from "lucide-react";

interface VerifyCertificate {
  certNo: string;
  verifyCode: string;
  issuedAt: string;
  expiresAt: string | null;
  recipientName: string;
  staffNo: string;
  courseCode: string;
  courseTitle: string;
  courseDurationHours: number;
}

interface VerifyResponse {
  valid: boolean;
  message?: string;
  certificate?: VerifyCertificate;
}

export function VerifyCertView() {
  const { t, lang } = useI18n();
  const viewParams = useUI((s) => s.viewParams);
  const setView = useUI((s) => s.setView);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const autoRanRef = useRef(false);

  const runVerify = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      toast.error(lang === "ms" ? "Masukkan kod pengesahan" : "Enter verification code");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/certificates/verify?code=" + encodeURIComponent(trimmed));
      const data = (await res.json()) as VerifyResponse;
      setResult(data);
      if (data.valid) {
        toast.success(t("certValid"));
      } else {
        toast.error(data.message || t("certInvalid"));
      }
    } catch {
      toast.error(lang === "ms" ? "Gagal mengesahkan sijil" : "Failed to verify certificate");
      setResult({ valid: false, message: lang === "ms" ? "Gagal menghubungi pelayan" : "Failed to reach server" });
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill + auto-verify when navigated with code param
  useEffect(() => {
    if (autoRanRef.current) return;
    const incoming = viewParams.code;
    if (incoming) {
      autoRanRef.current = true;
      setCode(incoming);
      void runVerify(incoming);
    }
  }, [viewParams.code]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runVerify(code);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title={t("verifyCertTitle")}
        subtitle={
          lang === "ms"
            ? "Sahkan ketulenan sijil dengan kod pengesahan atau no. sijil"
            : "Verify certificate authenticity with verification code or cert no."
        }
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      {/* Portal banner */}
      <GlassCard className="p-4 flex items-center gap-3" strong>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl glass text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {lang === "ms" ? "Portal Pengesahan Sijil Rasmi" : "Official Certificate Verification Portal"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lang === "ms"
              ? "Al Amin Edu Oasis LMS - sah dan telus"
              : "Al Amin Edu Oasis LMS - authentic and transparent"}
          </p>
        </div>
      </GlassCard>

      {/* Search */}
      <GlassCard className="p-5" strong>
        <form onSubmit={onSubmit} className="space-y-3">
          <Label htmlFor="verify-code" className="text-sm font-medium">
            {t("enterVerifyCode")}
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="verify-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={lang === "ms" ? "cth. ABC-1234-XYZ atau AI-2024-0001" : "e.g. ABC-1234-XYZ or AI-2024-0001"}
                className="pl-9 font-mono uppercase tracking-wide"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>
            <Button type="submit" disabled={loading} className="gap-1.5 sm:w-auto">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {t("verify")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === "ms"
              ? "Anda boleh menggunakan kod pengesahan atau no. sijil untuk pengesahan."
              : "You may use either the verification code or certificate number for verification."}
          </p>
        </form>
      </GlassCard>

      {/* Results */}
      {loading && (
        <GlassCard className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          </div>
        </GlassCard>
      )}

      {!loading && result && (
        <ResultCard result={result} lang={lang} t={t} onViewCerts={() => setView("certificates")} />
      )}

      {!loading && !result && (
        <GlassCard className="p-8">
          <div className="flex flex-col items-center justify-center text-center py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl glass text-muted-foreground mb-3">
              <Award className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">
              {lang === "ms" ? "Masukkan kod untuk mula" : "Enter a code to begin"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {lang === "ms"
                ? "Hasil pengesahan akan dipaparkan di sini."
                : "Verification result will be shown here."}
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function ResultCard({
  result,
  lang,
  t,
  onViewCerts,
}: {
  result: VerifyResponse;
  lang: "ms" | "en";
  t: (k: DictKey) => string;
  onViewCerts: () => void;
}) {
  if (!result.valid) {
    return (
      <GlassCard className="p-0 overflow-hidden border-rose-500/30" strong>
        <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 p-5 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-600 border border-rose-500/30">
            <XCircle className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-rose-700 dark:text-rose-400">{t("certInvalid")}</h3>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-rose-500/15 text-rose-600 border-rose-500/30">
                {lang === "ms" ? "TIDAK SAH" : "INVALID"}
              </Badge>
            </div>
            <p className="text-sm text-rose-700/80 dark:text-rose-300/80 mt-1">
              {result.message || (lang === "ms" ? "Sijil tidak dijumpai dalam rekod kami." : "Certificate not found in our records.")}
            </p>
          </div>
        </div>
        <div className="p-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {lang === "ms"
              ? "Sila semak kod dan cuba lagi. Hubungi pentadbir jika perlu."
              : "Please check the code and try again. Contact admin if needed."}
          </p>
        </div>
      </GlassCard>
    );
  }

  const cert = result.certificate!;
  const issued = formatDateMY(cert.issuedAt);
  const expires = cert.expiresAt ? formatDateMY(cert.expiresAt) : null;
  const isExpired = cert.expiresAt ? new Date(cert.expiresAt) < new Date() : false;

  return (
    <GlassCard className="p-0 overflow-hidden border-emerald-500/30" strong>
      {/* Valid header */}
      <div className="bg-gradient-to-br from-emerald-500/25 via-emerald-600/15 to-[oklch(0.72_0.16_160)]/20 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400">{t("certValid")}</h3>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold">
                {lang === "ms" ? "SAH" : "VALID"}
              </Badge>
              {isExpired && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-600 border-amber-500/30">
                  {lang === "ms" ? "TELAH TAMAT" : "EXPIRED"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mt-1">
              {lang === "ms"
                ? "Sijil ini telah disahkan oleh Al Amin Edu Oasis LMS."
                : "This certificate has been verified by Al Amin Edu Oasis LMS."}
            </p>
          </div>
        </div>
      </div>

      {/* Recipient block */}
      <div className="p-5 space-y-5">
        <div className="flex flex-col gap-3 rounded-xl glass p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.42_0.12_235)] to-[oklch(0.72_0.16_160)] text-white">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {lang === "ms" ? "Penerima" : "Recipient"}
              </p>
              <p className="font-bold text-base leading-tight">{cert.recipientName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <IdCard className="h-3 w-3" /> {cert.staffNo}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("certNo")}</p>
            <p className="font-mono font-bold text-sm">{cert.certNo}</p>
          </div>
        </div>

        {/* Course block */}
        <div className="rounded-xl glass p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {lang === "ms" ? "Kursus Disempurnakan" : "Completed Course"}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
              {cert.courseCode}
            </Badge>
            <p className="font-semibold text-sm leading-snug flex-1">{cert.courseTitle}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {lang === "ms"
              ? `Tempoh: ${cert.courseDurationHours} jam`
              : `Duration: ${cert.courseDurationHours} hours`}
          </div>
        </div>

        {/* Verify code + dates grid */}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg glass p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <FileBadge className="h-3 w-3" />
              <p className="text-[10px] uppercase tracking-wide">{t("verifyCode")}</p>
            </div>
            <p className="font-mono text-sm font-bold tracking-wider break-all">{cert.verifyCode}</p>
          </div>
          <div className="rounded-lg glass p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <CalendarCheck className="h-3 w-3" />
              <p className="text-[10px] uppercase tracking-wide">{t("issuedAt")}</p>
            </div>
            <p className="text-sm font-medium">{issued}</p>
          </div>
          <div className="rounded-lg glass p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <CalendarClock className="h-3 w-3" />
              <p className="text-[10px] uppercase tracking-wide">{t("expiresAt")}</p>
            </div>
            <p className={cn("text-sm font-medium", isExpired && "text-amber-500")}>
              {expires || (lang === "ms" ? "Selama-lamanya" : "Permanent")}
            </p>
          </div>
        </div>

        {/* Footer note */}
        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
            {lang === "ms"
              ? "Pengesahan ini dijana oleh sistem pusat Al Amin Edu Oasis. Ketulenan sijil boleh dipercayai."
              : "This verification is generated by the Al Amin Edu Oasis central system. The certificate authenticity is trusted."}
          </p>
        </div>

        <Button variant="outline" className="w-full gap-1.5" onClick={onViewCerts}>
          <Award className="h-4 w-4" />
          {lang === "ms" ? "Lihat Sijil Saya" : "View My Certificates"}
        </Button>
      </div>
    </GlassCard>
  );
}
