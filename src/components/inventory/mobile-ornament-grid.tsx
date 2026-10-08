import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useList } from "@refinedev/core";
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
  return {
    name: "Gold",
    badgeBg: "#fffbeb",
    badgeText: "#92400e",
    badgeBorder: "#fde68a",
    accent: "#d97706",
    gradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    icon: Gem,
  };
};

export const MobileOrnamentGrid: React.FC = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetal, setSelectedMetal] = useState<string>("all");
  const [showOrnament, setShowOrnament] = useState<IOrnamentWithDetails | null>(null);

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
    navigate("/ornaments/new");
  };

  const handleEdit = (e: React.MouseEvent, orn: IOrnamentWithDetails) => {
    e.stopPropagation();
    navigate(`/ornaments/edit/${orn.id}`);
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
            height: 44,
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
                minHeight: 44,
                borderRadius: 20,
                border: isSelected ? "none" : `1px solid ${token.colorBorderSecondary}`,
                fontSize: 13,
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                backgroundColor: isSelected ? token.colorPrimary : token.colorBgElevated,
                color: isSelected ? token.colorTextLightSolid : token.colorTextSecondary,
                boxShadow: isSelected ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {Icon && <Icon size={14} />}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Ornaments List */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <Text type="secondary">Loading showcase pieces...</Text>
        </div>
      ) : filteredOrnaments.length === 0 ? (
        <Empty
          description={
            <div style={{ padding: "20px 0" }}>
              <Text type="secondary">No ornaments found matching your criteria</Text>
              <div style={{ marginTop: 12 }}>
                <Button
                  icon={<RotateCcw size={14} />}
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedMetal("all");
                  }}
                  size="small"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredOrnaments.map((orn) => {
            const metalTheme = getMetalTheme(orn.metal_type?.name);
            const MetalIcon = metalTheme.icon;
            const weightG = orn.weight_mg ? (orn.weight_mg / 1000).toFixed(2) : "0.00";
            const isOutOfStock = (orn.quantity ?? 0) <= 0;

            return (
              <div
                key={orn.id}
                onClick={() => setShowOrnament(orn)}
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 16,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                  cursor: "pointer",
                  transition: "transform 0.1s ease, box-shadow 0.1s ease",
                  opacity: isOutOfStock ? 0.65 : 1,
                }}
              >
                {/* Top Row: Title, SKU & Quick Edit */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                      {/* Metal pill tag */}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 6,
                          backgroundColor: metalTheme.badgeBg,
                          color: metalTheme.badgeText,
                          border: `1px solid ${metalTheme.badgeBorder}`,
                        }}
                      >
                        <MetalIcon size={12} />
                        {orn.metal_type?.name || "Gold"}
                        {orn.purity_level?.display_name ? ` • ${orn.purity_level.display_name}` : ""}
                      </span>

                      {orn.category?.name && (
                        <span
                          style={{
                            fontSize: 11,
                            color: token.colorTextSecondary,
                            backgroundColor: token.colorBgLayout,
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {orn.category.name}
                        </span>
                      )}
                    </div>

                    <Title
                      level={5}
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {orn.name}
                    </Title>

                    {orn.sku && (
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: token.colorTextPlaceholder,
                        }}
                      >
                        SKU: {orn.sku}
                      </Text>
                    )}
                  </div>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={(e) => handleEdit(e, orn)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      backgroundColor: token.colorBgLayout,
                      color: token.colorTextSecondary,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                    aria-label="Edit piece"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>

                {/* Bottom Row: Weight & Stock status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 8,
                    borderTop: `1px dashed ${token.colorBorderSecondary}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Scale size={14} color={token.colorPrimary} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{weightG} g</span>
                  </div>

                  {isOutOfStock ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: token.colorError }}>
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
            navigate(`/ornaments/edit/${target.id}`);
          }
        }}
      />
    </div>
  );
};
