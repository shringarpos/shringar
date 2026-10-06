import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Result,
  Space,
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
  ShopOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useSearchParams } from "react-router";
import { supabaseClient } from "../../providers/supabase-client";
import { useLogin } from "@refinedev/core";

const { Title, Text, Paragraph } = Typography;

interface IAccessRequest {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  shop_name: string;
  status: "pending" | "approved" | "rejected" | "registered";
  approval_token: string;
}

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<IAccessRequest | null>(null);
  const [manualEmail, setManualEmail] = useState("");

  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { mutate: login } = useLogin();
  const [form] = Form.useForm();
  const [manualForm] = Form.useForm();

  const fetchRequestDetails = async (queryToken?: string, queryEmail?: string) => {
    setLoading(true);
    try {
      let query = supabaseClient.from("access_requests").select("*");

      if (queryToken) {
        query = query.eq("approval_token", queryToken.trim());
      } else if (queryEmail) {
        query = query
          .ilike("email", queryEmail.toLowerCase().trim())
          .order("created_at", { ascending: false });
      } else {
        setLoading(false);
        return;
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      setRequest(data);
    } catch (err: any) {
      console.error("Error loading invitation:", err);
      message.error("Unable to load invitation details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenParam || emailParam) {
      fetchRequestDetails(tokenParam || undefined, emailParam || undefined);
    } else {
      setLoading(false);
    }
  }, [tokenParam, emailParam]);

  const handleManualEmailCheck = async (values: { email: string }) => {
    setManualEmail(values.email);
    await fetchRequestDetails(undefined, values.email);
  };

  const handleActivate = async (values: { password: string }) => {
    if (!request) return;

    setSubmitting(true);
    try {
      const normalizedEmail = request.email.toLowerCase().trim();

      // Call backend edge function
      const { data, error } = await supabaseClient.functions.invoke("create-approved-user", {
        body: {
          email: normalizedEmail,
          password: values.password,
        },
      });

      if (error) {
        let errorMsg = "Failed to activate account. Please check your invitation status.";
        try {
          if ((error as any).context) {
            const body = await (error as any).context.json();
            if (body?.error) errorMsg = body.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      message.success("Account activated successfully! Logging you in...");

      // Automatically sign in with credentials
      login({
        email: normalizedEmail,
        password: values.password,
      });
    } catch (err: any) {
      console.error("Activation error:", err);
      message.error(err.message || "Failed to activate account.");
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
          maxWidth: 480,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          borderRadius: 16,
          borderColor: token.colorBorderSecondary,
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
          <Tag color="gold" icon={<SafetyCertificateOutlined />}>
            Invitation Activation
          </Tag>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Verifying your invitation details...</Text>
            </div>
          </div>
        ) : request ? (
          /* Render based on status */
          request.status === "approved" ? (
            /* Ready to Activate Form */
            <div>
              <div
                style={{
                  background: token.colorFillAlter,
                  padding: "16px",
                  borderRadius: 12,
                  marginBottom: 20,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <ShopOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
                  <Text strong style={{ fontSize: 16 }}>
                    {request.shop_name}
                  </Text>
                </div>
                <Paragraph style={{ margin: 0, fontSize: 13 }} type="secondary">
                  Welcome aboard, <Text strong>{request.full_name}</Text>! Your invitation has been
                  approved. Set your account password to activate your showroom workspace.
                </Paragraph>
              </div>

              <Form form={form} layout="vertical" onFinish={handleActivate} requiredMark="optional">
                <Form.Item label="Showroom Email">
                  <Input
                    prefix={<MailOutlined />}
                    value={request.email}
                    disabled
                    size="large"
                    style={{ background: token.colorBgContainerDisabled }}
                  />
                </Form.Item>

                <Form.Item
                  label="Create Password"
                  name="password"
                  rules={[
                    { required: true, message: "Please create a password" },
                    { min: 6, message: "Password must be at least 6 characters" },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Enter at least 6 characters"
                    size="large"
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
                    prefix={<LockOutlined />}
                    placeholder="Confirm your password"
                    size="large"
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 12, marginTop: 24 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    icon={<CheckCircleOutlined />}
                    loading={submitting}
                    block
                  >
                    Activate Store & Launch POS
                  </Button>
                </Form.Item>
              </Form>
            </div>
          ) : request.status === "registered" ? (
            /* Already Registered */
            <Result
              status="info"
              title="Account Already Activated"
              subTitle={
                <span>
                  The account for <Text strong>{request.email}</Text> ({request.shop_name}) is
                  already active. You can log in directly.
                </span>
              }
              extra={
                <Button type="primary" size="large" onClick={() => navigate("/login")}>
                  Sign In to Shringar POS
                </Button>
              }
            />
          ) : request.status === "pending" ? (
            /* Pending Approval */
            <Result
              status="warning"
              title="Application In Review"
              subTitle={
                <span>
                  Your request for <Text strong>{request.shop_name}</Text> is currently under review
                  by our onboarding team. You will receive an invitation link once verified.
                </span>
              }
              extra={[
                <Button key="login" onClick={() => navigate("/login")}>
                  Back to Sign In
                </Button>,
              ]}
            />
          ) : (
            /* Rejected */
            <Result
              status="error"
              title="Application Not Approved"
              subTitle="This invitation request was not approved. Please reach out to our team for assistance."
              extra={
                <Link to="/register">
                  <Button type="primary">Submit New Request</Button>
                </Link>
              }
            />
          )
        ) : (
          /* No Token or Manual Lookup */
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <KeyOutlined style={{ fontSize: 28, color: token.colorPrimary, marginBottom: 8 }} />
              <Title level={4} style={{ margin: "4px 0" }}>
                Activate Your Account
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Enter the email address you used to request access to verify your invitation.
              </Text>
            </div>

            <Form
              form={manualForm}
              layout="vertical"
              onFinish={handleManualEmailCheck}
              requiredMark="optional"
            >
              <Form.Item
                label="Registered Business Email"
                name="email"
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="e.g. store@jewellers.com"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 12 }}>
                <Button type="primary" htmlType="submit" size="large" block>
                  Check Invitation Status
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Don't have an invitation yet?{" "}
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
