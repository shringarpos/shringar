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
  MessageCircle,
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
        backgroundColor: token.colorBgLayout,
        paddingBottom: "calc(96px + env(safe-area-inset-bottom, 16px))",
      }}
    >
      {/* ── Sticky Top App Bar ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: token.colorBgElevated,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
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
              width: 36,
              height: 36,
              borderRadius: 18,
              border: `1px solid ${token.colorBorderSecondary}`,
              backgroundColor: token.colorBgLayout,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: token.colorText,
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <Title level={5} style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Add New Client
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
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
            height: 36,
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            padding: "0 14px",
          }}
        >
          Save
        </Button>
      </header>

      {/* ── Form Body ── */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* ── Card 1: Contact Details ── */}
        <div
          style={{
            backgroundColor: token.colorBgElevated,
            borderRadius: 16,
            padding: 14,
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <User size={15} color={token.colorPrimary} />
            <Text strong style={{ fontSize: 13, color: token.colorTextSecondary }}>
              PRIMARY CONTACT
            </Text>
          </div>

          <Form.Item
            label={<span style={{ fontSize: 12, fontWeight: 600 }}>Full Name</span>}
            name="name"
            rules={[{ required: true, message: "Customer name is required" }]}
            style={{ marginBottom: 12 }}
          >
            <Input
              placeholder="e.g. Ramesh Chandra Verma"
              style={{ height: 44, borderRadius: 12, fontSize: 14 }}
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Form.Item
              label={<span style={{ fontSize: 12, fontWeight: 600 }}>Phone (WhatsApp)</span>}
              name="phone"
              rules={[{ required: true, message: "Phone number required" }]}
              style={{ marginBottom: 12 }}
            >
              <Input
                placeholder="10-digit number"
                inputMode="tel"
                prefix={<Phone size={14} color={token.colorTextPlaceholder} style={{ marginRight: 4 }} />}
                style={{ height: 44, borderRadius: 12, fontSize: 13 }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: 12, fontWeight: 600 }}>Alternate Phone</span>}
              name="alternate_phone"
              style={{ marginBottom: 12 }}
            >
              <Input
                placeholder="Optional"
                inputMode="tel"
                style={{ height: 44, borderRadius: 12, fontSize: 13 }}
              />
            </Form.Item>
          </div>

          <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>Email Address</span>} name="email" style={{ marginBottom: 0 }}>
            <Input
              placeholder="Optional email for invoices"
              inputMode="email"
              style={{ height: 44, borderRadius: 12, fontSize: 13 }}
            />
          </Form.Item>
        </div>

        {/* ── Card 2: Address & Identity ── */}
        <div
          style={{
            backgroundColor: token.colorBgElevated,
            borderRadius: 16,
            padding: 14,
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <MapPin size={15} color={token.colorPrimary} />
            <Text strong style={{ fontSize: 13, color: token.colorTextSecondary }}>
              ADDRESS & TAX / ID
            </Text>
          </div>

          <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>Postal Address</span>} name="address" style={{ marginBottom: 12 }}>
            <Input.TextArea
              rows={2}
              placeholder="Street, City, Pincode"
              style={{ borderRadius: 12, fontSize: 13 }}
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>PAN Number</span>} name="pan_number" style={{ marginBottom: 0 }}>
              <Input
                placeholder="ABCDE1234F"
                autoCapitalize="characters"
                autoCorrect="off"
                style={{ height: 44, borderRadius: 12, fontSize: 13, textTransform: "uppercase" }}
              />
            </Form.Item>

            <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>GSTIN</span>} name="gst_number" style={{ marginBottom: 0 }}>
              <Input
                placeholder="Optional GSTIN"
                autoCapitalize="characters"
                autoCorrect="off"
                style={{ height: 44, borderRadius: 12, fontSize: 13, textTransform: "uppercase" }}
              />
            </Form.Item>
          </div>
        </div>

        {/* ── Card 3: Referral & Notes ── */}
        <div
          style={{
            backgroundColor: token.colorBgElevated,
            borderRadius: 16,
            padding: 14,
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <FileText size={15} color={token.colorPrimary} />
            <Text strong style={{ fontSize: 13, color: token.colorTextSecondary }}>
              REFERRAL & NOTES
            </Text>
          </div>

          <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>Referred By (Optional)</span>} name="reference_by" style={{ marginBottom: 12 }}>
            <Select
              allowClear
              showSearch
              placeholder="Select referring client"
              optionFilterProp="children"
              style={{ height: 44, width: "100%" }}
            >
              {referralList.map((ref) => (
                <Select.Option key={ref.id} value={ref.id}>
                  {ref.name} {ref.customer_code ? `(#${ref.customer_code})` : ""}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>Private Notes</span>} name="notes" style={{ marginBottom: 0 }}>
            <Input.TextArea
              rows={2}
              placeholder="Family jeweler history, ring size, preferences..."
              style={{ borderRadius: 12, fontSize: 13 }}
            />
          </Form.Item>
        </div>
      </Form>

      {/* ── Sticky Bottom Action Dock ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          backgroundColor: token.colorBgElevated,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          padding: "10px 16px",
          paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
          display: "flex",
          gap: 10,
        }}
      >
        <Button
          onClick={() => navigate(-1)}
          style={{
            height: 48,
            borderRadius: 14,
            fontWeight: 600,
            fontSize: 14,
            flex: 1,
          }}
        >
          Cancel
        </Button>

        <Button
          type="primary"
          icon={<Save size={16} />}
          loading={isSubmitting}
          onClick={() => form.submit()}
          style={{
            height: 48,
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 14,
            flex: 2,
            boxShadow: "0 2px 10px rgba(37, 99, 235, 0.3)",
          }}
        >
          Save Client
        </Button>
      </div>
    </div>
  );
};
