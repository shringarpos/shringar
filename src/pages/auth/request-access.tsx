import React, { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Result,
  Select,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import {
  CheckCircleOutlined,
  GoldOutlined,
  KeyOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SendOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router";
import { supabaseClient } from "../../providers/supabase-client";

const { Title, Text, Paragraph } = Typography;

export default function RequestAccessPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    email: string;
    fullName: string;
    shopName: string;
  } | null>(null);

  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleRequestSubmit = async (values: {
    fullName: string;
    email: string;
    phone: string;
    shopName: string;
    businessType?: string;
    notes?: string;
  }) => {
    setSubmitting(true);
    try {
      const normalizedEmail = values.email.toLowerCase().trim();

      // Check if request already exists
      const { data: existing } = await supabaseClient
        .from("access_requests")
        .select("id, status, approval_token")
        .ilike("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        if (existing.status === "approved") {
          message.info("Your email is already approved! Please proceed to activate your account.");
          navigate(`/activate?token=${existing.approval_token}`);
          return;
        } else if (existing.status === "registered") {
          message.info("An account with this email already exists. Please log in.");
          navigate("/login");
          return;
        } else if (existing.status === "pending") {
          setSubmittedData({
            email: normalizedEmail,
            fullName: values.fullName,
            shopName: values.shopName,
          });
          return;
        }
      }

      // Generate a unique token for backend approval workflow
      const approvalToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const notesContent = [
        values.businessType ? `Type: ${values.businessType}` : null,
        values.notes ? `Notes: ${values.notes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const { error: insertErr } = await supabaseClient
        .from("access_requests")
        .insert({
          email: normalizedEmail,
          full_name: values.fullName.trim(),
          phone: values.phone.trim(),
          shop_name: values.shopName.trim(),
          notes: notesContent || null,
          status: "pending",
          approval_token: approvalToken,
        });

      if (insertErr) {
        throw insertErr;
      }

      setSubmittedData({
        email: normalizedEmail,
        fullName: values.fullName,
        shopName: values.shopName,
      });

      message.success("Invitation request submitted successfully!");
    } catch (err: any) {
      console.error("Error submitting access request:", err);
      message.error(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: token.colorBgLayout,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 500,
          boxShadow: "0 12px 36px rgba(0,0,0,0.06)",
          borderRadius: 20,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/logo.png"
            alt="Shringar POS"
            style={{ width: 140, height: "auto", marginBottom: 12 }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <Title level={3} style={{ margin: "4px 0 2px" }}>
            Shringar POS
          </Title>
          <div style={{ marginTop: 6 }}>
            <Tag color="gold" icon={<LockOutlined />} style={{ padding: "3px 10px", borderRadius: 12 }}>
              Private Early Access
            </Tag>
          </div>
          <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
            Modern Cloud Billing, Gold Ledger (Girvi), and Digital Catalog engineered for Indian jewelers.
          </Paragraph>
        </div>

        {submittedData ? (
          /* Success Screen */
          <Result
            status="success"
            title="Invitation Request Received"
            subTitle={
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <Paragraph style={{ fontSize: 14 }}>
                  Thank you, <Text strong>{submittedData.fullName}</Text>! We have received your
                  onboarding request for <Text strong>{submittedData.shopName}</Text>.
                </Paragraph>
                <div
                  style={{
                    background: token.colorFillAlter,
                    padding: "16px",
                    borderRadius: 12,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    marginTop: 16,
                    textAlign: "left",
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Our team reviews all jewelry store onboarding requests to ensure personalized
                    setup and priority support. You will receive an invitation link at:
                  </Text>
                  <div style={{ marginTop: 6 }}>
                    <Text strong style={{ fontSize: 14, color: token.colorPrimary }}>
                      {submittedData.email}
                    </Text>
                  </div>
                </div>
              </div>
            }
            extra={[
              <Button
                key="login"
                type="primary"
                size="large"
                block
                onClick={() => navigate("/login")}
              >
                Return to Sign In
              </Button>,
              <Button
                key="another"
                type="link"
                size="middle"
                block
                onClick={() => {
                  setSubmittedData(null);
                  form.resetFields();
                }}
              >
                Submit another showroom request
              </Button>,
            ]}
          />
        ) : (
          /* Request Access Form */
          <div>
            <div
              style={{
                background: token.colorFillAlter,
                padding: "14px 16px",
                borderRadius: 12,
                marginBottom: 20,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 2 }}>
                Request Showroom Onboarding
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                We onboard jewelry showrooms with dedicated assistance. Provide your showroom
                details below to receive your invitation.
              </Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleRequestSubmit}
              requiredMark="optional"
            >
              <Form.Item
                label="Full Name (Owner / Manager)"
                name="fullName"
                rules={[{ required: true, message: "Please enter your full name" }]}
              >
                <Input prefix={<UserOutlined />} placeholder="e.g. Ramesh Patil" size="large" />
              </Form.Item>

              <Form.Item
                label="Showroom Business Email"
                name="email"
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="e.g. contact@jewellers.com" size="large" />
              </Form.Item>

              <Form.Item
                label="Mobile / WhatsApp Number"
                name="phone"
                rules={[{ required: true, message: "Please enter your contact number" }]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="e.g. +91 98220 12345" size="large" />
              </Form.Item>

              <Form.Item
                label="Jewelry Showroom Name & City"
                name="shopName"
                rules={[{ required: true, message: "Please enter showroom name and city" }]}
              >
                <Input prefix={<ShopOutlined />} placeholder="e.g. Mahalaxmi Jewellers, Kolhapur" size="large" />
              </Form.Item>

              <Form.Item label="Primary Business Category" name="businessType" initialValue="retail">
                <Select
                  size="large"
                  options={[
                    { label: "Retail Showroom (Gold, Silver & Diamond)", value: "retail" },
                    { label: "Wholesale & Bullion Trading", value: "wholesale" },
                    { label: "Jewelry Manufacturer / Workshop", value: "manufacturing" },
                    { label: "Artisan & Traditional Goldsmith", value: "artisan" },
                  ]}
                />
              </Form.Item>

              <Form.Item label="Specific Requirements (Optional)" name="notes">
                <Input.TextArea
                  rows={2}
                  placeholder="e.g. Girvi ledger management, barcode printing, multi-counter billing..."
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<SendOutlined />}
                  loading={submitting}
                  block
                  style={{ height: 44, borderRadius: 10, fontWeight: 600 }}
                >
                  Request Early Access Invitation
                </Button>
              </Form.Item>

              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  🔒 Applications are reviewed within 24 hours. Your details are kept confidential.
                </Text>
              </div>
            </Form>
          </div>
        )}

        {/* Footer Links */}
        <div
          style={{
            marginTop: 20,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            paddingTop: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: token.colorPrimary, fontWeight: 600 }}>
              Sign In
            </Link>
          </Text>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Received an invitation link?{" "}
            <Link to="/activate" style={{ color: token.colorPrimary, fontWeight: 600 }}>
              Activate Account
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
