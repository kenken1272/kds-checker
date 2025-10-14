"use client";

import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartDataset,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useMemo } from "react";
import { AggregatedSales } from "../lib/agg/sales";
import { SalesRow } from "../lib/types/sales";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

type SalesChartsProps = {
  summary: AggregatedSales | null;
  rows: SalesRow[];
};

const legendConfig = {
  display: true,
  position: "bottom" as const,
  labels: {
    boxWidth: 18,
    boxHeight: 18,
    color: "#1f2937",
  },
};

const tooltipLabel = (context: { dataset: { label?: string }; formattedValue: string }) => {
  const label = context.dataset.label ?? "";
  return `${label}: ${context.formattedValue}`;
};

const baseLineOptions: ChartOptions<"line"> = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: legendConfig,
    tooltip: {
      callbacks: {
        label: tooltipLabel,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#475569" },
      grid: { color: "rgba(148, 163, 184, 0.25)" },
    },
    y: {
      ticks: { color: "#475569" },
      grid: { color: "rgba(148, 163, 184, 0.25)" },
    },
  },
};

const baseBarOptions: ChartOptions<"bar"> = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: legendConfig,
    tooltip: {
      callbacks: {
        label: tooltipLabel,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#475569" },
      grid: { color: "rgba(148, 163, 184, 0.25)" },
    },
    y: {
      ticks: { color: "#475569" },
      grid: { color: "rgba(148, 163, 184, 0.25)" },
    },
  },
};

const baseDoughnutOptions: ChartOptions<"doughnut"> = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: legendConfig,
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(
    Math.round(value),
  );

export const SalesCharts = ({ summary, rows }: SalesChartsProps) => {
  const hasData = summary !== null && rows.length > 0;

  const { hourData, productData, statusData } = useMemo(() => {
    if (!summary || rows.length === 0) {
      return { hourData: null, productData: null, statusData: null };
    }

    const hourEntries = Object.entries(summary.byHour).sort(([a], [b]) => (a > b ? 1 : -1));
    const hourDatasets: ChartDataset<"line">[] = [
      {
        label: "売上 (¥)",
        data: hourEntries.map(([, bucket]) => bucket.signedTotal),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.2)",
        fill: true,
        tension: 0.35,
      },
      {
        label: "数量",
        data: hourEntries.map(([, bucket]) => bucket.signedQty),
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14, 165, 233, 0.18)",
        fill: true,
        tension: 0.35,
        yAxisID: "y1",
      },
    ];
    const hourData: ChartData<"line"> = {
      labels: hourEntries.map(([label]) => label),
      datasets: hourDatasets,
    };

    const topProducts = Object.entries(summary.byName)
      .sort((a, b) => Math.abs(b[1].signedTotal) - Math.abs(a[1].signedTotal))
      .slice(0, 7);

    const productDatasets: ChartDataset<"bar">[] = [
      {
        label: "売上 (¥)",
        data: topProducts.map(([, bucket]) => bucket.signedTotal),
        backgroundColor: topProducts.map(([, bucket]) =>
          bucket.signedTotal >= 0 ? "rgba(16, 185, 129, 0.75)" : "rgba(239, 68, 68, 0.8)",
        ),
        borderRadius: 8,
      },
    ];
    const productData: ChartData<"bar"> = {
      labels: topProducts.map(([label]) => label),
      datasets: productDatasets,
    };

    const cancelled = summary.cancelled.count;
    const completed = Math.max(summary.total.count - cancelled, 0);

    const statusData: ChartData<"doughnut"> = {
      labels: ["完了", "キャンセル"],
      datasets: [
        {
          label: "件数",
          data: [completed, cancelled],
          backgroundColor: ["rgba(59, 130, 246, 0.8)", "rgba(239, 68, 68, 0.85)"],
          borderWidth: 0,
        },
      ],
    };

    return { hourData, productData, statusData };
  }, [summary, rows]);

  if (!hasData || !hourData || !productData || !statusData) {
    return (
      <div className="card-surface rounded-2xl border border-dashed border-slate-300 px-6 py-8 text-center text-sm text-slate-500 shadow-lg">
        十分なデータが読み込まれるとグラフが表示されます。
      </div>
    );
  }

  const hourLabelCount = Array.isArray(hourData.labels) ? hourData.labels.length : 0;
  const productLabelCount = Array.isArray(productData.labels) ? productData.labels.length : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card-surface h-[320px] rounded-2xl border border-white/60 bg-white/85 px-5 py-5 shadow-xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">時間帯別トレンド</h3>
          <span className="text-xs font-medium text-slate-400">{hourLabelCount} バケット</span>
        </div>
        <Line
          options={{
            ...baseLineOptions,
            scales: {
              ...baseLineOptions.scales,
              y1: { position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#475569" } },
            },
          }}
          data={hourData}
        />
      </div>
      <div className="card-surface h-[320px] rounded-2xl border border-white/60 bg-white/85 px-5 py-5 shadow-xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">人気メニュー</h3>
          <span className="text-xs font-medium text-slate-400">TOP {productLabelCount}</span>
        </div>
        <Bar
          options={{
            ...baseBarOptions,
            indexAxis: "y" as const,
            scales: {
              x: {
                ...baseBarOptions.scales?.x,
                ticks: {
                  color: "#475569",
                  callback: (value: string | number) => formatCurrency(Number(value)),
                },
              },
              y: {
                ...baseBarOptions.scales?.y,
              },
            },
          }}
          data={productData}
        />
      </div>
      <div className="card-surface h-[300px] rounded-2xl border border-white/60 bg-white/85 px-5 py-5 shadow-xl backdrop-blur lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">完了 vs キャンセル</h3>
          <span className="text-xs font-medium text-slate-400">{rows.length.toLocaleString()} 行</span>
        </div>
        <div className="mx-auto h-[220px] max-w-[320px]">
          <Doughnut
            options={{
              ...baseDoughnutOptions,
              plugins: {
                ...baseDoughnutOptions.plugins,
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.label ?? "";
                      const value = context.raw as number;
                      return `${label}: ${value.toLocaleString()} 件`;
                    },
                  },
                },
              },
            }}
            data={statusData}
          />
        </div>
      </div>
    </div>
  );
};
