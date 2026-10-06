import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
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
  CloseCircleOutlined,
  CopyOutlined,
  HomeOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Link, useSearchParams } from "react-router";
import { supabaseClient } from "../../providers/supabase-client";

const { Title, Text, Paragraph } = Typography;

interface IAccessRequest {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  shop_name: string;
  notes?: string;
  status: "pending" | "approved" | "rejected" | "registered";
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  approval_token: string;
}

export default function ApproveAccessPage() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<IAccessRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState<"approved" | "rejected" | null>(null);

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
  }, [tokenParam, emailParam]);

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
    } catch (err: any) {
      console.error("Error updating status:", err);
      message.error(err.message || "Failed to update access status.");
    } finally {
      setActionLoading(false);
    }
  };

  const copyActivationLink = () => {
    if (!request) return;
    const link = `${window.location.origin}/activate?token=${request.approval_token}`;
    navigator.clipboard.writeText(link);
    message.success("Showroom activation link copied to clipboard!");
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
          maxWidth: 600,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
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
            Shringar POS Showroom Access Control
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
                title="Showroom Access Approved!"
                subTitle={
                  <div>
                    <Paragraph>
                      <Text strong>{request.email}</Text> ({request.shop_name}) is now authorized to activate their showroom account.
                    </Paragraph>
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
                      <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                        Unique Activation URL:
                      </Text>
                      <Text code copyable style={{ fontSize: 13, wordBreak: "break-all" }}>
                        {`${window.location.origin}/activate?token=${request.approval_token}`}
                      </Text>
                    </div>
                  </div>
                }
                extra={[
                  <Button
                    key="copy"
                    type="primary"
                    icon={<CopyOutlined />}
                    onClick={copyActivationLink}
                  >
                    Copy Activation Link
                  </Button>,
                  <Button
                    key="notify"
                    icon={<MailOutlined />}
                    href={`mailto:${request.email}?subject=${encodeURIComponent(
                      `Your Shringar POS Access Request Has Been Approved!`
                    )}&body=${encodeURIComponent(
                      `Hello ${request.full_name},\n\nGreat news! Your access request for ${request.shop_name} has been approved.\n\nYou can set your password and activate your showroom workspace using this link:\n${window.location.origin}/activate?token=${request.approval_token}\n\nWelcome aboard!\n\nBest regards,\nShringar POS Team`
                    )}`}
                  >
                    Send Email to Applicant
                  </Button>,
                  <Link key="login" to="/login">
                    <Button>Back to Sign In</Button>
                  </Link>,
                ]}
              />
            ) : actionDone === "rejected" || request.status === "rejected" ? (
              <Result
                status="info"
                title="Access Request Rejected"
                subTitle={`The request for ${request.email} has been marked as rejected.`}
                extra={
                  <Link to="/login">
                    <Button type="primary">Back to App</Button>
                  </Link>
                }
              />
            ) : (
              <div>
                <Descriptions
                  bordered
                  size="small"
                  column={1}
                  style={{ marginBottom: 20 }}
                  labelStyle={{ width: 140, fontWeight: 600 }}
                >
                  <Descriptions.Item label="Showroom Name">
                    <Text strong>{request.shop_name}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Owner / Manager">
                    {request.full_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    <Text copyable>{request.email}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    <Text copyable>{request.phone}</Text>
                  </Descriptions.Item>
                  {request.notes && (
                    <Descriptions.Item label="Details / Notes">
                      {request.notes}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Submitted On">
                    {new Date(request.created_at).toLocaleString()}
                  </Descriptions.Item>
                  <Descriptions.Item label="Current Status">
                    {statusTag(request.status)}
                  </Descriptions.Item>
                </Descriptions>

                <Space style={{ width: "100%", justifyContent: "center" }} size="middle">
                  <Button
                    type="primary"
                    size="large"
                    icon={<CheckCircleOutlined />}
                    loading={actionLoading}
                    onClick={() => handleUpdateStatus("approved")}
                    style={{ background: token.colorSuccess, borderColor: token.colorSuccess }}
                  >
                    Approve Showroom Access
                  </Button>

                  <Button
                    danger
                    size="large"
                    icon={<CloseCircleOutlined />}
                    loading={actionLoading}
                    onClick={() => handleUpdateStatus("rejected")}
                  >
                    Reject Request
                  </Button>
                </Space>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
