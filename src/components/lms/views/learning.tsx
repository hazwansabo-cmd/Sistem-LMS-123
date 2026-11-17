"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, EmptyState, statusStyles,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, BookOpen, FileText,
  Video, FlaskConical, FileQuestion, Menu, Play, Download, Award,
  GraduationCap, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LearningLesson {
  id: string;
  title: string;
  type: string;
  content: string | null;
  durationMin: number;
  order: number;
  completed: boolean;
}
interface LearningModule {
  id: string;
  title: string;
  order: number;
  lessons: LearningLesson[];
}
interface LearningQuiz {
  id: string;
  title: string;
  timeLimitMin: number;
  maxAttempts: number;
  passMark: number;
}
interface LearningData {
  course: { id: string; code: string; title: string; passMark: number; minAttendancePct: number };
  modules: LearningModule[];
  quizzes: LearningQuiz[];
  myAttempts: { id: string; quizId: string; score: number; passed: boolean; submittedAt: string }[];
  progress: { completedLessons: number; totalLessons: number; lessonPct: number; enrollmentStatus: string; progressPct: number };
}

export function LearningView() {
  const { t, lang } = useI18n();
  const viewParams = useUI((s) => s.viewParams);
  const setView = useUI((s) => s.setView);
  const courseId = viewParams.courseId;
  const qc = useQueryClient();

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const query = useQuery<LearningData>({
    queryKey: ["learning", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/learning/${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data as LearningData;
    },
    enabled: !!courseId,
    retry: false,
  });

  // Auto-select first lesson
  useEffect(() => {
    if (query.data && !activeLessonId) {
      const firstLesson = query.data.modules.find((m) => m.lessons.length > 0)?.lessons[0];
      if (firstLesson) setActiveLessonId(firstLesson.id);
    }
  }, [query.data, activeLessonId]);

  const allLessons = useMemo(
    () => query.data ? query.data.modules.flatMap((m) => m.lessons) : [],
    [query.data]
  );

  const activeLesson = useMemo(
    () => allLessons.find((l) => l.id === activeLessonId) || null,
    [allLessons, activeLessonId]
  );

  const activeIdx = activeLesson ? allLessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const nextLesson = activeIdx >= 0 && activeIdx < allLessons.length - 1 ? allLessons[activeIdx + 1] : null;

  const completeMutation = useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      const res = await fetch(`/api/learning/lesson/${lessonId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data as { progressPct: number; status: string; completedLessons: number; totalLessons: number };
    },
    onSuccess: (data) => {
      toast.success(t("lessonCompletedToast"));
      qc.invalidateQueries({ queryKey: ["learning", courseId] });
      // Advance to next lesson
      if (nextLesson) {
        setActiveLessonId(nextLesson.id);
      }
      if (data.status === "COMPLETED") {
        toast.success(t("allLessonsComplete"));
      }
    },
    onError: () => toast.error(t("lessonMarkFailed")),
  });

  if (!courseId) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title={t("noCourses")}
        action={<Button onClick={() => setView("courses")}>{t("browseCatalog")}</Button>}
      />
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Handle not-enrolled error
  if (query.isError || !query.data) {
    const errMsg = (query.error as Error)?.message || "";
    if (errMsg.toLowerCase().includes("daftar") || errMsg.toLowerCase().includes("enroll")) {
      return (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title={t("notEnrolled")}
          hint={t("notEnrolledHint")}
          action={
            <div className="flex gap-2">
              <Button onClick={async () => {
                try {
                  const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  toast.success(t("enrollSuccess"));
                  qc.invalidateQueries({ queryKey: ["learning", courseId] });
                } catch (e) {
                  toast.error(t("enrollFailed"));
                }
              }}>
                {t("enrollNow")}
              </Button>
              <Button variant="outline" onClick={() => setView("course-detail", { courseId })}>
                {t("backToCourse")}
              </Button>
            </div>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title={t("noCourses")}
        action={<Button onClick={() => setView("courses")}>{t("backToCourses")}</Button>}
      />
    );
  }

  const data = query.data;
  const progress = data.progress;
  const quizPassed = data.myAttempts.some((a) => a.passed);
  const allLessonsDone = progress.completedLessons === progress.totalLessons && progress.totalLessons > 0;
  const eligibleForCert = allLessonsDone && quizPassed;
  const firstQuiz = data.quizzes[0];

  // Sidebar content
  const SidebarBody = (
    <div className="space-y-1">
      {data.modules.map((m, mIdx) => (
        <div key={m.id} className="mb-2">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md glass text-primary text-[11px] font-bold">
              {mIdx + 1}
            </span>
            <p className="text-xs font-semibold text-foreground/90 line-clamp-1">{m.title}</p>
          </div>
          <div className="space-y-0.5 ml-2">
            {m.lessons.map((l) => {
              const isActive = l.id === activeLessonId;
              return (
                <button
                  key={l.id}
                  onClick={() => {
                    setActiveLessonId(l.id);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent/15 text-foreground/80"
                  )}
                >
                  <span className={cn("shrink-0", isActive ? "text-primary-foreground" : l.completed ? "text-emerald-500" : "text-muted-foreground")}>
                    {l.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <LessonTypeIcon type={l.type} className="h-3.5 w-3.5" />}
                  </span>
                  <span className="flex-1 truncate">{l.title}</span>
                  {l.durationMin > 0 && (
                    <span className={cn("text-[10px] shrink-0", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {l.durationMin}m
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <GlassCard strong className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setSidebarOpen(true)} aria-label="Menu">
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg glass text-primary font-bold text-xs">
              {data.course.code}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{data.course.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={progress.progressPct} className="h-1.5 w-24 sm:w-32" />
                <span className="text-[11px] text-muted-foreground shrink-0">{progress.progressPct}%</span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusStyles[progress.enrollmentStatus]?.cls || ""}`}>
                  {statusStyles[progress.enrollmentStatus]?.label || progress.enrollmentStatus}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setView("course-detail", { courseId })} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> {t("backToCourse")}
            </Button>
            {firstQuiz && (
              <Button size="sm" onClick={() => setView("quiz", { quizId: firstQuiz.id, courseId })} className="gap-1.5">
                <FileQuestion className="h-3.5 w-3.5" /> {t("takeQuiz")}
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Eligibility banner */}
      {eligibleForCert && (
        <GlassCard className="p-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {t("certEligible")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("notEligible").split(".")[0]}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setView("certificates")}>
              {t("viewCertificate")}
            </Button>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <GlassCard className="hidden lg:flex flex-col p-3 max-h-[calc(100vh-220px)] sticky top-20">
          <div className="flex items-center justify-between px-2 py-2 mb-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{t("modules")} / {t("lessons")}</p>
            <span className="text-[10px] text-muted-foreground">
              {progress.completedLessons}/{progress.totalLessons}
            </span>
          </div>
          <ScrollArea className="flex-1">
            {SidebarBody}
          </ScrollArea>
        </GlassCard>

        {/* Mobile sidebar sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0 glass-strong border-border/40">
            <SheetHeader className="px-3 py-3 border-b border-border/30">
              <SheetTitle className="text-sm">{t("modules")} / {t("lessons")}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-60px)] p-3">
              {SidebarBody}
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className="min-w-0">
          {activeLesson ? (
            <LessonPanel
              lesson={activeLesson}
              lang={lang}
              t={t}
              onNext={nextLesson ? () => setActiveLessonId(nextLesson.id) : null}
              onMarkComplete={() => completeMutation.mutate({ lessonId: activeLesson.id, completed: true })}
              marking={completeMutation.isPending}
              hasNext={!!nextLesson}
            />
          ) : (
            <GlassCard className="p-12">
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title={t("noLessonSelected")}
                hint={t("noLessonSelectedHint")}
              />
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonPanel({
  lesson, lang, t, onNext, onMarkComplete, marking, hasNext,
}: {
  lesson: LearningLesson;
  lang: "ms" | "en";
  t: (k: DictKey) => string;
  onNext: (() => void) | null;
  onMarkComplete: () => void;
  marking: boolean;
  hasNext: boolean;
}) {
  return (
    <GlassCard className="p-0 overflow-hidden">
      {/* Lesson header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border/30 glass">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg glass text-primary">
            <LessonTypeIcon type={lesson.type} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">{lesson.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                {lessonTypeLabel(lesson.type, t)}
              </Badge>
              {lesson.durationMin > 0 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {lesson.durationMin} {t("minutes")}
                </span>
              )}
              {lesson.completed && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-0.5" /> {t("completedBadge")}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lesson body */}
      <div className="p-5 min-h-[300px]">
        <LessonContent lesson={lesson} t={t} lang={lang} />
      </div>

      {/* Lesson footer */}
      <div className="flex items-center justify-between gap-3 p-4 border-t border-border/30 glass">
        <Button
          variant={lesson.completed ? "outline" : "default"}
          onClick={onMarkComplete}
          disabled={marking}
          className="gap-1.5"
        >
          {marking ? <Circle className="h-4 w-4 animate-pulse" /> : <CheckCircle2 className="h-4 w-4" />}
          {lesson.completed ? t("completedBadge") : t("markComplete")}
        </Button>
        {hasNext && onNext && (
          <Button variant="outline" onClick={onNext} className="gap-1.5">
            {t("nextLesson")} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

function LessonContent({ lesson, t, lang }: { lesson: LearningLesson; t: (k: DictKey) => string; lang: "ms" | "en" }) {
  const content = lesson.content || "";

  if (lesson.type === "video") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 rounded-xl border border-dashed border-border/40 glass">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <Play className="h-7 w-7" />
        </div>
        <p className="font-semibold">{t("videoDemo")}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{t("videoDemoHint")}</p>
        {content && (
          <p className="text-[11px] text-muted-foreground mt-3 font-mono break-all max-w-md">{content}</p>
        )}
      </div>
    );
  }

  if (lesson.type === "pdf") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 rounded-xl border border-dashed border-border/40 glass">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 mb-3">
          <FileText className="h-7 w-7" />
        </div>
        <p className="font-semibold">{t("pdfDoc")}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{t("pdfDocHint")}</p>
        {content && (
          <p className="text-[11px] text-muted-foreground mt-3 font-mono break-all max-w-md">{content}</p>
        )}
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" disabled>
          <Download className="h-3.5 w-3.5" /> {t("download")}
        </Button>
      </div>
    );
  }

  if (lesson.type === "lab") {
    return (
      <div className="rounded-xl border border-primary/20 glass overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-primary/20">
          <FlaskConical className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-primary">{t("labPrompt")}</p>
        </div>
        <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noDescription")}</p>
          )}
        </div>
      </div>
    );
  }

  // text type
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {content ? (
        <ReactMarkdown>{content}</ReactMarkdown>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noDescription")}</p>
      )}
    </div>
  );
}

function LessonTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "video": return <Video className={className} />;
    case "pdf": return <FileText className={className} />;
    case "lab": return <FlaskConical className={className} />;
    default: return <BookOpen className={className} />;
  }
}

function lessonTypeLabel(type: string, t: (k: DictKey) => string) {
  switch (type) {
    case "video": return t("lessonTypeVideo");
    case "pdf": return t("lessonTypePdf");
    case "lab": return t("lessonTypeLab");
    default: return t("lessonTypeText");
  }
}
