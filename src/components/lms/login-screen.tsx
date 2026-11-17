"use client";
import { useState } from "react";
import { useSession } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import { GlassCard } from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Mail, Lock, Shield, Users, BookOpen, User, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { email: "admin@alamin.edu.my", role: "ADMIN", label: "Pentadbir", labelEn: "Administrator", icon: Shield, color: "oklch(0.72 0.16 160)" },
  { email: "hr1@alamin.edu.my", role: "HR", label: "HR / Pengurus", labelEn: "HR / Manager", icon: Users, color: "#7b2cbf" },
  { email: "trainer1@alamin.edu.my", role: "TRAINER", label: "Jurulatih", labelEn: "Trainer", icon: BookOpen, color: "#e76f51" },
  { email: "nur.a1008@alamin.edu.my", role: "STAFF", label: "Staf", labelEn: "Staff", icon: User, color: "#0f4c75" },
];

export function LoginScreen() {
  const { t, lang } = useI18n();
  const setUser = useSession((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("invalidCreds"));
        return;
      }
      setUser(data.user);
      toast.success(`${t("welcome")}, ${data.user.name}`);
    } catch {
      toast.error(t("invalidCreds"));
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail.toLowerCase(), password: "password123" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("invalidCreds"));
        return;
      }
      setUser(data.user);
      toast.success(`${t("welcome")}, ${data.user.name}`);
    } catch {
      toast.error(t("invalidCreds"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Decorative floating orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-10 left-10 h-72 w-72 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.72 0.16 160 / 0.35), transparent)" }} />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.42 0.12 235 / 0.3), transparent)" }} />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.7 0.13 220 / 0.25), transparent)" }} />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6 items-stretch">
        {/* Branding panel */}
        <GlassCard strong className="p-8 lg:p-10 flex flex-col justify-between order-1">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl glass-strong text-primary">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">Al Amin Edu Oasis</h1>
                <p className="text-xs text-muted-foreground">{t("brandSub")}</p>
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-3">
              {lang === "ms" ? "Latihan AI untuk Kakitangan Malaysia" : "AI Training for Malaysian Staff"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {lang === "ms"
                ? "Platform pembelajaran berasaskan web untuk kemahiran Kecerdasan Buatan, dengan modul kehadiran digital, kuiz interaktif dan sijil boleh disahkan."
                : "Web-based learning platform for Artificial Intelligence skills, featuring digital attendance, interactive quizzes and verifiable certificates."}
            </p>
            <ul className="space-y-3">
              {[
                { icon: BookOpen, ms: "9 kursus AI berstruktur (AI-101 hingga AI-401)", en: "9 structured AI courses (AI-101 to AI-401)" },
                { icon: Shield, ms: "Kehadiran QR & kod sesi - tamat kerja menaip manual", en: "QR & session code attendance - end manual typing" },
                { icon: Sparkles, ms: "Sijil PDF dengan pengesahan awam", en: "PDF certificates with public verification" },
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg glass text-primary">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-foreground/90">{lang === "ms" ? f.ms : f.en}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("pdpaNotice")} | Malaysia</span>
            <span>{t("poweredBy")}</span>
          </div>
        </GlassCard>

        {/* Login form */}
        <GlassCard strong className="p-8 lg:p-10 flex flex-col justify-center order-2">
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-1">{t("loginCta")}</h3>
            <p className="text-sm text-muted-foreground">{t("loginHint")}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@alamin.edu.my"
                  className="pl-9 bg-background/40"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 bg-background/40"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 text-base">
              {loading ? t("loading") : t("login")}
              {!loading && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background/60 px-3 text-muted-foreground">{t("demoAccounts")}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                onClick={() => quickLogin(a.email)}
                disabled={loading}
                className="group flex items-center gap-3 rounded-xl glass p-3 text-left transition hover:border-primary/50 hover:shadow-md disabled:opacity-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklch, ${a.color} 18%, transparent)`, color: a.color }}>
                  <a.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{lang === "ms" ? a.label : a.labelEn}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">password123</span>
                </span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-[11px] text-muted-foreground text-center leading-relaxed">
            {t("privacyNotice")}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
