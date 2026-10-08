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
      iconBg: "rgba(255, 255, 255, 0.2)",
      onClick: () => navigate("/sales/new"),
      testId: "mobile-action-sale",
    },
    {
      label: "Add Client",
      sub: "New Profile",
      icon: Users,
      color: "#0284c7",
      bg: token.colorBgElevated,
      iconBg: "rgba(2, 132, 199, 0.1)",
      onClick: () => navigate("/customers"),
      testId: "mobile-action-customer",
    },
    {
      label: "Add Piece",
      sub: "New Inventory",
      icon: Gem,
      color: "#d97706",
      bg: token.colorBgElevated,
      iconBg: "rgba(217, 119, 6, 0.1)",
      onClick: () => navigate("/ornaments"),
      testId: "mobile-action-add-ornament",
    },
    {
      label: "Gold Loan",
      sub: "Pledge Ledger",
      icon: Coins,
      color: "#16a34a",
      bg: token.colorBgElevated,
      iconBg: "rgba(22, 163, 74, 0.1)",
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
        paddingBottom: "calc(96px + env(safe-area-inset-bottom, 16px))",
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
              minHeight: 44,
              padding: "10px 14px",
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

      {/* 2x2 Quick Actions Dock - Sleek, App-first Aesthetic */}
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
                  border: isPrimary ? "none" : `1px solid ${token.colorBorderSecondary}`,
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
                    backgroundColor: action.iconBg,
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
            onClick={() => navigate("/ornaments")}
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
            onClick={() => navigate("/ornaments")}
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

      {/* Recent Invoices Section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: token.colorTextSecondary }}>
            Recent Invoices
          </Text>
          <Button
            type="link"
            size="small"
            onClick={() => navigate("/invoices")}
            style={{ padding: "10px 12px", minHeight: 44, fontSize: 12, display: "inline-flex", alignItems: "center" }}
          >
            View All
          </Button>
        </div>

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <Skeleton active paragraph={{ rows: 1 }} />
              </div>
            ))}
          </div>
        ) : recentInvoices.length === 0 ? (
          <div
            style={{
              backgroundColor: token.colorBgElevated,
              borderRadius: 14,
              padding: "24px 16px",
              textAlign: "center",
              border: `1px dashed ${token.colorBorderSecondary}`,
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>No invoices created yet</span>}
            >
              <Button
                type="primary"
                size="small"
                onClick={() => navigate("/sales/new")}
                style={{ borderRadius: 8, fontSize: 12 }}
              >
                Create First Bill
              </Button>
            </Empty>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentInvoices.map((inv) => {
              const custName = inv.customer?.name || "Walk-in Customer";
              const dateStr = inv.invoice_date
                ? dayjs(inv.invoice_date).format("D MMM")
                : dayjs(inv.created_at).format("D MMM");

              return (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/show/${inv.id}`)}
                  style={{
                    backgroundColor: token.colorBgElevated,
                    borderRadius: 14,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: `1px solid ${token.colorBorderSecondary}`,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    transition: "transform 0.1s ease",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: inv.is_cancelled ? "rgba(239, 68, 68, 0.1)" : "rgba(37, 99, 235, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Receipt
                        size={17}
                        color={inv.is_cancelled ? "#ef4444" : token.colorPrimary}
                      />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Text strong style={{ fontSize: 13 }} ellipsis>
                          {custName}
                        </Text>
                        {inv.is_cancelled && (
                          <Tag color="error" style={{ margin: 0, fontSize: 9, lineHeight: "14px", padding: "0 4px" }}>
                            VOID
                          </Tag>
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        #{inv.invoice_number} • {dateStr}
                      </Text>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: inv.is_cancelled ? token.colorTextSecondary : token.colorText,
                        display: "block",
                      }}
                    >
                      {formatRupees(inv.total_amount_paise || 0)}
                    </span>
                    <span style={{ fontSize: 10, color: token.colorTextTertiary }}>
                      {dayjs(inv.created_at).fromNow(true)}
                    </span>
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
