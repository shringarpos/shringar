import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import { Button, Card, Progress, Skeleton, Tag, Typography } from "antd";
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

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0].payload;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        padding: "8px 14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        fontSize: 12,
      }}
    >
      <Text strong>{name}</Text>
      <br />
      <Text type="secondary">Items: </Text>
      <Text strong>{value}</Text>
      <br />
      <Text type="secondary">Share: </Text>
      <Text strong>{(percent * 100).toFixed(1)}%</Text>
    </div>
  );
};

export const InventorySummary: React.FC<InventorySummaryProps> = ({ shopId }) => {
  const navigate = useNavigate();

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
    queryOptions: { staleTime: 2 * 60 * 1000 },
  });

  const ornaments = (query?.data?.data ?? []) as IOrnamentWithDetails[];
  const isLoading = !!query?.isLoading;

  // ── Group by category ──────────────────────────────────────────────────────

  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; count: number; qty: number }> = {};
    for (const o of ornaments) {
      const id = o.category?.id ?? "unknown";
      const name = o.category?.name ?? "Uncategorized";
      if (!map[id]) map[id] = { name, count: 0, qty: 0 };
      map[id].count += 1;
      map[id].qty += o.quantity;
    }
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [ornaments]);

  // ── Group by metal type ────────────────────────────────────────────────────

  const metalData = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};
    for (const o of ornaments) {
      const id = o.metal_type?.id ?? "unknown";
      const name = o.metal_type?.name ?? "Unknown";
      if (!map[id]) map[id] = { name, value: 0 };
      map[id].value += 1;
    }
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [ornaments]);

  const total = ornaments.length || 1;

  return (
    <Card
      title="Inventory Breakdown"
      extra={
        <Button
          size="small"
          type="link"
          onClick={() => navigate("/inventory/ornaments")}
          style={{ paddingRight: 0 }}
        >
          Manage
        </Button>
      }
      style={{
        borderRadius: 12,
        height: "100%",
      }}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : ornaments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Text type="secondary">No ornaments in inventory.</Text>
          <br />
          <Button
            type="primary"
            size="small"
            style={{ marginTop: 12 }}
            onClick={() => navigate("/inventory/ornaments")}
          >
            Add Ornaments
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Pie chart — by metal type */}
          {metalData.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: "block" }}>
                By Metal Type
              </Text>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie
                      data={metalData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {metalData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {metalData.map((m, i) => (
                    <div
                      key={m.name}
                      style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: PALETTE[i % PALETTE.length],
                          flexShrink: 0,
                        }}
                      />
                      <Text style={{ fontSize: 12, flex: 1 }}>
                        {m.name.charAt(0) + m.name.slice(1).toLowerCase()}
                      </Text>
                      <Tag style={{ margin: 0, fontSize: 11 }}>{m.value}</Tag>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          <div>
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 10, display: "block" }}>
              Top Categories
            </Text>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {categoryData.map((cat) => (
                <div key={cat.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <Text style={{ fontSize: 12 }}>{cat.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {cat.count} items · qty {cat.qty}
                    </Text>
                  </div>
                  <Progress
                    percent={Math.round((cat.count / total) * 100)}
                    showInfo={false}
                    size="small"
                    trailColor="#f0f0f0"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
