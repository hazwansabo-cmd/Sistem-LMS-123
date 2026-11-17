"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, EmptyState,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, FileQuestion, Clock, Target, CheckCircle2, XCircle,
  Award, RefreshCw, AlertTriangle, BookOpen, PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  id: string;
  type: string;
  text: string;
  options: string[];
  points: number;
}
interface LearningQuiz {
  id: string;
  title: string;
  timeLimitMin: number;
  maxAttempts: number;
  passMark: number;
  questions: QuizQuestion[];
}
interface LearningData {
  course: { id: string; code: string; title: string; passMark: number; minAttendancePct: number };
  modules: unknown[];
  quizzes: LearningQuiz[];
  myAttempts: { id: string; quizId: string; score: number; passed: boolean; submittedAt: string }[];
  progress: { completedLessons: number; totalLessons: number; lessonPct: number; enrollmentStatus: string; progressPct: number };
}

interface SubmitResponse {
  ok: boolean;
  attemptId: string;
  score: number;
  passed: boolean;
  maxAttempts: number;
  attemptsUsed: number;
  breakdown: { questionId: string; correct: boolean; correctAnswer: string; yourAnswer: string; explanation: string | null }[];
  certificateIssued: { id: string; certNo: string } | null;
}

export function QuizView() {
  const { t, lang } = useI18n();
  const viewParams = useUI((s) => s.viewParams);
  const setView = useUI((s) => s.setView);
  const quizId = viewParams.quizId;
  const courseId = viewParams.courseId;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [prevQuizId, setPrevQuizId] = useState<string | null>(null);
  const submittedRef = useRef(false);

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

  const quiz = useMemo(
    () => query.data?.quizzes.find((q) => q.id === quizId) || null,
    [query.data, quizId]
  );

  const attemptsForQuiz = useMemo(
    () => query.data?.myAttempts.filter((a) => a.quizId === quizId) || [],
    [query.data, quizId]
  );

  const attemptsUsed = attemptsForQuiz.length;
  const noAttemptsLeft = quiz ? attemptsUsed >= quiz.maxAttempts : false;

  const submitMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await fetch(`/api/quiz/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      return data as SubmitResponse;
    },
    onSuccess: (data) => {
      setResult(data);
      setTimeLeft(null);
      if (data.passed) {
        toast.success(t("quizPassed"));
      } else {
        toast.error(t("quizFailed"));
      }
    },
    onError: (e) => {
      toast.error((e as Error).message || t("quizSubmitFailed"));
      submittedRef.current = false;
    },
  });

  const handleSubmit = (force = false) => {
    if (submittedRef.current) return;
    if (!quiz) return;
    // Validate all answered
    if (!force) {
      const unanswered = quiz.questions.filter((q) => !answers[q.id]?.trim());
      if (unanswered.length > 0) {
        toast.error(t("answerRequired"));
        return;
      }
    }
    setShowConfirm(false);
    submittedRef.current = true;
    submitMutation.mutate(answers);
  };

  // Initialize timer when quiz loads (store-info-from-previous-render pattern)
  if (quiz && quiz.id !== prevQuizId && !result && !noAttemptsLeft && timeLeft === null) {
    setPrevQuizId(quiz.id);
    setTimeLeft(quiz.timeLimitMin * 60);
  }

  // Countdown - auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === null || result) return;
    if (timeLeft <= 0) {
      if (!submittedRef.current) {
        toast.warning(t("timeUp"));
        submittedRef.current = true;
        submitMutation.mutate(answers);
      }
      return;
    }
    const h = setTimeout(() => setTimeLeft((p) => (p === null ? null : p - 1)), 1000);
    return () => clearTimeout(h);
  }, [timeLeft, result]);

  if (!courseId || !quizId) {
    return (
      <EmptyState
        icon={<FileQuestion className="h-6 w-6" />}
        title={t("noQuizzes")}
        action={<Button onClick={() => setView("courses")}>{t("backToCourses")}</Button>}
      />
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <EmptyState
        icon={<FileQuestion className="h-6 w-6" />}
        title={t("notEnrolled")}
        hint={t("notEnrolledHint")}
        action={<Button onClick={() => setView("course-detail", { courseId })}>{t("backToCourse")}</Button>}
      />
    );
  }

  if (!quiz) {
    return (
      <EmptyState
        icon={<FileQuestion className="h-6 w-6" />}
        title={t("noQuizzes")}
        action={<Button onClick={() => setView("course-detail", { courseId })}>{t("backToCourse")}</Button>}
      />
    );
  }

  // Results screen
  if (result) {
    return <QuizResults result={result} quiz={quiz} t={t} lang={lang} onRetry={() => {
      setResult(null);
      setAnswers({});
      setTimeLeft(quiz.timeLimitMin * 60);
      submittedRef.current = false;
    }} onBack={() => setView("learning", { courseId })} onViewCerts={() => setView("certificates")} />;
  }

  // No attempts left
  if (noAttemptsLeft) {
    return (
      <div className="space-y-4">
        <QuizHeader quiz={quiz} course={query.data.course} timeLeft={null} attemptsUsed={attemptsUsed} t={t} onBack={() => setView("learning", { courseId })} />
        <GlassCard className="p-8">
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
            title={t("noAttemptsLeft")}
            hint={t("noAttemptsLeftHint")}
            action={
              <Button variant="outline" onClick={() => setView("learning", { courseId })}>
                {t("backToLearning")}
              </Button>
            }
          />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <QuizHeader
        quiz={quiz}
        course={query.data.course}
        timeLeft={timeLeft}
        attemptsUsed={attemptsUsed}
        t={t}
        onBack={() => setView("learning", { courseId })}
      />

      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">
            {quiz.questions.length} {t("questions")}
          </h2>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {t("attemptsUsed")}: {attemptsUsed}/{quiz.maxAttempts}
          </Badge>
        </div>

        <ScrollArea className="max-h-[calc(100vh-340px)] pr-2">
          <div className="space-y-5">
            {quiz.questions.map((q, i) => (
              <QuestionBlock
                key={q.id}
                question={q}
                index={i}
                answer={answers[q.id] || ""}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                t={t}
                lang={lang}
              />
            ))}
          </div>
        </ScrollArea>
      </GlassCard>

      {/* Submit footer */}
      <GlassCard strong className="p-4 sticky bottom-2 z-10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {Object.keys(answers).length}/{quiz.questions.length} {t("questions").toLowerCase()} {lang === "ms" ? "dijawab" : "answered"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setView("learning", { courseId })}>
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowConfirm(true)}
              disabled={submitMutation.isPending}
              className="gap-1.5"
            >
              {submitMutation.isPending ? (
                <><Clock className="h-3.5 w-3.5 animate-spin" /> {t("quizSubmitting")}</>
              ) : (
                <>{t("submitQuiz")}</>
              )}
            </Button>
          </div>
        </div>
      </GlassCard>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("submitConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("submitConfirmHint")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(false)}>
              {t("submit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function QuizHeader({
  quiz, course, timeLeft, attemptsUsed, t, onBack,
}: {
  quiz: LearningQuiz;
  course: { id: string; code: string; title: string };
  timeLeft: number | null;
  attemptsUsed: number;
  t: (k: DictKey) => string;
  onBack: () => void;
}) {
  const isLow = timeLeft !== null && timeLeft <= 60;
  const mm = timeLeft !== null ? Math.floor(timeLeft / 60) : 0;
  const ss = timeLeft !== null ? timeLeft % 60 : 0;

  return (
    <GlassCard strong className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0" aria-label={t("backToLearning")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg glass text-primary">
            <FileQuestion className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{quiz.title}</p>
            <p className="text-xs text-muted-foreground truncate">{course.code} - {course.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            <Target className="h-3 w-3 mr-1" /> {t("passMark")} {quiz.passMark}%
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {t("maxAttempts")}: {quiz.maxAttempts}
          </Badge>
          {timeLeft !== null && (
            <Badge
              variant="outline"
              className={cn("text-xs font-mono px-2 py-0", isLow ? "bg-rose-500/15 text-rose-600 border-rose-500/30" : "")}
            >
              <Clock className="h-3 w-3 mr-1" />
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </Badge>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function QuestionBlock({
  question, index, answer, onChange, t, lang,
}: {
  question: QuizQuestion;
  index: number;
  answer: string;
  onChange: (v: string) => void;
  t: (k: DictKey) => string;
  lang: "ms" | "en";
}) {
  const labelId = `q-${question.id}`;
  return (
    <div className="rounded-xl glass p-4">
      <div className="flex items-start gap-2 mb-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary text-xs font-bold">
          {index + 1}
        </span>
        <Label htmlFor={labelId} className="text-sm font-medium leading-snug pt-1 cursor-pointer">
          {question.text}
          <span className="ml-2 text-[10px] text-muted-foreground font-normal">
            ({question.points} {lang === "ms" ? "mata" : "pts"})
          </span>
        </Label>
      </div>

      {question.type === "multiple" && (
        <RadioGroup value={answer} onValueChange={onChange} className="pl-9">
          {question.options.map((opt, i) => {
            const optId = `${labelId}-opt-${i}`;
            return (
              <div key={optId} className="flex items-center gap-2.5">
                <RadioGroupItem id={optId} value={opt} />
                <Label htmlFor={optId} className="text-sm font-normal cursor-pointer">{opt}</Label>
              </div>
            );
          })}
        </RadioGroup>
      )}

      {question.type === "truefalse" && (
        <RadioGroup value={answer} onValueChange={onChange} className="pl-9">
          <div className="flex items-center gap-2.5">
            <RadioGroupItem id={`${labelId}-true`} value="Benar" />
            <Label htmlFor={`${labelId}-true`} className="text-sm font-normal cursor-pointer">
              {lang === "ms" ? "Benar" : "True"}
            </Label>
          </div>
          <div className="flex items-center gap-2.5">
            <RadioGroupItem id={`${labelId}-false`} value="Salah" />
            <Label htmlFor={`${labelId}-false`} className="text-sm font-normal cursor-pointer">
              {lang === "ms" ? "Salah" : "False"}
            </Label>
          </div>
        </RadioGroup>
      )}

      {question.type === "short" && (
        <div className="pl-9">
          <Input
            id={labelId}
            value={answer}
            onChange={(e) => onChange(e.target.value)}
            placeholder={lang === "ms" ? "Tulis jawapan anda..." : "Type your answer..."}
            className="max-w-md"
          />
        </div>
      )}
    </div>
  );
}

function QuizResults({
  result, quiz, t, lang, onRetry, onBack, onViewCerts,
}: {
  result: SubmitResponse;
  quiz: LearningQuiz;
  t: (k: DictKey) => string;
  lang: "ms" | "en";
  onRetry: () => void;
  onBack: () => void;
  onViewCerts: () => void;
}) {
  const passed = result.passed;
  const canRetry = result.attemptsUsed < quiz.maxAttempts;

  return (
    <div className="space-y-4">
      {/* Score banner */}
      <GlassCard strong className={cn(
        "p-6 text-center",
        passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
      )}>
        <div className={cn(
          "flex h-16 w-16 mx-auto items-center justify-center rounded-full mb-3",
          passed ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
        )}>
          {passed ? <PartyPopper className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
        </div>
        <p className="text-4xl font-bold">{result.score}%</p>
        <p className={cn("text-sm font-semibold mt-1", passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
          {passed ? t("quizPassed") : t("quizFailed")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("passMark")}: {quiz.passMark}% • {t("attemptsUsed")}: {result.attemptsUsed}/{quiz.maxAttempts}
        </p>
      </GlassCard>

      {/* Certificate banner */}
      {result.certificateIssued && (
        <GlassCard className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {t("certEligible")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("certNo")}: <span className="font-mono">{result.certificateIssued.certNo}</span>
              </p>
            </div>
            <Button size="sm" onClick={onViewCerts} className="gap-1.5">
              <Award className="h-3.5 w-3.5" /> {t("certificatesView")}
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Breakdown */}
      <GlassCard className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" /> {t("quizResults")} - {t("explanation")}
        </h3>
        <div className="space-y-3 max-h-[calc(100vh-460px)] overflow-y-auto pr-1">
          {result.breakdown.map((b, i) => {
            const q = quiz.questions.find((qq) => qq.id === b.questionId);
            return (
              <div
                key={b.questionId}
                className={cn(
                  "rounded-xl border p-4",
                  b.correct
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-rose-500/30 bg-rose-500/5"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white text-xs",
                    b.correct ? "bg-emerald-500" : "bg-rose-500"
                  )}>
                    {b.correct ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">
                      <span className="text-muted-foreground mr-1">{i + 1}.</span>
                      {q?.text || `Q${i + 1}`}
                    </p>
                    <div className="mt-2 space-y-1 text-xs">
                      <p className={b.correct ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                        <span className="font-semibold">{t("yourAnswer")}: </span>
                        <span className={b.yourAnswer ? "" : "italic text-muted-foreground"}>
                          {b.yourAnswer || t("unanswered")}
                        </span>
                      </p>
                      {!b.correct && (
                        <p className="text-emerald-700 dark:text-emerald-400">
                          <span className="font-semibold">{t("correctAnswer")}: </span>
                          {b.correctAnswer}
                        </p>
                      )}
                      {b.explanation && (
                        <p className="text-muted-foreground italic mt-1.5 pt-1.5 border-t border-border/30">
                          {b.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-center gap-2 sm:justify-end">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("backToLearning")}
        </Button>
        {canRetry && !passed && (
          <Button onClick={onRetry} className="w-full sm:w-auto gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> {t("retry")}
          </Button>
        )}
      </div>
    </div>
  );
}
