"use client";

import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/utils";

// ─── Shared tooltip ────────────────────────────────────────────────────────────

type TooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
};

type ChartTooltipPayload = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
};

function ChartTooltip({ active, payload, label }: ChartTooltipPayload) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-panel/98 px-3 py-2.5 shadow-elevated backdrop-blur-xl">
      {label ? <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p> : null}
      {payload.map((entry, i) => (
        <div className="flex items-center gap-2" key={i}>
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.name}</span>
          <span className="ml-auto pl-4 text-xs font-semibold tabular-nums text-foreground">
            {typeof entry.value === "number" ? formatCompact(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Area Chart ────────────────────────────────────────────────────────────────

export type AreaSeries = {
  key: string;
  label: string;
  color: string;
};

export type AreaChartProps = {
  data: Record<string, string | number>[];
  series: AreaSeries[];
  xKey: string;
  height?: number;
  className?: string;
  grid?: boolean;
};

export function AreaChart({
  data,
  series,
  xKey,
  height = 220,
  className,
  grid = true,
}: AreaChartProps) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient id={`grad-${s.key}`} key={s.key} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {grid ? (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.6}
              vertical={false}
            />
          ) : null}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCompact}
            dx={-2}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────────

export type BarSeries = {
  key: string;
  label: string;
  color: string;
};

export type BarChartProps = {
  data: Record<string, string | number>[];
  series: BarSeries[];
  xKey: string;
  height?: number;
  className?: string;
  layout?: "horizontal" | "vertical";
};

export function BarChart({
  data,
  series,
  xKey,
  height = 220,
  className,
  layout = "horizontal",
}: BarChartProps) {
  const isVertical = layout === "vertical";
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={{ top: 4, right: 4, left: isVertical ? 60 : -20, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.6}
            horizontal={!isVertical}
            vertical={isVertical}
          />
          {isVertical ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCompact}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCompact}
                dx={-2}
              />
            </>
          )}
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={40} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Donut Chart ───────────────────────────────────────────────────────────────

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

export type DonutChartProps = {
  slices: DonutSlice[];
  size?: number;
  innerLabel?: ReactNode;
  className?: string;
};

export function DonutChart({ slices, size = 160, innerLabel, className }: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="82%"
            strokeWidth={0}
            paddingAngle={2}
          >
            {slices.map((slice, i) => (
              <Cell key={i} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const slice = payload[0].payload as DonutSlice;
              const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0";
              return (
                <div className="rounded-xl border bg-panel/98 px-3 py-2 shadow-elevated backdrop-blur-xl">
                  <p className="text-xs font-semibold">{slice.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatCompact(slice.value)} · {pct}%
                  </p>
                </div>
              );
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
      {innerLabel ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {innerLabel}
        </div>
      ) : null}
    </div>
  );
}

// ─── KPI Sparkline ─────────────────────────────────────────────────────────────

export type SparklineProps = {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  className?: string;
};

export function KpiSparkline({ data, color = "hsl(var(--primary))", height = 36, width = 80, className }: SparklineProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className={cn("shrink-0", className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill="url(#spark-grad)"
            dot={false}
            isAnimationActive={false}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Chart Legend ──────────────────────────────────────────────────────────────

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <div className="flex items-center gap-1.5" key={item.label}>
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          <span className="text-[11px] text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────

export type ProgressBarProps = {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
};

export function ProgressBar({ value, max = 100, color, className, showLabel = false, size = "md" }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: "h-1", md: "h-1.5", lg: "h-2.5" };
  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full overflow-hidden rounded-full bg-muted", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-product", !color && "bg-primary")}
          style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemax={max}
          aria-valuemin={0}
        />
      </div>
      {showLabel ? (
        <p className="mt-1 text-right text-[10px] tabular-nums text-muted-foreground">
          {pct.toFixed(0)}%
        </p>
      ) : null}
    </div>
  );
}
