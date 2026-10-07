import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Result,
  theme,
  Tag,
  Grid,
} from "antd";
import {
  MailOutlined,
  SendOutlined,
  LockOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate, Link } from "react-router";
import { supabaseClient } from "../../providers/supabase-client";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

export const RequestAccessPage: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const handleRequestSubmit = async (values: { email: string }) => {
    setSubmitting(true);
    const normalizedEmail = values.email.toLowerCase().trim();

    try {
      // Check if user already exists in access_requests
      const { data: existingUser } = await supabaseClient
        .from("access_requests")
        .select("id, status, approval_token")
        .ilike("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.status === "registered") {
          message.info("Your account is already active! Please sign in.");
          navigate(`/login?email=${encodeURIComponent(normalizedEmail)}`);
          return;
        }
        if (existingUser.status === "approved" && existingUser.approval_token) {
          message.success("Your email is already approved! Taking you to create your account.");
          navigate(`/create-account?token=${encodeURIComponent(existingUser.approval_token)}`);
          return;
        }
        if (existingUser.status === "pending") {
          message.warning("Your request is already pending approval from Sahil.");
          setSubmittedEmail(normalizedEmail);
          return;
        }
      }

      // Generate a unique approval token
      const approvalToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const { error: insertErr } = await supabaseClient
        .from("access_requests")
        .insert({
          email: normalizedEmail,
          status: "pending",
          approval_token: approvalToken,
        });

      if (insertErr) {
        throw insertErr;
      }

      setSubmittedEmail(normalizedEmail);

      // Trigger actual email delivery to sahilkhude11@gmail.com via Edge Function
      try {
        await supabaseClient.functions.invoke("send-access-email", {
          body: {
            type: "new_request",
            applicantEmail: normalizedEmail,
            approvalToken: approvalToken,
            origin: window.location.origin,
          },
        });
      } catch (emailErr) {
        console.warn("Automated email notification error (request still recorded):", emailErr);
      }

      message.success("Access request sent!");
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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: isMobile ? "flex-start" : "center",
        padding: isMobile ? "16px 12px 32px" : "24px 16px",
        background: token.colorBgLayout,
      }}
    >
      {/* Top back navigation on mobile */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          display: "flex",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/login")}
          style={{
            fontSize: 14,
            fontWeight: 500,
            padding: "4px 8px",
            color: token.colorTextSecondary,
          }}
        >
          Back to Login
        </Button>
      </div>

      <Card
        style={{
          width: "100%",
          maxWidth: 440,
          boxShadow: isMobile ? "0 2px 12px rgba(0,0,0,0.04)" : "0 10px 32px rgba(0,0,0,0.06)",
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        bodyStyle={{
          padding: isMobile ? "20px 16px" : "28px 24px",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/logo.png"
            alt="Shringar POS"
            style={{ width: 130, height: "auto", marginBottom: 10 }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <Title level={3} style={{ margin: "4px 0 2px", fontSize: isMobile ? 20 : 24 }}>
            Shringar POS
          </Title>
          <div style={{ marginTop: 6 }}>
            <Tag color="gold" icon={<LockOutlined />} style={{ padding: "2px 10px", borderRadius: 12 }}>
              Invite Only
            </Tag>
          </div>
        </div>

        {submittedEmail ? (
          /* Confirmation Screen */
          <Result
            status="success"
            title="Access Request Sent!"
            subTitle={
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <Paragraph style={{ fontSize: 14, color: token.colorTextSecondary, margin: 0 }}>
                  We've received your request for <Text strong>{submittedEmail}</Text>.
                </Paragraph>
                <Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 8 }}>
                  Sahil will review your request and you'll receive an invitation link.
                </Text>
              </div>
            }
            extra={[
              <Button
                key="login"
                type="primary"
                size="large"
                block
                style={{ height: 48, borderRadius: 12, fontWeight: 600, fontSize: 15 }}
                onClick={() => navigate("/login")}
              >
                Back to Login
              </Button>,
            ]}
          />
        ) : (
          /* Single Email Field */
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Title level={4} style={{ margin: "0 0 6px", fontSize: 18 }}>
                Request Access
              </Title>
              <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.4, display: "block" }}>
                Account creation is invite-only. Enter your email to request an invitation.
              </Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleRequestSubmit}
              requiredMark={false}
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: "Please enter your email address" },
                  { type: "email", message: "Please enter a valid email address" },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: token.colorTextTertiary, marginRight: 6 }} />}
                  placeholder="Enter your email address"
                  size="large"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  style={{ fontSize: 16, height: 48, borderRadius: 10 }}
                  autoFocus
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 12 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<SendOutlined />}
                  loading={submitting}
                  block
                  style={{ height: 48, borderRadius: 12, fontWeight: 600, fontSize: 15 }}
                >
                  Request Access
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Already have an approved account?{" "}
                <Link to="/login" style={{ fontWeight: 600 }}>
                  Back to Login
                </Link>
              </Text>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RequestAccessPage;
