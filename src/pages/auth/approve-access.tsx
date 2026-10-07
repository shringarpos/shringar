import React, { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Descriptions,
  Button,
  Space,
  Tag,
  Result,
  Spin,
  message,
  theme,
  Divider,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useSearchParams, Link, useLocation } from "react-router";
import { supabaseClient } from "../../providers/supabase-client";

const { Title, Text, Paragraph } = Typography;

interface AccessRequest {
  id: string;
  email: string;
  status: "pending" | "approved" | "rejected" | "registered";
  approval_token: string;
  created_at: string;
}

export const ApproveAccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Robust token & email extraction (supports searchParams, hash params, window.location.search)
  const getParam = (key: string): string | null => {
    // 1. From react-router useSearchParams
    const fromSearch = searchParams.get(key);
    if (fromSearch) return fromSearch.trim();

    // 2. From window.location.search directly
    const nativeSearch = new URLSearchParams(window.location.search).get(key);
    if (nativeSearch) return nativeSearch.trim();

    // 3. From window.location.hash query string if hash-based routing is used
    if (window.location.hash.includes("?")) {
      const hashQuery = window.location.hash.split("?")[1];
      const fromHash = new URLSearchParams(hashQuery).get(key);
      if (fromHash) return fromHash.trim();
    }

    return null;
  };

  const tokenParam = getParam("token");
  const emailParam = getParam("email");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [actionDone, setActionDone] = useState<"approved" | "rejected" | null>(null);
  const [emailSentStatus, setEmailSentStatus] = useState<string | null>(null);

  const { token } = theme.useToken();
  const ADMIN_EMAIL = "sahilkhude11@gmail.com";

  useEffect(() => {
    async function fetchRequest() {
      setLoading(true);
      try {
        let query = supabaseClient.from("access_requests").select("*");

        if (tokenParam) {
          query = query.eq("approval_token", tokenParam.trim());
        } else if (emailParam) {
          query = query
            .ilike("email", emailParam.toLowerCase().trim())
            .order("created_at", { ascending: false });
        } else {
          setLoading(false);
          return;
        }

        const { data, error } = await query.limit(1).maybeSingle();
        if (error) throw error;
        setRequest(data);
      } catch (err: any) {
        console.error("Error fetching access request:", err);
        message.error("Failed to load access request details.");
      } finally {
        setLoading(false);
      }
    }

    fetchRequest();
  }, [tokenParam, emailParam, location.key]);

  const handleUpdateStatus = async (newStatus: "approved" | "rejected") => {
    if (!request) return;
    setActionLoading(true);
    try {
      const { error } = await supabaseClient
        .from("access_requests")
        .update({
          status: newStatus,
          approved_at: newStatus === "approved" ? new Date().toISOString() : null,
          approved_by: ADMIN_EMAIL,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      setRequest((prev) => (prev ? { ...prev, status: newStatus } : null));
      setActionDone(newStatus);
      message.success(`Access request has been ${newStatus}!`);

      if (newStatus === "approved") {
        try {
          const { error: fnErr } = await supabaseClient.functions.invoke("send-access-email", {
            body: {
              type: "invite_approved_user",
              recipientEmail: request.email,
              approvalToken: request.approval_token,
              origin: window.location.origin,
            },
          });
          if (fnErr) throw fnErr;
          setEmailSentStatus("Invitation email sent directly to user's inbox!");
          message.success("Invitation email delivered to user!");
        } catch (mailErr: any) {
          console.warn("Error sending automatic invite email:", mailErr);
          setEmailSentStatus("Could not auto-deliver email; use copy link or button below.");
        }
      }
    } catch (err: any) {
      console.error("Error updating status:", err);
      message.error(err.message || "Failed to update access status.");
    } finally {
      setActionLoading(false);
    }
  };

  const copyCreationLink = () => {
    if (!request) return;
    const link = `${window.location.origin}/create-account?token=${request.approval_token}`;
    navigator.clipboard.writeText(link);
    message.success("Account creation link copied to clipboard!");
  };

  const statusTag = (st: string) => {
    switch (st) {
      case "approved":
        return <Tag color="success">Approved</Tag>;
      case "pending":
        return <Tag color="warning">Pending Review</Tag>;
      case "rejected":
        return <Tag color="error">Rejected</Tag>;
      case "registered":
        return <Tag color="processing">Account Registered</Tag>;
      default:
        return <Tag>{st}</Tag>;
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
          maxWidth: 580,
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          borderRadius: 16,
          borderColor: token.colorBorderSecondary,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <SafetyCertificateOutlined style={{ fontSize: 36, color: token.colorPrimary }} />
          <Title level={3} style={{ margin: "10px 0 4px" }}>
            Access Request Approval
          </Title>
          <Text type="secondary">
            Sahil Khude Admin Gatekeeper
          </Text>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
          </div>
        ) : !request ? (
          <Result
            status="warning"
            title="No Access Request Found"
            subTitle="The approval token or email is invalid or has expired."
            extra={
              <Link to="/login">
                <Button type="primary" icon={<HomeOutlined />}>
                  Go to Login
                </Button>
              </Link>
            }
          />
        ) : (
          <div>
            {actionDone === "approved" || request.status === "approved" ? (
              <Result
                status="success"
                title="Access Approved!"
                subTitle={
                  <div>
                    <Paragraph>
                      User <Text strong>{request.email}</Text> is now authorized to create their account.
                    </Paragraph>
                    {emailSentStatus && (
                      <Tag color="cyan" style={{ padding: "4px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                        {emailSentStatus}
                      </Tag>
                    )}
                    <div
                      style={{
                        background: token.colorFillAlter,
                        padding: "12px 16px",
                        borderRadius: 8,
                        marginTop: 12,
                        textAlign: "left",
                        border: `1px solid ${token.colorBorderSecondary}`,
                      }}
                    >
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                        Direct Account Creation Link:
                      </Text>
                      <Text code copyable style={{ fontSize: 13, wordBreak: "break-all" }}>
                        {`${window.location.origin}/create-account?token=${request.approval_token}`}
                      </Text>
                    </div>
                  </div>
                }
                extra={[
                  <Button
                    key="copy"
                    type="primary"
                    size="large"
                    icon={<CopyOutlined />}
                    onClick={copyCreationLink}
                  >
                    Copy Link
                  </Button>,
                  <Button
                    key="email"
                    size="large"
                    icon={<MailOutlined />}
                    href={`mailto:${request.email}?subject=${encodeURIComponent(
                      "Your Shringar POS Account Creation Link"
                    )}&body=${encodeURIComponent(
                      `Hello,\n\nYour access request for Shringar POS has been approved!\n\nClick the link below to set your password and access your account immediately:\n${window.location.origin}/create-account?token=${request.approval_token}\n\n(No email verification needed - you will be logged in directly!)\n\nWelcome aboard,\nSahil Khude\nShringar POS`
                    )}`}
                  >
                    Open Mail App
                  </Button>,
                  <Link to="/login" key="login">
                    <Button size="large" icon={<HomeOutlined />}>
                      Go to POS
                    </Button>
                  </Link>,
                ]}
              />
            ) : actionDone === "rejected" || request.status === "rejected" ? (
              <Result
                status="error"
                title="Access Request Rejected"
                subTitle={`The access request for ${request.email} was declined.`}
                extra={
                  <Link to="/login">
                    <Button type="primary" icon={<HomeOutlined />}>
                      Return to Sign In
                    </Button>
                  </Link>
                }
              />
            ) : request.status === "registered" ? (
              <Result
                status="info"
                title="Account Already Registered"
                subTitle={`The user with email ${request.email} has already completed registration.`}
                extra={
                  <Link to="/login">
                    <Button type="primary" icon={<HomeOutlined />}>
                      Go to Sign In
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div>
                <Descriptions
                  bordered
                  column={1}
                  size="small"
                  style={{ marginBottom: 20 }}
                  styles={{ label: { width: 140, fontWeight: 500 } }}
                >
                  <Descriptions.Item label="Email">
                    <Text strong copyable>{request.email}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    {statusTag(request.status)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Requested At">
                    {new Date(request.created_at).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: "16px 0" }} />

                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <Button
                    type="primary"
                    size="large"
                    icon={<CheckCircleOutlined />}
                    loading={actionLoading}
                    block
                    style={{
                      height: 48,
                      borderRadius: 8,
                      fontWeight: 600,
                      backgroundColor: "#16a34a",
                      borderColor: "#16a34a",
                    }}
                    onClick={() => handleUpdateStatus("approved")}
                  >
                    Approve Request & Send Invite Link
                  </Button>

                  <Button
                    danger
                    size="large"
                    icon={<CloseCircleOutlined />}
                    loading={actionLoading}
                    block
                    style={{ height: 44, borderRadius: 8 }}
                    onClick={() => handleUpdateStatus("rejected")}
                  >
                    Decline Request
                  </Button>
                </Space>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ApproveAccessPage;
