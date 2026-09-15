"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

function moneyTooltip(value: unknown): [string, string] {
  const n = Number(value ?? 0);
  return [n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), ""];
}

function countTooltip(value: unknown): [string, string] {
  return [String(value ?? 0), ""];
}

export function MonthlyCashflowChart({
  data,
}: {
  data: Array<{ month: string; revenue: number; expense: number }>;
}) {
  const chartData = data.map((d) => {
    const [y, m] = d.month.split("-");
    return { month: `${m}/${y}`, entradas: d.revenue, saidas: d.expense };
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => Number(v).toLocaleString("pt-BR", { notation: "compact" })}
          />
          <Tooltip formatter={moneyTooltip} />
          <Legend />
          <Bar dataKey="entradas" fill="#16a34a" name="Entradas" radius={[3, 3, 0, 0]} />
          <Bar dataKey="saidas" fill="#ef4444" name="Saídas" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionPie({
  data,
  formatter = countTooltip,
}: {
  data: Array<{ label: string; value: number }>;
  formatter?: (v: unknown) => [string, string];
}) {
  return (
    <div className="flex h-72 flex-col items-center gap-2 sm:flex-row">
      <div className="h-56 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
              label={(e: { percent?: number }) => (e.percent != null && e.percent >= 0.05 ? `${Math.round(e.percent * 100)}%` : "")}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatter} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-1.5 text-sm sm:w-40">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span
                className="inline-block size-3 rounded-sm"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              {d.label}
            </span>
            <span className="font-medium">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}