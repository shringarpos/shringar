import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Result,
  Spin,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import {
  CheckCircleOutlined,
  KeyOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useSearchParams } from "react-router";
import { supabaseClient } from "../../providers/supabase-client";
import { useLogin } from "@refinedev/core";

const { Title, Text, Paragraph } = Typography;

interface IAccessRequest {
  id: string;
  email: string;
  status: "pending" | "approved" | "rejected" | "registered";
  approval_token: string;
}

export default function CreateAccountPage() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<IAccessRequest | null>(null);

  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { mutate: login } = useLogin();
  const [form] = Form.useForm();
  const [lookupForm] = Form.useForm();

  const fetchRequestByToken = async (tokenStr: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("access_requests")
        .select("id, email, status, approval_token")
        .eq("approval_token", tokenStr.trim())
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setRequest(data);
    } catch (err: any) {
      console.error("Error loading access request:", err);
      message.error("Could not load invitation details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenParam) {
      fetchRequestByToken(tokenParam);
    } else {
      setLoading(false);
    }
  }, [tokenParam]);

  const handleLookupByEmail = async (values: { email: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("access_requests")
        .select("id, email, status, approval_token")
        .ilike("email", values.email.toLowerCase().trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        message.warning("No invitation found for this email. Please request access first.");
        setRequest(null);
      } else {
        setRequest(data);
      }
    } catch (err: any) {
      console.error("Error checking email:", err);
      message.error("Failed to check email status.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (values: { password: string }) => {
    if (!request) return;

    setSubmitting(true);
    try {
      const normalizedEmail = request.email.toLowerCase().trim();

      // Invoke backend edge function to create confirmed user
      const { data, error } = await supabaseClient.functions.invoke("create-approved-user", {
        body: {
          email: normalizedEmail,
          password: values.password,
        },
      });

      if (error) {
        let errorMsg = "Failed to create account. Please ensure your access request has been approved.";
        try {
          if ((error as any).context) {
            const body = await (error as any).context.json();
            if (body?.error) errorMsg = body.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      message.success("Account created successfully! Logging you in...");

      // Automatically sign in with credentials
      login({
        email: normalizedEmail,
        password: values.password,
      });
    } catch (err: any) {
      console.error("Account creation error:", err);
      message.error(err.message || "Failed to create account.");
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
        <div style={{ textAlign: "center", marginBottom: 20 }}>
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
            <Tag color="green" icon={<SafetyCertificateOutlined />}>
              Approved Invitation
            </Tag>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Verifying your invitation...</Text>
            </div>
          </div>
        ) : request ? (
          request.status === "approved" ? (
            /* Approved: Set Password and Launch App */
            <div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <Title level={4} style={{ margin: "0 0 6px" }}>
                  Create Your Account
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Your request has been approved! Set your password to get started immediately.
                </Text>
              </div>

              <div
                style={{
                  background: token.colorFillAlter,
                  padding: "12px 16px",
                  borderRadius: 8,
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <MailOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                <Text strong style={{ fontSize: 14 }}>
                  {request.email}
                </Text>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleCreateAccount}
                requiredMark={false}
              >
                <Form.Item
                  label="Password"
                  name="password"
                  rules={[
                    { required: true, message: "Please create a password" },
                    { min: 6, message: "Password must be at least 6 characters" },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: token.colorTextTertiary }} />}
                    placeholder="Enter at least 6 characters"
                    size="large"
                    autoFocus
                  />
                </Form.Item>

                <Form.Item
                  label="Confirm Password"
                  name="confirmPassword"
                  dependencies={["password"]}
                  rules={[
                    { required: true, message: "Please confirm your password" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Passwords do not match!"));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: token.colorTextTertiary }} />}
                    placeholder="Confirm your password"
                    size="large"
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 12, marginTop: 20 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    icon={<CheckCircleOutlined />}
                    loading={submitting}
                    block
                    style={{ height: 44, borderRadius: 10, fontWeight: 600 }}
                  >
                    Create Account & Launch POS
                  </Button>
                </Form.Item>
              </Form>

              <div style={{ textAlign: "center", marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ✓ Instant activation: No email verification needed.
                </Text>
              </div>
            </div>
          ) : request.status === "registered" ? (
            /* Already Registered */
            <Result
              status="info"
              title="Account Already Created"
              subTitle={
                <span>
                  The account for <Text strong>{request.email}</Text> has already been created. You can log in directly.
                </span>
              }
              extra={
                <Button type="primary" size="large" onClick={() => navigate("/login")}>
                  Sign In to Shringar POS
                </Button>
              }
            />
          ) : request.status === "pending" ? (
            /* Pending Review */
            <Result
              status="warning"
              title="Request Pending Approval"
              subTitle={
                <span>
                  The access request for <Text strong>{request.email}</Text> is currently awaiting approval. You will receive an invitation link once approved.
                </span>
              }
              extra={
                <Button key="login" onClick={() => navigate("/login")}>
                  Back to Sign In
                </Button>
              }
            />
          ) : (
            /* Rejected */
            <Result
              status="error"
              title="Request Not Approved"
              subTitle="This invitation request was not approved. Please contact us for support."
              extra={
                <Link to="/register">
                  <Button type="primary">Submit New Request</Button>
                </Link>
              }
            />
          )
        ) : (
          /* Missing or Invalid Token: Simple Email Check */
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <KeyOutlined style={{ fontSize: 28, color: token.colorPrimary, marginBottom: 8 }} />
              <Title level={4} style={{ margin: "4px 0" }}>
                Create Account
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Enter the email address you used to request access.
              </Text>
            </div>

            <Form
              form={lookupForm}
              layout="vertical"
              onFinish={handleLookupByEmail}
              requiredMark={false}
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="Enter your email"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 12 }}>
                <Button type="primary" htmlType="submit" size="large" block>
                  Continue
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Don't have an invitation?{" "}
                <Link to="/register" style={{ fontWeight: 600 }}>
                  Request Access
                </Link>
              </Text>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: 16,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            paddingTop: 16,
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            Already set up?{" "}
            <Link to="/login" style={{ color: token.colorPrimary, fontWeight: 600 }}>
              Sign In
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
