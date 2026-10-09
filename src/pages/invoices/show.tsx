import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DollarOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { DownloadInvoiceButton } from "../../components/invoices/download-invoice-button";
import {
  useGetIdentity,
  useShow,
  useUpdate,
} from "@refinedev/core";
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Grid,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import dayjs from "dayjs";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnsType } from "antd/es/table";
import { useNavigate, useParams } from "react-router";
import { CancelInvoiceModal } from "../../components/invoices/cancel-invoice-modal";
import { RecordPaymentModal } from "../../components/invoices/record-payment-modal";
import { PaymentLedgerTimeline } from "../../components/invoices/payment-ledger-timeline";
import { getInvoiceLedger, calculatePaymentStatus } from "../../services/payment-ledger";
import type { IInvoicePayment } from "../../libs/interfaces";
import type { ICustomer, IInvoice, IInvoiceItem } from "../../libs/interfaces";
import { supabaseClient } from "../../providers/supabase-client";
import { formatRateDisplay } from "../../components/metal-rates/utils";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const p2Rs = (p: number) => (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

interface InvoiceDetailItem extends IInvoiceItem {
  total_price_paise?: number;
  net_weight_grams?: number;
  making_charge_paise?: number;
}

interface InvoiceDetail extends IInvoice {
  customer?: Pick<ICustomer, "id" | "name" | "customer_code" | "phone" | "address" | "email"> | null;
  invoice_items?: InvoiceDetailItem[];
  subtotal_paise?: number;
  tax_amount_paise?: number;
  discount_paise?: number;
  paid_amount_paise?: number;
  balance_amount_paise?: number;
  payment_status?: string;
  payment_method?: string;
}

export default function InvoiceShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notification } = App.useApp();
  const screens = useBreakpoint();
  const { token } = theme.useToken();

  const { data: identity } = useGetIdentity<{ id: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (identity as any)?.id as string | undefined;

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [payments, setPayments] = useState<IInvoicePayment[]>([]);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

  const { query } = useShow<InvoiceDetail>({
    resource: "invoices",
    id,
    meta: {
      select: "*, customer:customers(id,name,customer_code,phone,address), invoice_items(*)",
    },
  });

  const { data, isLoading: loading } = query;
  const invoice = data?.data ?? null;

  const fetchLedger = useCallback(async () => {
    if (!invoice?.id || !invoice?.shop_id) return;
    try {
      const records = await getInvoiceLedger(invoice.id, invoice.shop_id, invoice.notes);
      setPayments(records);
    } catch (err) {
      console.error("Failed to load invoice ledger", err);
    }
  }, [invoice?.id, invoice?.shop_id, invoice?.notes]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const { paidPaise, balancePaise, status: paymentStatus } = useMemo(() => {
    const totalPaise = invoice?.total_amount_paise || 0;
    if (payments.length > 0) {
      return calculatePaymentStatus(totalPaise, payments);
    }
    if (invoice?.paid_amount_paise !== undefined) {
      const paid = invoice.paid_amount_paise || 0;
      const bal = invoice.balance_amount_paise ?? Math.max(0, totalPaise - paid);
      let st: "PAID" | "PARTIAL" | "UNPAID" = "UNPAID";
      if (paid >= totalPaise && totalPaise > 0) st = "PAID";
      else if (paid > 0) st = "PARTIAL";
      return { paidPaise: paid, balancePaise: bal, status: st };
    }
    return { paidPaise: totalPaise, balancePaise: 0, status: "PAID" as const };
  }, [invoice, payments]);

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
        if (!item.ornament_id) continue;
        try {
          const { data: ornData } = await supabaseClient
            .from("ornaments")
            .select("quantity")
            .eq("id", item.ornament_id)
            .maybeSingle();
          if (ornData && typeof ornData.quantity === "number") {
            await supabaseClient
              .from("ornaments")
              .update({ quantity: ornData.quantity + (item.quantity || 1) })
              .eq("id", item.ornament_id);
          }
        } catch (restockErr) {
          console.error("Failed to restock ornament:", restockErr);
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

  const itemColumns: ColumnsType<InvoiceDetailItem> = [
    {
      title: "Item",
      dataIndex: "item_name",
      key: "item_name",
      render: (name: string, record: InvoiceDetailItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Space size={4}>
            <Tag color={record.metal_type_name?.toUpperCase() === "GOLD" ? "gold" : "default"} style={{ margin: 0 }}>
              {record.metal_type_name || "Gold"}
            </Tag>
            {record.metal_type_name?.toUpperCase() === "GOLD" && record.purity_display_name && (
              <Tag color="gold" bordered={false} style={{ margin: 0 }}>
                {record.purity_display_name}
              </Tag>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: "Weight (g)",
      dataIndex: "weight_mg",
      key: "weight",
      align: "right",
      render: (mg: number) => (mg / 1000).toFixed(3),
    },
    {
      title: "Rate/g",
      dataIndex: "rate_per_gram_paise",
      key: "rate",
      align: "right",
      render: (p: number, record: InvoiceDetailItem) => formatRateDisplay(p, record.metal_type_name),
    },
    {
      title: "Making/g",
      dataIndex: "making_charge_per_gram_paise",
      key: "making",
      align: "right",
      render: (p: number) => `₹${(p / 100).toFixed(2)}`,
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
    },
    {
      title: "Total",
      dataIndex: "line_total_paise",
      key: "total",
      align: "right",
      render: (p: number) => (
        <Text strong style={{ color: token.colorPrimary }}>
          ₹{p2Rs(p)}
        </Text>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 48 }}>Loading invoice...</div>
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 48 }}>
          <Text type="secondary">Invoice not found.</Text>
          <div style={{ marginTop: 16 }}>
            <Button onClick={() => navigate("/invoices")}>Back to Invoices</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: "100%", overflowX: "hidden", paddingBottom: !screens.md ? 30 : 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            type="text"
            onClick={() => navigate("/invoices")}
          />
          <Title level={4} style={{ margin: 0, fontSize: !screens.md ? 17 : 20 }}>
            Invoice #{invoice.invoice_number}
          </Title>
          {invoice.is_cancelled ? (
            <Tag icon={<CloseCircleOutlined />} color="error">
              CANCELLED
            </Tag>
          ) : (
            <>
              <Tag icon={<CheckCircleOutlined />} color="success">
                ACTIVE
              </Tag>
              {paymentStatus === "PAID" ? (
                <Tag color="success">PAID</Tag>
              ) : paymentStatus === "PARTIAL" ? (
                <Tag color="warning">PARTIAL (Due: ₹{p2Rs(balancePaise)})</Tag>
              ) : (
                <Tag color="error">UNPAID (Due: ₹{p2Rs(balancePaise)})</Tag>
              )}
            </>
          )}
        </Space>

        <Space wrap>
          {!invoice.is_cancelled && balancePaise > 0 && (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => setRecordPaymentOpen(true)}
            >
              Record Payment
            </Button>
          )}
          <DownloadInvoiceButton invoiceId={invoice.id} />
          {!invoice.is_cancelled && (
            <>
              <Button
                icon={<CopyOutlined />}
                onClick={() => navigate(`/sales/new?clone=${invoice.id}`)}
              >
                Clone Sale
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => setCancelModalOpen(true)}
              >
                Cancel Bill
              </Button>
            </>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* Left Column: Metadata & Items */}
        <Col xs={24} lg={16}>
          {/* Metadata Card */}
          <Card style={{ marginBottom: 16 }}>
            <Descriptions
              column={{ xs: 1, sm: 2, md: 3 }}
              size="small"
              bordered
            >
              <Descriptions.Item label="Date">
                <Space>
                  <CalendarOutlined />
                  {dayjs(invoice.invoice_date).format("DD MMM YYYY")}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Customer">
                <Space>
                  <Text strong>{invoice.customer?.name || "Walk-in Customer"}</Text>
                  {invoice.customer?.customer_code && (
                    <Tag
                      color="blue"
                      style={{
                        fontFamily: "monospace",
                        fontSize: 10,
                        padding: "0 5px",
                        lineHeight: "18px",
                      }}
                    >
                      {invoice.customer.customer_code}
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {invoice.customer?.phone || "—"}
              </Descriptions.Item>
              {invoice.customer?.address && (
                <Descriptions.Item label="Address" span={3}>
                  {invoice.customer.address}
                </Descriptions.Item>
              )}
              {invoice.notes && (
                <Descriptions.Item label="Notes" span={3}>
                  <Text type="secondary">{invoice.notes}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Items Card */}
          <Card title="Line Items">
            {!screens.md ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(invoice.invoice_items ?? []).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      backgroundColor: token.colorFillAlter,
                      border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 14 }}>{item.item_name}</Text>
                      <Text strong style={{ color: token.colorPrimary, fontSize: 14 }}>
                        ₹{p2Rs(item.line_total_paise || item.total_price_paise || 0)}
                      </Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: token.colorTextSecondary }}>
                      <span>
                        {item.net_weight_grams || (item.weight_mg ? (item.weight_mg / 1000).toFixed(3) : 0)}g ({item.purity_display_name || item.metal_type_name || "Gold"})
                      </span>
                      <span>Qty: {item.quantity}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: token.colorTextTertiary, marginTop: 4 }}>
                      <span>Rate: {formatRateDisplay(item.rate_per_gram_paise, item.metal_type_name)}</span>
                      <span>Making: ₹{((item.making_charge_per_gram_paise || item.making_charge_paise || 0) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table<InvoiceDetailItem>
                dataSource={invoice.invoice_items ?? []}
                columns={itemColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>

        {/* Right Column: Financial Summary */}
        <Col xs={24} lg={8}>
          <Card title="Summary">
            {/* Item-level breakdown */}
            {(invoice.invoice_items ?? []).map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <Space size={4}>
                  <Text ellipsis style={{ maxWidth: 140, display: "inline-block" }}>
                    {item.item_name}
                  </Text>
                  {item.metal_type_name?.toUpperCase() === "GOLD" && item.purity_display_name && (
                    <Tag
                      color="gold"
                      style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}
                    >
                      {item.purity_display_name}
                    </Tag>
                  )}
                </Space>
                <Text>₹{p2Rs(item.line_total_paise || item.total_price_paise || 0)}</Text>
              </div>
            ))}

            <Divider style={{ margin: "10px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <Text type="secondary">Subtotal</Text>
              <Text>₹{p2Rs(invoice.subtotal_paise || invoice.subtotal_amount_paise || 0)}</Text>
            </div>
            {invoice.tax_amount_paise != null && invoice.tax_amount_paise > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Text type="secondary">GST (3%)</Text>
                <Text>₹{p2Rs(invoice.tax_amount_paise)}</Text>
              </div>
            )}
            {invoice.discount_paise != null && invoice.discount_paise > 0 && (
              <div
                style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}
              >
                <Text type="secondary">Discount</Text>
                <Text type="danger">−₹{p2Rs(invoice.discount_paise)}</Text>
              </div>
            )}

            <Divider style={{ margin: "10px 0" }} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text strong style={{ fontSize: 15 }}>
                Total (incl. GST)
              </Text>
              <Text strong style={{ fontSize: 17, color: token.colorPrimary }}>
                ₹{p2Rs(invoice.total_amount_paise || 0)}
              </Text>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <Text type="secondary">Paid Amount</Text>
              <Text strong style={{ color: token.colorSuccess }}>
                ₹{p2Rs(paidPaise)}
              </Text>
            </div>

            {balancePaise > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Text type="secondary">Balance Due</Text>
                <Text strong style={{ color: token.colorError }}>
                  ₹{p2Rs(balancePaise)}
                </Text>
              </div>
            )}

            {!invoice.is_cancelled && balancePaise > 0 && (
              <Button
                type="primary"
                block
                style={{ marginTop: 8, marginBottom: 12 }}
                onClick={() => setRecordPaymentOpen(true)}
              >
                Record Payment
              </Button>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Text type="secondary">Payment Mode</Text>
              <Tag>{invoice.payment_method || "CASH"}</Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Cancel Modal */}
      <CancelInvoiceModal
        open={cancelModalOpen}
        invoiceNumber={invoice.invoice_number}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelModalOpen(false)}
        loading={cancelling}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        onSuccess={() => {
          fetchLedger();
          query.refetch();
        }}
        invoice={{
          id: invoice.id,
          shop_id: invoice.shop_id,
          invoice_number: invoice.invoice_number,
          total_amount_paise: invoice.total_amount_paise,
          notes: invoice.notes,
        }}
        balancePaise={balancePaise}
        userId={userId}
      />
    </div>
  );
}
