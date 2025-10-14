"use client";

import Papa, { type ParseResult } from "papaparse";
import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AggregatedSales, aggregate } from "../../lib/agg/sales";
import {
  MAX_ROWS,
  SalesCsvRowSchema,
  normalizeRow,
  projectCsvRow,
  type SalesRow,
  type RawCsvRow,
} from "../../lib/types/sales";
import { saveDataset } from "../../lib/save";
import { useAuth } from "../../components/AuthProvider";
import { AuthBar } from "../../components/AuthBar";
import { CsvPreview } from "../../components/CsvPreview";
import { SummaryCards } from "../../components/SummaryCards";
import { BreakdownTables } from "../../components/BreakdownTables";
import { PageContainer } from "../../components/PageContainer";
import { SalesCharts } from "../../components/SalesCharts";

type ParseIssue = {
  index: number;
  message: string;
};

type ParseStats = {
  total: number;
  valid: number;
  invalid: number;
};

const parseFile = (file: File): Promise<RawCsvRow[]> =>
  new Promise((resolve, reject) => {
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "utf-8",
      complete: (results: ParseResult<Record<string, unknown>>) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0]?.message ?? "CSV parsing failed"));
          return;
        }
        resolve(results.data);
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });

const formatNumber = (value: number) => value.toLocaleString();

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [summary, setSummary] = useState<AggregatedSales | null>(null);
  const [issues, setIssues] = useState<ParseIssue[]>([]);
  const [stats, setStats] = useState<ParseStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) {
        return;
      }

      const targetFile = selectedFiles.item(0);
      if (!targetFile) {
        return;
      }

      if (!targetFile.name.toLowerCase().endsWith(".csv")) {
        setError("CSV ファイルを選択してください");
        return;
      }

      setError(null);
      setInfoMessage(null);
      setFile(targetFile);
      setRows([]);
      setSummary(null);
      setIssues([]);
      setStats(null);
      setIsParsing(true);

      try {
        const parsed = await parseFile(targetFile);
        const validRows: SalesRow[] = [];
        const collectedIssues: ParseIssue[] = [];

        parsed.forEach((rawRow, index) => {
          const projectedRow = projectCsvRow(rawRow);
          const result = SalesCsvRowSchema.safeParse(projectedRow);
          if (!result.success) {
            collectedIssues.push({
              index: index + 1,
              message: result.error.issues[0]?.message ?? "バリデーションエラー",
            });
            return;
          }

          try {
            const normalized = normalizeRow(result.data);
            validRows.push(normalized);
          } catch (normalizationError) {
            const message =
              normalizationError instanceof Error
                ? normalizationError.message
                : "正規化中にエラーが発生しました";
            collectedIssues.push({
              index: index + 1,
              message,
            });
          }
        });

        if (validRows.length > MAX_ROWS) {
          setError(`行数が上限(${MAX_ROWS})を超えています`);
          setRows([]);
          setSummary(null);
          setStats({ total: parsed.length, valid: validRows.length, invalid: collectedIssues.length });
          setIssues(collectedIssues.slice(0, 20));
          return;
        }

        const aggregates = aggregate(validRows);

        setRows(validRows);
        setSummary(aggregates);
        setIssues(collectedIssues.slice(0, 20));
        setStats({ total: parsed.length, valid: validRows.length, invalid: collectedIssues.length });
        setInfoMessage(collectedIssues.length > 0 ? "一部の行はバリデーションエラーで除外されました" : null);
      } catch (parseError) {
        const message = parseError instanceof Error ? parseError.message : "ファイル解析に失敗しました";
        setError(message);
      } finally {
        setIsParsing(false);
      }
    },
    [],
  );

  const handleFileInput = useCallback((event: FormEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    void handleFiles(target.files);
  }, [handleFiles]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      void handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const canSave = useMemo(() => rows.length > 0 && summary !== null, [rows.length, summary]);

  const saveDisabledReason = useMemo(() => {
    if (!canSave) {
      return "解析済みデータがありません";
    }
    return null;
  }, [canSave]);

  const handleSave = useCallback(async () => {
    if (!user || !file || !summary) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setInfoMessage(null);

    try {
      await saveDataset({
        rows,
        file,
        filename: file.name,
        userId: user.uid,
        orgId: user.uid,
        summary,
      });
      setInfoMessage("保存が完了しました");
      router.push("/datasets");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "保存に失敗しました";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, [file, summary, rows, user, router]);

  return (
    <div className="min-h-screen pb-16">
      <AuthBar onSave={handleSave} canSave={canSave} isSaving={isSaving} saveDisabledReason={saveDisabledReason} />

      <PageContainer>
        <main className="flex flex-1 flex-col gap-8">
          <section
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`card-surface relative flex min-h-[220px] flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-white/60 px-6 py-10 text-center shadow-2xl transition ${
              dragActive ? "ring-4 ring-blue-300/50" : ""
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-white/40 to-white/20" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <p className="text-lg font-semibold text-slate-800">CSV をドラッグ & ドロップ</p>
              <p className="text-sm text-slate-500">またはボタンからファイルを選択してください（最大 1000 行）</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
                <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1">ヘッダー行必須</span>
                <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1">UTF-8 (推奨)</span>
                <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1">ts / name / qty / pricemode / linetotal / status</span>
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-4 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
              >
                ファイルを選択
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                onInput={handleFileInput}
                className="hidden"
              />
              {file && (
                <p className="text-xs text-slate-500">
                  選択中: <span className="font-medium text-slate-700">{file.name}</span>
                </p>
              )}
              {isParsing && <p className="text-sm font-medium text-blue-600">解析中...</p>}
            </div>
          </section>

          {(error || infoMessage) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {error && (
                <div className="card-surface rounded-2xl border border-rose-200/70 bg-rose-50/80 px-5 py-4 text-sm font-medium text-rose-600 shadow-lg">
                  {error}
                </div>
              )}
              {infoMessage && (
                <div className="card-surface rounded-2xl border border-blue-200/70 bg-blue-50/80 px-5 py-4 text-sm font-medium text-blue-600 shadow-lg">
                  {infoMessage}
                </div>
              )}
            </div>
          )}

          {stats && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="card-surface rounded-2xl border border-white/60 bg-white/80 px-5 py-4 text-center shadow-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">合計行数</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{formatNumber(stats.total)}</p>
              </div>
              <div className="card-surface rounded-2xl border border-white/60 bg-white/80 px-5 py-4 text-center shadow-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">有効行数</p>
                <p className="mt-3 text-2xl font-semibold text-emerald-600">{formatNumber(stats.valid)}</p>
              </div>
              <div className="card-surface rounded-2xl border border-white/60 bg-white/80 px-5 py-4 text-center shadow-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">除外行数</p>
                <p className="mt-3 text-2xl font-semibold text-rose-500">{formatNumber(stats.invalid)}</p>
              </div>
            </div>
          )}

          {issues.length > 0 && (
            <div className="card-surface rounded-2xl border border-amber-200/70 bg-amber-50/75 px-5 py-5 text-sm text-amber-800 shadow-xl">
              <p className="font-semibold">バリデーション警告 (最大 20 件表示)</p>
              <ul className="mt-3 space-y-2 text-xs">
                {issues.map((issue) => (
                  <li key={`${issue.index}-${issue.message}`} className="rounded-lg bg-white/80 px-3 py-2">
                    <span className="font-semibold">{issue.index} 行目:</span> {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <SummaryCards summary={summary} rows={rows} />
          <SalesCharts summary={summary} rows={rows} />
          <BreakdownTables summary={summary} />
          <CsvPreview rows={rows} />
        </main>
      </PageContainer>
    </div>
  );
}
