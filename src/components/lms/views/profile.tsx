"use client";
import { useState } from "react";
import { useSession, useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import { dict } from "@/lib/i18n";
import {
  GlassCard, PageHeader, roleStyles, initials,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  User, Mail, IdCard, Building2, Briefcase, Languages, CalendarDays,
  ShieldAlert, Repeat, Pencil, Loader2, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/store/app";

const ROLE_OPTIONS: Role[] = ["ADMIN", "HR", "TRAINER", "STAFF"];

export function ProfileView() {
  const { t, lang } = useI18n();
  const user = useSession((s) => s.user)!;
  const setUser = useSession((s) => s.setUser);
  const setView = useUI((s) => s.setView);
  const [switching, setSwitching] = useState<Role | null>(null);

  const handleLanguageChange = (value: "ms" | "en") => {
    // Demo only: language change would normally call /api/users/[id] PUT
    if (user) setUser({ ...user, language: value });
    toast.success(lang === "ms"
      ? "Bahasa dikemas kini (demo)"
      : "Language updated (demo)");
  };

  const handleSwitchRole = async (newRole: Role) => {
    setSwitching(newRole);
    try {
      const res = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error("Switch failed");
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.user) {
        setUser(meData.user);
        setView("dashboard");
        const label = dict.roleAdmin[lang] as unknown as Record<string, string>;
        toast.success(`${t("switchRole")}: ${label || newRole}`);
      }
    } catch {
      toast.error(lang === "ms" ? "Gagal menukar peranan" : "Failed to switch role");
    } finally {
      setSwitching(null);
    }
  };

  const effectiveRole = (user.demoRole || user.role) as Role;
  const rStyle = roleStyles[effectiveRole] || roleStyles.STAFF;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("profile")}
        subtitle={lang === "ms"
          ? "Maklumat akaun dan tetapan peribadi"
          : "Account info and personal settings"}
        icon={<User className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            onClick={() => toast.info(lang === "ms"
              ? "Pengemaskinian profil akan tersedia dalam fasa seterusnya"
              : "Profile editing will be available in the next phase")}
            className="gap-1.5"
          >
            <Pencil className="h-4 w-4" /> {t("edit")}
          </Button>
        }
      />

      {/* Profile header card */}
      <GlassCard className="p-6" strong>
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <Avatar
            className="h-24 w-24 border-4 border-background shadow-lg"
            style={{ backgroundColor: user.avatarColor }}
          >
            <AvatarFallback
              style={{ backgroundColor: user.avatarColor, color: "white" }}
              className="text-3xl font-bold"
            >
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h2 className="text-xl font-bold text-gradient truncate">{user.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="outline" className={rStyle.cls}>
                {rStyle.label}
              </Badge>
              {user.demoRole && user.demoRole !== user.role && (
                <Badge variant="outline" className="bg-violet-500/15 text-violet-600 border-violet-500/30 text-[10px]">
                  {lang === "ms" ? "Demo" : "Demo"}
                </Badge>
              )}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                {lang === "ms" ? "Aktif" : "Active"}
              </Badge>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Account info */}
        <GlassCard className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-primary" />
            {lang === "ms" ? "Maklumat Akaun" : "Account Info"}
          </h3>
          <div className="space-y-3">
            <InfoLine icon={<IdCard className="h-4 w-4" />} label={t("staffNo")} value={user.staffNo} mono />
            <InfoLine icon={<Mail className="h-4 w-4" />} label={t("email")} value={user.email} />
            <InfoLine
              icon={<Building2 className="h-4 w-4" />}
              label={t("department")}
              value={user.departmentId || (lang === "ms" ? "Tiada jabatan" : "No department")}
            />
            <InfoLine
              icon={<Briefcase className="h-4 w-4" />}
              label={t("position")}
              value={user.position || "-"}
            />
            <InfoLine
              icon={<CalendarDays className="h-4 w-4" />}
              label={lang === "ms" ? "Ahli Sejak" : "Member Since"}
              value={lang === "ms" ? "Tidak tersedia" : "Not available"}
            />
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" /> {t("language")}
            </label>
            <Select value={user.language} onValueChange={(v) => handleLanguageChange(v as "ms" | "en")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("language")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ms">{t("langMs")}</SelectItem>
                <SelectItem value="en">{t("langEn")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {lang === "ms"
                ? "Bahasa keutamaan anda untuk antara muka"
                : "Your preferred interface language"}
            </p>
          </div>
        </GlassCard>

        {/* Role switching + PDPA */}
        <div className="space-y-4">
          <GlassCard className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <Repeat className="h-4 w-4 text-primary" />
              {t("loginAs")}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {lang === "ms"
                ? "Tukar peranan untuk meneroka pandangan berbeza dalam sistem (demo)."
                : "Switch roles to explore different views in the system (demo)."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((r) => {
                const isActive = effectiveRole === r;
                const rs = roleStyles[r];
                return (
                  <Button
                    key={r}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="justify-start gap-2"
                    disabled={switching !== null}
                    onClick={() => handleSwitchRole(r)}
                  >
                    {switching === r ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isActive ? (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                    <span className="truncate">{rs.label}</span>
                  </Button>
                );
              })}
            </div>
            {user.demoRole && (
              <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" />
                {lang === "ms"
                  ? `Anda kini log masuk sebagai ${rStyle.label} (demo)`
                  : `You are currently signed in as ${rStyle.label} (demo)`}
              </p>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              {t("pdpaNotice")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {lang === "ms"
                ? "Maklumat peribadi anda dilindungi di bawah Akta Perlindungan Data Peribadi 2010. Data ini adalah dummy untuk demo dan tidak akan dikongsi."
                : "Your personal information is protected under the Personal Data Protection Act 2010. This is dummy data for demo and will not be shared."}
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function InfoLine({
  icon, label, value, mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg glass p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg glass text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

void dict;
