import { useList } from "@refinedev/core";
import { List } from "@refinedev/antd";
import { Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import React from "react";
import { useNavigate } from "react-router";
import { RateChart } from "../../components/metal-rates/rate-chart";
import { RateHistoryTable } from "../../components/metal-rates/rate-history-table";
import { RateTopSection } from "../../components/metal-rates/rate-top-section";
import { useShopCheck } from "../../hooks/use-shop-check";
import type { IMetalRate, IMetalType } from "../../libs/interfaces";

const { Text } = Typography;

export default function MetalRates() {
  const navigate = useNavigate();
  const { shops, isLoading: shopLoading } = useShopCheck();
  const shopId = shops?.[0]?.id;
  const today = dayjs().format("YYYY-MM-DD");

  const { query: metalsQuery } = useList<IMetalType>({
    resource: "metal_types",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const since = dayjs(today).subtract(30, "day").format("YYYY-MM-DD");
  const { query: ratesQuery } = useList<IMetalRate>({
    resource: "ornament_rates",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "rate_date", operator: "gte", value: since },
    ],
    sorters: [{ field: "rate_date", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId, staleTime: 30 * 1000 },
  });

  const metals = (metalsQuery?.data?.data ?? []) as IMetalType[];
  const rates  = (ratesQuery?.data?.data  ?? []) as IMetalRate[];

  const isLoading =
    shopLoading || !!metalsQuery?.isLoading || (!!shopId && !!ratesQuery?.isLoading);

  const todayRates = rates.filter((r: IMetalRate) => r.rate_date === today);
  const lastUpdated = todayRates.reduce<IMetalRate | null>(
    (acc: IMetalRate | null, r: IMetalRate) => {
      if (!acc) return r;
      return r.updated_at > acc.updated_at ? r : acc;
    },
    null,
  );

  const handleHistoryRowClick = (date: string) => {
    navigate(`/invoices?invoiceDate=${date}`);
  };

  if (!shopId && !shopLoading) {
    return (
      <List title="Metal Rates">
        <Text type="secondary">Shop not configured. Please complete onboarding.</Text>
      </List>
    );
  }

  return (
    <List
      title="Metal Rates"
      breadcrumb={false}
      headerProps={{ style: { paddingBottom: 0 } }}
    >
      {/* ── Today's Rates + Rate Insights ───────────────────────────────── */}
      {isLoading ? (
        <div style={{ marginBottom: 24 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <RateTopSection
            metals={metals}
            rates={rates}
            today={today}
            shopId={shopId ?? ""}
            lastUpdated={lastUpdated}
            onRateSuccess={() => ratesQuery?.refetch()}
          />
        </div>
      )}

      {!isLoading && metals.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <RateChart metals={metals} rates={rates} today={today} />
        </div>
      )}

      {shopId && (
        <RateHistoryTable
          metals={metals}
          shopId={shopId}
          onRowClick={handleHistoryRowClick}
        />
      )}
    </List>
  );
}