"use client"

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { expenseMicroLabelClass, expenseMicroLabelStyle } from "./expense-console-ui"

export type CategoryChartEntry = {
  category: string
  label: string
  amount: number
  sharePct: number
  fill: string
  count?: number
}

type ExpenseCategoryChartProps = {
  data: CategoryChartEntry[]
  selectedCategory: string | null
  onSelectCategory: (category: string) => void
  activeEntry: CategoryChartEntry | null
  formatCurrency: (amount: number) => string
}

export function ExpenseCategoryChart({
  data,
  selectedCategory,
  onSelectCategory,
  activeEntry,
  formatCurrency,
}: ExpenseCategoryChartProps) {
  return (
    <>
      <p id="expense-chart-keyboard-hint" className="sr-only">
        The donut chart is visual only. Use the category buttons in the ledger
        list to select a category with the keyboard.
      </p>
      <div
        className="mx-auto aspect-square w-full max-w-[280px] min-h-[200px] sm:min-h-[240px]"
        style={{ maxHeight: 280 }}
        role="img"
        aria-label="Spend by sub-category chart"
        aria-describedby="expense-chart-keyboard-hint"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="label"
              innerRadius="42%"
              outerRadius="68%"
              paddingAngle={2}
              stroke="none"
              onClick={(_, index) => {
                const clicked = data[index]
                if (clicked) onSelectCategory(clicked.category)
              }}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={entry.fill}
                  fillOpacity={
                    selectedCategory === null ||
                    selectedCategory === entry.category
                      ? 1
                      : 0.35
                  }
                  stroke={
                    selectedCategory === entry.category
                      ? TOKENS.onSurface
                      : "transparent"
                  }
                  strokeWidth={selectedCategory === entry.category ? 1.5 : 0}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: TOKENS.surface,
                borderColor: TOKENS.outlineGhost,
                borderRadius: "16px",
                color: TOKENS.onSurface,
              }}
              labelStyle={{ color: TOKENS.onSurface }}
              itemStyle={{ color: TOKENS.onSurface }}
              wrapperStyle={{ color: TOKENS.onSurface }}
              formatter={(value, _name, item) => {
                const n =
                  typeof value === "number"
                    ? value
                    : parseFloat(String(value ?? 0))
                return [
                  formatCurrency(Number.isFinite(n) ? n : 0),
                  item.payload.label,
                ]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Spend by sub-category this month</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Amount</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.category}>
              <td>{row.label}</td>
              <td>{formatCurrency(row.amount)}</td>
              <td>{row.sharePct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {activeEntry ? (
        <div
          className="grid w-full grid-cols-2 gap-3 rounded-[1.25rem] border p-4"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: TOKENS.surfaceContainer,
          }}
        >
          <div className="col-span-2 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: activeEntry.fill }}
            />
            <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
              {activeEntry.label}
            </p>
          </div>
          <div>
            <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
              Spend
            </p>
            <p
              className="mt-2 text-sm font-semibold tabular-nums"
              style={{ color: TOKENS.onSurface }}
            >
              {formatCurrency(activeEntry.amount)}
            </p>
          </div>
          <div>
            <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
              Share
            </p>
            <p
              className="mt-2 text-sm font-semibold tabular-nums"
              style={{ color: TOKENS.onSurface }}
            >
              {activeEntry.sharePct.toFixed(1)}%
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
