"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, EmptyState,
  levelStyles, statusStyles, initials,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, Pencil, BookOpen, Layers, FileText, Video, FlaskConical,
  FileQuestion, Clock, Users, CalendarDays, MapPin, Video as VideoIcon,
  User as UserIcon, CheckCircle2, XCircle, Target,
} from "lucide-react";
import { formatDateMY } from "@/lib/lms/audit";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  type: string;
  content: string | null;
  durationMin: number;
  order: number;
}
interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}
interface Question {
  id: string;
  type: string;
  text: string;
  options: string[];
  points: number;
}
interface Quiz {
  id: string;
  title: string;
  timeLimitMin: number;
  maxAttempts: number;
  passMark: number;
  questions: Question[];
}
interface Session {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: string;
  location: string | null;
  url: string | null;
  capacity: number | null;
  sessionCode: string | null;
  trainer: string | null;
}
interface Attempt {
  id: string;
  quizId: string;
  score: number;
  passed: boolean;
  submittedAt: string;
}

interface CourseDetailData {
  course: {
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
    category: { id: string; name: string; description: string | null } | null;
    instructor: { id: string; name: string; position: string | null; avatarColor: string } | null;
    modules: Module[];
    quizzes: Quiz[];
    sessions: Session[];
  };
  myEnrollment: { status: string; progressPct: number } | null;
  myAttempts: Attempt[];
  myLessonProgress: Record<string, boolean>;
  myAttendance: { id: string; status: string; method: string; sessionTitle: string; date: string; checkInAt: string | null }[];
}

