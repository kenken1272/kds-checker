"use client";

import { collection, doc, getDoc, getDocs, orderBy, query, type DocumentData } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AuthBar } from "../../../components/AuthBar";
import { useAuth } from "../../../components/AuthProvider";
import { BreakdownTables } from "../../../components/BreakdownTables";
import { CsvPreview } from "../../../components/CsvPreview";
import { SummaryCards } from "../../../components/SummaryCards";
import { SalesCharts } from "../../../components/SalesCharts";
import { PageContainer } from "../../../components/PageContainer";
import { AggregatedSales, aggregate } from "../../../lib/agg/sales";
import { db } from "../../../lib/firebase/client";
import { type SalesRow } from "../../../lib/types/sales";

const toSalesRow = (data: DocumentData): SalesRow | null => {
  if (!data) {
    return null;
  }

  if (!data.ts || typeof data.ts.toDate !== "function") {
    return null;
  }

  const ts = data.ts.toDate();

  const qtyValue = typeof data.qty === "number" ? data.qty : null;
  const linetotalValue = typeof data.linetotal === "number" ? data.linetotal : null;
  const signedQtyValue = typeof data.signedQty === "number" ? data.signedQty : null;
  const signedTotalValue = typeof data.signedTotal === "number" ? data.signedTotal : null;

  if ([qtyValue, linetotalValue, signedQtyValue, signedTotalValue].some((value) => value === null)) {
    return null;
  }

  const status = data.status === "CANCELLED" ? "CANCELLED" : "OK";
  const name = typeof data.name === "string" ? data.name : "";
  const pricemode = typeof data.pricemode === "string" ? data.pricemode : "";

  if (!name || !pricemode) {
    return null;
  }

  return {
    ts,
    name,
    pricemode,
    qty: qtyValue as number,
    linetotal: linetotalValue as number,
    status,
    signedQty: signedQtyValue as number,
    signedTotal: signedTotalValue as number,
  };
};

type DatasetMeta = {
  filename: string;
  uploadedAt: Date | null;
  rows: number;
};

export default function DatasetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [summary, setSummary] = useState<AggregatedSales | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/upload");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchDataset = async () => {
      if (!user || !params?.id) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const datasetRef = doc(db, `orgs/${user.uid}/datasets/${params.id}`);
        const datasetSnapshot = await getDoc(datasetRef);

        if (!datasetSnapshot.exists()) {
          setError("データセットが見つかりません");
          setMeta(null);
          setRows([]);
          setSummary(null);
          return;
        }

        const datasetData = datasetSnapshot.data();
        setMeta({
          filename: typeof datasetData.filename === "string" ? datasetData.filename : "(no name)",
          uploadedAt:
            datasetData.uploadedAt && typeof datasetData.uploadedAt.toDate === "function"
              ? datasetData.uploadedAt.toDate()
              : null,
          rows: typeof datasetData.rows === "number" ? datasetData.rows : 0,
        });

        const linesRef = collection(datasetRef, "lines");
        const linesQuery = query(linesRef, orderBy("ts", "asc"));
        const linesSnapshot = await getDocs(linesQuery);

        const parsedRows: SalesRow[] = [];
        linesSnapshot.forEach((docSnapshot) => {
          const row = toSalesRow(docSnapshot.data());
          if (row) {
            parsedRows.push(row);
          }
        });

        setRows(parsedRows);
        setSummary(parsedRows.length > 0 ? aggregate(parsedRows) : null);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "データ取得に失敗しました";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDataset();
  }, [user, params?.id]);

  const headerInfo = useMemo(() => {
    if (!meta) {
      return null;
    }

    return (
      <div className="card-surface rounded-3xl border border-white/60 bg-white/85 px-6 py-6 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl font-semibold text-slate-900">{meta.filename}</p>
            <p className="mt-2 text-sm text-slate-500">
              アップロード日時: {meta.uploadedAt ? meta.uploadedAt.toLocaleString() : "未計測"}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-2 text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">保存行数</p>
              <p className="text-lg font-semibold text-slate-900">{meta.rows.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }, [meta]);

  return (
    <div className="min-h-screen pb-16">
      <AuthBar canSave={false} />
      <PageContainer>
        <main className="flex-1 space-y-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center text-sm font-medium text-blue-600 transition hover:text-blue-700"
          >
            ← 戻る
          </button>
          {headerInfo}
          {error && (
            <div className="card-surface rounded-2xl border border-rose-200/70 bg-rose-50/80 px-5 py-4 text-sm font-medium text-rose-600 shadow-xl">
              {error}
            </div>
          )}
          {isLoading && <p className="text-sm text-slate-500">読み込み中...</p>}
          {!isLoading && !error && (
            <>
              <SummaryCards summary={summary} rows={rows} />
              <SalesCharts summary={summary} rows={rows} />
              <BreakdownTables summary={summary} />
              <CsvPreview rows={rows} />
            </>
          )}
        </main>
      </PageContainer>
    </div>
  );
}
