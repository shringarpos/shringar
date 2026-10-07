import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useCreate, useGetIdentity, useList } from "@refinedev/core";
import {
  Form,
  Input,
  Button,
  Typography,
  theme,
  Select,
  notification,
} from "antd";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  FileText,
  Save,
  CreditCard,
} from "lucide-react";
import { useShopCheck } from "../../hooks/use-shop-check";
import type { ICustomer } from "../../libs/interfaces";

const { Text, Title } = Typography;

export const MobileCustomerForm: React.FC = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Referral customer options
  const { query: refQuery } = useList<ICustomer>({
    resource: "customers",
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    pagination: { pageSize: 50 },
  });
  const referralList = refQuery?.data?.data ?? [];

  const { mutateAsync: createCustomer } = useCreate();

  const handleSubmit = async (values: any) => {
    if (!shopId) {
      notification.error({ message: "No active shop found" });
      return;
    }

    try {
      setIsSubmitting(true);
      await createCustomer({
        resource: "customers",
        values: {
          name: values.name.trim(),
          phone: values.phone?.trim() || null,
          alternate_phone: values.alternate_phone?.trim() || null,
          email: values.email?.trim() || null,
          address: values.address?.trim() || null,
          pan_number: values.pan_number?.trim() || null,
          gst_number: values.gst_number?.trim() || null,
          notes: values.notes?.trim() || null,
          reference_by: values.reference_by || null,
          shop_id: shopId,
          created_by: userId,
          is_active: true,
        },
      });

      notification.success({ message: `Customer "${values.name}" created successfully` });
      navigate("/customers");
    } catch (err: any) {
      notification.error({ message: err?.message || "Failed to create customer" });
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
        backgroundColor: "#f8fafc",
        paddingBottom: "calc(100px + env(safe-area-inset-bottom, 16px))",
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
          backgroundColor: "rgba(255, 255, 255, 0.90)",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            data-testid="mobile-form-back-btn"
            onClick={() => navigate(-1)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              border: "1px solid rgba(15, 23, 42, 0.12)",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#0f172a",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "transform 0.1s ease",
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
              Add New Client
            </Title>
            <Text style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
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
            height: 38,
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
            backgroundColor: "#ffffff",
            borderRadius: 18,
            padding: "16px",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
              PRIMARY CONTACT
            </span>
          </div>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Full Name</span>}
            name="name"
            rules={[{ required: true, message: "Customer name is required" }]}
            style={{ marginBottom: 14 }}
          >
            <Input
              placeholder="e.g. Ramesh Chandra Verma"
              style={{ height: 48, borderRadius: 14, fontSize: 15, border: "1px solid rgba(15, 23, 42, 0.12)" }}
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Phone (WhatsApp)</span>}
              name="phone"
              rules={[{ required: true, message: "Phone number required" }]}
              style={{ marginBottom: 14 }}
            >
              <Input
                placeholder="10-digit number"
                inputMode="tel"
                prefix={<Phone size={15} color="#64748b" style={{ marginRight: 6 }} />}
                style={{ height: 48, borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Alternate Phone</span>}
              name="alternate_phone"
              style={{ marginBottom: 14 }}
            >
              <Input
                placeholder="Optional"
                inputMode="tel"
                style={{ height: 48, borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }}
              />
            </Form.Item>
          </div>

          <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Email Address</span>} name="email" style={{ marginBottom: 0 }}>
            <Input
              placeholder="Optional email for invoices"
              inputMode="email"
              style={{ height: 48, borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }}
            />
          </Form.Item>
        </div>

        {/* ── Card 2: Address & Identity ── */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 18,
            padding: "16px",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "rgba(5, 150, 105, 0.12)",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MapPin size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
              ADDRESS & TAX / ID
            </span>
          </div>

          <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Postal Address</span>} name="address" style={{ marginBottom: 14 }}>
            <Input.TextArea
              rows={2}
              placeholder="Street, City, Pincode"
              style={{ borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }}
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>PAN Number</span>} name="pan_number" style={{ marginBottom: 0 }}>
              <Input
                placeholder="ABCDE1234F"
                autoCapitalize="characters"
                autoCorrect="off"
                style={{ height: 48, borderRadius: 14, fontSize: 14, textTransform: "uppercase", border: "1px solid rgba(15, 23, 42, 0.12)", fontFamily: "monospace" }}
              />
            </Form.Item>

            <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>GSTIN</span>} name="gst_number" style={{ marginBottom: 0 }}>
              <Input
                placeholder="Optional GSTIN"
                autoCapitalize="characters"
                autoCorrect="off"
                style={{ height: 48, borderRadius: 14, fontSize: 14, textTransform: "uppercase", border: "1px solid rgba(15, 23, 42, 0.12)", fontFamily: "monospace" }}
              />
            </Form.Item>
          </div>
        </div>

        {/* ── Card 3: Referral & Notes ── */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 18,
            padding: "16px",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "rgba(124, 58, 237, 0.12)",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
              REFERRAL & NOTES
            </span>
          </div>

          <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Referred By (Optional)</span>} name="reference_by" style={{ marginBottom: 14 }}>
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

          <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Private Notes</span>} name="notes" style={{ marginBottom: 0 }}>
            <Input.TextArea
              rows={2}
              placeholder="Family jeweler history, ring size, preferences..."
              style={{ borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }}
            />
          </Form.Item>
        </div>
      </Form>

      {/* ── Native Sticky Bottom Action Dock with Translucent Frosted Glass ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          borderTop: "1px solid rgba(15, 23, 42, 0.08)",
          padding: "12px 16px",
          paddingBottom: "max(env(safe-area-inset-bottom), 14px)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
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
            backgroundColor: "#f1f5f9",
            color: "#334155",
            border: "1px solid rgba(15, 23, 42, 0.08)",
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
            boxShadow: "0 3px 12px rgba(37, 99, 235, 0.35)",
          }}
        >
          Save Client
        </Button>
      </div>
    </div>
  );
};
