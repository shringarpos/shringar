import React, { useState, useContext } from "react";
import { useNavigate } from "react-router";
import { useCreate, useGetIdentity, useList } from "@refinedev/core";
import { Form, Input, Button, Typography, notification, theme, Select } from "antd";
import { ArrowLeft, User, Phone, MapPin, FileText, Save, Check } from "lucide-react";
import { useShopCheck } from "../../hooks/use-shop-check";
import type { ICustomer } from "../../libs/interfaces";
import { ColorModeContext } from "../../contexts/color-mode";

const { Title, Text } = Typography;

export const MobileCustomerForm: React.FC = () => {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { mode } = useContext(ColorModeContext);
  const isDark = mode === "dark";

  const themeStyles = {
    pageBg: isDark ? "#000000" : "#f1f5f9",
    headerBg: isDark ? "rgba(0, 0, 0, 0.88)" : "rgba(255, 255, 255, 0.90)",
    headerBorder: isDark ? "1px solid #27272a" : "1px solid rgba(15, 23, 42, 0.08)",
    cardBg: isDark ? "#141414" : "#ffffff",
    cardBorder: isDark ? "1px solid #27272a" : "1px solid #e2e8f0",
    cardShadow: isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)",
    textPrimary: isDark ? "#f8fafc" : "#0f172a",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    labelColor: isDark ? "#f1f5f9" : "#1e293b",
    dockBg: isDark ? "#000000" : "#ffffff",
    dockBorder: isDark ? "1px solid #27272a" : "1px solid rgba(15, 23, 42, 0.08)",
    buttonSecondaryBg: isDark ? "#27272a" : "#f1f5f9",
    buttonSecondaryColor: isDark ? "#f8fafc" : "#334155",
    buttonSecondaryBorder: isDark ? "1px solid #3f3f46" : "1px solid #cbd5e1",
  };

  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;

  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: createCustomer } = useCreate();

  // Load existing customers for reference selector
  const { query: referralQuery } = useList<ICustomer>({
    resource: "customers",
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });
  const referralList = referralQuery?.data?.data ?? [];

  const handleSubmit = async (values: any) => {
    if (!shopId) {
      notification.error({ message: "Shop information not available" });
      return;
    }

    try {
      setIsSubmitting(true);
      await createCustomer({
        resource: "customers",
        values: {
          name: values.name.trim(),
          phone: values.phone?.trim() || null,
          email: values.email?.trim() || null,
          address: values.address?.trim(),
          reference_by: values.reference_by || null,
          shop_id: shopId,
          created_by: userId,
          updated_by: userId,
        },
      });

      notification.success({ message: "Client added to directory successfully" });
      navigate("/customers");
    } catch (err: any) {
      notification.error({ message: err?.message || "Failed to create client" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="mobile-customer-form-page"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: themeStyles.pageBg,
        color: themeStyles.textPrimary,
        paddingBottom: "calc(120px + env(safe-area-inset-bottom, 16px))",
      }}
    >
      {/* ── Native Sticky Top App Bar with Frosted Glass Blur ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          backgroundColor: themeStyles.headerBg,
          borderBottom: themeStyles.headerBorder,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            data-testid="mobile-form-back-btn"
            onClick={() => navigate(-1)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              border: isDark ? "1px solid #27272a" : "1px solid rgba(15, 23, 42, 0.12)",
              backgroundColor: isDark ? "#18181b" : "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: themeStyles.textPrimary,
              boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.04)",
              transition: "transform 0.1s ease",
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "-0.3px" }}>
              Add New Client
            </Title>
            <Text style={{ fontSize: 11, color: themeStyles.textSecondary, fontWeight: 500 }}>
              Directory & Ledger Profile
            </Text>
          </div>
        </div>

        <Button
          type="primary"
          icon={<Save size={15} />}
          loading={isSubmitting}
          onClick={() => form.submit()}
          style={{
            height: 44,
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 13,
            padding: "0 16px",
            backgroundColor: "#2563eb",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
          }}
        >
          Save
        </Button>
      </header>

      {/* ── Form Body: Standardized 16px Spacing, 14px Card Gaps ── */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* ── Card 1: Contact Details ── */}
        <div
          style={{
            backgroundColor: themeStyles.cardBg,
            borderRadius: 18,
            padding: "16px",
            border: themeStyles.cardBorder,
            boxShadow: themeStyles.cardShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(37, 99, 235, 0.12)",
                color: isDark ? "#60a5fa" : "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "0.02em" }}>
              PRIMARY CONTACT
            </span>
          </div>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Full Name</span>}
            name="name"
            rules={[{ required: true, message: "Please enter customer full name" }]}
            style={{ marginBottom: 14 }}
          >
            <Input
              placeholder="e.g. Anand Vardhan Sharma"
              style={{ height: 48, borderRadius: 14, fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Phone Number</span>}
            name="phone"
            rules={[
              {
                pattern: /^[0-9+\s-]{8,15}$/,
                message: "Please enter a valid phone number",
              },
            ]}
            style={{ marginBottom: 14 }}
          >
            <Input
              placeholder="10-digit mobile number"
              type="tel"
              prefix={<Phone size={16} style={{ color: "#94a3b8", marginRight: 4 }} />}
              style={{ height: 48, borderRadius: 14, fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Email Address (Optional)</span>}
            name="email"
            rules={[{ type: "email", message: "Please enter a valid email" }]}
            style={{ marginBottom: 0 }}
          >
            <Input
              placeholder="client@example.com"
              type="email"
              style={{ height: 48, borderRadius: 14, fontSize: 15 }}
            />
          </Form.Item>
        </div>

        {/* ── Card 2: Address & Legal Tax IDs ── */}
        <div
          style={{
            backgroundColor: themeStyles.cardBg,
            borderRadius: 18,
            padding: "16px",
            border: themeStyles.cardBorder,
            boxShadow: themeStyles.cardShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(5, 150, 105, 0.2)" : "rgba(5, 150, 105, 0.12)",
                color: isDark ? "#34d399" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MapPin size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "0.02em" }}>
              ADDRESS
            </span>
          </div>

          <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Postal Address</span>} name="address" rules={[{ required: true, message: "Address is required" }]} style={{ marginBottom: 0 }}>
            <Input.TextArea
              rows={2}
              placeholder="Street, City, Pincode"
              style={{ borderRadius: 14, fontSize: 14 }}
            />
          </Form.Item>
        </div>

        {/* ── Card 3: Referral & Notes ── */}
        <div
          style={{
            backgroundColor: themeStyles.cardBg,
            borderRadius: 18,
            padding: "16px",
            border: themeStyles.cardBorder,
            boxShadow: themeStyles.cardShadow,
            scrollMarginBottom: "calc(120px + env(safe-area-inset-bottom, 16px))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(124, 58, 237, 0.2)" : "rgba(124, 58, 237, 0.12)",
                color: isDark ? "#c084fc" : "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "0.02em" }}>
              REFERRAL
            </span>
          </div>

          <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Referred By (Optional)</span>} name="reference_by" style={{ marginBottom: 0 }}>
            <Select
              allowClear
              showSearch
              placeholder="Select referring client"
              optionFilterProp="children"
              style={{ height: 48, width: "100%" }}
            >
              {referralList.map((ref) => (
                <Select.Option key={ref.id} value={ref.id}>
                  {ref.name} {ref.customer_code ? `(#${ref.customer_code})` : ""}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>
      </Form>

      {/* ── Native Sticky Bottom Action Dock with Opaque Solid Background ── */}
      <div
        data-testid="mobile-form-dock"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          backgroundColor: themeStyles.dockBg,
          borderTop: themeStyles.dockBorder,
          padding: "12px 16px",
          paddingBottom: "max(env(safe-area-inset-bottom), 14px)",
          boxShadow: isDark ? "0 -4px 20px rgba(0,0,0,0.5)" : "0 -4px 20px rgba(0,0,0,0.06)",
          display: "flex",
          gap: 12,
        }}
      >
        <Button
          onClick={() => navigate(-1)}
          style={{
            height: 50,
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 14,
            flex: 1,
            backgroundColor: themeStyles.buttonSecondaryBg,
            color: themeStyles.buttonSecondaryColor,
            border: themeStyles.buttonSecondaryBorder,
          }}
        >
          Cancel
        </Button>

        <Button
          type="primary"
          icon={<Save size={17} />}
          loading={isSubmitting}
          onClick={() => form.submit()}
          style={{
            height: 50,
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 15,
            flex: 2,
            backgroundColor: "#2563eb",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
          }}
        >
          Add Client
        </Button>
      </div>
    </div>
  );
};
