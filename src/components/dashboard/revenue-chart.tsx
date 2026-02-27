import React, { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Radio, Segmented, Skeleton, theme, Typography } from "antd";
import dayjs from "dayjs";
import type { IInvoice } from "../../libs/interfaces";

const { Text } = Typography;

type Range = "7d" | "30d" | "90d";
type ChartType = "bar" | "line";

interface RevenueChartProps {
  shopId: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        borderRadius: 8,
        padding: "8px 14px",
        background: "rgba(22,22,22,0.92)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4, color: "#fff" }}>
        {label}
      </Text>
      {payload.map((entry: any) => (
        <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: entry.color,
              display: "inline-block",
            }}
          />
          <Text style={{ color: "rgba(255,255,255,0.6)" }}>{entry.name}:</Text>
          <Text strong style={{ color: "#fff" }}>
            {entry.name === "Revenue"
              ? `₹${Number(entry.value).toLocaleString("en-IN")}`
              : entry.value}
          </Text>
        </div>
      ))}
    </div>
  );
};

export const RevenueChart: React.FC<RevenueChartProps> = ({ shopId }) => {
  const [range, setRange] = useState<Range>("30d");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const { token } = theme.useToken();

  const REVENUE_COLOR = token.colorPrimary;
  const INVOICE_COLOR = token.colorSuccess;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = dayjs().subtract(days - 1, "day").format("YYYY-MM-DD");
  const today = dayjs().format("YYYY-MM-DD");

  const { query: invoicesQuery } = useList<IInvoice>({
    resource: "invoices",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "invoice_date", operator: "gte", value: since },
      { field: "invoice_date", operator: "lte", value: today },
      { field: "is_cancelled", operator: "eq", value: false },
    ],
    pagination: { mode: "off" },
    sorters: [{ field: "invoice_date", order: "asc" }],
    queryOptions: { staleTime: 30 * 1000 },
  });

  const invoices = (invoicesQuery?.data?.data ?? []) as IInvoice[];

  const chartData = useMemo(() => {
    // Build date buckets
    const buckets: Record<string, { Revenue: number; Invoices: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = dayjs().subtract(days - 1 - i, "day").format("YYYY-MM-DD");
      buckets[d] = { Revenue: 0, Invoices: 0 };
    }
    for (const inv of invoices) {
      const d = inv.invoice_date;
      if (buckets[d]) {
        buckets[d].Revenue += inv.total_amount_paise / 100;
        buckets[d].Invoices += 1;
      }
    }
    return Object.entries(buckets).map(([date, vals]) => ({
      date: dayjs(date).format(days <= 7 ? "ddd DD" : days <= 30 ? "DD MMM" : "DD MMM"),
      ...vals,
    }));
  }, [invoices, days]);

  const totalRevenue = invoices.reduce((s, i) => s + i.total_amount_paise / 100, 0);
  const maxRevenue = Math.max(...chartData.map((d) => d.Revenue), 1);
  const yAxisWidth = maxRevenue >= 100000 ? 80 : 70;

  const isLoading = !!invoicesQuery?.isLoading;

  return (
    <Card
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>Revenue Overview</span>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
            ₹{totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </Text>
        </div>
      }
      extra={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Segmented
            size="small"
            value={chartType}
            onChange={(v) => setChartType(v as ChartType)}
            options={[
              { label: "Bar", value: "bar" },
              { label: "Line", value: "line" },
            ]}
          />
          <Radio.Group
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            size="small"
            optionType="button"
            options={[
              { label: "7D", value: "7d" },
              { label: "30D", value: "30d" },
              { label: "90D", value: "90d" },
            ]}
          />
        </div>
      }
      style={{}}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          {chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={days <= 7 ? 0 : days <= 30 ? 4 : 9}
              />
              <YAxis
                yAxisId="revenue"
                width={yAxisWidth}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 100000
                    ? `₹${(v / 100000).toFixed(1)}L`
                    : v >= 1000
                      ? `₹${(v / 1000).toFixed(0)}K`
                      : `₹${v}`
                }
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                width={30}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar yAxisId="revenue" dataKey="Revenue" fill={REVENUE_COLOR} radius={[20, 4, 0, 0]} maxBarSize={64} />
              <Bar yAxisId="count" dataKey="Invoices" fill={INVOICE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={days <= 7 ? 0 : days <= 30 ? 4 : 9}
              />
              <YAxis
                yAxisId="revenue"
                width={yAxisWidth}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 100000
                    ? `₹${(v / 100000).toFixed(1)}L`
                    : v >= 1000
                      ? `₹${(v / 1000).toFixed(0)}K`
                      : `₹${v}`
                }
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                width={30}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="Revenue"
                stroke={REVENUE_COLOR}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: REVENUE_COLOR }}
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="Invoices"
                stroke={INVOICE_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: INVOICE_COLOR }}
                strokeDasharray="4 2"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </Card>
  );
};
