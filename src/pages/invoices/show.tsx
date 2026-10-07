import { useGetIdentity, useShow, useUpdate } from "@refinedev/core";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  EditOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { DownloadInvoiceButton } from "../../components/invoices/download-invoice-button";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Grid,
  Row,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { ColumnsType } from "antd/es/table";
import { CancelInvoiceModal } from "../../components/invoices/cancel-invoice-modal";
import type { ICustomer, IInvoice, IInvoiceItem } from "../../../src/libs/interfaces";
import { supabaseClient } from "../../../src/providers/supabase-client";
import { formatRateDisplay } from "../../components/metal-rates/utils";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// ─── helpers ─────────────────────────────────────────────────────────────────

const p2Rs = (p: number) => (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

interface InvoiceDetail extends IInvoice {
  customer?: Pick<ICustomer, "id" | "name" | "customer_code" | "phone" | "address" | "email"> | null;
  invoice_items?: IInvoiceItem[];
}

// ─── component ───────────────────────────────────────────────────────────────

export default function InvoiceShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notification } = App.useApp();
  const screens = useBreakpoint();

  const { data: identity } = useGetIdentity<{ id: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (identity as any)?.id as string | undefined;

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const { query } = useShow<InvoiceDetail>({
    resource: "invoices",
    id,
    meta: {
      select: "*, customer:customers(id,name,customer_code,phone,address), invoice_items(*)",
    },
  });

  const { data, isLoading: loading } = query;
  const invoice = data?.data ?? null;

  // ── Cancel ─────────────────────────────────────────────────────────────────

  const { mutateAsync: updateInvoice } = useUpdate<IInvoice>();

  const handleCancelConfirm = async (reason: string) => {
    if (!invoice || !userId) return;
    setCancelling(true);
    try {
      await updateInvoice({
        resource: "invoices",
        id: invoice.id,
        values: {
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          cancelled_reason: reason,
          updated_by: userId,
        },
        successNotification: false,
        errorNotification: false,
      });

      // Restore stock — read-then-increment per ornament (requires current qty)
      for (const item of invoice.invoice_items ?? []) {
        const { data: ornData } = await supabaseClient
          .from("ornaments")
          .select("quantity")
          .eq("id", item.ornament_id)
          .single();
        if (ornData) {
          await supabaseClient
            .from("ornaments")
            .update({ quantity: ornData.quantity + item.quantity })
            .eq("id", item.ornament_id);
        }
      }

      notification.success({ message: "Invoice cancelled and stock restored" });
      setCancelModalOpen(false);
      query.refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      notification.error({ message: "Failed to cancel invoice", description: msg });
    } finally {
      setCancelling(false);
    }
  };

  // ── Item columns ──────────────────────────────────────────────────────────

  const itemColumns: ColumnsType<IInvoiceItem> = [
    {
      title: "Item",
      dataIndex: "item_name",
      key: "item_name",
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Space size={4}>
            <Tag color={record.metal_type_name.toUpperCase() === "GOLD" ? "gold" : "default"} style={{ margin: 0 }}>
              {record.metal_type_name}
            </Tag>
            {record.metal_type_name.toUpperCase() === "GOLD" && record.purity_display_name && (
              <Tag color="gold" bordered={false} style={{ margin: 0 }}>
                {record.purity_display_name}
              </Tag>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      render: (q: number) => <Text>{q}</Text>,
    },
    {
      title: "Rate",
      dataIndex: "rate_per_gram_paise",
      key: "rate",
      align: "right",
      render: (p: number, record) => <Text>{formatRateDisplay(p, record.metal_type_name)}</Text>,
    },
    {
      title: "Making (₹/g)",
      dataIndex: "making_charge_per_gram_paise",
      key: "making_rate",
      align: "right",
      render: (p: number) => <Text>₹{(p / 100).toFixed(2)}</Text>,
    },
    {
      title: "Metal Amt",
      dataIndex: "metal_amount_paise",
      key: "metal_amt",
      align: "right",
      render: (p: number) => <Text>₹{p2Rs(p)}</Text>,
    },
    {
      title: "Making Amt",
      dataIndex: "making_charge_amount_paise",
      key: "making_amt",
      align: "right",
      render: (p: number) => <Text>₹{p2Rs(p)}</Text>,
    },
    {
      title: "Line Total",
      dataIndex: "line_total_paise",
      key: "total",
      align: "right",
      render: (p: number) => (
        <Text strong style={{ color: "#1677ff" }}>
          ₹{p2Rs(p)}
        </Text>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <Text type="secondary">Invoice not found.</Text>
        <br />
        <Button type="link" onClick={() => navigate("/invoices")}>
          Back to Invoices
        </Button>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Space wrap>
          <Button
            icon={<ArrowLeftOutlined />}
            type="text"
            onClick={() => navigate("/invoices")}
          />
          <Title level={4} style={{ margin: 0 }}>
            Invoice {invoice.invoice_number}
          </Title>
          {invoice.is_cancelled ? (
            <Tag icon={<CloseCircleOutlined />} color="error">
              Cancelled
            </Tag>
          ) : (
            <Tag icon={<CheckCircleOutlined />} color="success">
              Active
            </Tag>
          )}
          <Tag color={invoice.payment_status === "PAID" ? "success" : invoice.payment_status === "PARTIAL" ? "warning" : "error"}>
            {invoice.payment_status}
          </Tag>
        </Space>

        <Space wrap>
          <DownloadInvoiceButton invoiceId={invoice.id} />
          {!invoice.is_cancelled && (
            <>
              <Button
                icon={<CopyOutlined />}
                onClick={() => navigate(`/sales/new?clone=${invoice.id}`)}
              >
                Clone / Re-order
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => setCancelModalOpen(true)}
              >
                Cancel Invoice
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* Cancelled banner */}
      {invoice.is_cancelled && (
        <Alert
          type="error"
          showIcon
          message={`Invoice cancelled on ${dayjs(invoice.cancelled_at).format("D MMM YYYY HH:mm")}`}
          description={
            invoice.cancelled_reason ? `Reason: ${invoice.cancelled_reason}` : undefined
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        {/* Left — Details */}
        <Col xs={24} lg={16}>
          {/* Invoice meta */}
          <Card style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Invoice Number">
                <Text strong>{invoice.invoice_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Date">
                {dayjs(invoice.invoice_date).format("D MMMM YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label="Customer">
                <Space>
                  <Text strong>{invoice.customer?.name}</Text>
                  <Tag
                      color="blue"
                      style={{
                          fontFamily: "monospace",
                          fontSize: 10,
                          padding: "0 5px",
                          lineHeight: "18px",
                      }}
                  >
                      {invoice.customer?.customer_code}
                  </Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {invoice.customer?.phone ?? "—"}
              </Descriptions.Item>
              {invoice.customer?.address && (
                <Descriptions.Item label="Address" span={2}>
                  {invoice.customer.address}
                </Descriptions.Item>
              )}
              {invoice.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {invoice.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Items card: on mobile, card list; on desktop, Table */}
          <Card title={`Items (${invoice.invoice_items?.length ?? 0})`}>
            {!screens.md ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {invoice.invoice_items?.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      backgroundColor: "#f9fafb",
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text strong>{item.item_name}</Text>
                      <Text strong style={{ color: "#1677ff" }}>
                        ₹{p2Rs(item.line_total_paise)}
                      </Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}>
                      <span>
                        {item.net_weight_grams}g ({item.purity_display_name || item.metal_type_name})
                      </span>
                      <span>Qty: {item.quantity}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginTop: 4 }}>
                      <span>Rate: {formatRateDisplay(item.rate_per_gram_paise, item.metal_type_name)}</span>
                      <span>Making: ₹{(item.making_charge_per_gram_paise / 100).toFixed(2)}/g</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table<IInvoiceItem>
                dataSource={invoice.invoice_items ?? []}
                columns={itemColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 700 }}
              />
            )}
          </Card>
        </Col>

        {/* Right — Summary */}
        <Col xs={24} lg={8}>
          <Card title="Invoice Summary" style={{ position: "sticky", top: 80 }}>
            {invoice.invoice_items?.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  alignItems: "center",
                }}
              >
                <Space size={4}>
                  <Text ellipsis style={{ maxWidth: 140, display: "inline-block" }}>
                    {item.item_name}
                  </Text>
                  {item.metal_type_name.toUpperCase() === "GOLD" && item.purity_display_name && (
                    <Tag
                      color="gold"
                      style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}
                    >
                      {item.purity_display_name}
                    </Tag>
                  )}
                </Space>
                <Text>₹{p2Rs(item.line_total_paise)}</Text>
              </div>
            ))}

            <Divider style={{ margin: "10px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <Text type="secondary">Metal Subtotal</Text>
              <Text>₹{p2Rs(invoice.subtotal_amount_paise)}</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <Text type="secondary">Making Charges</Text>
              <Text>₹{p2Rs(invoice.total_making_charges_paise)}</Text>
            </div>
            {invoice.discount_amount_paise > 0 && (
              <div
                style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}
              >
                <Text type="secondary">Discount</Text>
                <Text type="danger">−₹{p2Rs(invoice.discount_amount_paise)}</Text>
              </div>
            )}

            <Divider style={{ margin: "8px 0" }} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text strong style={{ fontSize: 15 }}>
                Total (incl. GST)
              </Text>
              <Text strong style={{ fontSize: 17, color: "#1677ff" }}>
                ₹{p2Rs(invoice.total_amount_paise)}
              </Text>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <Text type="secondary">Paid Amount</Text>
              <Text strong style={{ color: "#52c41a" }}>
                ₹{p2Rs(invoice.paid_amount_paise)}
              </Text>
            </div>

            {invoice.balance_amount_paise > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Text type="secondary">Balance Due</Text>
                <Text strong style={{ color: "#ff4d4f" }}>
                  ₹{p2Rs(invoice.balance_amount_paise)}
                </Text>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Text type="secondary">Payment Mode</Text>
              <Tag>{invoice.payment_method}</Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Cancel Modal */}
      <CancelInvoiceModal
        open={cancelModalOpen}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        userRole="admin"
        onClose={() => setCancelModalOpen(false)}
        onSuccess={() => {
          setCancelModalOpen(false);
          query.refetch();
        }}
      />
    </div>
  );
}
