import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  message,
  Modal,
  Badge,
  Grid,
  Empty,
  theme,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  ReloadOutlined,
  LinkOutlined,
  UserOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { supabaseClient } from "../../providers/supabase-client";

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface AccessRequest {
  id: string;
  email: string;
  status: "pending" | "approved" | "rejected" | "registered";
  approval_token: string;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export const AccessRequestsSettings: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const ADMIN_EMAIL = "sahilkhude11@gmail.com";
  const isMobile = !screens.md;

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("access_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error("Error fetching access requests:", err);
      message.error("Failed to load access requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    try {
      const { error } = await supabaseClient
        .from("access_requests")
        .update({
          status: newStatus,
          approved_at: newStatus === "approved" ? new Date().toISOString() : null,
          approved_by: ADMIN_EMAIL,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      message.success(`Access request marked as ${newStatus}!`);

      if (newStatus === "approved") {
        const req = requests.find((r) => r.id === id);
        if (req?.approval_token) {
          try {
            await supabaseClient.functions.invoke("send-access-email", {
              body: {
                type: "invite_approved_user",
                recipientEmail: req.email,
                approvalToken: req.approval_token,
                origin: window.location.origin,
              },
            });
            message.success("Invitation email delivered to applicant!");
          } catch (mErr) {
            console.warn("Could not dispatch invite email automatically:", mErr);
          }
        }
      }

      fetchRequests();
    } catch (err: any) {
      console.error("Error updating status:", err);
      message.error(err.message || "Failed to update status.");
    }
  };

  const confirmDecline = (id: string, email: string) => {
    Modal.confirm({
      title: "Decline Request",
      icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
      content: `Are you sure you want to decline access for ${email}?`,
      okText: "Decline",
      okType: "danger",
      cancelText: "Cancel",
      centered: true,
      onOk: () => handleUpdateStatus(id, "rejected"),
    });
  };

  const copyApprovalLink = async (approvalToken: string) => {
    const link = `${window.location.origin}/approve-access?token=${approvalToken}`;
    try {
      await navigator.clipboard.writeText(link);
      message.success("1-Click approval link copied!");
    } catch {
      message.error("Unable to copy to clipboard");
    }
  };

  const copyCreationLink = async (approvalToken: string) => {
    const link = `${window.location.origin}/create-account?token=${approvalToken}`;
    try {
      await navigator.clipboard.writeText(link);
      message.success("Account creation link copied!");
    } catch {
      message.error("Unable to copy to clipboard");
    }
  };

  const renderStatusTag = (status: AccessRequest["status"]) => {
    switch (status) {
      case "approved":
        return <Tag color="success" style={{ margin: 0 }}>Approved</Tag>;
      case "pending":
        return <Tag color="warning" style={{ margin: 0 }}>Pending Review</Tag>;
      case "rejected":
        return <Tag color="error" style={{ margin: 0 }}>Rejected</Tag>;
      case "registered":
        return <Tag color="processing" style={{ margin: 0 }}>Registered</Tag>;
      default:
        return <Tag style={{ margin: 0 }}>{status}</Tag>;
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <Card
      styles={{
        header: { padding: isMobile ? "12px 14px" : "16px 24px" },
        body: { padding: isMobile ? "12px 8px" : "24px" },
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text strong style={{ fontSize: isMobile ? 15 : 16 }}>
            Access Requests
          </Text>
          {pendingCount > 0 && (
            <Badge
              count={pendingCount}
              style={{ backgroundColor: token.colorWarning }}
            />
          )}
        </div>
      }
      extra={
        <Button
          size={isMobile ? "small" : "middle"}
          icon={<ReloadOutlined />}
          onClick={fetchRequests}
          loading={loading}
        >
          {isMobile ? "" : "Refresh"}
        </Button>
      }
    >
      {/* Mobile Card List View */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests.length === 0 && !loading && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No access requests yet"
              style={{ margin: "20px 0" }}
            />
          )}

          {requests.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 12,
                padding: "14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              {/* Header row: Email + Status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: token.colorPrimaryBg,
                      color: token.colorPrimary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <UserOutlined style={{ fontSize: 15 }} />
                  </div>
                  <Text
                    strong
                    ellipsis
                    style={{ fontSize: 14, flex: 1, minWidth: 0 }}
                  >
                    {item.email}
                  </Text>
                </div>
                {renderStatusTag(item.status)}
              </div>

              {/* Meta row: Date */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: token.colorTextSecondary,
                  paddingLeft: 40,
                }}
              >
                <CalendarOutlined style={{ fontSize: 12 }} />
                <span>
                  {new Date(item.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Action buttons on Mobile */}
              {item.status === "pending" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    style={{
                      height: 38,
                      borderRadius: 8,
                      backgroundColor: token.colorSuccess,
                      borderColor: token.colorSuccess,
                      fontWeight: 600,
                    }}
                    onClick={() => handleUpdateStatus(item.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    style={{ height: 38, borderRadius: 8, fontWeight: 600 }}
                    onClick={() => confirmDecline(item.id, item.email)}
                  >
                    Decline
                  </Button>
                </div>
              )}

              {item.status === "approved" && (
                <Button
                  type="dashed"
                  block
                  icon={<CopyOutlined />}
                  style={{ height: 36, borderRadius: 8, fontSize: 13 }}
                  onClick={() => copyCreationLink(item.approval_token)}
                >
                  Copy Creation Link
                </Button>
              )}

              {item.status === "pending" && (
                <Button
                  block
                  type="text"
                  icon={<LinkOutlined />}
                  style={{ height: 32, fontSize: 12, color: token.colorTextSecondary }}
                  onClick={() => copyApprovalLink(item.approval_token)}
                >
                  Copy Direct Approval Link
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <Table
          dataSource={requests}
          rowKey="id"
          loading={loading}
          scroll={{ x: 600 }}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: "Date",
              dataIndex: "created_at",
              key: "created_at",
              render: (val: string) => (
                <Text style={{ fontSize: 13 }}>
                  {new Date(val).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              ),
            },
            {
              title: "Email",
              dataIndex: "email",
              key: "email",
              render: (email: string) => <Text strong>{email}</Text>,
            },
            {
              title: "Status",
              dataIndex: "status",
              key: "status",
              render: (status: AccessRequest["status"]) => renderStatusTag(status),
            },
            {
              title: "Actions",
              key: "actions",
              render: (_: any, record: AccessRequest) => (
                <Space size="small">
                  {record.status === "pending" && (
                    <>
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        style={{
                          backgroundColor: token.colorSuccess,
                          borderColor: token.colorSuccess,
                        }}
                        onClick={() => handleUpdateStatus(record.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => confirmDecline(record.id, record.email)}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  {record.status === "approved" && (
                    <Button
                      size="small"
                      type="dashed"
                      icon={<CopyOutlined />}
                      onClick={() => copyCreationLink(record.approval_token)}
                    >
                      Copy Creation Link
                    </Button>
                  )}
                  {record.status === "pending" && (
                    <Button
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => copyApprovalLink(record.approval_token)}
                    >
                      Approval Link
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
};

export default AccessRequestsSettings;
