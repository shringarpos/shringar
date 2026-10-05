import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import { Button, Card, Progress, Skeleton, Tag, Typography, theme } from "antd";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { IOrnamentWithDetails } from "../../libs/interfaces";

const { Text } = Typography;

const PALETTE = [
  "#1677ff", "#52c41a", "#fa8c16", "#722ed1", "#13c2c2",
  "#eb2f96", "#faad14", "#a0d911", "#096dd9", "#c41d7f",
];

interface InventorySummaryProps {
  shopId: string;
}

const CustomTooltip = ({ active, payload, token }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0].payload;
  return (
    <div
      style={{
        background: token?.colorBgElevated || "#fff",
        border: `1px solid ${token?.colorBorderSecondary || "#f0f0f0"}`,
        borderRadius: 8,
        padding: "8px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        fontSize: 12,
        color: token?.colorText,
      }}
    >
      <Text strong style={{ color: token?.colorText }}>{name}</Text>
      <br />
      <Text type="secondary">Items: </Text>
      <Text strong style={{ color: token?.colorText }}>{value}</Text>
      <br />
      <Text type="secondary">Share: </Text>
      <Text strong style={{ color: token?.colorText }}>{(percent * 100).toFixed(1)}%</Text>
    </div>
  );
};

export const InventorySummary: React.FC<InventorySummaryProps> = ({ shopId }) => {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const { query } = useList<IOrnamentWithDetails>({
    resource: "ornaments",
    meta: {
      select: "id, is_active, quantity, category:ornament_categories(id,name), metal_type:metal_types(id,name)",
    },
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "is_active", operator: "eq", value: true },
    ],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 30 * 1000 },
  });

  const ornaments = (query?.data?.data ?? []) as IOrnamentWithDetails[];

  // Group by category
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const o of ornaments) {
      const cat = o.category?.name ?? "Other";
      counts[cat] = (counts[cat] ?? 0) + (o.quantity ?? 1);
      total += o.quantity ?? 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? value / total : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [ornaments]);

  const totalItems = useMemo(
    () => ornaments.reduce((acc, o) => acc + (o.quantity ?? 1), 0),
    [ornaments]
  );

  const isLoading = !!query?.isLoading;

  return (
    <Card
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>Inventory by Category</span>
          <Tag color="blue">{totalItems} Total Items</Tag>
        </div>
      }
      extra={
        <Button
          type="link"
          size="small"
          onClick={() => navigate("/inventory/ornaments")}
          style={{ padding: 0 }}
        >
          View All
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : categoryData.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#8c8c8c" }}>
          No inventory items found
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 140, height: 140, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PALETTE[index % PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip token={token} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {categoryData.map((item, index) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: PALETTE[index % PALETTE.length],
                      flexShrink: 0,
                    }}
                  />
                  <Text
                    ellipsis
                    style={{ fontSize: 12 }}
                  >
                    {item.name}
                  </Text>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Text strong style={{ fontSize: 12 }}>
                    {item.value}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11, width: 36, textAlign: "right" }}>
                    {(item.percent * 100).toFixed(0)}%
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
