import React, { useState } from "react";
import { Drawer, Form, InputNumber, Button, Typography, theme, message, Space } from "antd";
import { TrendingUp, Edit3, ArrowRight } from "lucide-react";
import { useList, useCreate, useUpdate, useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router";
import dayjs from "dayjs";
import { useShopCheck } from "../../hooks/use-shop-check";
import type { IMetalRate, IMetalType } from "../../libs/interfaces";
import { formatRateDisplay, displayToPaise, paiseToDisplay, rateUnit } from "./utils";

const { Text, Title } = Typography;

export const MobileMetalRatesBar: React.FC = () => {
  const { token } = theme.useToken();
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
      message.error("Shop not found");
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

      message.success("Today's metal rates updated!");
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 16px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          cursor: "pointer",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          transition: "background-color 0.15s ease",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          {/* Gold Rate Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(217, 119, 6, 0.12)",
              padding: "3px 10px",
              borderRadius: 8,
              border: "1px solid rgba(217, 119, 6, 0.25)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: "#b45309", letterSpacing: "0.03em" }}>GOLD</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
              {goldRate && goldMetal
                ? formatRateDisplay(goldRate.rate_per_gram_paise, goldMetal.name)
                : <span style={{ color: "#d97706", fontSize: 11, fontWeight: 600 }}>Set Rate</span>}
            </span>
          </div>

          {/* Silver Rate Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(71, 85, 105, 0.12)",
              padding: "3px 10px",
              borderRadius: 8,
              border: "1px solid rgba(71, 85, 105, 0.25)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: "#334155", letterSpacing: "0.03em" }}>SILVER</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
              {silverRate && silverMetal
                ? formatRateDisplay(silverRate.rate_per_gram_paise, silverMetal.name)
                : <span style={{ color: "#475569", fontSize: 11, fontWeight: 600 }}>Set Rate</span>}
            </span>
          </div>
        </div>

        {/* Edit Pill Trigger */}
        <div
          data-testid="mobile-rate-edit-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 10px",
            borderRadius: 8,
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            color: "#1d4ed8",
            fontWeight: 700,
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          <Edit3 size={12} strokeWidth={2.5} />
          <span>Update</span>
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
          body: { padding: "16px 20px 28px" },
          header: { borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "14px 20px" },
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={18} color="#2563eb" />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Today's Metal Rates</span>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSaveRates}>
          {goldMetal && (
            <Form.Item
              name="gold_rate"
              label={
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                  Gold Rate ({rateUnit(goldMetal.name)})
                </span>
              }
              rules={[{ required: true, message: "Enter gold rate" }]}
              style={{ marginBottom: 16 }}
            >
              <InputNumber
                placeholder="e.g. 7200"
                min={0}
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 16, fontWeight: 600 }}
                prefix="₹"
              />
            </Form.Item>
          )}

          {silverMetal && (
            <Form.Item
              name="silver_rate"
              label={
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                  Silver Rate ({rateUnit(silverMetal.name)})
                </span>
              }
              rules={[{ required: true, message: "Enter silver rate" }]}
              style={{ marginBottom: 20 }}
            >
              <InputNumber
                placeholder="e.g. 85000"
                min={0}
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 16, fontWeight: 600 }}
                prefix="₹"
              />
            </Form.Item>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Button
              onClick={() => setDrawerOpen(false)}
              style={{ flex: 1, height: 48, borderRadius: 14, fontWeight: 700, fontSize: 14 }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              style={{ flex: 2, height: 48, borderRadius: 14, fontWeight: 700, fontSize: 14, backgroundColor: "#2563eb" }}
            >
              Save Today's Rates
            </Button>
          </div>
        </Form>
      </Drawer>
    </>
  );
};
