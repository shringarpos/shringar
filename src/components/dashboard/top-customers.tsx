import React, { useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import { Button, Card, Skeleton, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { ICustomer, IInvoice } from "../../libs/interfaces";

const { Text } = Typography;

const p2Rs = (p: number) =>
  (p / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });

interface TopCustomer {
  id: string;
  name: string;
  customer_code: string;
  totalPaise: number;
  invoiceCount: number;
}

interface TopCustomersProps {
  shopId: string;
}

const TROPHY_RANK = ["🥇", "🥈", "🥉"];

export const TopCustomers: React.FC<TopCustomersProps> = ({ shopId }) => {
  const navigate = useNavigate();

  const since = dayjs().subtract(90, "day").format("YYYY-MM-DD");

  const { query: invoicesQuery } = useList<IInvoice & { customer?: Pick<ICustomer, "id" | "name" | "customer_code"> | null }>({
    resource: "invoices",
    meta: { select: "customer_id, total_amount_paise, customer:customers(id,name,customer_code)" },
    filters: [
      { field: "shop_id", operator: "eq", value: shopId },
      { field: "invoice_date", operator: "gte", value: since },
      { field: "is_cancelled", operator: "eq", value: false },
    ],
    pagination: { mode: "off" },
    queryOptions: { staleTime: 2 * 60 * 1000 },
  });

  const invoices = invoicesQuery?.data?.data ?? [];

  const topCustomers: TopCustomer[] = useMemo(() => {
    const map: Record<string, TopCustomer> = {};
    for (const inv of invoices) {
      const id = inv.customer_id;
      if (!map[id]) {
        map[id] = {
          id,
          name: inv.customer?.name ?? "Unknown",
          customer_code: inv.customer?.customer_code ?? "—",
          totalPaise: 0,
          invoiceCount: 0,
        };
      }
      map[id].totalPaise += inv.total_amount_paise;
      map[id].invoiceCount += 1;
    }
    return Object.values(map)
      .sort((a, b) => b.totalPaise - a.totalPaise)
      .slice(0, 5);
  }, [invoices]);

  const isLoading = !!invoicesQuery?.isLoading;

  const columns: ColumnsType<TopCustomer> = [
    {
      title: "#",
      key: "rank",
      width: 36,
      render: (_: any, __: any, idx: number) => (
        <span style={{ fontSize: 16 }}>
          {idx < 3 ? TROPHY_RANK[idx] : <Text type="secondary">{idx + 1}</Text>}
        </span>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      render: (_: any, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: 12,
              border: "1px solid rgba(0,0,0,0.1)",
              flexShrink: 0,
            }}
          >
            {record.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <Text style={{ fontSize: 13, display: "block", lineHeight: 1.2 }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.customer_code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Invoices",
      dataIndex: "invoiceCount",
      key: "count",
      align: "center",
      render: (n: number) => <Text style={{ fontSize: 13 }}>{n}</Text>,
    },
    {
      title: "Total",
      dataIndex: "totalPaise",
      key: "total",
      align: "right",
      render: (p: number) => (
        <Text strong style={{ fontSize: 13 }}>
          ₹{p2Rs(p)}
        </Text>
      ),
    },
  ];

  return (
    <Card
      title="Top Customers (90 days)"
      extra={
        <Button
          size="small"
          type="link"
          onClick={() => navigate("/customers")}
          style={{ paddingRight: 0 }}
        >
          View all
        </Button>
      }
      style={{ height: "100%" }}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <Table
          dataSource={topCustomers}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: "No sales in past 90 days." }}
        />
      )}
    </Card>
  );
};
