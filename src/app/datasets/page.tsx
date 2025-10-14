"use client";

import { collection, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AuthBar } from "../../components/AuthBar";
import { useAuth } from "../../components/AuthProvider";
import { PageContainer } from "../../components/PageContainer";
import { db } from "../../lib/firebase/client";

type DatasetItem = {
  id: string;
  filename: string;
  uploadedAt: Date | null;
  rows: number;
  sumSignedTotal: number;
  sumSignedQty: number;
  cancelledCount: number;
  cancelledAmount: number;
};

const parseNumber = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const toDatasetItem = (docData: DocumentData, id: string): DatasetItem => ({
  id,
  filename: typeof docData.filename === "string" ? docData.filename : "(no name)",
  uploadedAt:
    docData.uploadedAt && typeof docData.uploadedAt.toDate === "function"
      ? docData.uploadedAt.toDate()
      : null,
  rows: parseNumber(docData.rows),
  sumSignedTotal: parseNumber(docData.sumSignedTotal),
  sumSignedQty: parseNumber(docData.sumSignedQty),
  cancelledCount: parseNumber(docData.cancelledCount),
  cancelledAmount: parseNumber(docData.cancelledAmount),
});

const formatCurrency = (value: number) => `¥${value.toLocaleString()}`;

export default function DatasetsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<DatasetItem[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/upload");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    const datasetsRef = collection(db, `orgs/${user.uid}/datasets`);
    const datasetsQuery = query(datasetsRef, orderBy("uploadedAt", "desc"));

    const unsubscribe = onSnapshot(datasetsQuery, (snapshot) => {
      const mapped = snapshot.docs.map((docSnapshot) => toDatasetItem(docSnapshot.data(), docSnapshot.id));
      setItems(mapped);
    });

    return () => unsubscribe();
  }, [user]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="card-surface rounded-2xl border border-white/60 bg-white/80 px-6 py-8 text-center text-sm text-slate-500 shadow-xl">
          読み込み中...
        </div>
      );
    }

    if (!user) {
      return (
        <div className="card-surface rounded-2xl border border-white/60 bg-white/80 px-6 py-8 text-center text-sm text-slate-500 shadow-xl">
          ログインが必要です。
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="card-surface rounded-2xl border border-dashed border-slate-300 bg-white/75 px-6 py-10 text-center text-sm text-slate-500 shadow-xl">
          保存済みデータセットはありません。<br />まずは CSV をアップロードして分析を保存しましょう。
        </div>
      );
    }

    return (
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(`/datasets/${item.id}`)}
            className="group flex flex-col items-start rounded-3xl border border-white/60 bg-gradient-to-br from-white/90 via-white/70 to-white/60 px-6 py-6 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="flex w-full items-center justify-between">
              <p className="text-lg font-semibold text-slate-900">{item.filename}</p>
              <span className="rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-1 text-xs font-medium text-blue-600">
                {item.rows.toLocaleString()} 行
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {item.uploadedAt ? item.uploadedAt.toLocaleString() : "時刻未取得"}
            </p>
            <div className="mt-4 grid w-full gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2">
                <p className="text-xs text-slate-400">売上 (signed)</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(item.sumSignedTotal)}</p>
              </div>
              <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2">
                <p className="text-xs text-slate-400">数量 (signed)</p>
                <p className="text-base font-semibold text-slate-900">{item.sumSignedQty.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>キャンセル: {item.cancelledCount.toLocaleString()} 件</span>
              <span>キャンセル額: {formatCurrency(item.cancelledAmount)}</span>
            </div>
          </button>
        ))}
      </div>
    );
  }, [items, loading, router, user]);

  return (
    <div className="min-h-screen pb-16">
      <AuthBar canSave={false} />
      <PageContainer>
        <main className="flex-1 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">保存済みデータ</h1>
              <p className="text-sm text-slate-500">認証済みの分析結果はここからいつでも再確認できます。</p>
            </div>
            <div className="rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-medium text-slate-500">
              {items.length.toLocaleString()} 件のデータセット
            </div>
          </div>
          {content}
        </main>
      </PageContainer>
    </div>
  );
}
