import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  LinkOutlined,
  MailOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { supabaseClient } from "../../providers/supabase-client";

const { Title, Text } = Typography;

interface IAccessRequest {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  shop_name?: string;
  notes?: string;
  status: "pending" | "approved" | "rejected" | "registered";
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  approval_token: string;
}

export default function AccessRequestsSettings() {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<IAccessRequest[]>([]);
  const { token } = theme.useToken();
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
      title: "Applicant Email",
      key: "applicant",
      render: (_: any, record: IAccessRequest) => (
        <div>
          <Text strong copyable>{record.email}</Text>
          {record.full_name && (
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {record.full_name}
            </div>
          )}
          {record.shop_name && (
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {record.shop_name}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (st: string) => {
        switch (st) {
          case "approved":
            return <Tag color="success">Approved</Tag>;
          case "pending":
            return <Tag color="warning">Pending Review</Tag>;
          case "rejected":
            return <Tag color="error">Rejected</Tag>;
          case "registered":
            return <Tag color="processing">Registered</Tag>;
          default:
            return <Tag>{st}</Tag>;
        }
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: IAccessRequest) => (
        <Space size="small">
          {record.status === "pending" && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleUpdateStatus(record.id, "approved")}
                style={{ backgroundColor: token.colorSuccess }}
              >
                Approve
              </Button>
              <Popconfirm
                title="Reject this request?"
                onConfirm={() => handleUpdateStatus(record.id, "rejected")}
                okText="Reject"
                cancelText="Cancel"
              >
                <Button danger size="small" icon={<CloseCircleOutlined />}>
                  Reject
                </Button>
              </Popconfirm>
            </>
          )}

          {record.status === "approved" && (
            <>
              <Tooltip title="Copy Account Creation Link">
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => copyCreationLink(record.approval_token)}
                >
                  Invite Link
                </Button>
              </Tooltip>
              <Button
                size="small"
                icon={<MailOutlined />}
                href={`mailto:${record.email}?subject=${encodeURIComponent(
                  "Your Shringar POS Account Creation Link"
                )}&body=${encodeURIComponent(
                  `Hello,\n\nYour access request for Shringar POS has been approved!\n\nClick the link below to set your password and access your account:\n${window.location.origin}/create-account?token=${record.approval_token}\n\n(No email verification needed - you will be logged in directly!)\n\nBest regards,\nSahil Khude\nShringar POS`
                )}`}
              >
                Email
              </Button>
            </>
          )}

          {record.status === "pending" && (
            <Tooltip title="Copy 1-Click Admin Approval Link">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyApprovalLink(record.approval_token)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={4} style={{ margin: 0 }}>
            Showroom Access Requests
          </Title>
          <Button icon={<ReloadOutlined />} onClick={fetchRequests} loading={loading}>
            Refresh
          </Button>
        </div>
      }
      style={{ borderRadius: 12 }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Review access requests. When you approve an applicant, an invitation link is generated allowing them to set their password and enter the app directly without email verification.
        </Text>
      </div>

      <Table
        dataSource={requests}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="middle"
      />
    </Card>
  );
}
