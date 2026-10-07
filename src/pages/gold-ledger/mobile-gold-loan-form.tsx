import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useCreate, useGetIdentity } from "@refinedev/core";
import {
  Form,
  Input,
  InputNumber,
  Button,
  DatePicker,
  Typography,
  theme,
  notification,
} from "antd";
import {
  ArrowLeft,
  Coins,
  Scale,
  Percent,
  Calendar,
  Save,
  User,
  Phone,
} from "lucide-react";
import dayjs from "dayjs";
import type { IGoldLoan } from "../../libs/interfaces";

const { Text, Title } = Typography;

export const MobileGoldLoanForm: React.FC = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Watchers for dynamic interest estimation
  const loanAmount: number = Form.useWatch("loan_amount", form) ?? 0;
  const interestRatePct: number = Form.useWatch("interest_rate_pct", form) ?? 2;
  const durationMonths: number = Form.useWatch("duration_months", form) ?? 6;

  const monthlyInterestRs = useMemo(() => {
    if (!loanAmount || !interestRatePct) return 0;
    return Math.round((loanAmount * interestRatePct) / 100);
  }, [loanAmount, interestRatePct]);

  const totalInterestRs = useMemo(() => {
    return monthlyInterestRs * durationMonths;
  }, [monthlyInterestRs, durationMonths]);

  const { mutateAsync: createLoan } = useCreate();

  const handleSubmit = async (values: any) => {
    if (!userId) {
      notification.error({ message: "User session not found" });
      return;
    }

    try {
      setIsSubmitting(true);
      const lDate = values.loan_date
        ? dayjs.isDayjs(values.loan_date)
          ? values.loan_date.format("YYYY-MM-DD")
          : values.loan_date
        : dayjs().format("YYYY-MM-DD");

      const principal = Number(values.loan_amount || 0);
      const iRate = Number(values.interest_rate_pct ?? 2);
      const months = Number(values.duration_months ?? 6);
      const iTotal = Math.round((principal * iRate * months) / 100);

      const payload: Partial<IGoldLoan> = {
        customer_name: values.customer_name.trim(),
        contact_no: values.contact_no?.trim() || "",
        address: values.address?.trim() || "",
        nominee: values.nominee?.trim() || "",
        metal_type: (values.metal_type || "Gold") as "Gold" | "Silver",
        purity: values.purity || "22K",
        ornament_details: values.item_description || "Ornament Collateral",
        loan_amount: principal,
        duration_months: months,
        interest_rate: iRate,
        interest_amount: iTotal,
        total_amount: principal + iTotal,
        loan_date: lDate,
        status: "running",
        user_id: userId,
      };

      await createLoan({
        resource: "gold_loans",
        values: payload,
      });

      notification.success({ message: `Gold loan for ${values.customer_name} issued successfully` });
      navigate("/gold-ledger");
    } catch (err: any) {
      notification.error({ message: err?.message || "Failed to create gold loan" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="mobile-gold-loan-form-page"
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
              New Gold Loan
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Girvi & Collateral Ledger
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
        initialValues={{
          metal_type: "Gold",
          purity: "22K",
          interest_rate_pct: 2,
          duration_months: 6,
          loan_date: dayjs(),
        }}
        style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* ── Card 1: Borrower Information ── */}
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
              BORROWER CONTACT
            </Text>
          </div>

          <Form.Item
            label={<span style={{ fontSize: 12, fontWeight: 600 }}>Borrower Name</span>}
            name="customer_name"
            rules={[{ required: true, message: "Borrower name is required" }]}
            style={{ marginBottom: 12 }}
          >
            <Input
              placeholder="e.g. Suresh Kumar"
              style={{ height: 44, borderRadius: 12, fontSize: 14 }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: 12, fontWeight: 600 }}>Contact Phone (WhatsApp)</span>}
            name="contact_no"
            style={{ marginBottom: 12 }}
          >
            <Input
              placeholder="10-digit mobile number"
              inputMode="tel"
              prefix={<Phone size={14} color={token.colorTextPlaceholder} style={{ marginRight: 4 }} />}
              style={{ height: 44, borderRadius: 12, fontSize: 13 }}
            />
          </Form.Item>

          <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>Address</span>} name="address" style={{ marginBottom: 0 }}>
            <Input placeholder="Resident village / town" style={{ height: 44, borderRadius: 12, fontSize: 13 }} />
          </Form.Item>
        </div>

        {/* ── Card 2: Pledged Collateral ── */}
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
            <Coins size={15} color="#d97706" />
            <Text strong style={{ fontSize: 13, color: token.colorTextSecondary }}>
              PLEDGED COLLATERAL
            </Text>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>Metal Type</span>} name="metal_type" style={{ marginBottom: 12 }}>
              <Input style={{ height: 44, borderRadius: 12, fontSize: 13 }} />
            </Form.Item>

            <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>Purity</span>} name="purity" style={{ marginBottom: 12 }}>
              <Input placeholder="e.g. 22K" style={{ height: 44, borderRadius: 12, fontSize: 13 }} />
            </Form.Item>
          </div>

          <Form.Item
            label={<span style={{ fontSize: 12, fontWeight: 600 }}>Item Description & Weight</span>}
            name="item_description"
            rules={[{ required: true, message: "Describe the ornaments" }]}
            style={{ marginBottom: 0 }}
          >
            <Input
              placeholder="e.g. 2 Gold Bangles (24.5g gross)"
              style={{ height: 44, borderRadius: 12, fontSize: 14 }}
            />
          </Form.Item>
        </div>

        {/* ── Card 3: Loan Terms & Monthly Interest ── */}
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
            <Percent size={15} color={token.colorPrimary} />
            <Text strong style={{ fontSize: 13, color: token.colorTextSecondary }}>
              LOAN PRINCIPAL & INTEREST
            </Text>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
            <Form.Item
              label={<span style={{ fontSize: 12, fontWeight: 600 }}>Loan Principal (₹)</span>}
              name="loan_amount"
              rules={[{ required: true, message: "Enter principal amount" }]}
              style={{ marginBottom: 12 }}
            >
              <InputNumber
                min={0}
                placeholder="₹ Principal"
                style={{ width: "100%", height: 44, borderRadius: 12, fontSize: 14 }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: 12, fontWeight: 600 }}>Interest (%/mo)</span>}
              name="interest_rate_pct"
              rules={[{ required: true, message: "Rate" }]}
              style={{ marginBottom: 12 }}
            >
              <InputNumber
                min={0}
                step={0.1}
                placeholder="2.0%"
                style={{ width: "100%", height: 44, borderRadius: 12, fontSize: 14 }}
              />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <Form.Item
              label={<span style={{ fontSize: 12, fontWeight: 600 }}>Tenure (Months)</span>}
              name="duration_months"
              rules={[{ required: true, message: "Duration" }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={1}
                max={60}
                style={{ width: "100%", height: 44, borderRadius: 12, fontSize: 14 }}
              />
            </Form.Item>

            <Form.Item label={<span style={{ fontSize: 12, fontWeight: 600 }}>Issue Date</span>} name="loan_date" style={{ marginBottom: 0 }}>
              <DatePicker format="YYYY-MM-DD" style={{ width: "100%", height: 44, borderRadius: 12 }} />
            </Form.Item>
          </div>

          {/* Monthly Interest Badge */}
          <div
            style={{
              borderRadius: 12,
              padding: "12px 14px",
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span style={{ fontSize: 11, opacity: 0.8, display: "block" }}>ESTIMATED MONTHLY INTEREST</span>
              <span style={{ fontSize: 11, opacity: 0.65 }}>
                {interestRatePct}% on ₹{loanAmount.toLocaleString("en-IN")}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#facc15" }}>
                ₹{monthlyInterestRs.toLocaleString("en-IN")}
                <span style={{ fontSize: 11, fontWeight: 400, color: "#fff", opacity: 0.7 }}> /mo</span>
              </span>
            </div>
          </div>
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
          Issue Gold Loan
        </Button>
      </div>
    </div>
  );
};
