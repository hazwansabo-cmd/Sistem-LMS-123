"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, EmptyState,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Bell, BookOpen, CalendarClock, AlertTriangle, Award, CheckCheck,
  Loader2, Circle, CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTimeMY } from "@/lib/lms/audit";
import { cn } from "@/lib/utils";

interface NotifItem {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotifResponse { notifications: NotifItem[] }

const NOTIF_ICONS: Record<string, typeof BookOpen> = {
  assigned: BookOpen,
  upcoming: CalendarClock,
  deadline: AlertTriangle,
  certificate: Award,
};

const NOTIF_ACCENT: Record<string, string> = {
  assigned: "bg-sky-500/15 text-sky-600",
  upcoming: "bg-amber-500/15 text-amber-600",
  deadline: "bg-rose-500/15 text-rose-600",
  certificate: "bg-emerald-500/15 text-emerald-600",
};

export function NotificationsView() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "unread">("all");

  const query = useQuery<NotifResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      return data as NotifResponse;
    },
    refetchInterval: 60000,
  });

  const notifs = query.data?.notifications ?? [];
  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);
  const visible = useMemo(
    () => tab === "unread" ? notifs.filter((n) => !n.read) : notifs,
    [notifs, tab],
  );

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data;
    },
    onSuccess: () => {
      toast.success(lang === "ms" ? "Semua notifikasi ditanda dibaca" : "All notifications marked as read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("notifications")}
        subtitle={lang === "ms"
          ? `${notifs.length} jumlah · ${unreadCount} belum dibaca`
          : `${notifs.length} total · ${unreadCount} unread`}
        icon={<Bell className="h-5 w-5" />}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              {markAllMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCheck className="h-4 w-4" />}
              {lang === "ms" ? "Tanda semua dibaca" : "Mark all read"}
            </Button>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="all">
            {t("all")} ({notifs.length})
          </TabsTrigger>
          <TabsTrigger value="unread" disabled={unreadCount === 0}>
            {lang === "ms" ? "Belum Dibaca" : "Unread"} ({unreadCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title={lang === "ms" ? "Tiada notifikasi" : "No notifications"}
          hint={tab === "unread"
            ? (lang === "ms" ? "Semua notifikasi telah dibaca." : "All notifications have been read.")
            : (lang === "ms" ? "Anda belum menerima sebarang notifikasi." : "You have not received any notifications.")}
        />
      ) : (
        <ScrollArea className="max-h-[36rem]">
          <div className="space-y-2 pr-2">
            {visible.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                lang={lang}
                t={t}
                onMark={() => markOneMutation.mutate(n.id)}
                marking={markOneMutation.isPending}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function NotificationRow({
  n, lang, t, onMark, marking,
}: {
  n: NotifItem;
  lang: string;
  t: (k: DictKey) => string;
  onMark: () => void;
  marking: boolean;
}) {
  const Icon = NOTIF_ICONS[n.type] || Bell;
  const accent = NOTIF_ACCENT[n.type] || "bg-primary/15 text-primary";

  return (
    <GlassCard
      className={cn("p-4 transition-colors", !n.read && "border-l-4 border-l-primary")}
      hover
    >
      <button
        onClick={onMark}
        disabled={marking || n.read}
        className="w-full text-left disabled:cursor-default"
        aria-label={n.read ? t("view") : (lang === "ms" ? "Tanda dibaca" : "Mark as read")}
      >
        <div className="flex items-start gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", accent)}>
            {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug">{n.message}</p>
              {!n.read && (
                <CircleDot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              )}
              {n.read && (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 capitalize", accent)}>
                {n.type}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {formatDateTimeMY(n.createdAt)}
              </span>
              {!n.read && (
                <span className="text-[10px] text-primary ml-auto">
                  {lang === "ms" ? "Klik untuk tanda dibaca" : "Click to mark read"}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </GlassCard>
  );
}
