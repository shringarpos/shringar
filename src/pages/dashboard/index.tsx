import React from "react";
import { Col, Row, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import { useShopCheck } from "../../hooks/use-shop-check";
import {
  InventorySummary,
  MetalRatesWidget,
  QuickActions,
  RecentInvoices,
  RevenueChart,
  StatsCards,
  TopCustomers,
} from "../../components/dashboard";

const { Title, Text } = Typography;

export default function Dashboard() {
  const { shops, isLoading } = useShopCheck();
  const shopId = shops?.[0]?.id;
  const shopName = shops?.[0]?.name;

  if (isLoading) {
    return (
      <div style={{ padding: "24px 0" }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!shopId) {
    return (
      <div style={{ padding: 24 }}>
        <Text type="secondary">Shop not configured. Please complete onboarding.</Text>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <Title level={4} style={{ margin: 0 }}>
          Welcome back{shopName ? `, ${shopName}` : ""}! 👋
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {dayjs().format("dddd, D MMMM YYYY")}
        </Text>
      </div>

      {/* ── KPI Stats ────────────────────────────────────────────────────── */}
      <StatsCards shopId={shopId} />

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <QuickActions />

      {/* ── Revenue Chart + Metal Rates ─────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <RevenueChart shopId={shopId} />
        </Col>
        <Col xs={24} xl={8}>
          <MetalRatesWidget shopId={shopId} />
        </Col>
      </Row>

      {/* ── Recent Invoices ─────────────────────────────────────────────── */}
      <RecentInvoices shopId={shopId} />

      {/* ── Inventory + Top Customers ──────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <InventorySummary shopId={shopId} />
        </Col>
        <Col xs={24} lg={12}>
          <TopCustomers shopId={shopId} />
        </Col>
      </Row>

    </div>
  );
}