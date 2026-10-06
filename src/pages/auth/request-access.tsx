import React, { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Result,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  LockOutlined,
  MailOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router";
import { supabaseClient } from "../../providers/supabase-client";

const { Title, Text, Paragraph } = Typography;

export default function RequestAccessPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const ADMIN_EMAIL = "sahilkhude11@gmail.com";

  const handleRequestSubmit = async (values: { email: string }) => {
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
          message.info("Your email is already approved! You can create your account now.");
          navigate(`/create-account?token=${existing.approval_token}`);
          return;
        } else if (existing.status === "registered") {
          message.info("An account with this email already exists. Please log in.");
          navigate("/login");
          return;
        } else if (existing.status === "pending") {
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

      // Trigger notification email to Sahil
      const approvalUrl = `${window.location.origin}/approve-access?token=${approvalToken}`;
      const emailSubject = encodeURIComponent(`[Access Request] Shringar POS - ${normalizedEmail}`);
      const emailBody = encodeURIComponent(
        `Hello Sahil,\n\nA new user has requested access to Shringar POS:\n\n` +
        `• Email: ${normalizedEmail}\n\n` +
        `To approve this user and send their account creation link, click here:\n${approvalUrl}\n\n` +
        `Regards,\nShringar POS Access System`
      );

      const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${emailSubject}&body=${emailBody}`;
      try {
        const mailAnchor = document.createElement("a");
        mailAnchor.href = mailtoLink;
        mailAnchor.target = "_blank";
        mailAnchor.rel = "noopener noreferrer";
        mailAnchor.click();
      } catch (_) {
        // Mailto trigger fallback
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
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: token.colorBgLayout,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 10px 32px rgba(0,0,0,0.06)",
          borderRadius: 16,
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
            <Tag color="gold" icon={<LockOutlined />} style={{ padding: "2px 10px", borderRadius: 12 }}>
              Invite Only
            </Tag>
          </div>
        </div>

        {submittedEmail ? (
          /* Clean 2-Step Feedback */
          <Result
            status="success"
            title="Access Request Sent!"
            subTitle={
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <Paragraph style={{ fontSize: 14, color: token.colorTextSecondary }}>
                  We've received your request for <Text strong>{submittedEmail}</Text>.
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
                  <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                    What happens next?
                  </Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Once Sahil approves your request, you will receive an invitation email with a direct link to create your account. You won't need to verify your email and can start using the app immediately.
                  </Text>
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
                Back to Sign In
              </Button>,
            ]}
          />
        ) : (
          /* Ultra-Clean Single Email Field */
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Title level={4} style={{ margin: "0 0 6px" }}>
                Request Access
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Account creation is currently invite-only. Enter your email to request an invitation.
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
                  prefix={<MailOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="Enter your email address"
                  size="large"
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
                  style={{ height: 44, borderRadius: 10, fontWeight: 600 }}
                >
                  Request Access
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 16,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            paddingTop: 16,
            textAlign: "center",
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: token.colorPrimary, fontWeight: 600 }}>
              Sign In
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
