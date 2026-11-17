"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUI } from "@/store/app";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";
import {
  GlassCard, PageHeader, EmptyState, StatCard, statusStyles,
} from "@/components/lms/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, Upload, FileText, CheckCircle2, XCircle,
  AlertTriangle, Info, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SessionDetail {
  id: string;
  title: string;
  code: string | null;
  date: string;
}

interface SessionDetailResponse {
  session: SessionDetail;
}

interface PreviewRow {
  row: number;
  staffNo: string;
  name: string | null;
  status: string;
  checkIn: string | null;
  remarks: string | null;
  valid: boolean;
  error: string | null;
}

interface ImportResponse {
  ok: boolean;
  totalRows: number;
  valid: number;
  created: number;
  updated: number;
  preview: PreviewRow[];
}

export function AttendanceImportView() {
  const { t } = useI18n();
  const viewParams = useUI((s) => s.viewParams);
  const setView = useUI((s) => s.setView);
  const qc = useQueryClient();
  const sessionId = viewParams.sessionId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const detailQuery = useQuery<SessionDetailResponse>({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sesi tidak dijumpai");
      return data as SessionDetailResponse;
    },
    enabled: !!sessionId,
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/attendance/import?sessionId=${sessionId}`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengimport");
      return data as ImportResponse;
    },
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["session", sessionId] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success(`${data.created} dicipta, ${data.updated} dikemas kini`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResult(null);
      importMutation.mutate(file);
    }
  };

  const onPickFile = () => {
    fileInputRef.current?.click();
  };

  if (!sessionId) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title={t("noData")}
        action={<Button onClick={() => setView("attendance")} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> {t("back")}</Button>}
      />
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title={detailQuery.error?.message || t("noData")}
        action={<Button onClick={() => setView("attendance")} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> {t("back")}</Button>}
      />
    );
  }

  const session = detailQuery.data.session;
  const invalidCount = result ? result.totalRows - result.valid : 0;
  const preview = result?.preview ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("importCsv")}
        subtitle={`${session.title}${session.code ? " - " + session.code : ""}`}
        icon={<Upload className="h-5 w-5" />}
        actions={
          <Button variant="ghost" size="sm" onClick={() => setView("attendance-list", { sessionId })} className="gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("back")}
          </Button>
        }
      />

      {!result && (
        <GlassCard
          className="p-8 border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/40 transition-colors"
          onClick={onPickFile}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            className="hidden"
            aria-label="CSV file"
          />
          <div className="flex flex-col items-center justify-center text-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl glass text-primary">
              {importMutation.isPending ? (
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="font-medium text-base">
                {importMutation.isPending ? t("loading") : "Muat Naik & Pratonton CSV"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Klik untuk pilih fail CSV. Rekod sah akan dipratonton dan disimpan secara automatik.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg glass text-primary">
            <Info className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Format CSV Dijangka</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lajur: <code className="font-mono text-[11px] bg-muted/40 px-1.5 py-0.5 rounded">staffNo, status, checkIn, remarks</code>
            </p>
            <pre className="mt-2 text-[11px] font-mono bg-muted/40 rounded-md p-3 overflow-x-auto">
{`staffNo,status,checkIn,remarks
EMP001,hadir,09:05,
EMP002,lewat,09:25,Lewat 25 minit
EMP003,tidak_hadir,,MC
EMP004,cuti,,Cuti tahunan
EMP005,dikecualikan,,Tugas rasmi`}
            </pre>
            <p className="text-[11px] text-muted-foreground mt-2">
              Status yang sah: <code className="font-mono">hadir</code>, <code className="font-mono">lewat</code>, <code className="font-mono">tidak_hadir</code>, <code className="font-mono">cuti</code>, <code className="font-mono">dikecualikan</code>.
              <code className="font-mono ml-2">checkIn</code> dalam format <code className="font-mono">HH:mm</code> (pilihan).
            </p>
          </div>
        </div>
      </GlassCard>

      {result && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label={t("total")} value={result.totalRows} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="Sah" value={result.valid} icon={<CheckCircle2 className="h-5 w-5" />} accent="accent" />
            <StatCard label="Tidak Sah" value={invalidCount} icon={<XCircle className="h-5 w-5" />} accent={invalidCount > 0 ? "danger" : undefined} />
            <StatCard label="Dicipta / Dikemas Kini" value={`${result.created} / ${result.updated}`} icon={<ArrowRight className="h-5 w-5" />} />
          </div>

          {invalidCount > 0 && (
            <GlassCard className="p-4 bg-amber-500/5 border-amber-500/20">
              <div className="flex items-start gap-2.5 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-700 dark:text-amber-400">
                  {invalidCount} baris tidak sah telah diabaikan. Semak lajur <code className="font-mono text-[11px]">error</code> di bawah untuk butiran.
                </p>
              </div>
            </GlassCard>
          )}

          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
              <h2 className="font-semibold text-sm">Pratonton Import</h2>
              <Button variant="outline" size="sm" onClick={onPickFile} className="gap-1">
                <Upload className="h-3.5 w-3.5" /> Import Semula
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={onFileChange} className="hidden" aria-label="CSV file" />
            </div>
            <ScrollArea className="max-h-[480px] w-full">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead className="min-w-[120px]">{t("staffNo")}</TableHead>
                      <TableHead className="min-w-[180px]">{t("name")}</TableHead>
                      <TableHead className="min-w-[120px]">{t("status")}</TableHead>
                      <TableHead className="min-w-[100px] hidden sm:table-cell">{t("time")}</TableHead>
                      <TableHead className="min-w-[180px] hidden md:table-cell">{t("reason")}</TableHead>
                      <TableHead className="min-w-[60px] text-center">OK</TableHead>
                      <TableHead className="min-w-[200px]">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row) => {
                      const sty = statusStyles[row.status] || null;
                      return (
                        <TableRow key={row.row} className={cn(!row.valid && "bg-rose-500/5")}>
                          <TableCell className="text-xs text-muted-foreground font-mono">{row.row}</TableCell>
                          <TableCell className="font-mono text-xs">{row.staffNo}</TableCell>
                          <TableCell className="text-xs">{row.name || <span className="text-muted-foreground">-</span>}</TableCell>
                          <TableCell>
                            {sty ? (
                              <Badge variant="outline" className={cn("text-[10px]", sty.cls)}>{sty.label}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{row.status || "-"}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs hidden sm:table-cell font-mono">{row.checkIn || "-"}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell text-muted-foreground max-w-[200px] truncate">{row.remarks || "-"}</TableCell>
                          <TableCell className="text-center">
                            {row.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-500 inline" />
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.error ? (
                              <span className="text-rose-600">{row.error}</span>
                            ) : (
                              <span className="text-emerald-600">OK</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </GlassCard>

          <GlassCard strong className="p-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-base">Import Selesai</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.created} rekod dicipta, {result.updated} dikemas kini.
                  {invalidCount > 0 && ` ${invalidCount} baris tidak sah diabaikan.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" onClick={() => setView("attendance-list", { sessionId })} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> {t("back")} - {t("sessions")}
                </Button>
                <Button onClick={() => { setResult(null); }} className="gap-1">
                  <Upload className="h-4 w-4" /> Import Lain
                </Button>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
