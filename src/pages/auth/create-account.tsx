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
  Grid,
} from "antd";
import {
  CheckCircleOutlined,
  KeyOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router";
import { supabaseClient } from "../../providers/supabase-client";
import { useLogin } from "@refinedev/core";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

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
  const [form] = Form.useForm();
  const [lookupForm] = Form.useForm();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { mutate: login } = useLogin();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const fetchRequestByToken = async (tok: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("access_requests")
        .select("id, email, status, approval_token")
        .eq("approval_token", tok.trim())
        .maybeSingle();

      if (error) {
        throw error;
      }
      setRequest(data);
    } catch (err: any) {
      console.error("Error fetching access request:", err);
      message.error(err.message || "Failed to load invitation.");
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

  const handleCreateAccount = async (values: { password: string }) => {
    if (!request) return;
    setSubmitting(true);

    try {
      // 1. Sign up the user in Supabase auth (with auto_confirm email if configured)
      const { data: authData, error: authErr } = await supabaseClient.auth.signUp({
        email: request.email,
        password: values.password,
        options: {
          data: {
            name: request.email.split("@")[0],
          },
        },
      });

      if (authErr) {
        // If user already exists in Auth, try logging in with the given password
        if (authErr.message.includes("User already registered") || authErr.status === 422) {
          const { error: signInErr } = await supabaseClient.auth.signInWithPassword({
            email: request.email,
            password: values.password,
          });
          if (signInErr) {
            throw new Error("This email is already registered. If this is you, please sign in with your password at the login page.");
          }
        } else {
          throw authErr;
        }
      }

      // 2. Mark the access_request as registered
      await supabaseClient
        .from("access_requests")
        .update({ status: "registered" })
        .eq("id", request.id);

      // 3. Mark the email as authorized in app_settings whitelist
      try {
        const { data: settingsData } = await supabaseClient
          .from("app_settings")
          .select("id, allowed_emails")
          .order("id", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (settingsData) {
          const existingList: string[] = Array.isArray(settingsData.allowed_emails)
            ? settingsData.allowed_emails
            : [];
          if (!existingList.some((e) => e.toLowerCase() === request.email.toLowerCase())) {
            await supabaseClient
              .from("app_settings")
              .update({
                allowed_emails: [...existingList, request.email.toLowerCase()],
              })
              .eq("id", settingsData.id);
          }
        }
      } catch (e) {
        console.warn("Could not update app_settings whitelist (continuing):", e);
      }

      message.success("Account successfully created! Logging in...");

      // 4. Log in immediately and redirect to onboarding / shop setup
      login({
        email: request.email,
        password: values.password,
        redirectTo: "/setup",
      });
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
          maxWidth: 460,
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
          maxWidth: 460,
          boxShadow: isMobile ? "0 2px 12px rgba(0,0,0,0.04)" : "0 10px 32px rgba(0,0,0,0.06)",
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        bodyStyle={{
          padding: isMobile ? "20px 16px" : "28px 24px",
        }}
      >
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
              style={{ marginBottom: 20, borderRadius: 10 }}
            />
            <Form form={lookupForm} layout="vertical" onFinish={handleManualLookup}>
              <Form.Item
                name="token"
                rules={[{ required: true, message: "Please paste your invitation token" }]}
              >
                <Input
                  prefix={<KeyOutlined style={{ color: token.colorTextTertiary, marginRight: 6 }} />}
                  placeholder="Paste invitation token here"
                  size="large"
                  style={{ fontSize: 16, height: 48, borderRadius: 10 }}
                />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                style={{ height: 48, borderRadius: 12, fontWeight: 600, fontSize: 15 }}
              >
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
              <Button
                key="req"
                type="primary"
                size="large"
                block
                style={{ height: 48, borderRadius: 12, fontWeight: 600, marginBottom: 8 }}
                onClick={() => navigate("/register")}
              >
                Request Access
              </Button>,
              <Button
                key="login"
                size="large"
                block
                style={{ height: 48, borderRadius: 12 }}
                onClick={() => navigate("/login")}
              >
                Back to Login
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
                style={{ height: 48, borderRadius: 12, fontWeight: 600 }}
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
            subTitle={`The request for ${request.email} has not yet been approved. You will receive an email once approved.`}
            extra={[
              <Button
                key="login"
                type="primary"
                size="large"
                block
                style={{ height: 48, borderRadius: 12, fontWeight: 600 }}
                onClick={() => navigate("/login")}
              >
                Back to Login
              </Button>,
            ]}
          />
        ) : request.status === "rejected" ? (
          <Result
            status="error"
            title="Invitation Declined"
            subTitle="This access request was declined. Please contact the administrator for assistance."
            extra={[
              <Button
                key="login"
                type="primary"
                size="large"
                block
                style={{ height: 48, borderRadius: 12, fontWeight: 600 }}
                onClick={() => navigate("/login")}
              >
                Back to Login
              </Button>,
            ]}
          />
        ) : (
          /* Approved -> Create Account Form */
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Title level={4} style={{ margin: "0 0 6px", fontSize: 18 }}>
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
                borderRadius: 12,
                marginBottom: 20,
                border: `1px solid ${token.colorBorderSecondary}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <MailOutlined style={{ color: token.colorPrimary, fontSize: 20 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Verified Account Email
                </Text>
                <Text strong style={{ fontSize: 14 }} ellipsis>
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
                label={<span style={{ fontSize: 13, fontWeight: 500 }}>Set Password</span>}
                rules={[
                  { required: true, message: "Please enter your password" },
                  { min: 6, message: "Password must be at least 6 characters" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: token.colorTextTertiary, marginRight: 6 }} />}
                  placeholder="Enter at least 6 characters"
                  size="large"
                  style={{ fontSize: 16, height: 48, borderRadius: 10 }}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={<span style={{ fontSize: 13, fontWeight: 500 }}>Confirm Password</span>}
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
                  prefix={<LockOutlined style={{ color: token.colorTextTertiary, marginRight: 6 }} />}
                  placeholder="Re-enter your password"
                  size="large"
                  style={{ fontSize: 16, height: 48, borderRadius: 10 }}
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
                  style={{ height: 48, borderRadius: 12, fontWeight: 600, fontSize: 15 }}
                >
                  Create Account & Launch POS
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Already registered?{" "}
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
}
