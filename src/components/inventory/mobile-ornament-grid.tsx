import React, { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { useDrawerForm } from "@refinedev/antd";
import {
  Typography,
  Input,
  Button,
  Tag,
  Skeleton,
  theme,
  Empty,
  Badge,
} from "antd";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Gem,
  Sparkles,
  Scale,
} from "lucide-react";
import type { IOrnament, IOrnamentWithDetails } from "../../libs/interfaces";
import { useShopCheck } from "../../hooks/use-shop-check";
import { OrnamentDrawer } from "./ornaments/ornament-drawer";
import { OrnamentShowDrawer } from "./ornaments/ornament-show-drawer";

const { Title, Text } = Typography;

export const MobileOrnamentGrid: React.FC = () => {
  const { token } = theme.useToken();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetal, setSelectedMetal] = useState<string>("all");
  const [showOrnament, setShowOrnament] = useState<IOrnamentWithDetails | null>(null);
  const [editingOrnament, setEditingOrnament] = useState<IOrnament | null>(null);

  const {
    drawerProps,
    formProps,
    show: showDrawer,
    close: closeDrawer,
  } = useDrawerForm<IOrnament>({
    resource: "ornaments",
    action: editingOrnament ? "edit" : "create",
    id: editingOrnament?.id,
    redirect: false,
    onMutationSuccess: () => {
      setEditingOrnament(null);
      closeDrawer();
    },
  });

  const { query } = useList<IOrnamentWithDetails>({
    resource: "ornaments",
    meta: {
      select: "*, metal_type:metal_types(id,name), purity_level:purity_levels(id,purity_value,display_name), category:categories(id,name)",
    },
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { mode: "server", pageSize: 50 },
    queryOptions: { enabled: !!shopId },
  });

  const ornaments = (query?.data?.data ?? []) as IOrnamentWithDetails[];
  const isLoading = query?.isLoading;

  const filteredOrnaments = useMemo(() => {
    return ornaments.filter((orn) => {
      const matchSearch =
        !searchTerm ||
        orn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orn.item_code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMetal =
        selectedMetal === "all" ||
        orn.metal_type?.name?.toLowerCase() === selectedMetal.toLowerCase();

      return matchSearch && matchMetal;
    });
  }, [ornaments, searchTerm, selectedMetal]);

  const handleCreateNew = () => {
    setEditingOrnament(null);
    formProps.form?.resetFields();
    showDrawer();
  };

  const handleEdit = (orn: IOrnamentWithDetails) => {
    setEditingOrnament(orn);
    showDrawer(orn.id);
  };

  return (
    <div
      data-testid="mobile-ornaments"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 0",
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Showcase Catalog
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {filteredOrnaments.length} {filteredOrnaments.length === 1 ? "piece" : "pieces"}
          </Text>
        </div>

        <Button
          data-testid="mobile-new-ornament-btn"
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleCreateNew}
          style={{
            height: 38,
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Add Item
        </Button>
      </div>

      {/* Search Input */}
      <Input
        prefix={<Search size={16} color={token.colorTextPlaceholder} />}
        placeholder="Search ornaments or item code..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        allowClear
        style={{
          height: 42,
          borderRadius: 12,
          fontSize: 14,
          background: token.colorBgElevated,
        }}
      />

      {/* Category Pills */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
          scrollbarWidth: "none",
        }}
      >
        {["all", "gold", "silver", "diamond"].map((metal) => (
          <button
            key={metal}
            type="button"
            onClick={() => setSelectedMetal(metal)}
            style={{
              padding: "6px 12px",
              borderRadius: 14,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
              whiteSpace: "nowrap",
              backgroundColor:
                selectedMetal === metal
                  ? token.colorPrimary
                  : token.colorFillAlter,
              color:
                selectedMetal === metal ? "#fff" : token.colorTextSecondary,
            }}
          >
            {metal === "all" ? "All" : metal}
          </button>
        ))}
      </div>

      {/* 2-Column Grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Skeleton active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      ) : filteredOrnaments.length === 0 ? (
        <Empty description="No ornaments found" style={{ margin: "32px 0" }} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {filteredOrnaments.map((orn) => {
            const weight = orn.net_weight_grams || orn.gross_weight_grams || 0;
            const purity = orn.purity_level?.display_name || "22K";

            return (
              <div
                key={orn.id}
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 14,
                  padding: "12px 10px",
                  border: `1px solid ${token.colorBorderSecondary}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 8,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Tag color="gold" style={{ margin: 0, fontSize: 10, borderRadius: 6, padding: "0 5px" }}>
                      {purity}
                    </Tag>
                    <span style={{ fontSize: 10, color: token.colorTextSecondary }}>
                      Qty: {orn.quantity}
                    </span>
                  </div>

                  <Text strong style={{ fontSize: 13, display: "block", marginTop: 6 }} ellipsis>
                    {orn.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    #{orn.item_code || "ORN"}
                  </Text>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "2px 0 6px" }}>
                    <Scale size={11} color="#d97706" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: token.colorText }}>
                      {weight}g
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      onClick={() => setShowOrnament(orn)}
                      style={{ flex: 1, borderRadius: 8, fontSize: 11, height: 28 }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleEdit(orn)}
                      style={{ borderRadius: 8, fontSize: 11, height: 28, padding: "0 8px" }}
                    >
                      <Edit size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show Ornament Drawer */}
      <OrnamentShowDrawer
        open={!!showOrnament}
        ornament={showOrnament}
        onClose={() => setShowOrnament(null)}
      />

      {/* Create / Edit Ornament Drawer */}
      <OrnamentDrawer
        drawerProps={drawerProps}
        formProps={formProps}
        ornament={editingOrnament}
        shopId={shopId}
        onClose={() => {
          setEditingOrnament(null);
          closeDrawer();
        }}
      />
    </div>
  );
};
