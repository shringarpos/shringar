import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Divider, Row, Tag, Typography, theme } from "antd";
import dayjs from "dayjs";
import React from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import type { IMetalRate, IMetalType } from "../../libs/interfaces";
import { RateEditPopover } from "./rate-edit-popover";
import {
  computeKpis,
  formatRateDisplay,
  getTodayRate,
  groupByMetal,
} from "./utils";

const { Text, Title } = Typography;
const { useToken } = theme;

function buildSparkline(
  rates: IMetalRate[],
  metalId: string,
  n = 15,
): { v: number }[] {
  return rates
    .filter((r) => r.metal_type_id === metalId)
    .sort((a, b) => a.rate_date.localeCompare(b.rate_date))
    .slice(-n)
    .map((r) => ({ v: r.rate_per_gram_paise }));
}

function Sparkline({
  data,
  color,
}: {
  data: { v: number }[];
  color: string;
}) {
  if (data.length < 2) return null;
  return (
    <ResponsiveContainer width={80} height={36}>
      <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface TodayRateCardProps {
  metal: IMetalType;
  todayRate?: IMetalRate;
  shopId: string;
  onSuccess?: () => void;
}

function TodayRateCard({
  metal,
  todayRate,
  shopId,
  onSuccess,
}: TodayRateCardProps) {
  const { token } = useToken();
  const isSet = !!todayRate;

  return (
    <Card
      style={{
        borderRadius: 12,
        border: `1px solid ${isSet ? token.colorBorderSecondary : token.colorWarningBorder}`,
        boxShadow: token.boxShadowTertiary,
        height: "100%",
      }}
      styles={{ body: { padding: "16px 20px" } }}
    >
      {/* Header row: metal label + status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text
          type="secondary"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {metal.name}
        </Text>
        {!isSet && (
          <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>
            Not Set Today
          </Tag>
        )}
      </div>

      {/* Rate value */}
      {isSet ? (
        <Title
          level={3}
          style={{
            margin: "4px 0 2px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {formatRateDisplay(todayRate!.rate_per_gram_paise, metal.name)}
        </Title>
      ) : (
        <Title
          level={3}
          style={{ margin: "4px 0 2px", color: token.colorTextTertiary }}
        >
          —
        </Title>
      )}

      {/* Footer row: updated time + action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <Text type="secondary" style={{ fontSize: 11 }}>
          {isSet
            ? `Updated ${dayjs(todayRate!.updated_at).format("h:mm A")}`
            : "No entry for today"}
        </Text>

        <RateEditPopover
          metal={metal}
          existingRate={todayRate}
          shopId={shopId}
          onSuccess={onSuccess}
          trigger={
            isSet ? (
              <Button size="small" icon={<EditOutlined />}>
                Edit Rate
              </Button>
            ) : (
              <Button type="primary" size="small" icon={<PlusOutlined />}>
                Set Rate
              </Button>
            )
          }
        />
      </div>
    </Card>
  );
}

interface InsightsCardProps {
  metal: IMetalType;
  rates: IMetalRate[];
  today: string;
}

function InsightsCard({ metal, rates, today }: InsightsCardProps) {
  const { token } = useToken();
  const kpi = computeKpis(rates, today);
  const sparkData = buildSparkline(rates, metal.id);

  const changeUp = (kpi.changeAmount ?? 0) > 0;
  const changeDown = (kpi.changeAmount ?? 0) < 0;
  const changeColor = changeUp
    ? token.colorSuccess
    : changeDown
      ? token.colorError
      : token.colorTextSecondary;

  // Each stat: label on top, value below
  const StatCell = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div style={{ padding: "6px 0" }}>
      <Text
        type="secondary"
        style={{ fontSize: 11, display: "block", marginBottom: 3 }}
      >
        {label}
      </Text>
      {children}
    </div>
  );

  return (
    <Card
      style={{
        borderRadius: 12,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary,
        height: "100%",
      }}
      styles={{ body: { padding: "16px 20px" } }}
    >
      {/* Header: metal name + sparkline */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Text
          type="secondary"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {metal.name} — Insights
        </Text>
        <Sparkline data={sparkData} color={token.colorPrimary} />
      </div>

      <Divider style={{ margin: "0 0 4px" }} />

      {/* 2-column grid: label above, value below */}
      <Row gutter={[12, 0]}>
        {/* vs Yesterday */}
        <Col span={12}>
          <StatCell label="vs Yesterday">
            {kpi.changeAmount !== null && kpi.changePercent !== null ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: 600, color: changeColor }}>
                  {changeUp ? (
                    <ArrowUpOutlined />
                  ) : changeDown ? (
                    <ArrowDownOutlined />
                  ) : null}{" "}
                  {formatRateDisplay(Math.abs(kpi.changeAmount), metal.name)}
                </Text>
                <Tag
                  color={changeUp ? "success" : changeDown ? "error" : "default"}
                  style={{ margin: 0, fontSize: 11, lineHeight: "18px" }}
                >
                  {changeUp ? "+" : changeDown ? "−" : ""}
                  {Math.abs(kpi.changePercent).toFixed(2)}%
                </Tag>
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                —
              </Text>
            )}
          </StatCell>
        </Col>

        {/* 30-Day Avg */}
        <Col span={12}>
          <StatCell label="30-Day Avg">
            <Text style={{ fontSize: 13, fontWeight: 600 }}>
              {kpi.avgMonth !== null
                ? formatRateDisplay(kpi.avgMonth, metal.name)
                : "—"}
            </Text>
          </StatCell>
        </Col>

        {/* Month High */}
        <Col span={12}>
          <StatCell label="Month High">
            <Text style={{ fontSize: 13, fontWeight: 600, color: token.colorSuccess }}>
              {kpi.highestMonth !== null
                ? formatRateDisplay(kpi.highestMonth, metal.name)
                : "—"}
            </Text>
          </StatCell>
        </Col>

        {/* Month Low */}
        <Col span={12}>
          <StatCell label="Month Low">
            <Text style={{ fontSize: 13, fontWeight: 600, color: token.colorError }}>
              {kpi.lowestMonth !== null
                ? formatRateDisplay(kpi.lowestMonth, metal.name)
                : "—"}
            </Text>
          </StatCell>
        </Col>
      </Row>
    </Card>
  );
}

interface RateTopSectionProps {
  metals: IMetalType[];
  rates: IMetalRate[];
  today: string;
  shopId: string;
  lastUpdated?: IMetalRate | null;
  onRateSuccess?: () => void;
}

export const RateTopSection: React.FC<RateTopSectionProps> = ({
  metals,
  rates,
  today,
  shopId,
  lastUpdated,
  onRateSuccess,
}) => {
  const { token } = useToken();
  const grouped = groupByMetal(rates);

  // Responsive span: 1→24, 2→12, 3→8, 4+→6 (wraps after 4)
  const colSpan = Math.floor(24 / Math.min(metals.length || 1, 4));

  return (
    <>
      {/* ── Today's Rates ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <Text strong style={{ fontSize: 15, color: token.colorText }}>
            Today's Rates
          </Text>
          {lastUpdated && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Last updated {dayjs(lastUpdated.updated_at).format("h:mm A")}
            </Text>
          )}
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(today).format("dddd, D MMMM YYYY")}
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {metals.map((metal) => (
          <Col key={metal.id} xs={24} sm={colSpan}>
            <TodayRateCard
              metal={metal}
              todayRate={getTodayRate(rates, metal.id, today)}
              shopId={shopId}
              onSuccess={onRateSuccess}
            />
          </Col>
        ))}
      </Row>

      {/* ── Rate Insights ──────────────────────────────────────────── */}
      <div style={{ margin: "24px 0 12px" }}>
        <Text strong style={{ fontSize: 15, color: token.colorText }}>
          Rate Insights
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          30-day analysis
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {metals.map((metal) => (
          <Col key={metal.id} xs={24} sm={colSpan}>
            <InsightsCard
              metal={metal}
              rates={grouped[metal.id] ?? []}
              today={today}
            />
          </Col>
        ))}
      </Row>
    </>
  );
};
