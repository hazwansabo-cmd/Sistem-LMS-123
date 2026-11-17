"use client";
import { useEffect } from "react";
import { useSession } from "@/store/app";
import { LoginScreen } from "@/components/lms/login-screen";
import { AppShell } from "@/components/lms/app-shell";
import { ViewRouter } from "@/components/lms/view-router";

export default function Home() {
  const user = useSession((s) => s.user);
  const loading = useSession((s) => s.loading);
  const setUser = useSession((s) => s.setUser);
  const setLoading = useSession((s) => s.setLoading);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (active) setUser(data.user || null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [setUser, setLoading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-2xl glass-strong animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gradient">AA</span>
            </div>
          </div>
          <div className="h-2 w-32 rounded-full bg-muted/40 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <AppShell>
      <ViewRouter />
    </AppShell>
  );
}
