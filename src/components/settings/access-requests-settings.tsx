import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  MailOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { supabaseClient } from "../../providers/supabase-client";

const { Title, Text } = Typography;

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
    message.success("Direct approval link copied to clipboard!");
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
      title: "Applicant",
      key: "applicant",
      render: (_: any, record: IAccessRequest) => (
        <div>
          <Text strong>{record.full_name}</Text>
          <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
            {record.email}
          </div>
          <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
            {record.phone}
          </div>
        </div>
      ),
    },
    {
      title: "Shop & City",
      dataIndex: "shop_name",
      key: "shop_name",
      render: (val: string, record: IAccessRequest) => (
        <div>
          <Text>{val}</Text>
          {record.notes && (
            <div style={{ fontSize: 12, color: token.colorTextSecondary, maxWidth: 200 }}>
              Notes: {record.notes}
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
            <Button
              size="small"
              icon={<MailOutlined />}
              href={`mailto:${record.email}?subject=${encodeURIComponent(
                "Your Shringar POS Access Request Has Been Approved!"
              )}&body=${encodeURIComponent(
                `Hello ${record.full_name},\n\nYour access request for ${record.shop_name} has been approved.\n\nYou can now set your password and complete your registration at:\n${window.location.origin}/register\n\nBest regards,\nSahil Khude\nShringar POS Administrator`
              )}`}
            >
              Email Invite
            </Button>
          )}

          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyApprovalLink(record.approval_token)}
            title="Copy 1-Click Approval Link"
          />
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Access Requests & User Approvals
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Control who can register and create accounts in Shringar POS. Administrator:{" "}
              <Text strong>{ADMIN_EMAIL}</Text>
            </Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchRequests} loading={loading}>
            Refresh
          </Button>
        </div>
      }
    >
      <Table
        dataSource={requests}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}
