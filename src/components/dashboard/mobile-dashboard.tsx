import React from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import { Typography, Tag, Avatar, theme, Skeleton } from "antd";
import {
  ShoppingCart,
  Users,
  Coins,
  ReceiptIcon,
  TrendingUp,
  Gem,
  ChevronRight,
  Plus,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { ICustomer, IInvoice, IOrnament } from "../../libs/interfaces";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

interface MobileDashboardProps {
  shopId: string;
  shopName?: string;
}

interface InvoiceRow extends IInvoice {
  customer?: Pick<ICustomer, "id", "name", "customer_code"> | null;
}

const abbrRs = (paise: number): string => {
  const rs = paise / 100;
  if (rs >= 10_000_000) return `₹${(rs / 10_000_000).toFixed(2)}Cr`;
  if (rs >= 100_000) return `₹${(rs / 100_000).toFixed(2)}L`;
  if (rs >= 1_000) return `₹${(rs / 1_000).toFixed(1)}K`;
  return `₹${rs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  shopId,
  shopName,
}) => {
  const { token } = theme.useToken();
  const navigate = useNavigate();

  // Queries for stats
  const today = dayjs().format("YYYY-MM-DD");

  const { query: invoicesTodayQuery } = useList<IInvoice>({
    resource: "invoices",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "invoice_date", operator: "eq", value: today },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId },
  });

  const { query: recentInvoicesQuery } = useList<InvoiceRow>({
    resource: "invoices",
    meta: { select: "*, customer:customers(id,name,customer_code)" },
    filters: [{ field: "shop_id", operator: "eq", value: shopId }],
    sorters: [{ field: "invoice_date", order: "desc" }, { field: "created_at", order: "desc" }],
    pagination: { mode: "server", pageSize: 5 },
    queryOptions: { enabled: !!shopId },
  });

  const { query: customersQuery } = useList<ICustomer>({
    resource: "customers",
    filters: [{ field: "shop_id", operator: "eq", value: shopId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId },
  });

  const { query: ornamentsQuery } = useList<IOrnament>({
    resource: "ornaments",
    filters: [{ field: "shop_id", operator: "eq", value: shopId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId },
  });

  const todayInvoices = invoicesTodayQuery?.data?.data ?? [];
  const todaySalesPaise = todayInvoices.reduce(
    (sum, inv) => sum + (inv.total_amount_paise ?? 0),
    0
  );
  const totalCustomers = customersQuery?.data?.data?.length ?? 0;
  const totalStockCount = ornamentsQuery?.data?.data?.length ?? 0;
  const recentInvoices = (recentInvoicesQuery?.data?.data ?? []) as InvoiceRow[];
  const isLoading = recentInvoicesQuery?.isLoading;

  const quickActions = [
    {
      key: "sale",
      label: "New Sale",
      testId: "mobile-action-sale",
      icon: ShoppingCart,
      color: "#2563eb",
      bgColor: "#eff6ff",
      onClick: () => navigate("/sales/new"),
    },
    {
      key: "customer",
      label: "Add Client",
      testId: "mobile-action-customer",
      icon: Users,
      color: "#0d9488",
      bgColor: "#f0fdfa",
      onClick: () => navigate("/customers"),
    },
    {
      key: "loan",
      label: "Gold Loan",
      testId: "mobile-action-loan",
      icon: Coins,
      color: "#d97706",
      bgColor: "#fffbeb",
      onClick: () => navigate("/gold-ledger"),
    },
    {
      key: "rates",
      label: "Live Rates",
      testId: "mobile-action-rates",
      icon: TrendingUp,
      color: "#b45309",
      bgColor: "#fef3c7",
      onClick: () => navigate("/metal-rates"),
    },
  ];

  return (
    <div
      data-testid="mobile-dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingBottom: 20,
      }}
    >
      {/* App Greeting & Date Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 2px",
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Hi {shopName || "Jeweler"} 👋
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs().format("dddd, D MMM YYYY")}
          </Text>
        </div>
        <Tag
          color="gold"
          style={{
            margin: 0,
            borderRadius: 12,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          LIVE STORE
        </Tag>
      </div>

      {/* Quick Action Touch Circles */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 14px",
          backgroundColor: token.colorBgElevated,
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              data-testid={action.testId}
              type="button"
              onClick={action.onClick}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 6px",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: action.bgColor,
                  color: action.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                }}
              >
                <Icon size={22} strokeWidth={2.2} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: token.colorText,
                }}
              >
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2x2 Compact KPI Grid */}
      <div
        data-testid="mobile-kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {/* Today's Sales */}
        <div
          onClick={() => navigate("/invoices")}
          style={{
            backgroundColor: token.colorBgElevated,
            borderRadius: 14,
            padding: "14px 14px",
            border: `1px solid ${token.colorBorderSecondary}`,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>
              TODAY'S SALE
            </Text>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={14} />
            </div>
          </div>
          <Title level={4} style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700 }}>
            {abbrRs(todaySalesPaise)}
          </Title>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {todayInvoices.length} {todayInvoices.length === 1 ? "bill" : "bills"}
          </Text>
        </div>

        {/* Total Invoices */}
        <div
          onClick={() => navigate("/invoices")}
          style={{
            backgroundColor: token.colorBgElevated,
            borderRadius: 14,
            padding: "14px 14px",
            border: `1px solid ${token.colorBorderSecondary}`,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>
              INVOICES
            </Text>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                backgroundColor: "#fdf4ff",
                color: "#c026d3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ReceiptIcon size={14} />
            </div>
          </div>
          <Title level={4} style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700 }}>
            {recentInvoicesQuery?.data?.total ?? recentInvoices.length}
          </Title>
          <Text type="secondary" style={{ fontSize: 11 }}>
            All-time records
          </Text>
        </div>

        {/* Active Customers */}
        <div
          onClick={() => navigate("/customers")}
          style={{
            backgroundColor: token.colorBgElevated,
            borderRadius: 14,
            padding: "14px 14px",
            border: `1px solid ${token.colorBorderSecondary}`,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>
              CUSTOMERS
            </Text>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                backgroundColor: "#f0fdf4",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={14} />
            </div>
          </div>
          <Title level={4} style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700 }}>
            {totalCustomers}
          </Title>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Verified accounts
          </Text>
        </div>

        {/* Stock Items */}
        <div
          onClick={() => navigate("/ornaments")}
          style={{
            backgroundColor: token.colorBgElevated,
            borderRadius: 14,
            padding: "14px 14px",
            border: `1px solid ${token.colorBorderSecondary}`,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>
              ORNAMENTS
            </Text>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                backgroundColor: "#fff7ed",
                color: "#ea580c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Gem size={14} />
            </div>
          </div>
          <Title level={4} style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700 }}>
            {totalStockCount}
          </Title>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Live in showcase
          </Text>
        </div>
      </div>

      {/* Recent Transactions List (Card-based, zero horizontal scroll) */}
      <div
        style={{
          backgroundColor: token.colorBgElevated,
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
          padding: "16px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text strong style={{ fontSize: 15 }}>
            Recent Invoices
          </Text>
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            style={{
              background: "none",
              border: "none",
              color: token.colorPrimary,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View All →
          </button>
        </div>

        {isLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : recentInvoices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <ReceiptIcon size={32} style={{ color: token.colorTextQuaternary, margin: "0 auto 8px" }} />
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              No invoices generated yet
            </Text>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentInvoices.map((inv) => {
              const custName = inv.customer?.name || "Walk-in Customer";
              const initial = custName[0]?.toUpperCase() || "C";
              const isPaid = inv.payment_status === "PAID";
              const isPartial = inv.payment_status === "PARTIAL";

              return (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/show/${inv.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 10px",
                    borderRadius: 10,
                    backgroundColor: token.colorFillAlter,
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar
                      size={36}
                      style={{
                        backgroundColor: token.colorPrimaryBg,
                        color: token.colorPrimary,
                        fontWeight: 600,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {initial}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13, display: "block" }} ellipsis>
                        {custName}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        #{inv.invoice_number} • {dayjs(inv.invoice_date).fromNow()}
                      </Text>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <Text strong style={{ fontSize: 13, display: "block" }}>
                      {abbrRs(inv.total_amount_paise ?? 0)}
                    </Text>
                    <Tag
                      color={isPaid ? "success" : isPartial ? "warning" : "error"}
                      style={{ margin: 0, fontSize: 10, borderRadius: 6, lineHeight: "16px", padding: "0 6px" }}
                    >
                      {inv.payment_status || "UNPAID"}
                    </Tag>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
