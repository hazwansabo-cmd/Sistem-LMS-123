"use client";
import { create } from "zustand";
import type { Lang } from "@/lib/i18n";

export type Role = "ADMIN" | "HR" | "TRAINER" | "STAFF";

export type SessionUser = {
  id: string;
  staffNo: string;
  name: string;
  email: string;
  role: Role;
  demoRole: Role | null;
  departmentId: string | null;
  position: string | null;
  language: "ms" | "en";
  avatarColor: string;
};

export type View =
  | "dashboard"
  | "courses"
  | "course-detail"
  | "my-courses"
  | "learning"
  | "quiz"
  | "attendance"
  | "session-qr"
  | "my-attendance"
  | "attendance-bulk"
  | "attendance-import"
  | "attendance-list"
  | "corrections"
  | "certificates"
  | "verify-cert"
  | "reports"
  | "users"
  | "departments"
  | "audit-log"
  | "settings"
  | "profile"
  | "notifications"
  | "course-editor";

interface UIState {
  view: View;
  viewParams: Record<string, string>;
  lang: Lang;
  sidebarOpen: boolean;
  setView: (view: View, params?: Record<string, string>) => void;
  setLang: (lang: Lang) => void;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  view: "dashboard",
  viewParams: {},
  lang: "ms",
  sidebarOpen: false,
  setView: (view, params = {}) => set({ view, viewParams: params, sidebarOpen: false }),
  setLang: (lang) => set({ lang }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
}));

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
  setUser: (u: SessionUser | null) => void;
  setLoading: (l: boolean) => void;
  effectiveRole: () => Role;
}

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  loading: true,
  setUser: (u) => set({ user: u, loading: false }),
  setLoading: (l) => set({ loading: l }),
  effectiveRole: () => {
    const u = get().user;
    if (!u) return "STAFF";
    return (u.demoRole || u.role) as Role;
  },
}));
