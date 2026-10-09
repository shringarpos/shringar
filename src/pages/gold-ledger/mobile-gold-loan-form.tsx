import React, { useState, useContext } from "react";
import { useNavigate } from "react-router";
import { useCreate, useGetIdentity } from "@refinedev/core";
import { Form, Input, InputNumber, Button, DatePicker, Typography, notification, theme } from "antd";
import { ArrowLeft, User, Coins, Percent, Save, Phone } from "lucide-react";
import dayjs from "dayjs";
import type { IGoldLoan } from "../../libs/interfaces";
import { ColorModeContext } from "../../contexts/color-mode";

const { Title, Text } = Typography;

export const MobileGoldLoanForm: React.FC = () => {
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

  const { data: identity } = useGetIdentity<{ id: string }>();
  const userId = identity?.id;

  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loanAmount = Form.useWatch("loan_amount", form) || 0;
  const interestRate = Form.useWatch("interest_rate", form) || 0;
  const durationMonths = Form.useWatch("duration_months", form) || 0;
  // Desktop simple-interest parity: rate is Annual % (% p.a.), formula: (P * R * T) / 1200
  const tenureInterestRs = Math.round(((Number(loanAmount) * Number(interestRate) * Number(durationMonths)) / 1200) * 100) / 100;
  const monthlyInterestRs = Number(durationMonths) > 0 ? Math.round((tenureInterestRs / Number(durationMonths)) * 100) / 100 : 0;
  const totalPayableRs = Math.round((Number(loanAmount || 0) + tenureInterestRs) * 100) / 100;
  const effectiveMonthlyPct = Number(interestRate) ? (Number(interestRate) / 12).toFixed(2) : "0.00";

  const { mutateAsync: createLoan } = useCreate<IGoldLoan>();

  const handleSubmit = async (values: any) => {
    try {
      setIsSubmitting(true);
      const loanDateStr = values.loan_date
        ? dayjs.isDayjs(values.loan_date)
          ? values.loan_date.format("YYYY-MM-DD")
          : values.loan_date
        : dayjs().format("YYYY-MM-DD");

      const principal = Number(values.loan_amount);
      const rate = Number(values.interest_rate);
      const months = Number(values.duration_months);
      const interestAmount = Math.round(((principal * rate * months) / 1200) * 100) / 100;
      const totalAmount = Math.round((principal + interestAmount) * 100) / 100;

      // EXACT gold_loans columns only (migration 20261005154854): user_id
      // satisfies RLS user_id = auth.uid(); non-schema keys and UI-aliased
      // field names are mapped or dropped — never sent.
      await createLoan({
        resource: "gold_loans",
        values: {
          user_id: userId,
          customer_name: values.customer_name.trim(),
          contact_no: values.contact_no.trim(),
          address: values.address.trim(),
          nominee: values.nominee.trim(),
          metal_type: values.metal_type,
          purity: values.purity,
          ornament_details: values.ornament_details.trim(),
          loan_date: loanDateStr,
          loan_amount: principal,
          duration_months: months,
          interest_rate: rate,
          interest_amount: interestAmount,
          total_amount: totalAmount,
          status: "running",
        },
      });

      notification.success({ message: "Gold loan registered successfully" });
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
              width: 38,
              height: 38,
              borderRadius: 19,
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
              New Gold Loan
            </Title>
            <Text style={{ fontSize: 11, color: themeStyles.textSecondary, fontWeight: 500 }}>
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
        initialValues={{
          metal_type: "Gold",
          purity: "22K",
          interest_rate: 18,
          duration_months: 12,
          loan_date: dayjs(),
        }}
        style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* ── Card 1: Borrower Information ── */}
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
              BORROWER CONTACT
            </span>
          </div>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Borrower Name</span>}
            name="customer_name"
            rules={[{ required: true, whitespace: true, message: "Borrower name is required" }]}
            style={{ marginBottom: 14 }}
          >
            <Input placeholder="Full name of borrower" style={{ height: 48, borderRadius: 14, fontSize: 15 }} />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Phone Number</span>}
            name="contact_no"
            rules={[
              { required: true, whitespace: true, message: "Contact number is required" },
              { pattern: /^[0-9+\s-]{8,15}$/, message: "Valid phone required" },
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
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Nominee</span>}
            name="nominee"
            rules={[{ required: true, whitespace: true, message: "Nominee name is required" }]}
            style={{ marginBottom: 14 }}
          >
            <Input placeholder="Nominee full name" style={{ height: 48, borderRadius: 14, fontSize: 15 }} />
          </Form.Item>

          <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Address</span>} name="address" rules={[{ required: true, whitespace: true, message: "Residential address is required" }]} style={{ marginBottom: 0 }}>
            <Input placeholder="Resident village / town" style={{ height: 48, borderRadius: 14, fontSize: 14 }} />
          </Form.Item>
        </div>

        {/* ── Card 2: Pledged Collateral ── */}
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
                backgroundColor: isDark ? "rgba(217, 119, 6, 0.2)" : "rgba(217, 119, 6, 0.12)",
                color: isDark ? "#fbbf24" : "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Coins size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "0.02em" }}>
              PLEDGED COLLATERAL
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Metal Type</span>} name="metal_type" rules={[{ required: true, message: "Select metal type" }]} style={{ marginBottom: 14 }}>
              <Input style={{ height: 48, borderRadius: 14, fontSize: 14 }} />
            </Form.Item>

            <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Purity</span>} name="purity" rules={[{ required: true, message: "Select purity" }]} style={{ marginBottom: 14 }}>
              <Input placeholder="e.g. 22K" style={{ height: 48, borderRadius: 14, fontSize: 14 }} />
            </Form.Item>
          </div>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Item Description & Weight</span>}
            name="ornament_details"
            rules={[{ required: true, whitespace: true, message: "Describe the ornaments" }]}
            style={{ marginBottom: 0 }}
          >
            <Input
              placeholder="e.g. 2 Gold Bangles (24.5g gross)"
              style={{ height: 48, borderRadius: 14, fontSize: 14 }}
            />
          </Form.Item>
        </div>

        {/* ── Card 3: Loan Terms & Monthly Interest ── */}
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
                backgroundColor: isDark ? "rgba(5, 150, 105, 0.2)" : "rgba(5, 150, 105, 0.12)",
                color: isDark ? "#34d399" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Percent size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: themeStyles.textPrimary, letterSpacing: "0.02em" }}>
              LOAN PRINCIPAL & INTEREST
            </span>
          </div>

          <style>{`
            .loan-fields-centered .ant-form-item-label { text-align: center; }
            .loan-fields-centered .ant-form-item-label > label { display: inline-flex; justify-content: center; width: 100%; text-align: center; }
            .loan-fields-centered .ant-input-number-input {
              text-align: center !important;
              height: 48px !important;
              line-height: 48px !important;
              font-size: 16px !important;
              font-weight: 600 !important;
            }
            .loan-fields-centered .ant-input-number-group-addon {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0 10px;
              font-weight: 600;
              font-size: 13px;
            }
            .loan-fields-centered .ant-picker {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .loan-fields-centered .ant-picker-input {
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .loan-fields-centered .ant-picker-input input {
              text-align: center !important;
              height: 48px !important;
              font-size: 15px !important;
              font-weight: 600 !important;
            }
          `}</style>
          <div className="loan-fields-centered">
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
              <Form.Item
                label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Loan Principal (₹)</span>}
                name="loan_amount"
                rules={[{ required: true, message: "Enter principal amount" }]}
                style={{ marginBottom: 14 }}
              >
                <InputNumber
                  min={0}
                  placeholder="₹ Principal"
                  style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15 }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Interest (% p.a.)</span>}
                name="interest_rate"
                rules={[
                  { required: true, message: "Interest rate is required" },
                  { type: "number", min: 0.1, max: 100, message: "Rate must be between 0.1% and 100%" },
                ]}
                style={{ marginBottom: 14 }}
              >
                <InputNumber
                  min={0.1}
                  max={100}
                  step={0.5}
                  precision={2}
                  placeholder="18"
                  addonAfter="% p.a."
                  style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15 }}
                />
              </Form.Item>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <Form.Item
                label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Tenure (Months)</span>}
                name="duration_months"
                rules={[{ required: true, message: "Duration" }]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  min={1}
                  max={60}
                  style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15 }}
                />
              </Form.Item>

              <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: themeStyles.labelColor, marginBottom: 6, display: "inline-block" }}>Issue Date</span>} name="loan_date" style={{ marginBottom: 0 }}>
                <DatePicker format="YYYY-MM-DD" style={{ width: "100%", height: 48, borderRadius: 14 }} />
              </Form.Item>
            </div>
          </div>

          {/* High-Contrast Dynamic Monthly Interest Badge */}
          <div
            style={{
              borderRadius: 14,
              padding: "14px 16px",
              background: isDark
                ? "linear-gradient(135deg, #090d16 0%, #172554 100%)"
                : "linear-gradient(135deg, #090d16 0%, #172554 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 16px rgba(15, 23, 42, 0.25)",
              border: isDark ? "1px solid rgba(250, 204, 21, 0.4)" : "1px solid rgba(250, 204, 21, 0.35)",
            }}
          >
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "#93c5fd", display: "block" }}>
                ESTIMATED MONTHLY INTEREST
              </span>
              <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 500 }}>
                {interestRate}% p.a. (~{effectiveMonthlyPct}%/mo) on ₹{Number(loanAmount || 0).toLocaleString("en-IN")} • Total ₹{totalPayableRs.toLocaleString("en-IN")} over {Number(durationMonths || 0)}mo
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#facc15", letterSpacing: "-0.5px" }}>
                ₹{monthlyInterestRs.toLocaleString("en-IN")}
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}> /mo</span>
              </span>
            </div>
          </div>
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
          Create Loan
        </Button>
      </div>
    </div>
  );
};
