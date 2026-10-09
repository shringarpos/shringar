import React, { useState, useContext } from "react";
import { Drawer, Form, InputNumber, Button, Typography, theme, Space } from "antd";
import { TrendingUp, Edit3, ArrowRight } from "lucide-react";
import { useList, useCreate, useUpdate, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router";
import dayjs from "dayjs";
import { useShopCheck } from "../../hooks/use-shop-check";
import type { IMetalRate, IMetalType } from "../../libs/interfaces";
import { formatRateDisplay, displayToPaise, paiseToDisplay, rateUnit } from "./utils";
import { ColorModeContext } from "../../contexts/color-mode";
import { notifyMobile } from "../../utils/mobile-notify";

const { Text, Title } = Typography;

export const MobileMetalRatesBar: React.FC = () => {
  const { token } = theme.useToken();
  const { mode } = useContext(ColorModeContext);
  const isDark = mode === "dark";
  const navigate = useNavigate();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;
  const today = dayjs().format("YYYY-MM-DD");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;

  const { query: metalsQuery } = useList<IMetalType>({
    resource: "metal_types",
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const { query: ratesQuery } = useList<IMetalRate>({
    resource: "ornament_rates",
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "rate_date", operator: "eq", value: today },
    ],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!shopId, staleTime: 30 * 1000 },
  });

  const { mutateAsync: createRate } = useCreate<IMetalRate>();
  const { mutateAsync: updateRate } = useUpdate<IMetalRate>();

  const metals = (metalsQuery?.data?.data ?? []) as IMetalType[];
  const rates = (ratesQuery?.data?.data ?? []) as IMetalRate[];

  const goldMetal = metals.find((m) => m.name.toUpperCase() === "GOLD");
  const silverMetal = metals.find((m) => m.name.toUpperCase() === "SILVER");

  const goldRate = rates.find((r) => r.metal_type_id === goldMetal?.id);
  const silverRate = rates.find((r) => r.metal_type_id === silverMetal?.id);

  const handleOpenDrawer = () => {
    form.setFieldsValue({
      gold_rate: goldRate && goldMetal ? paiseToDisplay(goldRate.rate_per_gram_paise, goldMetal.name) : undefined,
      silver_rate: silverRate && silverMetal ? paiseToDisplay(silverRate.rate_per_gram_paise, silverMetal.name) : undefined,
    });
    setDrawerOpen(true);
  };

  const handleSaveRates = async () => {
    if (!shopId) {
      notifyMobile.error("Shop not found");
      return;
    }
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Save Gold Rate
      if (goldMetal && values.gold_rate != null) {
        const goldPaise = displayToPaise(values.gold_rate, goldMetal.name);
        if (goldRate) {
          await updateRate({
            resource: "ornament_rates",
            id: goldRate.id,
            values: { rate_per_gram_paise: goldPaise, updated_by: userId },
          });
        } else {
          await createRate({
            resource: "ornament_rates",
            values: {
              shop_id: shopId,
              metal_type_id: goldMetal.id,
              rate_date: today,
              rate_per_gram_paise: goldPaise,
              created_by: userId,
              updated_by: userId,
            },
          });
        }
      }

      // Save Silver Rate
      if (silverMetal && values.silver_rate != null) {
        const silverPaise = displayToPaise(values.silver_rate, silverMetal.name);
        if (silverRate) {
          await updateRate({
            resource: "ornament_rates",
            id: silverRate.id,
            values: { rate_per_gram_paise: silverPaise, updated_by: userId },
          });
        } else {
          await createRate({
            resource: "ornament_rates",
            values: {
              shop_id: shopId,
              metal_type_id: silverMetal.id,
              rate_date: today,
              rate_per_gram_paise: silverPaise,
              created_by: userId,
              updated_by: userId,
            },
          });
        }
      }

      notifyMobile.success("Today's metal rates updated!");
      await ratesQuery?.refetch();
      setDrawerOpen(false);
    } catch {
      // validation error
    } finally {
      setSaving(false);
    }
  };

  if (!shopId) return null;

  return (
    <>
      {/* Sleek, Non-Breaking Ticker Bar Right Under Top App Bar */}
      <div
        data-testid="mobile-metal-rates-bar"
        onClick={handleOpenDrawer}
        style={{
          padding: "2px 16px 10px 16px",
          borderBottom: isDark ? "1px solid #1e293b" : "1px solid rgba(15, 23, 42, 0.08)",
          cursor: "pointer",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            borderRadius: 12,
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.04)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: isDark ? "none" : "0 1px 3px rgba(0, 0, 0, 0.02)",
            minHeight: 38,
            boxSizing: "border-box",
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              flex: 1,
              whiteSpace: "nowrap",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {/* Gold Rate */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#f59e0b",
                  boxShadow: "0 0 6px rgba(245, 158, 11, 0.7)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 800, color: isDark ? "#fbbf24" : "#b45309", letterSpacing: "0.03em" }}>
                GOLD
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#f8fafc" : "#0f172a", whiteSpace: "nowrap" }}>
                {goldRate && goldMetal ? (
                  <>
                    ₹{paiseToDisplay(goldRate.rate_per_gram_paise, goldMetal.name).toLocaleString("en-IN")}
                    <span style={{ fontSize: 10, fontWeight: 500, color: isDark ? "#94a3b8" : "#64748b", marginLeft: 2 }}>/10g</span>
                  </>
                ) : (
                  <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: 600 }}>Set Rate</span>
                )}
              </span>
            </div>

            {/* Subtle Divider */}
            <span
              style={{
                width: 1,
                height: 14,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.12)",
                flexShrink: 0,
              }}
            />

            {/* Silver Rate */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#94a3b8",
                  boxShadow: "0 0 6px rgba(148, 163, 184, 0.7)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 800, color: isDark ? "#cbd5e1" : "#475569", letterSpacing: "0.03em" }}>
                SILVER
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#f8fafc" : "#0f172a", whiteSpace: "nowrap" }}>
                {silverRate && silverMetal ? (
                  <>
                    ₹{paiseToDisplay(silverRate.rate_per_gram_paise, silverMetal.name).toLocaleString("en-IN")}
                    <span style={{ fontSize: 10, fontWeight: 500, color: isDark ? "#94a3b8" : "#64748b", marginLeft: 2 }}>/g</span>
                  </>
                ) : (
                  <span style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: 600 }}>Set Rate</span>
                )}
              </span>
            </div>
          </div>

          {/* Edit / Update Pill Trigger */}
          <div
            data-testid="mobile-rate-edit-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "3px 8px",
              borderRadius: 8,
              backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(37, 99, 235, 0.08)",
              color: isDark ? "#60a5fa" : "#2563eb",
              fontWeight: 700,
              fontSize: 11,
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            <Edit3 size={11} strokeWidth={2.5} />
            <span>Update</span>
          </div>
        </div>
      </div>

      {/* Mobile Rates Quick-Update Bottom Drawer */}
      <Drawer
        data-testid="mobile-rates-drawer"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="bottom"
        height="auto"
        styles={{
          body: {
            padding: "16px 20px 28px",
            backgroundColor: token.colorBgContainer,
            color: token.colorText,
          },
          header: {
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            backgroundColor: token.colorBgContainer,
            padding: "14px 20px",
          },
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={18} color={token.colorPrimary} />
            <span style={{ fontSize: 16, fontWeight: 700, color: token.colorText }}>
              Today's Metal Rates
            </span>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSaveRates}>
          {goldMetal && (
            <Form.Item
              name="gold_rate"
              label={
                <span style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
                  Gold Rate ({rateUnit(goldMetal.name)})
                </span>
              }
              rules={[{ required: true, message: "Enter gold rate" }]}
              style={{ marginBottom: 16 }}
            >
              {/* Native polish: inputs sit directly on the card background —
                  no third-color faded wrapper, token border only. */}
              <InputNumber
                placeholder="e.g. 7200"
                min={0}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 600,
                  backgroundColor: token.colorBgContainer,
                  color: token.colorText,
                  border: `1px solid ${token.colorBorder}`,
                }}
                prefix="₹"
              />
            </Form.Item>
          )}

          {silverMetal && (
            <Form.Item
              name="silver_rate"
              label={
                <span style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
                  Silver Rate ({rateUnit(silverMetal.name)})
                </span>
              }
              rules={[{ required: true, message: "Enter silver rate" }]}
              style={{ marginBottom: 20 }}
            >
              <InputNumber
                placeholder="e.g. 85000"
                min={0}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 600,
                  backgroundColor: token.colorBgContainer,
                  color: token.colorText,
                  border: `1px solid ${token.colorBorder}`,
                }}
                prefix="₹"
              />
            </Form.Item>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Button
              onClick={() => setDrawerOpen(false)}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 14,
                backgroundColor: token.colorFillAlter,
                color: token.colorText,
                border: `1px solid ${token.colorBorder}`,
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              style={{ flex: 2, height: 48, borderRadius: 14, fontWeight: 700, fontSize: 14, backgroundColor: token.colorPrimary }}
            >
              Save Today's Rates
            </Button>
          </div>
        </Form>
      </Drawer>
    </>
  );
};
