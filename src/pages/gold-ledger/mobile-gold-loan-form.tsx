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
  Percent,
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
              New Gold Loan
            </Title>
            <Text style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
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
          interest_rate_pct: 2,
          duration_months: 6,
          loan_date: dayjs(),
        }}
        style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* ── Card 1: Borrower Information ── */}
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
              BORROWER CONTACT
            </span>
          </div>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Borrower Name</span>}
            name="customer_name"
            rules={[{ required: true, message: "Borrower name is required" }]}
            style={{ marginBottom: 14 }}
          >
            <Input
              placeholder="e.g. Suresh Kumar"
              style={{ height: 48, borderRadius: 14, fontSize: 15, border: "1px solid rgba(15, 23, 42, 0.12)" }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Contact Phone (WhatsApp)</span>}
            name="contact_no"
            style={{ marginBottom: 14 }}
          >
            <Input
              placeholder="10-digit mobile number"
              inputMode="tel"
              prefix={<Phone size={15} color="#64748b" style={{ marginRight: 6 }} />}
              style={{ height: 48, borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }}
            />
          </Form.Item>

          <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Address</span>} name="address" style={{ marginBottom: 0 }}>
            <Input placeholder="Resident village / town" style={{ height: 48, borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }} />
          </Form.Item>
        </div>

        {/* ── Card 2: Pledged Collateral ── */}
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
                backgroundColor: "rgba(217, 119, 6, 0.12)",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Coins size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
              PLEDGED COLLATERAL
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Metal Type</span>} name="metal_type" style={{ marginBottom: 14 }}>
              <Input style={{ height: 48, borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }} />
            </Form.Item>

            <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Purity</span>} name="purity" style={{ marginBottom: 14 }}>
              <Input placeholder="e.g. 22K" style={{ height: 48, borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }} />
            </Form.Item>
          </div>

          <Form.Item
            label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Item Description & Weight</span>}
            name="item_description"
            rules={[{ required: true, message: "Describe the ornaments" }]}
            style={{ marginBottom: 0 }}
          >
            <Input
              placeholder="e.g. 2 Gold Bangles (24.5g gross)"
              style={{ height: 48, borderRadius: 14, fontSize: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }}
            />
          </Form.Item>
        </div>

        {/* ── Card 3: Loan Terms & Monthly Interest ── */}
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
              <Percent size={15} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
              LOAN PRINCIPAL & INTEREST
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Loan Principal (₹)</span>}
              name="loan_amount"
              rules={[{ required: true, message: "Enter principal amount" }]}
              style={{ marginBottom: 14 }}
            >
              <InputNumber
                min={0}
                placeholder="₹ Principal"
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15, border: "1px solid rgba(15, 23, 42, 0.12)" }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Interest (%/mo)</span>}
              name="interest_rate_pct"
              rules={[{ required: true, message: "Rate" }]}
              style={{ marginBottom: 14 }}
            >
              <InputNumber
                min={0}
                step={0.1}
                placeholder="2.0%"
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15, border: "1px solid rgba(15, 23, 42, 0.12)" }}
              />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <Form.Item
              label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Tenure (Months)</span>}
              name="duration_months"
              rules={[{ required: true, message: "Duration" }]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={1}
                max={60}
                style={{ width: "100%", height: 48, borderRadius: 14, fontSize: 15, border: "1px solid rgba(15, 23, 42, 0.12)" }}
              />
            </Form.Item>

            <Form.Item label={<span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "inline-block" }}>Issue Date</span>} name="loan_date" style={{ marginBottom: 0 }}>
              <DatePicker format="YYYY-MM-DD" style={{ width: "100%", height: 48, borderRadius: 14, border: "1px solid rgba(15, 23, 42, 0.12)" }} />
            </Form.Item>
          </div>

          {/* High-Contrast Dynamic Monthly Interest Badge (10/10 Contrast) */}
          <div
            style={{
              borderRadius: 14,
              padding: "14px 16px",
              background: "linear-gradient(135deg, #090d16 0%, #172554 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 16px rgba(15, 23, 42, 0.25)",
              border: "1px solid rgba(250, 204, 21, 0.35)",
            }}
          >
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "#93c5fd", display: "block" }}>
                ESTIMATED MONTHLY INTEREST
              </span>
              <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 500 }}>
                {interestRatePct}% on ₹{loanAmount.toLocaleString("en-IN")}
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
          Issue Gold Loan
        </Button>
      </div>
    </div>
  );
};
