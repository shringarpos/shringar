import React from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Skeleton,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { ICustomer, IInvoice } from "../../libs/interfaces";

dayjs.extend(relativeTime);

const { Text, Link } = Typography;

const p2Rs = (p: number) =>
  (p / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });

interface InvoiceRow extends IInvoice {
  customer?: Pick<ICustomer, "id" | "name" | "customer_code"> | null;
}

interface RecentInvoicesProps {
  shopId: string;
  limit?: number;
}

export const RecentInvoices: React.FC<RecentInvoicesProps> = ({
  shopId,
  limit = 8,
}) => {
  const navigate = useNavigate();

  const { query } = useList<InvoiceRow>({
    resource: "invoices",
    meta: {
      select: "*, customer:customers(id,name,customer_code)",
    },
    filters: [{ field: "shop_id", operator: "eq", value: shopId }],
    sorters: [{ field: "invoice_date", order: "desc" }, { field: "created_at", order: "desc" }],
    pagination: { mode: "server", pageSize: limit },
    queryOptions: { staleTime: 30 * 1000 },
  });

  const invoices = (query?.data?.data ?? []) as InvoiceRow[];
  const isLoading = !!query?.isLoading;

  const columns: ColumnsType<InvoiceRow> = [
    {
      title: "Invoice #",
      dataIndex: "invoice_number",
      key: "invoice_number",
      render: (num: string, record) => (
        <Link
          onClick={() => navigate(`/invoices/${record.id}`)}
          style={{ fontWeight: 600, fontSize: 13 }}
        >
          {num}
        </Link>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      render: (_: any, record) => {
        const name = record.customer?.name ?? "—";
        const code = record.customer?.customer_code;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar size={28}>
              {name.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text style={{ fontSize: 13, display: "block", lineHeight: 1.2 }}>{name}</Text>
              {code && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {code}
                </Text>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "invoice_date",
      key: "date",
      render: (d: string) => (
        <div>
          <Text style={{ fontSize: 12 }}>{dayjs(d).format("DD MMM YYYY")}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {dayjs(d).fromNow()}
          </Text>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "total_amount_paise",
      key: "amount",
      align: "right",
      render: (p: number) => (
        <Text strong style={{ fontSize: 13 }}>
          ₹{p2Rs(p)}
        </Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      render: (_: any, record) =>
        record.is_cancelled ? (
          <Tag color="red" style={{ fontSize: 11 }}>
            Cancelled
          </Tag>
        ) : (
          <Badge status="success" text={<Text style={{ fontSize: 11, color: "#52c41a" }}>Active</Text>} />
        ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 40,
      render: (_: any, record) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          type="text"
          onClick={() => navigate(`/invoices/${record.id}`)}
        />
      ),
    },
  ];

  return (
    <Card
      title="Recent Invoices"
      extra={
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            size="small"
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => navigate("/create-sale")}
          >
            New Sale
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => navigate("/invoices")}
            style={{ paddingRight: 0 }}
          >
            View all
          </Button>
        </div>
      }
      style={{ borderRadius: 12 }}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : (
        <Table
          dataSource={invoices}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          style={{ fontSize: 13 }}
          onRow={(record) => ({
            style: record.is_cancelled
              ? { opacity: 0.6 }
              : {},
          })}
          locale={{ emptyText: "No invoices yet. Create your first sale!" }}
        />
      )}
    </Card>
  );
};
