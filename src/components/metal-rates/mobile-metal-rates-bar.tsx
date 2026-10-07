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
          padding: "6px 14px",
          backgroundColor: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
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
              gap: 4,
              backgroundColor: "rgba(217, 119, 6, 0.08)",
              padding: "2px 8px",
              borderRadius: 6,
              border: "1px solid rgba(217, 119, 6, 0.18)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706" }}>GOLD</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: token.colorText }}>
              {goldRate && goldMetal
                ? formatRateDisplay(goldRate.rate_per_gram_paise, goldMetal.name)
                : <span style={{ color: token.colorWarningText, fontSize: 11 }}>Not set</span>}
            </span>
          </div>

          {/* Silver Rate Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "rgba(100, 116, 139, 0.08)",
              padding: "2px 8px",
              borderRadius: 6,
              border: "1px solid rgba(100, 116, 139, 0.18)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>SILVER</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: token.colorText }}>
              {silverRate && silverMetal
                ? formatRateDisplay(silverRate.rate_per_gram_paise, silverMetal.name)
                : <span style={{ color: token.colorWarningText, fontSize: 11 }}>Not set</span>}
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
            padding: "2px 8px",
            borderRadius: 6,
            backgroundColor: token.colorFillAlter,
            color: token.colorPrimary,
            fontWeight: 600,
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          <Edit3 size={11} />
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
          body: {
            padding: "16px 20px 24px",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
          },
          header: { display: "none" },
        }}
      >
        {/* Grab Handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: token.colorBorder }} />
        </div>

        {/* Drawer Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <Title level={4} style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              Today's Metal Rates
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs().format("dddd, D MMMM YYYY")}
            </Text>
          </div>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setDrawerOpen(false);
              navigate("/metal-rates");
            }}
            style={{ padding: 0, fontSize: 12, display: "flex", alignItems: "center", gap: 2 }}
          >
            History <ArrowRight size={13} />
          </Button>
        </div>

        {/* Form Inputs */}
        <Form form={form} layout="vertical" onFinish={handleSaveRates}>
          {goldMetal && (
            <Form.Item
              name="gold_rate"
              label={
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, color: "#d97706" }}>Gold Rate</span>
                  <span style={{ fontSize: 11, color: token.colorTextSecondary }}>
                    ({rateUnit(goldMetal.name)})
                  </span>
                </div>
              }
              rules={[{ required: true, message: "Please enter gold rate" }]}
              style={{ marginBottom: 14 }}
            >
              <InputNumber
                style={{ width: "100%", height: 44, borderRadius: 10, fontSize: 15 }}
                min={1}
                precision={2}
                placeholder="e.g. 7850"
                inputMode="decimal"
                prefix="₹"
              />
            </Form.Item>
          )}

          {silverMetal && (
            <Form.Item
              name="silver_rate"
              label={
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Silver Rate</span>
                  <span style={{ fontSize: 11, color: token.colorTextSecondary }}>
                    ({rateUnit(silverMetal.name)})
                  </span>
                </div>
              }
              rules={[{ required: true, message: "Please enter silver rate" }]}
              style={{ marginBottom: 20 }}
            >
              <InputNumber
                style={{ width: "100%", height: 44, borderRadius: 10, fontSize: 15 }}
                min={1}
                precision={2}
                placeholder="e.g. 98"
                inputMode="decimal"
                prefix="₹"
              />
            </Form.Item>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Button
              style={{ flex: 1, height: 44, borderRadius: 10 }}
              onClick={() => setDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              style={{
                flex: 2,
                height: 44,
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              Save Today's Rates
            </Button>
          </div>
        </Form>
      </Drawer>
    </>
  );
};
