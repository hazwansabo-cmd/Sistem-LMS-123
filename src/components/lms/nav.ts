"use client";
import type { Role, View } from "@/store/app";
import {
  LayoutDashboard, BookOpen, GraduationCap, QrCode, CalendarCheck,
  Award, FileBarChart, Users, Building2, ScrollText, Settings, User,
  Bell, ClipboardList, ShieldCheck,
} from "lucide-react";

export type NavItem = { view: View; labelKey: string; icon: typeof LayoutDashboard; roles: Role[] };

export const NAV_ITEMS: NavItem[] = [
  { view: "dashboard", labelKey: "dashboard", icon: LayoutDashboard, roles: ["ADMIN", "HR", "TRAINER", "STAFF"] },
  { view: "courses", labelKey: "courses", icon: BookOpen, roles: ["ADMIN", "HR", "TRAINER", "STAFF"] },
  { view: "my-courses", labelKey: "myCourses", icon: GraduationCap, roles: ["STAFF", "TRAINER"] },
  { view: "attendance", labelKey: "attendance", icon: QrCode, roles: ["ADMIN", "HR", "TRAINER", "STAFF"] },
  { view: "corrections", labelKey: "corrections", icon: ClipboardList, roles: ["HR", "ADMIN"] },
  { view: "certificates", labelKey: "certificates", icon: Award, roles: ["STAFF", "TRAINER", "ADMIN"] },
  { view: "verify-cert", labelKey: "verifyCert", icon: ShieldCheck, roles: ["ADMIN", "HR", "TRAINER", "STAFF"] },
  { view: "reports", labelKey: "reports", icon: FileBarChart, roles: ["ADMIN", "HR", "TRAINER"] },
  { view: "users", labelKey: "users", icon: Users, roles: ["ADMIN", "HR"] },
  { view: "departments", labelKey: "departments", icon: Building2, roles: ["ADMIN"] },
  { view: "audit-log", labelKey: "auditLog", icon: ScrollText, roles: ["ADMIN"] },
  { view: "settings", labelKey: "settings", icon: Settings, roles: ["ADMIN"] },
  { view: "profile", labelKey: "profile", icon: User, roles: ["ADMIN", "HR", "TRAINER", "STAFF"] },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((n) => n.roles.includes(role));
}
