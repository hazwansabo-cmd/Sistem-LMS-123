"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession, useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, EmptyState, StatCard,
  levelStyles, statusStyles, initials,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap, BookOpen, CheckCircle2, Award, ChevronRight,
  FileQuestion, RefreshCw, Layers,
} from "lucide-react";

interface MyCourseItem {
  id: string;
  code: string;
  title: string;
  description: string;
  level: string;
  language: string;
  durationHours: number;
  status: string;
  passMark: number;
  category: string | null;
  instructor: { id: string; name: string; position: string | null; avatarColor: string } | null;
  moduleCount: number;
  lessonCount: number;
  quizCount: number;
  enrollmentCount: number;
  sessionCount: number;
  myEnrollment: { status: string; progressPct: number } | null;
}

interface CatalogResponse { courses: MyCourseItem[] }

export function MyCoursesView() {
  const { t, lang } = useI18n();
  const role = useSession((s) => s.effectiveRole());
  const setView = useUI((s) => s.setView);

  const query = useQuery<CatalogResponse>({
    queryKey: ["courses", "my-courses", role],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      const data = await res.json();
      return data as CatalogResponse;
    },
  });

  const enrolled = useMemo(
    () => (query.data?.courses ?? []).filter((c) => c.myEnrollment),
    [query.data]
  );

  const grouped = useMemo(() => {
    const groups: Record<string, MyCourseItem[]> = { IN_PROGRESS: [], COMPLETED: [], ENROLLED: [] };
    for (const c of enrolled) {
      const s = c.myEnrollment?.status || "ENROLLED";
      if (!groups[s]) groups[s] = [];
      groups[s].push(c);
    }
    return groups;
  }, [enrolled]);

  const inProgress = grouped.IN_PROGRESS?.length || 0;
  const completed = grouped.COMPLETED?.length || 0;
  const total = enrolled.length;

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("myCoursesTitle")}
        subtitle={t("myCoursesSub")}
        icon={<GraduationCap className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => setView("courses")}>
            <BookOpen className="mr-1.5 h-4 w-4" /> {t("browseCatalog")}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("total")} value={total} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label={t("inProgress")} value={inProgress} icon={<BookOpen className="h-5 w-5" />} accent="warn" />
        <StatCard label={t("completed")} value={completed} icon={<CheckCircle2 className="h-5 w-5" />} accent="accent" />
      </div>

      {enrolled.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title={t("noEnrollments")}
          hint={t("noEnrollmentsHint")}
          action={
            <Button onClick={() => setView("courses")}>
              <BookOpen className="mr-1.5 h-4 w-4" /> {t("browseCatalog")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* IN_PROGRESS */}
          {grouped.IN_PROGRESS && grouped.IN_PROGRESS.length > 0 && (
            <Section
              title={t("inProgress")}
              count={grouped.IN_PROGRESS.length}
              icon={<BookOpen className="h-4 w-4 text-amber-500" />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {grouped.IN_PROGRESS.map((c) => (
                  <MyCourseCard
                    key={c.id}
                    course={c}
                    lang={lang}
                    onContinue={(id) => setView("learning", { courseId: id })}
                    onRetry={(cid, qid) => setView("quiz", { courseId: cid, quizId: qid })}
                    onViewCert={() => setView("certificates")}
                    onOpen={(id) => setView("course-detail", { courseId: id })}
                    t={t}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* COMPLETED */}
          {grouped.COMPLETED && grouped.COMPLETED.length > 0 && (
            <Section
              title={t("completed")}
              count={grouped.COMPLETED.length}
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {grouped.COMPLETED.map((c) => (
                  <MyCourseCard
                    key={c.id}
                    course={c}
                    lang={lang}
                    onContinue={(id) => setView("learning", { courseId: id })}
                    onRetry={(cid, qid) => setView("quiz", { courseId: cid, quizId: qid })}
                    onViewCert={() => setView("certificates")}
                    onOpen={(id) => setView("course-detail", { courseId: id })}
                    t={t}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* ENROLLED (not yet started) */}
          {grouped.ENROLLED && grouped.ENROLLED.length > 0 && (
            <Section
              title={t("enrolled")}
              count={grouped.ENROLLED.length}
              icon={<GraduationCap className="h-4 w-4 text-primary" />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {grouped.ENROLLED.map((c) => (
                  <MyCourseCard
                    key={c.id}
                    course={c}
                    lang={lang}
                    onContinue={(id) => setView("learning", { courseId: id })}
                    onRetry={(cid, qid) => setView("quiz", { courseId: cid, quizId: qid })}
                    onViewCert={() => setView("certificates")}
                    onOpen={(id) => setView("course-detail", { courseId: id })}
                    t={t}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Other statuses fallback */}
          {Object.entries(grouped)
            .filter(([k]) => !["IN_PROGRESS", "COMPLETED", "ENROLLED"].includes(k))
            .map(([k, list]) => list && list.length > 0 ? (
              <Section key={k} title={statusStyles[k]?.label || k} count={list.length} icon={<BookOpen className="h-4 w-4" />}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {list.map((c) => (
                    <MyCourseCard
                      key={c.id}
                      course={c}
                      lang={lang}
                      onContinue={(id) => setView("learning", { courseId: id })}
                      onRetry={(cid, qid) => setView("quiz", { courseId: cid, quizId: qid })}
                      onViewCert={() => setView("certificates")}
                      onOpen={(id) => setView("course-detail", { courseId: id })}
                      t={t}
                    />
                  ))}
                </div>
              </Section>
            ) : null)}
        </div>
      )}
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg glass">{icon}</span>
        <h2 className="text-base font-semibold">{title}</h2>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{count}</Badge>
      </div>
      {children}
    </div>
  );
}

function MyCourseCard({
  course, lang, onContinue, onRetry, onViewCert, onOpen, t,
}: {
  course: MyCourseItem;
  lang: "ms" | "en";
  onContinue: (id: string) => void;
  onRetry: (courseId: string, quizId: string) => void;
  onViewCert: () => void;
  onOpen: (id: string) => void;
  t: (k: DictKey) => string;
}) {
  const enr = course.myEnrollment!;
  const lvl = levelStyles[course.level] || levelStyles.SEMUA;
  const st = statusStyles[enr.status] || statusStyles.ENROLLED;
  const isCompleted = enr.status === "COMPLETED";

  return (
    <GlassCard className="p-5" hover>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl glass text-primary font-bold text-xs">
          {course.code}
        </div>
        <div className="min-w-0 flex-1">
          <button onClick={() => onOpen(course.id)} className="text-left">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 hover:text-primary transition">{course.title}</h3>
          </button>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${lvl}`}>{course.level}</Badge>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${st.cls}`}>{st.label}</Badge>
            {course.quizCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <FileQuestion className="h-3 w-3 mr-0.5" />{course.quizCount}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <Layers className="h-3 w-3 mr-0.5" />{course.moduleCount}
            </Badge>
          </div>
        </div>
        {course.instructor && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback
              style={{ backgroundColor: course.instructor.avatarColor, color: "white" }}
              className="text-[10px] font-semibold"
            >
              {initials(course.instructor.name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">{t("progress")}</span>
          <span className="font-medium">{enr.progressPct}%</span>
        </div>
        <Progress value={enr.progressPct} className="h-2" />
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
        {isCompleted ? (
          <>
            <Button size="sm" variant="outline" onClick={() => onOpen(course.id)} className="flex-1">
              {t("viewDetails")} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            {course.quizCount > 0 && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onOpen(course.id)}>
                <RefreshCw className="h-3.5 w-3.5" /> {t("retryQuiz")}
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={onViewCert}>
              <Award className="h-3.5 w-3.5" /> {t("viewCertificate")}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => onOpen(course.id)}>
              {t("viewDetails")}
            </Button>
            <Button size="sm" className="flex-1" onClick={() => onContinue(course.id)}>
              {t("continue")} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {course.category && (
        <p className="text-[11px] text-muted-foreground mt-2">
          {lang === "ms" ? "Kategori" : "Category"}: {course.category}
        </p>
      )}
    </GlassCard>
  );
}
