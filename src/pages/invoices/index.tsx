import {
  ExportButton,
  List as RefineList,
  getDefaultSortOrder,
  useTable,
} from "@refinedev/antd";
import { useExport, useGetIdentity } from "@refinedev/core";
import type { HttpError } from "@refinedev/core";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { DownloadInvoiceButton } from "../../components/invoices/download-invoice-button";
import { MobileInvoiceList } from "../../components/invoices/mobile-invoice-list";
import type { FilterDropdownProps } from "antd/es/table/interface";
import {
  App,
  Button,
  Card,
  Col,
  Grid,
  Input,
  Radio,
  Row,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { CancelInvoiceModal } from "../../components/invoices/cancel-invoice-modal";
import type { ICustomer, IInvoice } from "../../../src/libs/interfaces";
import { useShopCheck } from "../../../src/hooks/use-shop-check";
import { supabaseClient } from "../../../src/providers/supabase-client";

dayjs.extend(relativeTime);

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface IInvoiceRow extends IInvoice {
  customer?: Pick<ICustomer, "id" | "name" | "customer_code" | "phone"> | null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const p2Rs = (p: number) => (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

export default function Invoices() {
  const screens = useBreakpoint();

  if (!screens.md) {
    return <MobileInvoiceList />;
  }

  return <InvoiceList />;
}

// ─── main component ─────────────────────────────────────────────────────────

function InvoiceList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [cancellingInvoice, setCancellingInvoice] = useState<IInvoiceRow | null>(null);
  const [cancellingRole, setCancellingRole] = useState<string>("staff");
  const { data: identity } = useGetIdentity<{ email?: string; id?: string }>();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;

  const {
    tableProps,
    sorters,
    setSorters,
    filters,
    setFilters,
    searchFormProps,
  } = useTable<IInvoiceRow, HttpError>({
    resource: "invoices",
    meta: {
      select: "*, customer:customers(id,name,customer_code,phone)",
    },
    syncWithLocation: true,
    pagination: {
      pageSize: 20,
    },
    initialSorter: [
      {
        field: "invoice_date",
        order: "desc",
      },
      {
        field: "created_at",
        order: "desc",
      },
    ],
    initialFilter: [
      ...(shopId ? [{ field: "shop_id", operator: "eq" as const, value: shopId }] : []),
    ],
  });

  const { triggerExport, isLoading: exportLoading } = useExport<IInvoiceRow>({
    resource: "invoices",
    meta: {
      select: "*, customer:customers(name,customer_code)",
    },
    mapData: (record) => ({
      "Invoice #": record.invoice_number,
      Date: record.invoice_date,
      Customer: record.customer?.name ?? "Walk-in",
      "Customer Code": record.customer?.customer_code ?? "",
      "Subtotal (Rs)": (record.subtotal_paise / 100).toFixed(2),
      "Tax (Rs)": (record.tax_amount_paise / 100).toFixed(2),
      "Discount (Rs)": (record.discount_paise / 100).toFixed(2),
      "Total (Rs)": (record.total_amount_paise / 100).toFixed(2),
      "Paid (Rs)": (record.paid_amount_paise / 100).toFixed(2),
      "Balance (Rs)": (record.balance_amount_paise / 100).toFixed(2),
      Status: record.payment_status,
      "Payment Method": record.payment_method ?? "",
    }),
  });

  const handleCancelClick = async (record: IInvoiceRow) => {
    if (!identity?.email) {
      setCancellingRole("staff");
      setCancellingInvoice(record);
      return;
    }
    try {
      const { data } = await supabaseClient
        .from("app_settings")
        .select("admin_emails")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      const adminList: string[] = (data as any)?.admin_emails ?? [];
      const isAdmin = adminList.some(
        (e) => e.toLowerCase() === identity.email!.toLowerCase()
      );
      setCancellingRole(isAdmin ? "admin" : "staff");
    } catch {
      setCancellingRole("staff");
    }
    setCancellingInvoice(record);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    if (val === "all") {
      setFilters(
        filters.filter((f) => !("field" in f && f.field === "payment_status"))
      );
    } else {
      setFilters([
        ...filters.filter((f) => !("field" in f && f.field === "payment_status")),
        {
          field: "payment_status",
          operator: "eq",
          value: val,
        },
      ]);
    }
  };

  const columns = [
    {
      title: "Invoice #",
      dataIndex: "invoice_number",
      key: "invoice_number",
      sorter: true,
      defaultSortOrder: getDefaultSortOrder("invoice_number", sorters),
      render: (val: string, record: IInvoiceRow) => (
        <Space orientation="vertical" size={0}>
          <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>
            {val}
          </Text>
          <Text orientation="horizontal" type="secondary" style={{ fontSize: 11 }}>
            {dayjs(record.created_at).fromNow()}
          </Text>
        </Space>
      ),
    },
    {
      title: "Date",
      dataIndex: "invoice_date",
      key: "invoice_date",
      sorter: true,
      defaultSortOrder: getDefaultSortOrder("invoice_date", sorters),
      render: (val: string) => dayjs(val).format("DD MMM YYYY"),
    },
    {
      title: "Customer",
      dataIndex: ["customer", "name"],
      key: "customer_name",
      render: (_: any, record: IInvoiceRow) => {
        if (!record.customer) {
          return <Text type="secondary">Walk-in Customer</Text>;
        }
        return (
          <Space orientation="vertical" size={0}>
            <Text orientation="horizontal" strong style={{ fontSize: 13 }}>
              {record.customer.name}
            </Text>
            {record.customer.phone && (
              <Text orientation="horizontal" type="secondary" style={{ fontSize: 11 }}>
                {record.customer.phone}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: "Total Amount",
      dataIndex: "total_amount_paise",
      key: "total_amount_paise",
      sorter: true,
      defaultSortOrder: getDefaultSortOrder("total_amount_paise", sorters),
      align: "right" as const,
      render: (val: number) => (
        <Text strong style={{ fontSize: 13 }}>
          ₹{p2Rs(val)}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "payment_status",
      key: "payment_status",
      render: (val: string) => {
        const colors: Record<string, string> = {
          PAID: "success",
          PARTIAL: "warning",
          UNPAID: "error",
          CANCELLED: "default",
        };
        return <Tag color={colors[val] || "default"}>{val}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      render: (_: any, record: IInvoiceRow) => (
        <Space size={8}>
          <Tooltip title="View Invoice">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/invoices/show/${record.id}`)}
            />
          </Tooltip>
          <DownloadInvoiceButton invoiceId={record.id} size="small" />
          {record.payment_status !== "CANCELLED" && (
            <Tooltip title="Cancel Invoice">
              <Button
                type="text"
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleCancelClick(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <RefineList
      title="Invoices & Bills"
      headerButtons={[
        <ExportButton
          key="export"
          onClick={() => triggerExport()}
          loading={exportLoading}
        />,
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/sales/new")}
        >
          New Sale
        </Button>,
      ]}
    >
      <Card bodyStyle={{ padding: "16px 20px" }} style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} sm={16}>
            <Radio.Group
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="all">All</Radio.Button>
              <Radio.Button value="PAID">Paid</Radio.Button>
              <Radio.Button value="PARTIAL">Partial</Radio.Button>
              <Radio.Button value="UNPAID">Unpaid</Radio.Button>
              <Radio.Button value="CANCELLED">Cancelled</Radio.Button>
            </Radio.Group>
          </Col>
        </Row>
      </Card>

      <Table
        {...tableProps}
        rowKey="id"
        columns={columns}
        pagination={{
          ...tableProps.pagination,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} invoices`,
        }}
      />

      {cancellingInvoice && (
        <CancelInvoiceModal
          open={!!cancellingInvoice}
          invoiceId={cancellingInvoice.id}
          invoiceNumber={cancellingInvoice.invoice_number}
          userRole={cancellingRole as any}
          onClose={() => setCancellingInvoice(null)}
          onSuccess={() => {
            setCancellingInvoice(null);
            tableProps.onChange?.(
              tableProps.pagination || {},
              {},
              {},
              { currentDataSource: [], action: "filter" }
            );
          }}
        />
      )}
    </RefineList>
  );
}
