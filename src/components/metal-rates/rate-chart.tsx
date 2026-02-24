import { Card, Radio, Space, Typography } from "antd";
import dayjs from "dayjs";
import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IMetalRate, IMetalType } from "../../libs/interfaces";
import { buildChartData, isGold, paiseToDisplay } from "./utils";

const { Text } = Typography;

const METAL_COLORS: Record<string, string> = {
  GOLD: "#d4af37",
  SILVER: "#aaa9ad",
};

const DEFAULT_COLOR = "#6366f1";

type Range = "today" | "7d" | "30d";

interface RateChartProps {
  metals: IMetalType[];
  rates: IMetalRate[];
  today: string;
}

export const RateChart: React.FC<RateChartProps> = ({
  metals,
  rates,
  today,
}) => {
  const [range, setRange] = useState<Range>("30d");
  const [activeMetal, setActiveMetal] = useState<string | null>(null);

  const cutoff = useMemo(() => {
    if (range === "today") return today;
    if (range === "7d") return dayjs(today).subtract(6, "day").format("YYYY-MM-DD");
    return dayjs(today).subtract(29, "day").format("YYYY-MM-DD");
  }, [range, today]);

  const filteredRates = useMemo(
    () => rates.filter((r) => r.rate_date >= cutoff),
    [rates, cutoff],
  );

  const activeMetas = useMemo(
    () =>
      activeMetal
        ? metals.filter((m) => m.id === activeMetal)
        : metals,
    [metals, activeMetal],
  );

  const filteredForChart = useMemo(
    () =>
      filteredRates.filter((r) =>
        activeMetas.some((m) => m.id === r.metal_type_id),
      ),
    [filteredRates, activeMetas],
  );

  const chartData = useMemo(
    () => buildChartData(filteredForChart, activeMetas),
    [filteredForChart, activeMetas],
  );

  const formatTick = (val: number, metalName: string) =>
    `₹${paiseToDisplay(val, metalName).toLocaleString("en-IN")}`;

  return (
    <Card
      title="Rate Trend"
      extra={
        <Space size="small" wrap>
          <Radio.Group
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            size="small"
            optionType="button"
            options={[
              { label: "Today", value: "today" },
              { label: "7D", value: "7d" },
              { label: "30D", value: "30d" },
            ]}
          />
          <Radio.Group
            value={activeMetal ?? "all"}
            onChange={(e) =>
              setActiveMetal(e.target.value === "all" ? null : e.target.value)
            }
            size="small"
            optionType="button"
            options={[
              { label: "All", value: "all" },
              ...metals.map((m) => ({ label: m.name, value: m.id })),
            ]}
          />
        </Space>
      }
      bordered={false}
    >
      {chartData.length === 0 ? (
        <Text type="secondary">No rate data available for this range.</Text>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => dayjs(v as string).format("D MMM")}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
              tick={{ fontSize: 11 }}
              width={72}
            />
            <Tooltip
              formatter={(value, name) => {
                const numValue = typeof value === "number" ? value : 0;
                const metal = metals.find((m) => m.name === String(name));
                if (!metal) return [`${numValue}`, String(name)];
                return [
                  `₹${paiseToDisplay(numValue, metal.name).toLocaleString("en-IN")} ${isGold(metal.name) ? "/ 10g" : "/ g"}`,
                  String(name),
                ] as [string, string];
              }}
              labelFormatter={(label) =>
                dayjs(label as string).format("D MMM YYYY")
              }
            />
            <Legend />
            {activeMetas.map((metal) => (
              <Line
                key={metal.id}
                type="monotone"
                dataKey={metal.name}
                stroke={METAL_COLORS[metal.name.toUpperCase()] ?? DEFAULT_COLOR}
                strokeWidth={2}
                dot={range === "today" || range === "7d"}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
