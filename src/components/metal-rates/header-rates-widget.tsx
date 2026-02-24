import { useList } from "@refinedev/core";
import { EditOutlined, HistoryOutlined } from "@ant-design/icons";
import {
  Button,
  Divider,
  Popover,
  Space,
  Typography,
  theme,
} from "antd";
import dayjs from "dayjs";
import React, { useState } from "react";
import { useNavigate } from "react-router";
import type { IMetalRate, IMetalType } from "../../libs/interfaces";
import { useShopCheck } from "../../hooks/use-shop-check";
import { RateEditPopover } from "./rate-edit-popover";
import { formatRateDisplay, getLatestRate } from "./utils";

const { useToken } = theme;

const { Text } = Typography;

// Detect dark mode via colorBgBase token: '#000000' in dark algo, '#ffffff' in light
function useIsDark() {
  const { token } = useToken();
  return token.colorBgBase?.toLowerCase().startsWith("#0") ?? false;
}

function metalAccent(name: string, isDark: boolean): string {
  const key = name.toUpperCase();
  if (key === "GOLD")   return isDark ? "#fbbf24" : "#f59e0b"; // amber-400 / amber-500
  if (key === "SILVER") return isDark ? "#cbd5e1" : "#64748b"; // slate-300 / slate-500
  return isDark ? "#818cf8" : "#6366f1"; // indigo fallback
}

export const HeaderRatesWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isDark = useIsDark();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;
  const today = dayjs().format("YYYY-MM-DD");

  const { query: metalsQuery } = useList<IMetalType>({
    resource: "metal_types",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const { query: ratesQuery } = useList<IMetalRate>({
    resource: "ornament_rates",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "rate_date", operator: "eq", value: today },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId, staleTime: 30 * 1000 },
  });

  const metals = (metalsQuery?.data?.data ?? []) as IMetalType[];
  const rates  = (ratesQuery?.data?.data  ?? []) as IMetalRate[];
  const isLoading = !!metalsQuery?.isLoading || (!!shopId && !!ratesQuery?.isLoading);

  if (isLoading || !shopId) return null;

  const content = (
    <div style={{ minWidth: 260 }}>
      <Text style={{ fontSize: 12 }}>
        Today — {dayjs().format("D MMM YYYY")}
      </Text>
      <Divider style={{ margin: "8px 0" }} />
      {metals.map((metal: IMetalType) => {
        const accent = metalAccent(metal.name, isDark);
        const todayRate = rates.find((r: IMetalRate) => r.metal_type_id === metal.id);
        return (
          <div
            key={metal.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              paddingLeft: 10,
              borderLeft: `3px solid ${accent}`,
            }}
          >
            <Space>
              <Text strong style={{ color: accent }}>
                {metal.name}
              </Text>
              <Text strong>
                {todayRate
                  ? formatRateDisplay(todayRate.rate_per_gram_paise, metal.name)
                  : <Text type="secondary">Not set</Text>}
              </Text>
            </Space>
            <RateEditPopover
              metal={metal}
              existingRate={todayRate}
              shopId={shopId}
              onSuccess={() => ratesQuery?.refetch()}
              trigger={
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ color: accent, opacity: 0.8 }} />}
                />
              }
            />
          </div>
        );
      })}
      <Divider style={{ margin: "8px 0" }} />
      <Button
        type="link"
        icon={<HistoryOutlined />}
        size="small"
        style={{ padding: 0 }}
        onClick={() => {
          setOpen(false);
          navigate("/metal-rates");
        }}
      >
        View Full History
      </Button>
    </div>
  );

  return (
    <Popover
      content={content}
      title="Metal Rates"
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Button type="text" size="small" style={{ cursor: "pointer" }}>
        {metals.map((m: IMetalType, i: number) => {
          const accent = metalAccent(m.name, isDark);
          const r = getLatestRate(rates, m.id);
          const rateStr = r
            ? formatRateDisplay(r.rate_per_gram_paise, m.name)
            : "—";
          return (
            <React.Fragment key={m.id}>
              {i > 0 && (
                <Text type="secondary" style={{ margin: "0 6px", fontSize: 13 }}>
                  |
                </Text>
              )}
              <Text style={{ color: accent, fontWeight: 600, fontSize: 13 }}>
                { m.name}
              </Text>
              <Text strong style={{ fontSize: 14, marginLeft: 4 }}>
                {rateStr}
              </Text>
            </React.Fragment>
          );
        })}
      </Button>
    </Popover>
  );
};
