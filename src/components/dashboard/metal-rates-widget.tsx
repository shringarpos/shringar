import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import { Badge, Button, Card, Skeleton, Tag, Tooltip, Typography } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { TrendingUp } from "lucide-react";
import dayjs from "dayjs";
import type { IMetalRate, IMetalType } from "../../libs/interfaces";

const { Text } = Typography;

interface MetalRatesWidgetProps {
  shopId: string;
}

const METAL_SYMBOL: Record<string, string> = {
  GOLD: "Au",
  SILVER: "Ag",
};

const getSymbol = (name: string) => METAL_SYMBOL[name.toUpperCase()] ?? name.slice(0, 2).toUpperCase();

export const MetalRatesWidget: React.FC<MetalRatesWidgetProps> = ({ shopId }) => {
  const navigate = useNavigate();
  const today = dayjs().format("YYYY-MM-DD");
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

  const { query: metalsQuery } = useList<IMetalType>({
    resource: "metal_types",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const metals = (metalsQuery?.data?.data ?? []) as IMetalType[];

  const { query: ratesQuery } = useList<IMetalRate>({
    resource: "ornament_rates",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "rate_date", operator: "gte", value: yesterday },
      { field: "rate_date", operator: "lte", value: today },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId && metals.length > 0, staleTime: 60 * 1000 },
  });

  const rates = (ratesQuery?.data?.data ?? []) as IMetalRate[];

  const rateMap = useMemo(() => {
    const map: Record<string, { today?: number; yesterday?: number }> = {};
    for (const r of rates) {
      if (!map[r.metal_type_id]) map[r.metal_type_id] = {};
      if (r.rate_date === today) map[r.metal_type_id].today = r.rate_per_gram_paise;
      if (r.rate_date === yesterday) map[r.metal_type_id].yesterday = r.rate_per_gram_paise;
    }
    return map;
  }, [rates, today, yesterday]);

  const isLoading = !!metalsQuery?.isLoading || !!ratesQuery?.isLoading;

  return (
    <Card
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={16} />
          <span>Today's Metal Rates</span>
        </div>
      }
      extra={
        <Button
          size="small"
          type="link"
          icon={<PlusOutlined />}
          onClick={() => navigate("/metal-rates")}
          style={{ paddingRight: 0 }}
        >
          Update
        </Button>
      }
      style={{ height: "100%" }}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : metals.length === 0 ? (
        <Text type="secondary">No metal types configured.</Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {metals.map((metal) => {
            const symbol = getSymbol(metal.name);
            const entry = rateMap[metal.id];
            const todayRate = entry?.today;
            const yestRate = entry?.yesterday;

            const ratePerGram = todayRate != null ? todayRate / 100 : null;
            const isGold = metal.name.toUpperCase() === "GOLD";
            const displayRate = ratePerGram != null ? (isGold ? ratePerGram * 10 : ratePerGram) : null;
            const displayUnit = isGold ? "/ 10g" : "/ gram";
            const diff =
              todayRate != null && yestRate != null
                ? ((todayRate - yestRate) / yestRate) * 100
                : null;

            return (
              <div
                key={metal.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                {/* Metal symbol badge */}
                <Tag style={{ fontWeight: 700, fontSize: 13, margin: 0, flexShrink: 0 }}>
                  {symbol}
                </Tag>

                {/* Name + rate */}
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 14, textTransform: "capitalize", display: "block" }}>
                    {metal.name.charAt(0) + metal.name.slice(1).toLowerCase()}
                  </Text>
                  {displayRate != null ? (
                    <Text style={{ fontSize: 18, fontWeight: 700 }}>
                      ₹{displayRate.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      <Text type="secondary" style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>
                        {displayUnit}
                      </Text>
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      No rate today
                    </Text>
                  )}
                </div>

                {/* Trend badge */}
                {diff != null && (
                  <Tooltip title={`vs yesterday (₹${((yestRate! / 100) * (isGold ? 10 : 1)).toLocaleString("en-IN")}${isGold ? "/10g" : "/g"})`}>
                    <Tag
                      icon={
                        diff > 0 ? (
                          <ArrowUpOutlined />
                        ) : diff < 0 ? (
                          <ArrowDownOutlined />
                        ) : (
                          <MinusOutlined />
                        )
                      }
                      color={diff > 0 ? "success" : diff < 0 ? "error" : "default"}
                      style={{ margin: 0 }}
                    >
                      {Math.abs(diff).toFixed(2)}%
                    </Tag>
                  </Tooltip>
                )}

                {todayRate == null && (
                  <Badge status="warning" text={<Text type="warning" style={{ fontSize: 11 }}>Not set</Text>} />
                )}
              </div>
            );
          })}

          {/* Last updated note */}
          <Text type="secondary" style={{ fontSize: 11, textAlign: "right" }}>
            {today}
          </Text>
        </div>
      )}
    </Card>
  );
};
