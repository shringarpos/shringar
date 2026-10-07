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
import { Link, useNavigate, useSearchParams, useLocation } from "react-router";
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
  const location = useLocation();

  // Robust token extraction (supports searchParams, window.location.search, and hash queries)
  const getParam = (key: string): string | null => {
    const fromSearch = searchParams.get(key);
    if (fromSearch) return fromSearch.trim();

    const nativeSearch = new URLSearchParams(window.location.search).get(key);
    if (nativeSearch) return nativeSearch.trim();

    if (window.location.hash.includes("?")) {
      const hashQuery = window.location.hash.split("?")[1];
      const fromHash = new URLSearchParams(hashQuery).get(key);
      if (fromHash) return fromHash.trim();
    }

    return null;
  };

  const tokenParam = getParam("token");

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
      console.error("Error looking up access token:", err);
      message.error("Failed to verify access token.");
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
  }, [tokenParam, location.key]);

  const handleCreateAccount = async (values: any) => {
    if (!request) return;
    setSubmitting(true);

    try {
      // Call edge function to create user with confirmed email
      const { data, error } = await supabaseClient.functions.invoke("create-approved-user", {
        body: {
          email: request.email,
          password: values.password,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to create user");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Update access_requests status to 'registered'
      await supabaseClient
        .from("access_requests")
        .update({
          status: "registered",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      message.success("Account created successfully! Launching Shringar POS...");

      // Automatically sign in the user
      login(
        {
          email: request.email,
          password: values.password,
        },
        {
          onSuccess: () => {
            navigate("/");
          },
          onError: () => {
            navigate("/login?registered=true");
          },
        }
      );
    } catch (err: any) {
      console.error("Account creation error:", err);
      message.error(err.message || "Account creation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualLookup = (values: { token: string }) => {
    if (values.token) {
      navigate(`/create-account?token=${encodeURIComponent(values.token.trim())}`);
      fetchRequestByToken(values.token.trim());
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
          maxWidth: 460,
          boxShadow: "0 10px 32px rgba(0,0,0,0.06)",
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
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
            <Tag color="green" icon={<SafetyCertificateOutlined />} style={{ padding: "2px 10px", borderRadius: 12 }}>
              Authorized Setup
            </Tag>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
          </div>
        ) : !tokenParam ? (
          <div>
            <Alert
              type="info"
              showIcon
              message="Invitation Token Required"
              description="Please open the setup link from your approval email, or enter your token below."
              style={{ marginBottom: 20 }}
            />
            <Form form={lookupForm} layout="vertical" onFinish={handleManualLookup}>
              <Form.Item
                name="token"
                rules={[{ required: true, message: "Please paste your invitation token" }]}
              >
                <Input
                  prefix={<KeyOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="Paste invitation token here"
                  size="large"
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block>
                Continue Setup
              </Button>
            </Form>
          </div>
        ) : !request ? (
          <Result
            status="warning"
            title="Invalid Invitation Link"
            subTitle="This invitation token was not found or has expired. Please verify your link or request a new invitation."
            extra={[
              <Button key="req" type="primary" onClick={() => navigate("/register")}>
                Request Access
              </Button>,
              <Button key="login" onClick={() => navigate("/login")}>
                Back to Sign In
              </Button>,
            ]}
          />
        ) : request.status === "registered" ? (
          <Result
            status="info"
            title="Account Already Created"
            subTitle={`The account for ${request.email} has already been created. You can sign in directly.`}
            extra={[
              <Button
                key="login"
                type="primary"
                size="large"
                block
                onClick={() => navigate(`/login?email=${encodeURIComponent(request.email)}`)}
              >
                Go to Sign In
              </Button>,
            ]}
          />
        ) : request.status === "pending" ? (
          <Result
            status="warning"
            title="Request Still Pending Review"
            subTitle={`The request for ${request.email} has not yet been approved by the onboarding team. You will receive an email as soon as it is approved.`}
            extra={[
              <Button key="login" type="primary" onClick={() => navigate("/login")}>
                Back to Sign In
              </Button>,
            ]}
          />
        ) : request.status === "rejected" ? (
          <Result
            status="error"
            title="Invitation Declined"
            subTitle="This access request was declined. Please contact the administrator for assistance."
            extra={[
              <Button key="login" type="primary" onClick={() => navigate("/login")}>
                Back to Sign In
              </Button>,
            ]}
          />
        ) : (
          /* Approved -> Create Account Form */
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Title level={4} style={{ margin: "0 0 6px" }}>
                Create Your Account
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                You have been approved! Set your password to launch Shringar POS.
              </Text>
            </div>

            <div
              style={{
                background: token.colorFillAlter,
                padding: "12px 16px",
                borderRadius: 8,
                marginBottom: 20,
                border: `1px solid ${token.colorBorderSecondary}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <MailOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                  Verified Account Email
                </Text>
                <Text strong style={{ fontSize: 14 }}>
                  {request.email}
                </Text>
              </div>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleCreateAccount}
              requiredMark={false}
            >
              <Form.Item
                name="password"
                label="Set Password"
                rules={[
                  { required: true, message: "Please enter your password" },
                  { min: 6, message: "Password must be at least 6 characters" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="Enter at least 6 characters"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Please confirm your password" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Passwords do not match"));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="Re-enter your password"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  loading={submitting}
                  block
                  style={{ height: 44, borderRadius: 8, fontWeight: 500 }}
                >
                  Create Account & Launch POS
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Card>
    </div>
  );
}
