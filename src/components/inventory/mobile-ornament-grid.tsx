import React, { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { useDrawerForm } from "@refinedev/antd";
import {
  Typography,
  Input,
  Button,
  theme,
  Empty,
} from "antd";
import {
  Search,
  Plus,
  Edit2,
  Gem,
  Sparkles,
  Scale,
  CircleDot,
  RotateCcw,
} from "lucide-react";
import type { IOrnament, IOrnamentWithDetails } from "../../libs/interfaces";
import { useShopCheck } from "../../hooks/use-shop-check";
import { OrnamentDrawer } from "./ornaments/ornament-drawer";
import { OrnamentShowDrawer } from "./ornaments/ornament-show-drawer";

const { Title, Text } = Typography;

// Helper: Metal-specific aesthetic styling
const getMetalTheme = (metalName?: string) => {
  const metal = metalName?.toLowerCase() || "gold";
  if (metal.includes("silver")) {
    return {
      name: "Silver",
      badgeBg: "#f1f5f9",
      badgeText: "#334155",
      badgeBorder: "#cbd5e1",
      accent: "#64748b",
      gradient: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      icon: CircleDot,
    };
  }
  if (metal.includes("diamond") || metal.includes("gem")) {
    return {
      name: "Diamond",
      badgeBg: "#f0f9ff",
      badgeText: "#0369a1",
      badgeBorder: "#bae6fd",
      accent: "#0284c7",
      gradient: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
      icon: Sparkles,
    };
  }
  // Default Gold
  return {
    name: "Gold",
    badgeBg: "#fef3c7",
    badgeText: "#92400e",
    badgeBorder: "#fde68a",
    accent: "#d97706",
    gradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    icon: Gem,
  };
};

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
      select:
        "*, metal_type:metal_types(id,name), purity_level:purity_levels(id,purity_value,display_name), category:ornament_categories(id,name)",
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
        orn.sku?.toLowerCase().includes(searchTerm.toLowerCase());

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

  const handleEdit = (e: React.MouseEvent, orn: IOrnamentWithDetails) => {
    e.stopPropagation();
    setEditingOrnament(orn);
    showDrawer(orn.id);
  };

  const metalPills = [
    { key: "all", label: "All", icon: null },
    { key: "gold", label: "Gold", icon: Gem },
    { key: "silver", label: "Silver", icon: CircleDot },
    { key: "diamond", label: "Diamond", icon: Sparkles },
  ];

  return (
    <div
      data-testid="mobile-ornaments"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        paddingBottom: "calc(88px + env(safe-area-inset-bottom, 16px))",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 2,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
            Showcase Catalog
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {filteredOrnaments.length} {filteredOrnaments.length === 1 ? "piece" : "pieces"} available
          </Text>
        </div>

        <Button
          data-testid="mobile-new-ornament-btn"
          type="primary"
          icon={<Plus size={16} strokeWidth={2.5} />}
          onClick={handleCreateNew}
          style={{
            height: 40,
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 4,
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          Add Item
        </Button>
      </div>

      {/* Search Input */}
      <Input
        prefix={<Search size={16} color={token.colorTextPlaceholder} style={{ marginRight: 4 }} />}
        placeholder="Search by name or SKU..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        allowClear
        inputMode="search"
        style={{
          height: 44,
          borderRadius: 14,
          fontSize: 14,
          backgroundColor: token.colorBgElevated,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      />

      {/* Category / Metal Pills */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {metalPills.map(({ key, label, icon: Icon }) => {
          const isSelected = selectedMetal === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedMetal(key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "8px 16px",
                minHeight: 38,
                borderRadius: 20,
                border: isSelected ? "none" : `1px solid ${token.colorBorderSecondary}`,
                fontSize: 13,
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                backgroundColor: isSelected ? token.colorPrimary : token.colorBgElevated,
                color: isSelected ? "#fff" : token.colorTextSecondary,
                boxShadow: isSelected ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {Icon && <Icon size={13} strokeWidth={2.2} />}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* 2-Column Showcase Grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                backgroundColor: token.colorBgElevated,
                borderRadius: 16,
                padding: 12,
                border: `1px solid ${token.colorBorderSecondary}`,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  height: 90,
                  borderRadius: 10,
                  backgroundColor: token.colorFillTertiary,
                }}
              />
              <div style={{ height: 14, width: "70%", borderRadius: 4, backgroundColor: token.colorFillSecondary }} />
              <div style={{ height: 10, width: "40%", borderRadius: 4, backgroundColor: token.colorFillTertiary }} />
            </div>
          ))}
        </div>
      ) : filteredOrnaments.length === 0 ? (
        <div
          style={{
            backgroundColor: token.colorBgElevated,
            borderRadius: 16,
            padding: "36px 16px",
            textAlign: "center",
            border: `1px dashed ${token.colorBorderSecondary}`,
            margin: "12px 0",
          }}
        >
          <Empty
            description={
              <div>
                <Text strong style={{ fontSize: 14, display: "block" }}>
                  No ornaments match your filter
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Try changing your search term or category
                </Text>
              </div>
            }
          >
            {(searchTerm || selectedMetal !== "all") && (
              <Button
                size="small"
                icon={<RotateCcw size={13} />}
                onClick={() => {
                  setSearchTerm("");
                  setSelectedMetal("all");
                }}
                style={{ marginTop: 8, borderRadius: 8 }}
              >
                Reset Filters
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {filteredOrnaments.map((orn) => {
            const weightG = orn.weight_mg != null ? (orn.weight_mg / 1000).toFixed(3) : "0.000";
            const purity = orn.purity_level?.display_name || "22K";
            const metalTheme = getMetalTheme(orn.metal_type?.name);
            const isOutOfStock = orn.quantity <= 0;

            return (
              <div
                key={orn.id}
                role="button"
                tabIndex={0}
                onClick={() => setShowOrnament(orn)}
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 16,
                  padding: "12px",
                  border: `1px solid ${token.colorBorderSecondary}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 10,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  cursor: "pointer",
                  transition: "transform 0.1s ease, box-shadow 0.15s ease",
                  WebkitTapHighlightColor: "transparent",
                  position: "relative",
                  opacity: isOutOfStock ? 0.75 : 1,
                }}
              >
                {/* Visual Header / Thumbnail Placeholder */}
                <div
                  style={{
                    height: 84,
                    borderRadius: 12,
                    background: metalTheme.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                    border: `1px solid ${metalTheme.badgeBorder}`,
                  }}
                >
                  <metalTheme.icon size={36} color={metalTheme.accent} style={{ opacity: 0.65 }} />

                  {/* Purity Tag (Top Left) */}
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 6,
                      backgroundColor: metalTheme.badgeBg,
                      color: metalTheme.badgeText,
                      border: `1px solid ${metalTheme.badgeBorder}`,
                      letterSpacing: 0.2,
                    }}
                  >
                    {purity}
                  </span>

                  {/* Edit Icon Button (Top Right, 32px touch target) */}
                  <button
                    type="button"
                    title="Edit Ornament"
                    onClick={(e) => handleEdit(e, orn)}
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 5,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      color: token.colorTextSecondary,
                    }}
                  >
                    <Edit2 size={12} />
                  </button>
                </div>

                {/* Details Section */}
                <div>
                  <Text
                    strong
                    style={{
                      fontSize: 13,
                      lineHeight: 1.3,
                      display: "block",
                      marginBottom: 2,
                    }}
                    ellipsis
                  >
                    {orn.name}
                  </Text>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      letterSpacing: 0.3,
                    }}
                  >
                    #{orn.sku || "ORN"}
                  </Text>
                </div>

                {/* Metric Strip: Weight & Stock Status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 6,
                    borderTop: `1px dashed ${token.colorBorderSecondary}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Scale size={12} color={metalTheme.accent} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: token.colorText }}>
                      {weightG}
                      <span style={{ fontSize: 10, fontWeight: 400, color: token.colorTextSecondary }}>
                        {" "}g
                      </span>
                    </span>
                  </div>

                  {isOutOfStock ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#ef4444",
                        backgroundColor: "#fef2f2",
                        padding: "1px 5px",
                        borderRadius: 4,
                      }}
                    >
                      Out of stock
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 500, color: token.colorTextSecondary }}>
                      Qty: <strong>{orn.quantity}</strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show Ornament Drawer */}
      <OrnamentShowDrawer
        open={!!showOrnament}
        record={showOrnament}
        onClose={() => setShowOrnament(null)}
        onEdit={() => {
          const target = showOrnament;
          setShowOrnament(null);
          if (target) {
            setEditingOrnament(target);
            showDrawer(target.id);
          }
        }}
      />

      {/* Create / Edit Ornament Drawer */}
      <OrnamentDrawer
        action={editingOrnament ? "edit" : "create"}
        drawerProps={drawerProps}
        formProps={formProps}
        shopId={shopId}
        close={() => {
          setEditingOrnament(null);
          closeDrawer();
        }}
        onFinish={formProps.onFinish as any}
      />
    </div>
  );
};
