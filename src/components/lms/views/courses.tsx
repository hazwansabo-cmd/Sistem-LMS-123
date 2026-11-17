"use client";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, StatCard, EmptyState,
  levelStyles, statusStyles, initials,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, Search, Plus, Clock, Layers, GraduationCap,
  Users, ChevronRight, Sparkles, FileQuestion, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

interface CourseInstructor {
  id: string;
  name: string;
  position: string | null;
  avatarColor: string;
}

interface CourseListItem {
  id: string;
  code: string;
  title: string;
  description: string;
  level: string;
  language: string;
  durationHours: number;
  status: string;
  passMark: number;
  minAttendancePct: number;
  learningPath: string;
  category: string | null;
  categoryId: string | null;
  instructor: CourseInstructor | null;
  moduleCount: number;
  lessonCount: number;
  quizCount: number;
  enrollmentCount: number;
  sessionCount: number;
  myEnrollment: { status: string; progressPct: number } | null;
}

interface CatalogResponse { courses: CourseListItem[] }

interface CategoryItem { id: string; name: string; description: string | null; courseCount: number }

interface DepartmentsResponse {
  departments: { id: string; name: string; userCount: number }[];
  categories: CategoryItem[];
}

export function CoursesView() {
  const { t } = useI18n();
  const role = useSession((s) => s.effectiveRole());
  const setView = useUI((s) => s.setView);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [language, setLanguage] = useState("all");
  const [sort, setSort] = useState("code");

  // Debounce search
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(h);
  }, [search]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (category && category !== "all") params.set("category", category);
  if (level && level !== "all") params.set("level", level);
  if (language && language !== "all") params.set("language", language);
  if (sort) params.set("sort", sort);

  const coursesQuery = useQuery<CatalogResponse>({
    queryKey: ["courses", debouncedSearch, category, level, language, sort],
    queryFn: async () => {
      const res = await fetch(`/api/courses?${params.toString()}`);
      const data = await res.json();
      return data as CatalogResponse;
    },
  });

  const categoriesQuery = useQuery<DepartmentsResponse>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      return (await res.json()) as DepartmentsResponse;
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enroll failed");
      return data;
    },
    onSuccess: () => {
      toast.success(t("enrollSuccess"));
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: () => toast.error(t("enrollFailed")),
  });

  const courses = coursesQuery.data?.courses ?? [];
  const publishedCount = useMemo(
    () => courses.filter((c) => c.status === "PUBLISHED").length,
    [courses]
  );
  const myEnrolledCount = useMemo(
    () => courses.filter((c) => c.myEnrollment).length,
    [courses]
  );

  const canCreate = role === "TRAINER" || role === "ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("catalogTitle")}
        subtitle={t("catalogSub")}
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          canCreate ? (
            <Button onClick={() => setView("course-editor")} className="gap-1.5">
              <Plus className="h-4 w-4" /> {t("createCourse")}
            </Button>
          ) : null
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("totalCoursesShort")}
          value={courses.length}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label={t("publishedCourses")}
          value={publishedCount}
          icon={<Sparkles className="h-5 w-5" />}
          accent="accent"
        />
        <StatCard
          label={t("myCourses")}
          value={myEnrolledCount}
          icon={<GraduationCap className="h-5 w-5" />}
        />
      </div>

      {/* Filter bar */}
      <GlassCard className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
              aria-label={t("search")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <FilterSelect
              value={category}
              onChange={setCategory}
              placeholder={t("allCategories")}
              label={t("category")}
              options={
                categoriesQuery.data?.categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                })) ?? []
              }
            />
            <FilterSelect
              value={level}
              onChange={setLevel}
              placeholder={t("allLevels")}
              label={t("level")}
              options={[
                { value: "PEMULA", label: "Pemula" },
                { value: "PERTENGAHAN", label: "Pertengahan" },
                { value: "LANJUTAN", label: "Lanjutan" },
                { value: "SEMUA", label: "Semua Tahap" },
              ]}
            />
            <FilterSelect
              value={language}
              onChange={setLanguage}
              placeholder={t("allLanguages")}
              label={t("language")}
              options={[
                { value: "ms", label: t("langMs") },
                { value: "en", label: t("langEn") },
                { value: "bilingual", label: t("langBilingual") },
              ]}
            />
            <FilterSelect
              value={sort}
              onChange={setSort}
              placeholder={t("sortCode")}
              label={t("sort")}
              options={[
                { value: "code", label: t("sortCode") },
                { value: "title", label: t("sortTitle") },
                { value: "duration", label: t("sortDuration") },
                { value: "newest", label: t("sortNewest") },
              ]}
            />
          </div>
        </div>
      </GlassCard>

      {/* Course grid */}
      {coursesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={t("noCourses")}
          hint={t("noCoursesHint")}
          action={
            <Button variant="outline" onClick={() => {
              setSearch(""); setCategory("all"); setLevel("all"); setLanguage("all");
            }}>
              {t("filter")} - {t("all")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              onEnroll={(id) => enrollMutation.mutate(id)}
              onOpen={(id) => setView("course-detail", { courseId: id })}
              onContinue={(id) => setView("learning", { courseId: id })}
              enrolling={enrollMutation.isPending}
              t={t}
              role={role}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value, onChange, options, placeholder, label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full lg:w-[170px]" aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CourseCard({
  course, onEnroll, onOpen, onContinue, enrolling, t, role,
}: {
  course: CourseListItem;
  onEnroll: (id: string) => void;
  onOpen: (id: string) => void;
  onContinue: (id: string) => void;
  enrolling: boolean;
  t: (k: DictKey) => string;
  role: string;
}) {
  const lvl = levelStyles[course.level] || levelStyles.SEMUA;
  const enrStatus = course.myEnrollment?.status
    ? statusStyles[course.myEnrollment.status] || statusStyles.ENROLLED
    : null;
  const pubStatus = statusStyles[course.status] || statusStyles.DRAFT;

  return (
    <GlassCard className="flex flex-col p-5" hover>
      {/* Header: code + status badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge variant="outline" className="font-mono text-[11px]">{course.code}</Badge>
        <div className="flex flex-wrap items-center gap-1 justify-end">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${lvl}`}>
            {course.level}
          </Badge>
          {course.status !== "PUBLISHED" && role !== "STAFF" && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pubStatus.cls}`}>
              {pubStatus.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-base leading-snug line-clamp-2 min-h-[2.6rem]">
        {course.title}
      </h3>

      {course.category && (
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {course.category}
        </p>
      )}

      {/* Description */}
      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 min-h-[2rem]">
        {course.description || t("noDescription")}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 mt-3 text-xs">
        <Stat icon={<Clock className="h-3.5 w-3.5" />} value={`${course.durationHours} ${t("hours")}`} />
        <Stat icon={<Layers className="h-3.5 w-3.5" />} value={`${course.moduleCount} ${t("modules")}`} />
        <Stat icon={<GraduationCap className="h-3.5 w-3.5" />} value={`${course.lessonCount} ${t("lessons")}`} />
        <Stat icon={<Users className="h-3.5 w-3.5" />} value={`${course.enrollmentCount}`} />
        {course.quizCount > 0 && (
          <Stat icon={<FileQuestion className="h-3.5 w-3.5" />} value={`${course.quizCount} ${t("quiz")}`} />
        )}
        {course.sessionCount > 0 && (
          <Stat icon={<CalendarDays className="h-3.5 w-3.5" />} value={`${course.sessionCount} ${t("sessions")}`} />
        )}
      </div>

      {/* Instructor */}
      {course.instructor && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
          <Avatar className="h-7 w-7">
            <AvatarFallback
              style={{ backgroundColor: course.instructor.avatarColor, color: "white" }}
              className="text-[10px] font-semibold"
            >
              {initials(course.instructor.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{course.instructor.name}</p>
            {course.instructor.position && (
              <p className="text-[10px] text-muted-foreground truncate">
                {course.instructor.position}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Enrollment badge */}
      {enrStatus && (
        <div className="mt-3">
          <Badge variant="outline" className={`text-[10px] ${enrStatus.cls}`}>
            {enrStatus.label}
            {course.myEnrollment && course.myEnrollment.progressPct > 0 && (
              <span className="ml-1 opacity-70">- {course.myEnrollment.progressPct}%</span>
            )}
          </Badge>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onOpen(course.id)}
        >
          {t("viewDetails")} <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        {role === "STAFF" && !course.myEnrollment && course.status === "PUBLISHED" && (
          <Button
            size="sm"
            onClick={() => onEnroll(course.id)}
            disabled={enrolling}
          >
            {t("enrollNow")}
          </Button>
        )}
        {course.myEnrollment && (
          <Button
            size="sm"
            onClick={() => onContinue(course.id)}
          >
            {t("continue")}
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
