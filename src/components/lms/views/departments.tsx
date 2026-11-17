"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/hooks/use-i18n";
import {
  GlassCard, PageHeader, StatCard, EmptyState,
} from "@/components/lms/ui";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Building2, Users, FolderTree, BookOpen, Hash, UserCog,
} from "lucide-react";

interface DeptItem {
  id: string;
  name: string;
  headUserId: string | null;
  userCount: number;
}

interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  courseCount: number;
}

interface DeptResponse {
  departments: DeptItem[];
  categories: CategoryItem[];
}

export function DepartmentsView() {
  const { t, lang } = useI18n();

  const query = useQuery<DeptResponse>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      const data = await res.json();
      return data as DeptResponse;
    },
  });

  const totalUsersAcrossDepts = useMemo(
    () => (query.data?.departments ?? []).reduce((a, d) => a + d.userCount, 0),
    [query.data],
  );

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const departments = query.data?.departments ?? [];
  const categories = query.data?.categories ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("departments")}
        subtitle={lang === "ms"
          ? "Struktur organisasi, jabatan dan kategori kursus"
          : "Organisation structure, departments and course categories"}
        icon={<Building2 className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("departments")}
          value={departments.length}
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          label={lang === "ms" ? "Kategori" : "Categories"}
          value={categories.length}
          icon={<FolderTree className="h-5 w-5" />}
          accent="accent"
        />
        <StatCard
          label={t("totalStaff")}
          value={totalUsersAcrossDepts}
          icon={<Users className="h-5 w-5" />}
          sub={lang === "ms" ? "merentas jabatan" : "across departments"}
        />
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="departments">{t("departments")}</TabsTrigger>
          <TabsTrigger value="categories">{lang === "ms" ? "Kategori" : "Categories"}</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-4">
          {departments.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title={t("noData")}
              hint={lang === "ms" ? "Tiada jabatan ditemui." : "No departments found."}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((d) => (
                <GlassCard key={d.id} className="p-5" hover>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl glass text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Hash className="h-3 w-3" /> {d.id.slice(-6)}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-semibold leading-snug">{d.name}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg glass p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("totalStaff")}</p>
                      <p className="text-lg font-bold text-primary mt-0.5">{d.userCount}</p>
                    </div>
                    <div className="rounded-lg glass p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                        <UserCog className="h-3 w-3" /> {lang === "ms" ? "Ketua" : "Head"}
                      </p>
                      <p className="text-xs font-medium mt-0.5 truncate">
                        {d.headUserId ? d.headUserId.slice(-6) : "-"}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          {categories.length === 0 ? (
            <EmptyState
              icon={<FolderTree className="h-6 w-6" />}
              title={t("noData")}
              hint={lang === "ms" ? "Tiada kategori ditemui." : "No categories found."}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <GlassCard key={c.id} className="p-5" hover>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl glass text-primary">
                      <FolderTree className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <BookOpen className="h-3 w-3" /> {c.courseCount} {lang === "ms" ? "kursus" : "courses"}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-semibold leading-snug">{c.name}</h3>
                  {c.description ? (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground italic">
                      {lang === "ms" ? "Tiada penerangan" : "No description"}
                    </p>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
