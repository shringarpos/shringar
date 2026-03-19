import React from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import { Card, Skeleton, Tooltip, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ICustomer, IInvoice, IOrnament } from "../../libs/interfaces";

const { Text } = Typography;

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Abbreviate paise value to a compact rupee string: ₹1.2Cr / ₹3.4L / ₹56.7K / ₹890 */
const abbrRs = (paise: number): string => {
  const rs = paise / 100;
  if (rs >= 10_000_000) return `₹${(rs / 10_000_000).toFixed(2)}Cr`;
  if (rs >= 100_000)    return `₹${(rs / 100_000).toFixed(2)}L`;
  if (rs >= 1_000)      return `₹${(rs / 1_000).toFixed(1)}K`;
  return `₹${rs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

/** Full unabbreviated rupee string for tooltip */
const fullRs = (paise: number): string =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const calcTrend = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  path?: string;
  /** Shown in a ?-tooltip next to the value (e.g. full unabbreviated number) */
  valueTip?: string;
  /** Shown on the ⓘ icon in the title row */
  infoTip?: string;
  loading?: boolean;
  /** Numeric percentage change. Drives ↑/↓ colour. */
  trendValue?: number;
  /** Plain-text label shown beside / below the trend */
  trendLabel?: string;
}

const CARD_WIDTH = 200;

type DashboardFilter = {
  field: string;
  operator: "eq" | "gte" | "lte";
  value: string | number | boolean;
};

const buildFilteredPath = (basePath: string, filters: DashboardFilter[]) => {
  const params = new URLSearchParams();

  filters.forEach((filter, index) => {
    params.set(`filters[${index}][field]`, filter.field);
    params.set(`filters[${index}][operator]`, filter.operator);
    params.set(`filters[${index}][value]`, String(filter.value));
  });

  params.set("currentPage", "1");

  return `${basePath}?${params.toString()}`;
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  path,
  valueTip,
  infoTip,
  loading,
  trendValue,
  trendLabel,
}) => {
  const navigate = useNavigate();
  const trendUp   = trendValue != null && trendValue > 0;
  const trendDown = trendValue != null && trendValue < 0;
  const isClickable = !!path && !loading;

  const cardTitle = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
      <Text
        type="secondary"
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          lineHeight: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </Text>
      {infoTip && (
        <Tooltip title={infoTip} placement="top">
          <InfoCircleOutlined style={{ fontSize: 11, opacity: 0.45, flexShrink: 0, cursor: "help" }} />
        </Tooltip>
      )}
    </div>
  );

  return (
    <Card
      size="small"
      title={cardTitle}
      style={{
        width: CARD_WIDTH,
        flexShrink: 0,
        cursor: isClickable ? "pointer" : "default",
      }}
      styles={{ header: { minHeight: 36, padding: "0 12px" }, body: { padding: "10px 12px" } }}
      hoverable={isClickable}
      onClick={isClickable ? () => navigate(path) : undefined}
    >
      {/* ── Value ─────────────────────────────────────────────────────── */}
      {loading ? (
        <Skeleton.Input active size="small" style={{ width: 100, height: 30, display: "block" }} />
      ) : (
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, minWidth: 0 }}>
          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </span>
          {valueTip && (
            <Tooltip title={<span style={{ fontFamily: "monospace", fontSize: 12 }}>{valueTip}</span>} placement="top">
              <InfoCircleOutlined style={{ fontSize: 11, opacity: 0.35, cursor: "help", flexShrink: 0 }} />
            </Tooltip>
          )}
        </div>
      )}

      {/* ── Trend / subtitle ──────────────────────────────────────────── */}
      {!loading && (trendValue != null || trendLabel) && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, marginTop: 6 }}>
          {trendValue != null && (
            <Text
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: trendUp ? "#52c41a" : trendDown ? "#ff4d4f" : undefined,
                flexShrink: 0,
              }}
            >
              {trendUp ? "↑" : trendDown ? "↓" : "→"}{" "}
              {Math.abs(trendValue).toFixed(1)}%
            </Text>
          )}
          {trendLabel && (
            <Text
              type="secondary"
              style={{
                fontSize: 11,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {trendLabel}
            </Text>
          )}
        </div>
      )}
    </Card>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface StatsCardsProps {
  shopId: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ shopId }) => {
  const today = dayjs().format("YYYY-MM-DD");
  const thisMonthStart = dayjs().startOf("month").format("YYYY-MM-DD");
  const lastMonthStart = dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
  const lastMonthEnd = dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD");

  // ── Today's invoices ──────────────────────────────────────────────────────

  const { query: todayInvQuery } = useList<IInvoice>({
    resource: "invoices",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "invoice_date", operator: "eq", value: today },
      { field: "is_cancelled", operator: "eq", value: false },
    ],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 30 * 1000 },
  });

  const todayInvoices = todayInvQuery?.data?.data ?? [];
  const todayRevenue = todayInvoices.reduce((s, i) => s + i.total_amount_paise, 0);

  // ── This month's invoices ────────────────────────────────────────────────

  const { query: monthInvQuery } = useList<IInvoice>({
    resource: "invoices",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "invoice_date", operator: "gte", value: thisMonthStart },
      { field: "invoice_date", operator: "lte", value: today },
      { field: "is_cancelled", operator: "eq", value: false },
    ],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 60 * 1000 },
  });

  const monthInvoices = monthInvQuery?.data?.data ?? [];
  const monthRevenue = monthInvoices.reduce((s, i) => s + i.total_amount_paise, 0);

  // ── Last month invoices (for trend) ───────────────────────────────────────

  const { query: lastMonthInvQuery } = useList<IInvoice>({
    resource: "invoices",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "invoice_date", operator: "gte", value: lastMonthStart },
      { field: "invoice_date", operator: "lte", value: lastMonthEnd },
      { field: "is_cancelled", operator: "eq", value: false },
    ],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const lastMonthRevenue = (lastMonthInvQuery?.data?.data ?? []).reduce(
    (s, i) => s + i.total_amount_paise,
    0,
  );
  const revenueTrend = calcTrend(monthRevenue, lastMonthRevenue);

  // ── Customers ─────────────────────────────────────────────────────────────

  const { query: customersQuery } = useList<ICustomer>({
    resource: "customers",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "is_active", operator: "eq", value: true },
    ],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 2 * 60 * 1000 },
  });

  const totalCustomers = customersQuery?.data?.total ?? 0;

  // ── Inventory ──────────────────────────────────────────────────────────────

  const { query: ornamentsQuery } = useList<IOrnament>({
    resource: "ornaments",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "is_active", operator: "eq", value: true },
    ],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 2 * 60 * 1000 },
  });

  const ornaments = ornamentsQuery?.data?.data ?? [];
  const totalOrnaments = ornaments.length;
  const lowStockCount = ornaments.filter((o) => o.quantity <= 1).length;

  const isLoading =
    !!todayInvQuery?.isLoading ||
    !!monthInvQuery?.isLoading ||
    !!customersQuery?.isLoading ||
    !!ornamentsQuery?.isLoading;

  const cards: StatCardProps[] = [
    {
      title: "Today's Revenue",
      value: abbrRs(todayRevenue),
      path: buildFilteredPath("/invoices", [
        { field: "invoice_date", operator: "eq", value: today },
        { field: "is_cancelled", operator: "eq", value: false },
      ]),
      valueTip: fullRs(todayRevenue),
      trendLabel: `${todayInvoices.length} invoice${todayInvoices.length !== 1 ? "s" : ""} today`,
      infoTip: "Total revenue from non-cancelled invoices raised today",
    },
    {
      title: "Monthly Revenue",
      value: abbrRs(monthRevenue),
      path: buildFilteredPath("/invoices", [
        { field: "invoice_date", operator: "gte", value: thisMonthStart },
        { field: "invoice_date", operator: "lte", value: today },
        { field: "is_cancelled", operator: "eq", value: false },
      ]),
      valueTip: fullRs(monthRevenue),
      trendValue: revenueTrend,
      trendLabel: "vs last month",
      infoTip: "Revenue from non-cancelled invoices this calendar month",
    },
    {
      title: "Total Customers",
      value: totalCustomers,
      path: buildFilteredPath("/customers", [
        { field: "is_active", operator: "eq", value: true },
      ]),
      infoTip: "Active customers registered in your shop",
    },
    {
      title: "Active Ornaments",
      value: totalOrnaments,
      path: buildFilteredPath("/inventory/ornaments", [
        { field: "is_active", operator: "eq", value: true },
      ]),
      trendLabel: lowStockCount > 0 ? `${lowStockCount} low stock` : "All stocked",
      infoTip: "Active ornament SKUs in your inventory",
    },
    {
      title: "Low Stock Items",
      value: lowStockCount,
      path: buildFilteredPath("/inventory/ornaments", [
        { field: "is_active", operator: "eq", value: true },
        { field: "quantity", operator: "lte", value: 1 },
      ]),
      infoTip: "Ornaments with quantity ≤ 1",
    },
    {
      title: "Monthly Invoices",
      value: monthInvoices.length,
      path: buildFilteredPath("/invoices", [
        { field: "invoice_date", operator: "gte", value: thisMonthStart },
        { field: "invoice_date", operator: "lte", value: today },
        { field: "is_cancelled", operator: "eq", value: false },
      ]),
      infoTip: "Total invoices raised this calendar month",
    },
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {cards.map((card) => (
        <StatCard key={card.title} {...card} loading={isLoading} />
      ))}
    </div>
  );
};
