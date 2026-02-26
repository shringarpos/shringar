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

// ─── helpers ─────────────────────────────────────────────────────────────────

const p2Rs = (p: number) => (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

interface InvoiceDetail extends IInvoice {
  customer?: Pick<ICustomer, "id" | "name" | "customer_code" | "phone" | "address" | "email"> | null;
  invoice_items?: IInvoiceItem[];
}

// ─── component ────────────────────────────────────────────────────────────────

export default function InvoiceShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notification } = App.useApp();

  const { data: identity } = useGetIdentity<{ id: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (identity as any)?.id as string | undefined;

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const { query } = useShow<InvoiceDetail>({
    resource: "invoices",
    id,
    meta: {
      select: "*, customer:customers(id,name,customer_code,phone,address), invoice_items(*)",
    },
  });

  const { data, isLoading: loading } = query;
  const invoice = data?.data ?? null;

  // ── Cancel ────────────────────────────────────────────────────────────────

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
      title: "Weight",
      dataIndex: "weight_mg",
      key: "weight",
      align: "right",
      render: (mg: number) => <Text>{(mg / 1000).toFixed(3)} g</Text>,
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

  // ── Render ────────────────────────────────────────────────────────────────

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
    <>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Space>
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
        </Space>

        <Space>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print
          </Button>
          <DownloadInvoiceButton invoice={invoice} label="Download PDF" />
          <Button
            icon={<CopyOutlined />}
            onClick={() => navigate(`/create-sale?clone=${invoice.id}`)}
          >
            Clone
          </Button>
          {!invoice.is_cancelled && (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
              >
                Edit Notes
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

      <Row gutter={24}>
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

          {/* Items table */}
          <Card title={`Items (${invoice.invoice_items?.length ?? 0})`}>
            <Table<IInvoiceItem>
              dataSource={invoice.invoice_items ?? []}
              columns={itemColumns}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 700 }}
            />
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
              }}
            >
              <Text strong style={{ fontSize: 16 }}>
                Total
              </Text>
              <Text
                strong
                style={{
                  fontSize: 22,
                  color: invoice.is_cancelled ? "#ff4d4f" : "#389e0d",
                  textDecoration: invoice.is_cancelled ? "line-through" : undefined,
                }}
              >
                ₹{p2Rs(invoice.total_amount_paise)}
              </Text>
            </div>

            {invoice.is_cancelled && (
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                Invoice cancelled — amount voided
              </Text>
            )}

            <Divider style={{ margin: "16px 0 8px" }} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Created {dayjs(invoice.created_at).format("D MMM YYYY HH:mm")}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Updated {dayjs(invoice.updated_at).format("D MMM YYYY HH:mm")}
            </Text>
          </Card>
        </Col>
      </Row>

      <CancelInvoiceModal
        open={cancelModalOpen}
        invoiceNumber={invoice.invoice_number}
        loading={cancelling}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelModalOpen(false)}
      />
    </>
  );
}
