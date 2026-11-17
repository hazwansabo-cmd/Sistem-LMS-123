"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, StatCard, EmptyState,
  roleStyles, initials,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, Search, Plus, ShieldCheck, Pencil, Ban, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateMY } from "@/lib/lms/audit";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  staffNo: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  departmentId: string | null;
  position: string | null;
  language: string;
  status: string;
  avatarColor: string;
  createdAt: string;
}

interface UsersResponse { users: UserRow[] }

interface DeptResponse {
  departments: { id: string; name: string; headUserId: string | null; userCount: number }[];
  categories: { id: string; name: string; description: string | null; courseCount: number }[];
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Aktif", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  INACTIVE: { label: "Nyahaktif", cls: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
};

export function UsersView() {
  const { t, lang } = useI18n();
  const role = useSession((s) => s.effectiveRole());
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(h);
  }, [search]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (roleFilter !== "all") params.set("role", roleFilter);
  if (deptFilter !== "all") params.set("departmentId", deptFilter);

  const usersQuery = useQuery<UsersResponse>({
    queryKey: ["users", debouncedSearch, roleFilter, deptFilter],
    queryFn: async () => {
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      return data as UsersResponse;
    },
  });

  const deptQuery = useQuery<DeptResponse>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      const data = await res.json();
      return data as DeptResponse;
    },
  });

  const users = usersQuery.data?.users ?? [];
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { ADMIN: 0, HR: 0, TRAINER: 0, STAFF: 0 };
    for (const u of users) counts[u.role] = (counts[u.role] || 0) + 1;
    return counts;
  }, [users]);

  const addMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      return data;
    },
    onSuccess: () => {
      toast.success(lang === "ms" ? "Pengguna berjaya ditambah" : "User added successfully");
      qc.invalidateQueries({ queryKey: ["users"] });
      setAddOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (usersQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("userManagement")}
        subtitle={lang === "ms"
          ? "Urus akaun kakitangan, peranan dan jabatan"
          : "Manage staff accounts, roles and departments"}
        icon={<Users className="h-5 w-5" />}
        actions={
          role === "ADMIN" ? (
            <Button onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> {t("addUser")}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalStaff")} value={users.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label={t("roleAdmin")} value={roleCounts.ADMIN} icon={<ShieldCheck className="h-5 w-5" />} accent="accent" />
        <StatCard label={t("roleTrainer")} value={roleCounts.TRAINER} icon={<Users className="h-5 w-5" />} accent="warn" />
        <StatCard label={t("roleStaff")} value={roleCounts.STAFF} icon={<Users className="h-5 w-5" />} />
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "ms"
                ? "Cari nama / e-mel / no. staf..."
                : "Search name / email / staff no..."}
              className="pl-9"
              aria-label={t("search")}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full lg:w-[180px]" aria-label={t("filter")}>
              <SelectValue placeholder={t("all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")} - {t("roleStaff")}</SelectItem>
              <SelectItem value="ADMIN">{roleStyles.ADMIN.label}</SelectItem>
              <SelectItem value="HR">{roleStyles.HR.label}</SelectItem>
              <SelectItem value="TRAINER">{roleStyles.TRAINER.label}</SelectItem>
              <SelectItem value="STAFF">{roleStyles.STAFF.label}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full lg:w-[200px]" aria-label={t("department")}>
              <SelectValue placeholder={t("department")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")} - {t("department")}</SelectItem>
              {deptQuery.data?.departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        {users.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={t("noData")}
            hint={lang === "ms"
              ? "Tiada pengguna dijumpai dengan penapis semasa."
              : "No users found with the current filter."}
          />
        ) : (
          <ScrollArea className="max-h-[28rem]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("name")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("staffNo")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("email")}</TableHead>
                  <TableHead>{t("department")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("position")}</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("date")}</TableHead>
                  {role === "ADMIN" && <TableHead className="text-right">{t("actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <UserRowItem key={u.id} u={u} role={role} lang={lang} t={t} />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </GlassCard>

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={(p) => addMutation.mutate(p)}
        submitting={addMutation.isPending}
        departments={deptQuery.data?.departments ?? []}
        lang={lang}
        t={t}
      />
    </div>
  );
}

function UserRowItem({
  u, role, lang, t,
}: {
  u: UserRow;
  role: string;
  lang: string;
  t: (k: DictKey) => string;
}) {
  const rStyle = roleStyles[u.role] || roleStyles.STAFF;
  const stStyle = STATUS_BADGE[u.status] || { label: u.status, cls: "bg-slate-500/15 text-slate-600 border-slate-500/30" };
  return (
    <TableRow className="hover:bg-accent/10">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-background">
            <AvatarFallback
              style={{ backgroundColor: u.avatarColor, color: "white" }}
              className="text-xs font-semibold"
            >
              {initials(u.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{u.name}</p>
            <p className="text-[11px] text-muted-foreground truncate md:hidden">{u.staffNo}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell font-mono text-xs">{u.staffNo}</TableCell>
      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[16rem]">{u.email}</TableCell>
      <TableCell className="text-xs">{u.department || "-"}</TableCell>
      <TableCell className="hidden sm:table-cell text-xs">{u.position || "-"}</TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("text-[10px] px-1.5", rStyle.cls)}>
          {rStyle.label}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("text-[10px] px-1.5", stStyle.cls)}>
          {stStyle.label}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDateMY(u.createdAt)}</TableCell>
      {role === "ADMIN" && (
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2"
              onClick={() => toast.info(lang === "ms"
                ? "Suntingan pengguna akan tersedia dalam fasa seterusnya"
                : "User editing will be available in the next phase")}
            >
              <Pencil className="h-3.5 w-3.5" /> {t("edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-muted-foreground"
              onClick={() => toast.info(lang === "ms"
                ? "Nyahaktifkan pengguna (demo)"
                : "Deactivate user (demo)")}
            >
              <Ban className="h-3.5 w-3.5" /> {lang === "ms" ? "Nyahaktif" : "Deactivate"}
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

function AddUserDialog({
  open, onOpenChange, onSubmit, submitting, departments, lang, t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  submitting: boolean;
  departments: { id: string; name: string }[];
  lang: string;
  t: (k: DictKey) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/40 sm:max-w-lg">
        {/* Radix Dialog unmounts content when closed — form state resets naturally */}
        <AddUserForm
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitting={submitting}
          departments={departments}
          lang={lang}
          t={t}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddUserForm({
  onSubmit, onCancel, submitting, departments, lang, t,
}: {
  onSubmit: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
  submitting: boolean;
  departments: { id: string; name: string }[];
  lang: string;
  t: (k: DictKey) => string;
}) {
  const [staffNo, setStaffNo] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState("STAFF");
  const [departmentId, setDepartmentId] = useState("");
  const [position, setPosition] = useState("");
  const [language, setLanguage] = useState("ms");

  const canSubmit = !!staffNo.trim() && !!name.trim() && !!email.trim() && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      staffNo: staffNo.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: userRole,
      departmentId: departmentId || undefined,
      position: position.trim() || undefined,
      language,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-gradient">{t("addUser")}</DialogTitle>
        <DialogDescription>
          {lang === "ms"
            ? "Isikan maklumat kakitangan baru di bawah."
            : "Fill in the new staff details below."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="u-staffno">{t("staffNo")}</Label>
            <Input id="u-staffno" value={staffNo} onChange={(e) => setStaffNo(e.target.value)} placeholder="STAF-001" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-name">{t("name")}</Label>
            <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmad bin Ali" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="u-email">{t("email")}</Label>
          <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ahmad@alamin.edu.my" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={userRole} onValueChange={setUserRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("roleStaff")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{roleStyles.ADMIN.label}</SelectItem>
                <SelectItem value="HR">{roleStyles.HR.label}</SelectItem>
                <SelectItem value="TRAINER">{roleStyles.TRAINER.label}</SelectItem>
                <SelectItem value="STAFF">{roleStyles.STAFF.label}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("department")}</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={lang === "ms" ? "Tanpa jabatan" : "No department"} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="u-position">{t("position")}</Label>
            <Input id="u-position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder={lang === "ms" ? "Eksekutif" : "Executive"} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("language")}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("language")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ms">{t("langMs")}</SelectItem>
                <SelectItem value="en">{t("langEn")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          {t("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("create")}
        </Button>
      </DialogFooter>
    </>
  );
}
