"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TooltipEntry = {
  color?: string;
  name?: string;
  value?: number;
};

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-panel px-3 py-2 text-xs shadow-elevated">
      {label ? <p className="font-semibold text-foreground">{label}</p> : null}
      {payload.map((entry) => (
        <p className="flex items-center gap-1.5 text-muted-foreground" key={entry.name}>
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}:{" "}
          <span className="font-medium text-foreground">
            {(entry.value ?? 0).toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

export type ApprovalStatusKey = "approved" | "pending" | "returned" | "rejected";

export type ApprovalStatusChartProps = {
  approved: number;
  pending: number;
  rejected: number;
  returned: number;
  activeKey?: string | null;
  onSliceClick?: (key: ApprovalStatusKey) => void;
};

export function ApprovalStatusChart({
  activeKey,
  approved,
  onSliceClick,
  pending,
  rejected,
  returned,
}: ApprovalStatusChartProps) {
  const total = approved + pending + rejected + returned;
  const allSegments: { color: string; key: ApprovalStatusKey; name: string; value: number }[] = [
    { color: "hsl(var(--success))", key: "approved", name: "Approved", value: approved },
    { color: "hsl(var(--warning))", key: "pending", name: "Pending", value: pending },
    { color: "hsl(var(--accent))", key: "returned", name: "Returned", value: returned },
    { color: "hsl(var(--danger))", key: "rejected", name: "Rejected", value: rejected },
  ];
  const data = allSegments.filter((entry) => entry.value > 0);

  if (!total) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed text-center text-xs text-muted-foreground">
        No reviewed submissions yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-32 w-32 shrink-0">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="64%"
              nameKey="name"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 3 : 0}
              stroke="hsl(var(--panel))"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell
                  cursor={onSliceClick ? "pointer" : undefined}
                  fill={entry.color}
                  key={entry.name}
                  onClick={onSliceClick ? () => onSliceClick(entry.key) : undefined}
                  opacity={activeKey && activeKey !== entry.key ? 0.35 : 1}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((entry) => (
          <li key={entry.name}>
            <button
              className="flex w-full items-center justify-between gap-2 text-left text-xs disabled:cursor-default"
              disabled={!onSliceClick}
              onClick={onSliceClick ? () => onSliceClick(entry.key) : undefined}
              style={{ opacity: activeKey && activeKey !== entry.key ? 0.5 : 1 }}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="shrink-0 font-semibold">
                {entry.value.toLocaleString()}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type FormResponseDatum = {
  id?: string;
  name: string;
  responses: number;
};

export function FormResponseChart({
  activeId,
  data,
  onBarClick,
}: {
  activeId?: string | null;
  data: FormResponseDatum[];
  onBarClick?: (datum: FormResponseDatum) => void;
}) {
  if (!data.length) return null;

  const chartHeight = Math.max(96, data.length * 32);

  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ bottom: 0, left: 0, right: 12, top: 0 }}
        >
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            allowDecimals={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="name"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            type="category"
            width={140}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar
            barSize={14}
            cursor={onBarClick ? "pointer" : undefined}
            dataKey="responses"
            name="Responses"
            onClick={onBarClick ? (entry) => onBarClick((entry?.payload ?? entry) as FormResponseDatum) : undefined}
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry) => (
              <Cell
                fill="hsl(var(--primary))"
                key={entry.id ?? entry.name}
                opacity={activeId && entry.id !== activeId ? 0.35 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
