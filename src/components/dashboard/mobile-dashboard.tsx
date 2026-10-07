import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Typography,
  Tag,
  Avatar,
  Skeleton,
  theme,
  Empty,
  Button,
} from "antd";
import {
  TrendingUp,
  Receipt,
  Users,
  Coins,
  Gem,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  ChevronRight,
  Package,
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
  customer?: Pick<ICustomer, "id" | "name" | "customer_code"> | null;
  payment_status?: string;
}

const formatRupees = (paise: number): string => {
  const rs = Math.round(paise / 100);
  return `₹${rs.toLocaleString("en-IN")}`;
};

const abbrRs = (paise: number): string => {
  const rs = paise / 100;
  if (rs >= 10_000_000) return `₹${(rs / 10_000_000).toFixed(2)}Cr`;
  if (rs >= 100_000) return `₹${(rs / 100_000).toFixed(2)}L`;
  if (rs >= 1_000) return `₹${(rs / 1_000).toFixed(1)}K`;
  return `₹${rs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  shopId,
  shopName: _shopName,
}) => {
  const { token } = theme.useToken();
  const navigate = useNavigate();

  // 1. Fetch Today's & Recent Invoices
  const { query: invoicesQuery } = useList<InvoiceRow>({
    resource: "invoices",
    meta: {
      select: "*, customer:customers(id,name,customer_code)",
    },
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { mode: "server", pageSize: 20 },
    queryOptions: { enabled: !!shopId },
  });

  // 2. Fetch Customers Count
  const { query: customersQuery } = useList<ICustomer>({
    resource: "customers",
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    pagination: { mode: "server", pageSize: 1 },
    queryOptions: { enabled: !!shopId },
  });

  // 3. Fetch Ornaments for Inventory Count
  const { query: ornamentsQuery } = useList<IOrnament>({
    resource: "ornaments",
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    pagination: { mode: "server", pageSize: 100 },
    queryOptions: { enabled: !!shopId },
  });

  const invoices = invoicesQuery?.data?.data ?? [];
  const totalCustomers = customersQuery?.data?.total ?? 0;
  const ornaments = ornamentsQuery?.data?.data ?? [];
  const isLoading = invoicesQuery?.isLoading || customersQuery?.isLoading || ornamentsQuery?.isLoading;

  // Calculate Metrics
  const todayStr = dayjs().format("YYYY-MM-DD");
  const todayInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const invDate = inv.invoice_date || (inv.created_at ? inv.created_at.slice(0, 10) : "");
      return invDate === todayStr && !inv.is_cancelled;
    });
  }, [invoices, todayStr]);

  const todaySalesPaise = useMemo(() => {
    return todayInvoices.reduce((sum, inv) => sum + (inv.total_amount_paise || 0), 0);
  }, [todayInvoices]);

  const totalStockGrams = useMemo(() => {
    return ornaments.reduce((sum, orn) => {
      const g = (orn.weight_mg || 0) / 1000;
      return sum + g * (orn.quantity || 1);
    }, 0);
  }, [ornaments]);

  const totalStockItems = useMemo(() => {
    return ornaments.reduce((sum, orn) => sum + (orn.quantity || 0), 0);
  }, [ornaments]);

  const recentInvoices = invoices.slice(0, 5);

  const quickActions = [
    {
      label: "New Sale",
      sub: "Quick Billing",
      icon: Plus,
      color: "#ffffff",
      bg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      onClick: () => navigate("/sales/new"),
      testId: "mobile-action-sale",
    },
    {
      label: "Add Client",
      sub: "New Profile",
      icon: Users,
      color: "#0284c7",
      bg: "rgba(2, 132, 199, 0.08)",
      border: "rgba(2, 132, 199, 0.2)",
      onClick: () => navigate("/customers"),
      testId: "mobile-action-customer",
    },
    {
      label: "Add Piece",
      sub: "New Inventory",
      icon: Gem,
      color: "#d97706",
      bg: "rgba(217, 119, 6, 0.08)",
      border: "rgba(217, 119, 6, 0.2)",
      onClick: () => navigate("/inventory/ornaments"),
      testId: "mobile-action-add-ornament",
    },
    {
      label: "Gold Loan",
      sub: "Pledge Ledger",
      icon: Coins,
      color: "#16a34a",
      bg: "rgba(22, 163, 74, 0.08)",
      border: "rgba(22, 163, 74, 0.2)",
      onClick: () => navigate("/gold-ledger"),
      testId: "mobile-action-loan",
    },
  ];

  return (
    <div
      data-testid="mobile-dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingBottom: 24,
      }}
    >
      {/* Hero: Today's Net Sales Card */}
      <div
        data-testid="mobile-hero-sales-card"
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #172554 100%)",
          borderRadius: 20,
          padding: "20px 18px",
          color: "#ffffff",
          boxShadow: "0 8px 24px rgba(30, 58, 138, 0.25)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -24,
            right: -24,
            width: 110,
            height: 110,
            borderRadius: 55,
            background: "rgba(255, 255, 255, 0.08)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#4ade80",
                display: "inline-block",
                boxShadow: "0 0 8px #4ade80",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255, 255, 255, 0.8)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Today's Net Sales
            </span>
          </div>

          <span
            style={{
              fontSize: 11,
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              padding: "2px 8px",
              borderRadius: 12,
              fontWeight: 500,
            }}
          >
            {dayjs().format("D MMM YYYY")}
          </span>
        </div>

        {/* Big Total */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          {isLoading ? (
            <Skeleton.Input active size="large" style={{ width: 160, height: 38 }} />
          ) : (
            <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
              {formatRupees(todaySalesPaise)}
            </span>
          )}
        </div>

        {/* Footer info in Hero */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.75)" }}>
            {todayInvoices.length} {todayInvoices.length === 1 ? "bill issued" : "bills issued"} today
          </span>

          <button
            type="button"
            onClick={() => navigate("/sales/new")}
            style={{
              background: "#ffffff",
              color: "#1e3a8a",
              border: "none",
              borderRadius: 10,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={13} strokeWidth={3} />
            <span>New Bill</span>
          </button>
        </div>
      </div>

      {/* 2x2 Quick Actions Dock - 100% Touch Area with zero dead zones */}
      <div>
        <Text strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: token.colorTextSecondary }}>
          Quick Actions
        </Text>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginTop: 8,
          }}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isPrimary = action.label === "New Sale";

            return (
              <button
                key={action.label}
                data-testid={action.testId}
                type="button"
                onClick={action.onClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: isPrimary ? "none" : `1px solid ${action.border || token.colorBorderSecondary}`,
                  background: action.bg,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  minHeight: 52,
                  boxShadow: isPrimary
                    ? "0 4px 12px rgba(37, 99, 235, 0.28)"
                    : "0 1px 3px rgba(0, 0, 0, 0.02)",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isPrimary ? "rgba(255, 255, 255, 0.2)" : `${action.color}15`,
                    color: isPrimary ? "#ffffff" : action.color,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} strokeWidth={2.4} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: isPrimary ? "#ffffff" : token.colorText,
                      lineHeight: 1.2,
                    }}
                  >
                    {action.label}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: isPrimary ? "rgba(255, 255, 255, 0.75)" : token.colorTextSecondary,
                      marginTop: 2,
                    }}
                  >
                    {action.sub}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-Metric KPI Grid */}
      <div>
        <Text strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: token.colorTextSecondary }}>
          Showroom Snapshot
        </Text>
        <div
          data-testid="mobile-kpi-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginTop: 8,
          }}
        >
          {/* Customers */}
          <div
            onClick={() => navigate("/customers")}
            role="button"
            tabIndex={0}
            style={{
              backgroundColor: token.colorBgElevated,
              borderRadius: 14,
              padding: "12px 10px",
              border: `1px solid ${token.colorBorderSecondary}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Users size={15} color={token.colorPrimary} />
              <ArrowUpRight size={12} color={token.colorTextQuaternary} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: token.colorText, marginTop: 2 }}>
              {isLoading ? "-" : totalCustomers}
            </span>
            <span style={{ fontSize: 11, color: token.colorTextSecondary }}>
              Clients
            </span>
          </div>

          {/* Stock grams */}
          <div
            onClick={() => navigate("/inventory/ornaments")}
            role="button"
            tabIndex={0}
            style={{
              backgroundColor: token.colorBgElevated,
              borderRadius: 14,
              padding: "12px 10px",
              border: `1px solid ${token.colorBorderSecondary}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Gem size={15} color="#d97706" />
              <ArrowUpRight size={12} color={token.colorTextQuaternary} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: token.colorText, marginTop: 2 }}>
              {isLoading ? "-" : `${Math.round(totalStockGrams)}g`}
            </span>
            <span style={{ fontSize: 11, color: token.colorTextSecondary }}>
              Gold Stock
            </span>
          </div>

          {/* Pieces */}
          <div
            onClick={() => navigate("/inventory/ornaments")}
            role="button"
            tabIndex={0}
            style={{
              backgroundColor: token.colorBgElevated,
              borderRadius: 14,
              padding: "12px 10px",
              border: `1px solid ${token.colorBorderSecondary}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Package size={15} color="#16a34a" />
              <ArrowUpRight size={12} color={token.colorTextQuaternary} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: token.colorText, marginTop: 2 }}>
              {isLoading ? "-" : totalStockItems}
            </span>
            <span style={{ fontSize: 11, color: token.colorTextSecondary }}>
              Pieces
            </span>
          </div>
        </div>
      </div>

      {/* Recent Bills Stream */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: token.colorTextSecondary }}>
            Recent Invoices
          </Text>
          <Button
            type="link"
            size="small"
            onClick={() => navigate("/invoices")}
            style={{
              fontSize: 12,
              padding: "8px 12px",
              height: "auto",
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span>View All</span>
            <ChevronRight size={13} />
          </Button>
        </div>

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ) : recentInvoices.length === 0 ? (
          <Empty description="No recent bills" style={{ margin: "20px 0" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentInvoices.map((inv) => {
              const custName = inv.customer?.name || "Walk-in Customer";
              const initial = custName[0]?.toUpperCase() || "C";
              const isPaid = inv.payment_status === "PAID";
              const isPartial = inv.payment_status === "PARTIAL";

              return (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/show/${inv.id}`)}
                  role="button"
                  tabIndex={0}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 12,
                    backgroundColor: token.colorBgElevated,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  }}
                >
                  {/* Left: Avatar + Details */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <Avatar
                      size={36}
                      style={{
                        backgroundColor: token.colorPrimaryBg,
                        color: token.colorPrimary,
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {initial}
                    </Avatar>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text strong style={{ fontSize: 13, display: "block" }} ellipsis>
                        {custName}
                      </Text>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          #{inv.invoice_number}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          • {dayjs(inv.invoice_date || inv.created_at).fromNow()}
                        </Text>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <Text strong style={{ fontSize: 14, display: "block" }}>
                        ₹{Math.round((inv.total_amount_paise || 0) / 100).toLocaleString("en-IN")}
                      </Text>
                      <Tag
                        color={isPaid ? "success" : isPartial ? "warning" : "default"}
                        style={{
                          margin: "2px 0 0",
                          fontSize: 10,
                          borderRadius: 6,
                          lineHeight: "16px",
                          padding: "0 6px",
                          border: "none",
                          fontWeight: 600,
                        }}
                      >
                        {inv.payment_status || "UNPAID"}
                      </Tag>
                    </div>
                    <ChevronRight size={14} style={{ color: token.colorTextQuaternary }} />
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
