"use client";

import { AggregatedSales } from "../lib/agg/sales";
import { SalesRow } from "../lib/types/sales";

type SummaryCardsProps = {
  summary: AggregatedSales | null;
  rows: SalesRow[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(
    Math.round(value),
  );

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const toneClasses = {
  primary: "from-blue-500/18 to-blue-500/5",
  success: "from-emerald-500/18 to-emerald-500/5",
  warning: "from-amber-500/20 to-amber-500/6",
  danger: "from-rose-500/20 to-rose-500/6",
  neutral: "from-slate-500/15 to-slate-500/4",
} as const;

export const SummaryCards = ({ summary, rows }: SummaryCardsProps) => {
  if (!summary || rows.length === 0) {
    return (
      <div className="card-surface overflow-hidden rounded-2xl border border-white/60 bg-white/75 px-6 py-8 text-center shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Analysis</p>
        <p className="mt-3 text-lg font-medium text-slate-600">CSV を読み込むと主要指標が表示されます。</p>
      </div>
    );
  }

  const grossSales = rows.reduce((total, row) => total + row.linetotal, 0);
  const netSales = summary.total.signedTotal;
  const netQty = summary.total.signedQty;
  const averageTicket = summary.total.count > 0 ? netSales / summary.total.count : 0;
  const cancellationRate = summary.total.count > 0 ? summary.cancelled.count / summary.total.count : 0;
  const uniqueItems = new Set(rows.map((row) => row.name)).size;

  const cards = [
    {
      key: "net",
      label: "ネット売上",
      primary: formatCurrency(netSales),
      secondary: `キャンセル差引後 / ${summary.total.count.toLocaleString()} 行`,
      icon: "💰",
      tone: "primary" as const,
    },
    {
      key: "gross",
      label: "総売上 (キャンセル前)",
      primary: formatCurrency(grossSales),
      secondary: `キャンセル額 ${formatCurrency(summary.cancelled.amount)}`,
      icon: "📈",
      tone: "success" as const,
    },
    {
      key: "qty",
      label: "Signed 数量",
      primary: netQty.toLocaleString(),
      secondary: `キャンセル ${summary.cancelled.count.toLocaleString()} 件`,
      icon: "📦",
      tone: "neutral" as const,
    },
    {
      key: "avg",
      label: "平均取引額",
      primary: formatCurrency(averageTicket),
      secondary: `1 行あたりの平均金額`,
      icon: "⚖️",
      tone: "warning" as const,
    },
    {
      key: "cancelRate",
      label: "キャンセル率",
      primary: formatPercent(cancellationRate),
      secondary: `${summary.cancelled.count.toLocaleString()}/${summary.total.count.toLocaleString()} 行`,
      icon: "🚫",
      tone: "danger" as const,
    },
    {
      key: "items",
      label: "取扱商品数",
      primary: `${uniqueItems.toLocaleString()} 品目`,
      secondary: `${rows.length.toLocaleString()} 行を解析`,
      icon: "🍔",
      tone: "neutral" as const,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br ${toneClasses[card.tone]} px-5 py-5 text-slate-800 shadow-xl backdrop-blur transition hover:-translate-y-1 hover:shadow-2xl`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500/70">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{card.primary}</p>
            </div>
            <span className="text-2xl">{card.icon}</span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{card.secondary}</p>
        </div>
      ))}
    </div>
  );
};
