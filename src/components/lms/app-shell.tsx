"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSession, useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import { navForRole } from "@/components/lms/nav";
import { roleStyles, initials } from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  GraduationCap, Menu, Sun, Moon, Bell, LogOut, User, Repeat, Settings,
  Languages, ChevronDown, CheckCircle2, Circle, BookOpen, Award, CalendarClock, AlertTriangle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dict } from "@/lib/i18n";

const NOTIF_ICONS: Record<string, typeof BookOpen> = {
  assigned: BookOpen,
  upcoming: CalendarClock,
  deadline: AlertTriangle,
  certificate: Award,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, lang } = useI18n();
  const user = useSession((s) => s.user);
  const effectiveRole = useSession((s) => s.effectiveRole());
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const setLang = useUI((s) => s.setLang);
  const sidebarOpen = useUI((s) => s.sidebarOpen);
  const setSidebar = useUI((s) => s.setSidebar);
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const setUser = useSession((s) => s.setUser);
  const { theme, setTheme } = useTheme();
  // Detect client mount without setState-in-effect (React-recommended pattern)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const qc = useQueryClient();

  useEffect(() => {
    if (user?.language) setLang(user.language);
  }, [user?.language, setLang]);

  const role = effectiveRole;
  const items = navForRole(role);

  const notifQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      return data.notifications as { id: string; type: string; message: string; read: boolean; createdAt: string }[];
    },
    refetchInterval: 60000,
  });
  const unread = notifQuery.data?.filter((n) => !n.read).length || 0;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    toast.success(t("goodbye"));
  };

  const switchRole = async (newRole: "ADMIN" | "HR" | "TRAINER" | "STAFF") => {
    const res = await fetch("/api/auth/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (data.ok) {
      // Re-fetch me to update demoRole
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.user) {
        setUser(meData.user);
        setView("dashboard");
        toast.success(`${t("switchRole")}: ${dict.roleAdmin[newRole === "ADMIN" ? "ms" : lang] || newRole}`);
      }
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl glass text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gradient truncate">Al Amin</p>
          <p className="text-[10px] text-muted-foreground truncate">Edu Oasis LMS</p>
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {items.map((item) => {
            const active = view === item.view;
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground/80 hover:bg-accent/20 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground")} />
                <span className="truncate">{t(item.labelKey as never)}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="px-3 py-4 border-t border-border/30">
        <div className="flex items-center gap-3 rounded-xl glass p-2.5">
          <Avatar className="h-9 w-9 border-2 border-background">
            <AvatarFallback style={{ backgroundColor: user?.avatarColor, color: "white" }} className="text-xs font-semibold">
              {user ? initials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.position || roleStyles[role].label}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="lg:hidden flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-sm font-bold text-gradient">Al Amin</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("welcome")},</span>
            <span className="text-gradient font-semibold">{user?.name?.split(" ").slice(0, 2).join(" ")}</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Language toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === "ms" ? "en" : "ms")}
              className="gap-1.5 px-2.5"
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">{lang}</span>
            </Button>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? t("lightMode") : t("darkMode")}
            >
              {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications")}>
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 glass-strong border-border/40" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                  <p className="text-sm font-semibold">{t("notifications")}</p>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">
                      Tanda semua dibaca
                    </button>
                  )}
                </div>
                <ScrollArea className="max-h-80">
                  <div className="divide-y divide-border/20">
                    {notifQuery.data?.length ? (
                      notifQuery.data.slice(0, 8).map((n) => {
                        const Icon = NOTIF_ICONS[n.type] || Bell;
                        return (
                          <div key={n.id} className={cn("flex items-start gap-3 px-4 py-3", !n.read && "bg-accent/10")}>
                            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-foreground/90">{n.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(n.createdAt).toLocaleDateString("en-GB")}
                              </p>
                            </div>
                            {!n.read && <Circle className="h-2 w-2 fill-primary text-primary mt-1" />}
                          </div>
                        );
                      })
                    ) : (
                      <p className="px-4 py-8 text-center text-xs text-muted-foreground">{t("noData")}</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg glass px-2 py-1.5 hover:border-primary/40 transition">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback style={{ backgroundColor: user?.avatarColor, color: "white" }} className="text-[10px] font-semibold">
                      {user ? initials(user.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-strong border-border/40">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-[11px] text-muted-foreground font-normal">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <div className="px-2 py-1.5">
                  <Badge variant="outline" className={cn("w-full justify-center", roleStyles[role].cls)}>
                    {roleStyles[role].label}
                    {user?.demoRole && user.demoRole !== user.role && (
                      <span className="ml-1 opacity-70">(demo)</span>
                    )}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView("profile")}>
                  <User className="mr-2 h-4 w-4" /> {t("profile")}
                </DropdownMenuItem>
                {(user?.role === "ADMIN") && (
                  <DropdownMenuItem onClick={() => setView("settings")}>
                    <Settings className="mr-2 h-4 w-4" /> {t("settings")}
                  </DropdownMenuItem>
                )}
                {/* Login as (demo) */}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] text-muted-foreground">{t("switchRole")} (demo)</DropdownMenuLabel>
                {(["ADMIN", "HR", "TRAINER", "STAFF"] as const).map((r) => (
                  <DropdownMenuItem key={r} onClick={() => switchRole(r)} disabled={role === r && user?.demoRole === r}>
                    <Repeat className="mr-2 h-4 w-4" />
                    <span>{r === "ADMIN" ? t("roleAdmin") : r === "HR" ? t("roleHR") : r === "TRAINER" ? t("roleTrainer") : t("roleStaff")}</span>
                    {role === r && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-rose-600 focus:text-rose-700">
                  <LogOut className="mr-2 h-4 w-4" /> {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border/30 glass">
          {SidebarContent}
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebar}>
          <SheetContent side="left" className="w-72 p-0 glass-strong border-border/40">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigasi</SheetTitle>
            </SheetHeader>
            {SidebarContent}
          </SheetContent>
        </Sheet>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-auto glass border-t border-border/30 px-6 py-4">
      <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="font-medium">Al Amin Edu Oasis</span>
          <span className="hidden sm:inline">• {t("brandSub")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{t("pdpaNotice")}</span>
          <span className="hidden sm:inline">•</span>
          <span>{t("poweredBy")}</span>
        </div>
      </div>
    </footer>
  );
}
