import React, { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Result,
  Segmented,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
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
import { useLogin } from "@refinedev/core";

const { Title, Text, Paragraph } = Typography;

export default function RequestAccessPage() {
  const [mode, setMode] = useState<"request" | "complete">("request");
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    email: string;
    fullName: string;
    shopName: string;
    approvalToken: string;
  } | null>(null);

  const [approvalStatus, setApprovalStatus] = useState<{
    checked: boolean;
    approved: boolean;
    status?: string;
    message?: string;
  } | null>(null);

  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { mutate: login } = useLogin();
  const [requestForm] = Form.useForm();
  const [completeForm] = Form.useForm();

  const ADMIN_EMAIL = "sahilkhude11@gmail.com";

  // 1. Submit Access Request
  const handleRequestSubmit = async (values: {
    fullName: string;
    email: string;
    phone: string;
    shopName: string;
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
          message.info("Your email is already approved! You can complete your registration.");
          setMode("complete");
          completeForm.setFieldsValue({ email: normalizedEmail });
          setSubmitting(false);
          return;
        } else if (existing.status === "registered") {
          message.info("An account with this email already exists. Please log in.");
          navigate("/login");
          setSubmitting(false);
          return;
        } else if (existing.status === "pending") {
          message.warning("An access request for this email is already pending approval.");
          setSubmittedData({
            email: normalizedEmail,
            fullName: values.fullName,
            shopName: values.shopName,
            approvalToken: existing.approval_token,
          });
          setSubmitting(false);
          return;
        }
      }

      // Generate a client-side fallback token if needed
      const approvalToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const { data: inserted, error: insertErr } = await supabaseClient
        .from("access_requests")
        .insert({
          email: normalizedEmail,
          full_name: values.fullName.trim(),
          phone: values.phone.trim(),
          shop_name: values.shopName.trim(),
          notes: values.notes?.trim() || null,
          status: "pending",
          approval_token: approvalToken,
        })
        .select()
        .single();

      if (insertErr) {
        throw insertErr;
      }

      const finalToken = inserted?.approval_token || approvalToken;

      setSubmittedData({
        email: normalizedEmail,
        fullName: values.fullName,
        shopName: values.shopName,
        approvalToken: finalToken,
      });

      // Prepare email mailto trigger
      const approvalUrl = `${window.location.origin}/approve-access?token=${finalToken}`;
      const emailSubject = encodeURIComponent(`[Access Request] Shringar POS - ${values.shopName} (${values.fullName})`);
      const emailBody = encodeURIComponent(
        `Hello Sahil,\n\nA new jeweler has requested access to Shringar POS:\n\n` +
        `• Name: ${values.fullName}\n` +
        `• Email: ${normalizedEmail}\n` +
        `• Phone: ${values.phone}\n` +
        `• Shop Name: ${values.shopName}\n` +
        `• Notes: ${values.notes || "N/A"}\n\n` +
        `To approve this request, click the 1-click link below:\n${approvalUrl}\n\n` +
        `Regards,\nShringar POS Access Control System`
      );

      // Try triggering mailto link automatically in background
      const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${emailSubject}&body=${emailBody}`;
      try {
        const mailAnchor = document.createElement("a");
        mailAnchor.href = mailtoLink;
        mailAnchor.target = "_blank";
        mailAnchor.rel = "noopener noreferrer";
      } catch (e) {
        // ignore
      }

      message.success("Access request submitted successfully!");
    } catch (err: any) {
      console.error("Error submitting access request:", err);
      message.error(err.message || "Failed to submit access request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Complete Registration for Approved User
  const handleCompleteRegistration = async (values: {
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error("Passwords do not match!");
      return;
    }

    setSubmitting(true);
    setApprovalStatus(null);

    try {
      const normalizedEmail = values.email.toLowerCase().trim();

      // Check approval in database
      const { data: request, error: reqErr } = await supabaseClient
        .from("access_requests")
        .select("id, status, full_name, shop_name")
        .ilike("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reqErr) throw reqErr;

      if (!request) {
        setApprovalStatus({
          checked: true,
          approved: false,
          message: `No access request found for ${normalizedEmail}. Please submit an access request first.`,
        });
        setSubmitting(false);
        return;
      }

      if (request.status === "pending") {
        setApprovalStatus({
          checked: true,
          approved: false,
          status: "pending",
          message: `Your access request for ${normalizedEmail} is currently pending review by ${ADMIN_EMAIL}. You will be able to create your account once approved.`,
        });
        setSubmitting(false);
        return;
      }

      if (request.status === "rejected") {
        setApprovalStatus({
          checked: true,
          approved: false,
          status: "rejected",
          message: `Your access request for ${normalizedEmail} was not approved. Please contact ${ADMIN_EMAIL} for details.`,
        });
        setSubmitting(false);
        return;
      }

      if (request.status !== "approved" && request.status !== "registered") {
        setApprovalStatus({
          checked: true,
          approved: false,
          message: `Access not approved for this email.`,
        });
        setSubmitting(false);
        return;
      }

      // Invoke backend edge function to register approved account
      const { data: edgeData, error: edgeErr } = await supabaseClient.functions.invoke(
        "create-approved-user",
        {
          body: {
            email: normalizedEmail,
            password: values.password,
          },
        }
      );

      if (edgeErr) {
        let errorMsg = "Failed to create account. Please ensure your access request has been approved.";
        try {
          if ((edgeErr as any).context) {
            const body = await (edgeErr as any).context.json();
            if (body?.error) errorMsg = body.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      message.success("Account created successfully! Logging you in...");

      // Log the user in
      login({
        email: normalizedEmail,
        password: values.password,
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      message.error(err.message || "Failed to complete registration.");
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
          maxWidth: 520,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          borderRadius: 16,
          borderColor: token.colorBorderSecondary,
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
          <Space>
            <Tag color="gold" icon={<LockOutlined />}>
              Invite & Approval Only
            </Tag>
          </Space>
        </div>

        {/* Security Notification Banner */}
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
          message="Account Creation is Restricted"
          description={
            <Text style={{ fontSize: 13 }}>
              To ensure platform security and quality of service, public self-registration is closed.
              Submit your request below to gain access. Administrator:{" "}
              <Text strong code>{ADMIN_EMAIL}</Text>.
            </Text>
          }
        />

        {submittedData ? (
          /* Submission Confirmation View */
          <Result
            status="success"
            title="Access Request Submitted"
            subTitle={
              <div style={{ textAlign: "left", marginTop: 8 }}>
                <Paragraph>
                  We have recorded your access request for{" "}
                  <Text strong>{submittedData.email}</Text> ({submittedData.shopName}).
                </Paragraph>
                <Paragraph type="secondary" style={{ fontSize: 13 }}>
                  An alert has been dispatched to administrator <Text strong>{ADMIN_EMAIL}</Text>.
                  Once approved, return here and switch to <strong>"Complete Registration"</strong> to set your password.
                </Paragraph>
              </div>
            }
            extra={[
              <Button
                key="email"
                type="primary"
                icon={<MailOutlined />}
                href={`mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
                  `[Access Request] Shringar POS - ${submittedData.shopName} (${submittedData.fullName})`
                )}&body=${encodeURIComponent(
                  `Hello Sahil,\n\nI have requested access to Shringar POS for my shop ${submittedData.shopName}.\nEmail: ${submittedData.email}\nApproval URL: ${window.location.origin}/approve-access?token=${submittedData.approvalToken}\n\nThank you!`
                )}`}
              >
                Send Email to Administrator
              </Button>,
              <Button
                key="back"
                onClick={() => {
                  setSubmittedData(null);
                  setMode("complete");
                  completeForm.setFieldsValue({ email: submittedData.email });
                }}
              >
                Check Approval / Complete Setup
              </Button>,
            ]}
          />
        ) : (
          <>
            {/* Mode Switcher */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <Segmented
                value={mode}
                onChange={(val) => setMode(val as "request" | "complete")}
                options={[
                  { label: "1. Request Access", value: "request", icon: <SendOutlined /> },
                  { label: "2. Approved? Set Password", value: "complete", icon: <KeyOutlined /> },
                ]}
                block
              />
            </div>

            {mode === "request" ? (
              /* Request Access Form */
              <Form
                form={requestForm}
                layout="vertical"
                onFinish={handleRequestSubmit}
                requiredMark="optional"
              >
                <Form.Item
                  label="Full Name"
                  name="fullName"
                  rules={[{ required: true, message: "Please enter your full name" }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="e.g. Ramesh Patil" size="large" />
                </Form.Item>

                <Form.Item
                  label="Email Address"
                  name="email"
                  rules={[
                    { required: true, message: "Please enter your email" },
                    { type: "email", message: "Please enter a valid email" },
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="e.g. ramesh.patil@jewellers.com" size="large" />
                </Form.Item>

                <Form.Item
                  label="Mobile / WhatsApp Number"
                  name="phone"
                  rules={[{ required: true, message: "Please enter contact phone" }]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="e.g. +91 98220 12345" size="large" />
                </Form.Item>

                <Form.Item
                  label="Jewelry Shop Name & City"
                  name="shopName"
                  rules={[{ required: true, message: "Please enter shop name and city" }]}
                >
                  <Input prefix={<ShopOutlined />} placeholder="e.g. Mahalaxmi Jewellers, Kolhapur" size="large" />
                </Form.Item>

                <Form.Item label="Reason / Notes (Optional)" name="notes">
                  <Input.TextArea
                    rows={2}
                    placeholder="Briefly describe your jewelry business requirements..."
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
                  >
                    Submit Access Request
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              /* Complete Registration Form for Approved Users */
              <Form
                form={completeForm}
                layout="vertical"
                onFinish={handleCompleteRegistration}
                requiredMark="optional"
              >
                {approvalStatus && !approvalStatus.approved && (
                  <Alert
                    type={approvalStatus.status === "pending" ? "info" : "error"}
                    showIcon
                    icon={approvalStatus.status === "pending" ? <ClockCircleOutlined /> : undefined}
                    style={{ marginBottom: 16 }}
                    message={
                      approvalStatus.status === "pending"
                        ? "Access Request Pending"
                        : "Access Restricted"
                    }
                    description={approvalStatus.message}
                  />
                )}

                <Form.Item
                  label="Approved Email Address"
                  name="email"
                  rules={[
                    { required: true, message: "Please enter your approved email" },
                    { type: "email", message: "Please enter a valid email" },
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="Enter your approved email" size="large" />
                </Form.Item>

                <Form.Item
                  label="Choose Password"
                  name="password"
                  rules={[
                    { required: true, message: "Please enter a password" },
                    { min: 6, message: "Password must be at least 6 characters" },
                  ]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="Min 6 characters" size="large" />
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
                  <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" size="large" />
                </Form.Item>

                <Form.Item style={{ marginBottom: 12 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    icon={<CheckCircleOutlined />}
                    loading={submitting}
                    block
                  >
                    Create Account & Login
                  </Button>
                </Form.Item>
              </Form>
            )}
          </>
        )}

        {/* Footer links */}
        <div style={{ textAlign: "center", marginTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 16 }}>
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