export function CourseDetailView() {
  const { t, lang } = useI18n();
  const role = useSession((s) => s.effectiveRole());
  const user = useSession((s) => s.user);
  const viewParams = useUI((s) => s.viewParams);
  const setView = useUI((s) => s.setView);
  const courseId = viewParams.courseId;

  const query = useQuery<CourseDetailData>({
    queryKey: ["course-detail", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data as CourseDetailData;
    },
    enabled: !!courseId,
  });

  if (!courseId) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title={t("noCourses")}
        action={<Button onClick={() => setView("courses")}>{t("backToCourses")}</Button>}
      />
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title={t("noCourses")}
        action={<Button onClick={() => setView("courses")}>{t("backToCourses")}</Button>}
      />
    );
  }

  const { course, myEnrollment, myAttempts } = query.data;
  const isOwner = role === "ADMIN" || (role === "TRAINER" && course.instructor?.id === user?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setView("courses")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> {t("backToCourses")}
        </Button>
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => setView("course-editor", { courseId: course.id })}
          >
            <Pencil className="h-3.5 w-3.5" /> {t("editCourse")}
          </Button>
        )}
      </div>

      <PageHeader
        title={course.title}
        subtitle={`${course.code} • ${course.category?.name || t("noCategory")}`}
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          myEnrollment ? (
            <Button onClick={() => setView("learning", { courseId: course.id })}>
              {t("continueLearning")}
            </Button>
          ) : role === "STAFF" && course.status === "PUBLISHED" ? (
            <EnrollButton courseId={course.id} />
          ) : null
        }
      />

      <Tabs defaultValue="synopsis" className="w-full">
        <TabsList className="w-full max-w-full overflow-x-auto justify-start h-auto">
          <TabsTrigger value="synopsis">{t("synopsis")}</TabsTrigger>
          <TabsTrigger value="syllabus">{t("syllabus")} ({course.modules.length})</TabsTrigger>
          <TabsTrigger value="sessions">{t("sessions")} ({course.sessions.length})</TabsTrigger>
          <TabsTrigger value="quizzes">{t("quiz")} ({course.quizzes.length})</TabsTrigger>
        </TabsList>

        {/* SYNOPSIS */}
        <TabsContent value="synopsis">
          <div className="grid gap-6 lg:grid-cols-3">
            <GlassCard className="p-6 lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">{course.code}</Badge>
                <Badge variant="outline" className={`text-xs ${levelStyles[course.level] || levelStyles.SEMUA}`}>
                  {course.level}
                </Badge>
                <Badge variant="outline" className={`text-xs ${statusStyles[course.status]?.cls || ""}`}>
                  {statusStyles[course.status]?.label || course.status}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t("description")}
                </h3>
                <p className="text-sm text-foreground/90 whitespace-pre-line">
                  {course.description || t("noDescription")}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Target className="h-4 w-4" /> {t("outcomes")}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">{t("learningOutcomesHint")}</p>
                <ul className="space-y-1.5">
                  {deriveOutcomes(course).map((o, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>

            {/* Sidebar: meta + instructor */}
            <div className="space-y-4">
              <GlassCard className="p-5">
                <h3 className="font-semibold mb-3 text-sm">{t("instructor")}</h3>
                {course.instructor ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback
                        style={{ backgroundColor: course.instructor.avatarColor, color: "white" }}
                        className="text-sm font-semibold"
                      >
                        {initials(course.instructor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{course.instructor.name}</p>
                      {course.instructor.position && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <UserIcon className="h-3 w-3" /> {course.instructor.position}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("noInstructor")}</p>
                )}
              </GlassCard>

              <GlassCard className="p-5 space-y-3">
                <MetaRow icon={<Clock className="h-4 w-4" />} label={t("duration")} value={`${course.durationHours} ${t("hours")}`} />
                <MetaRow icon={<Target className="h-4 w-4" />} label={t("passMark")} value={`${course.passMark}%`} />
                {course.minAttendancePct > 0 && (
                  <MetaRow icon={<Users className="h-4 w-4" />} label={t("minAttendance")} value={`${course.minAttendancePct}%`} />
                )}
                <MetaRow icon={<Layers className="h-4 w-4" />} label={t("modules")} value={`${course.modules.length}`} />
                <MetaRow icon={<BookOpen className="h-4 w-4" />} label={t("lessons")} value={`${course.modules.reduce((a, m) => a + m.lessons.length, 0)}`} />
                <MetaRow icon={<FileQuestion className="h-4 w-4" />} label={t("quiz")} value={`${course.quizzes.length}`} />
              </GlassCard>

              {myEnrollment && (
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{t("progress")}</span>
                    <Badge variant="outline" className={`text-[10px] ${statusStyles[myEnrollment.status]?.cls || ""}`}>
                      {statusStyles[myEnrollment.status]?.label || myEnrollment.status}
                    </Badge>
                  </div>
                  <Progress value={myEnrollment.progressPct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">{myEnrollment.progressPct}% {t("completed").toLowerCase()}</p>
                </GlassCard>
              )}
            </div>
          </div>
        </TabsContent>

        {/* SYLLABUS */}
        <TabsContent value="syllabus">
          <GlassCard className="p-5">
            {course.modules.length === 0 ? (
              <EmptyState icon={<Layers className="h-6 w-6" />} title={t("noModules")} />
            ) : (
              <Accordion type="multiple" className="w-full">
                {course.modules.map((m, idx) => (
                  <AccordionItem key={m.id} value={m.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg glass text-primary text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.lessons.length} {t("lessons").toLowerCase()}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1 ml-11">
                        {m.lessons.map((l) => {
                          const done = !!query.data?.myLessonProgress?.[l.id];
                          const Icon = lessonTypeIcon(l.type);
                          return (
                            <li key={l.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent/10">
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${done ? "text-emerald-500" : "text-muted-foreground"}`}>
                                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                              </span>
                              <span className="text-sm flex-1 truncate">{l.title}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                {lessonTypeLabel(l.type, t)}
                              </Badge>
                              {l.durationMin > 0 && (
                                <span className="text-[10px] text-muted-foreground">{l.durationMin} {t("minutes")}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </GlassCard>
        </TabsContent>

        {/* SESSIONS */}
        <TabsContent value="sessions">
          <GlassCard className="p-5">
            {course.sessions.length === 0 ? (
              <EmptyState icon={<CalendarDays className="h-6 w-6" />} title={t("noSessions")} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("time")}</TableHead>
                    <TableHead>{t("mode")}</TableHead>
                    <TableHead>{t("location")}</TableHead>
                    <TableHead>{t("instructor")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {course.sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap">{formatDateMY(s.date)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{s.startTime} - {s.endTime}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {s.mode === "dalam_talian" ? <><VideoIcon className="h-3 w-3 mr-1" /> {t("online")}</> : <><MapPin className="h-3 w-3 mr-1" /> {t("faceToFace")}</>}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {s.mode === "dalam_talian" && s.url ? s.url : s.location || "-"}
                      </TableCell>
                      <TableCell className="text-xs">{s.trainer || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </GlassCard>
        </TabsContent>

        {/* QUIZZES */}
        <TabsContent value="quizzes">
          <div className="space-y-4">
            {course.quizzes.length === 0 ? (
              <GlassCard className="p-5">
                <EmptyState icon={<FileQuestion className="h-6 w-6" />} title={t("noQuizzes")} />
              </GlassCard>
            ) : (
              course.quizzes.map((q) => {
                const attemptsForQ = myAttempts.filter((a) => a.quizId === q.id);
                const bestScore = attemptsForQ.length ? Math.max(...attemptsForQ.map((a) => a.score)) : null;
                const passed = attemptsForQ.some((a) => a.passed);
                const canRetry = attemptsForQ.length < q.maxAttempts;
                return (
                  <GlassCard key={q.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base">{q.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <Clock className="h-3 w-3 mr-1" /> {q.timeLimitMin} {t("minutes")}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <Target className="h-3 w-3 mr-1" /> {t("passMark")} {q.passMark}%
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {q.maxAttempts} {lang === "ms" ? "cubaan" : "attempts"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {q.questions.length} {t("questions")}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {myEnrollment && (canRetry || attemptsForQ.length === 0) ? (
                          <Button size="sm" onClick={() => setView("quiz", { quizId: q.id, courseId: course.id })}>
                            {attemptsForQ.length === 0 ? t("startQuiz") : t("retryQuiz")}
                          </Button>
                        ) : !myEnrollment && role === "STAFF" ? (
                          <span className="text-xs text-muted-foreground">{t("notEnrolled")}</span>
                        ) : null}
                      </div>
                    </div>

                    {attemptsForQ.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase">
                            {t("attemptsUsed")} ({attemptsForQ.length}/{q.maxAttempts})
                          </span>
                          {passed && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> {t("pass")}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {attemptsForQ.map((a, i) => (
                            <div key={a.id} className="flex items-center justify-between text-xs rounded-lg glass px-2.5 py-1.5">
                              <span>{lang === "ms" ? "Cubaan" : "Attempt"} #{attemptsForQ.length - i}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{a.score}%</span>
                                {a.passed ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-rose-500" />
                                )}
                                <span className="text-muted-foreground">{formatDateMY(a.submittedAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {bestScore !== null && (
                          <p className="text-[11px] text-muted-foreground mt-2">
                            {lang === "ms" ? "Skor terbaik" : "Best score"}: <span className="font-semibold text-foreground">{bestScore}%</span>
                          </p>
                        )}
                      </div>
                    )}
                  </GlassCard>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EnrollButton({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  return (
    <Button
      onClick={async () => {
        try {
          const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          toast.success(t("enrollSuccess"));
          qc.invalidateQueries({ queryKey: ["course-detail", courseId] });
          qc.invalidateQueries({ queryKey: ["courses"] });
        } catch {
          toast.error(t("enrollFailed"));
        }
      }}
    >
      {t("enrollNow")}
    </Button>
  );
}

// Derive simple outcomes from modules (first lesson of each module)
function deriveOutcomes(course: { modules: Module[] }): string[] {
  if (course.modules.length === 0) return [];
  return course.modules.map((m) => {
    const firstLesson = m.lessons[0];
    return firstLesson ? `${m.title}: ${firstLesson.title}` : m.title;
  });
}

function lessonTypeIcon(type: string) {
  switch (type) {
    case "video": return Video;
    case "pdf": return FileText;
    case "lab": return FlaskConical;
    default: return FileText;
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
