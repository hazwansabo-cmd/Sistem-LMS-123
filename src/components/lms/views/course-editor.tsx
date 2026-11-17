"use client";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import {
  GlassCard, PageHeader,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft, Save, BookOpen, Info, Code2,
} from "lucide-react";
import { toast } from "sonner";

const LEVELS = ["PEMULA", "PERTENGAHAN", "LANJUTAN", "SEMUA"] as const;
const LANGUAGES = ["ms", "en", "bilingual"] as const;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const PATHS = ["ALL", "ADMIN_FINANCE", "CUSTOMER_SERVICE", "IT_DEV"] as const;

const schema = z.object({
  code: z.string().min(2, { message: "Kod kursus diperlukan" }),
  title: z.string().min(3, { message: "Tajuk kursus diperlukan" }),
  description: z.string().default(""),
  categoryId: z.string().default(""),
  level: z.enum(LEVELS).default("PEMULA"),
  language: z.enum(LANGUAGES).default("bilingual"),
  durationHours: z.number().positive({ message: "Tempoh mesti lebih besar dari 0" }),
  status: z.enum(STATUSES).default("DRAFT"),
  passMark: z.number().min(0).max(100, { message: "Markah mesti antara 0-100" }),
  minAttendancePct: z.number().min(0).max(100).default(0),
  learningPath: z.enum(PATHS).default("ALL"),
});

type FormValues = z.infer<typeof schema>;

interface DepartmentsResponse {
  departments: { id: string; name: string; userCount: number }[];
  categories: { id: string; name: string; description: string | null; courseCount: number }[];
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
    categoryId: string | null;
    category: { id: string; name: string; description: string | null } | null;
  };
}

export function CourseEditorView() {
  const { t, lang } = useI18n();
  const viewParams = useUI((s) => s.viewParams);
  const setView = useUI((s) => s.setView);
  const qc = useQueryClient();
  const courseId = viewParams.courseId;
  const isEdit = !!courseId;

  const deptQuery = useQuery<DepartmentsResponse>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      return (await res.json()) as DepartmentsResponse;
    },
  });

  const courseQuery = useQuery<CourseDetailData>({
    queryKey: ["course-detail", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data as CourseDetailData;
    },
    enabled: isEdit,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      code: "",
      title: "",
      description: "",
      categoryId: "",
      level: "PEMULA",
      language: "bilingual",
      durationHours: 4,
      status: "DRAFT",
      passMark: 70,
      minAttendancePct: 0,
      learningPath: "ALL",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (isEdit && courseQuery.data?.course) {
      const c = courseQuery.data.course;
      form.reset({
        code: c.code,
        title: c.title,
        description: c.description || "",
        categoryId: c.categoryId || "",
        level: (LEVELS.includes(c.level as typeof LEVELS[number]) ? c.level : "PEMULA") as typeof LEVELS[number],
        language: (LANGUAGES.includes(c.language as typeof LANGUAGES[number]) ? c.language : "bilingual") as typeof LANGUAGES[number],
        durationHours: c.durationHours,
        status: (STATUSES.includes(c.status as typeof STATUSES[number]) ? c.status : "DRAFT") as typeof STATUSES[number],
        passMark: c.passMark,
        minAttendancePct: c.minAttendancePct,
        learningPath: (PATHS.includes(c.learningPath as typeof PATHS[number]) ? c.learningPath : "ALL") as typeof PATHS[number],
      });
    }
  }, [isEdit, courseQuery.data, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        code: values.code,
        title: values.title,
        description: values.description || "",
        categoryId: values.categoryId || null,
        level: values.level,
        language: values.language,
        durationHours: values.durationHours,
        status: values.status,
        passMark: values.passMark,
        minAttendancePct: values.minAttendancePct,
        learningPath: values.learningPath,
      };
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/courses/${courseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/courses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success(t("courseSaved"));
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["course-detail", courseId] });
      qc.invalidateQueries({ queryKey: ["course-detail", data.course?.id] });
      setView("course-detail", { courseId: data.course?.id || courseId || "" });
    } catch (e) {
      toast.error((e as Error).message || t("courseSaveFailed"));
    }
  };

  const isLoading = isEdit && courseQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setView(isEdit ? "course-detail" : "courses", isEdit ? { courseId } : undefined)} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Button>
      </div>

      <PageHeader
        title={isEdit ? t("editExistingCourse") : t("createNewCourse")}
        subtitle={t("courseEditorSub")}
        icon={<BookOpen className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
            <GlassCard className="p-6 space-y-5">
              {/* Code + Title */}
              <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Code2 className="h-3.5 w-3.5" /> {t("courseCode")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="AI-101"
                          disabled={isEdit}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormDescription>{t("codeHint")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("name")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("titleHint")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder={lang === "ms" ? "Penerangan ringkas kursus..." : "Brief course description..."}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category + Level */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("category")}</FormLabel>
                      <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("noCategory")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t("noCategory")}</SelectItem>
                          {deptQuery.data?.categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.courseCount})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("level")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Language + Duration */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("language")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ms">{t("langMs")}</SelectItem>
                          <SelectItem value="en">{t("langEn")}</SelectItem>
                          <SelectItem value="bilingual">{t("langBilingual")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="durationHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("duration")} ({t("hours")})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* PassMark + Attendance */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="passMark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("passMark")} (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormDescription>{t("markRange")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minAttendancePct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("minAttendance")} (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        0 = {lang === "ms" ? "tidak diwajibkan" : "not required"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status + Learning Path */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("publishStatus")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DRAFT">{lang === "ms" ? "Draf" : "Draft"}</SelectItem>
                          <SelectItem value="PUBLISHED">{t("published")}</SelectItem>
                          <SelectItem value="ARCHIVED">{lang === "ms" ? "Diarkibkan" : "Archived"}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="learningPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("learningPath")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ALL">{t("pathAll")}</SelectItem>
                          <SelectItem value="ADMIN_FINANCE">{t("pathAdmin")}</SelectItem>
                          <SelectItem value="CUSTOMER_SERVICE">{t("pathCs")}</SelectItem>
                          <SelectItem value="IT_DEV">{t("pathIt")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </GlassCard>

            {/* Note */}
            <GlassCard className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">
                    {lang === "ms" ? "Nota:" : "Note:"}
                  </p>
                  {t("courseEditorSub")}{" "}
                  {isEdit && (
                    <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                      {lang === "ms" ? "Mod Sunting" : "Edit Mode"}
                    </Badge>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setView(isEdit ? "course-detail" : "courses", isEdit ? { courseId } : undefined)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="gap-1.5">
                <Save className="h-4 w-4" />
                {form.formState.isSubmitting ? t("loading") : t("saveCourse")}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
