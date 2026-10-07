import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  message,
  Popconfirm,
  Badge,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  ReloadOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { supabaseClient } from "../../providers/supabase-client";

const { Text } = Typography;

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
  const ADMIN_EMAIL = "sahilkhude11@gmail.com";

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

  const copyApprovalLink = (approvalToken: string) => {
    const link = `${window.location.origin}/approve-access?token=${approvalToken}`;
    navigator.clipboard.writeText(link);
    message.success("1-Click approval link copied to clipboard!");
  };

  const copyCreationLink = (approvalToken: string) => {
    const link = `${window.location.origin}/create-account?token=${approvalToken}`;
    navigator.clipboard.writeText(link);
    message.success("Account creation link copied to clipboard!");
  };

  const columns = [
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
      render: (status: string) => {
        switch (status) {
          case "approved":
            return <Tag color="success">Approved</Tag>;
          case "pending":
            return <Tag color="warning">Pending Review</Tag>;
          case "rejected":
            return <Tag color="error">Rejected</Tag>;
          case "registered":
            return <Tag color="processing">Account Registered</Tag>;
          default:
            return <Tag>{status}</Tag>;
        }
      },
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
                style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                onClick={() => handleUpdateStatus(record.id, "approved")}
              >
                Approve
              </Button>
              <Popconfirm
                title="Decline this request?"
                onConfirm={() => handleUpdateStatus(record.id, "rejected")}
                okText="Yes"
                cancelText="No"
              >
                <Button size="small" danger icon={<CloseOutlined />}>
                  Decline
                </Button>
              </Popconfirm>
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
  ];

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <Card
      title={
        <Space>
          <span>Access Requests & Gatekeeper</span>
          {pendingCount > 0 && <Badge count={pendingCount} />}
        </Space>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetchRequests} loading={loading}>
          Refresh
        </Button>
      }
    >
      <Table
        dataSource={requests}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 500 }}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
};

export default AccessRequestsSettings;
