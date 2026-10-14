"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2 } from "lucide-react";

type Datum = { label: string; value: number };

function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")} mil` : String(n);
}

/**
 * Gráfico de barras de série única (sem legenda — o título nomeia a série).
 * Barras finas (≤24px), topo arredondado 4px, grade hairline, tooltip ao passar
 * o mouse e alternância para visualização em tabela.
 */
export function SimpleBarChart({ data, valueLabel, height = 220, format = compact }: { data: Datum[]; valueLabel: string; height?: number; format?: (n: number) => string }) {
  const [asTable, setAsTable] = React.useState(false);
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-caption font-medium text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
        >
          <Table2 className="size-3.5" aria-hidden /> {asTable ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>
      {asTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-caption text-muted-foreground">
              <th className="py-1.5 font-medium">Período</th>
              <th className="py-1.5 text-right font-medium">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-border">
                <td className="py-1.5">{d.label}</td>
                <td className="py-1.5 text-right tabular">{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ height }} role="img" aria-label={`${valueLabel}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={format} width={48} />
              <Tooltip
                cursor={{ fill: "var(--surface-sunken)", opacity: 0.6 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-md">
                      <p className="text-caption text-muted-foreground">{label}</p>
                      <p className="flex items-center gap-2 font-semibold text-foreground-strong">
                        <span className="size-2 rounded-full bg-[var(--chart-1)]" aria-hidden />
                        {format(Number(payload[0]!.value))} <span className="font-normal text-muted-foreground">{valueLabel.toLowerCase()}</span>
                      </p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
