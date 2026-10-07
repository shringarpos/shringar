import React, { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Typography,
  Input,
  Button,
  Tag,
  Avatar,
  Skeleton,
  theme,
  Empty,
  message,
} from "antd";
import {
  Search,
  Plus,
  Eye,
  Share2,
  Copy,
  Receipt,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { ICustomer, IInvoice } from "../../libs/interfaces";
import { useShopCheck } from "../../hooks/use-shop-check";
import { DownloadInvoiceButton } from "./download-invoice-button";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

interface IInvoiceRow extends IInvoice {
  customer?: Pick<ICustomer, "id" | "name" | "customer_code" | "phone"> | null;
}

const abbrRs = (paise: number): string => {
  const rs = paise / 100;
  return `₹${rs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const MobileInvoiceList: React.FC = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { shops } = useShopCheck();
  const shopId = shops?.[0]?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { query } = useList<IInvoiceRow>({
    resource: "invoices",
    meta: {
      select: "*, customer:customers(id,name,customer_code,phone)",
    },
    filters: shopId ? [{ field: "shop_id", operator: "eq", value: shopId }] : [],
    sorters: [
      { field: "invoice_date", order: "desc" },
      { field: "created_at", order: "desc" },
    ],
    pagination: { mode: "server", pageSize: 50 },
    queryOptions: { enabled: !!shopId },
  });

  const invoices = (query?.data?.data ?? []) as IInvoiceRow[];
  const isLoading = query?.isLoading;

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        !searchTerm ||
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer?.phone?.includes(searchTerm);

      const matchStatus =
        statusFilter === "ALL" ||
        (inv.payment_status || "UNPAID").toUpperCase() === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Copied ${text} to clipboard!`);
  };

  const handleWhatsApp = (inv: IInvoiceRow) => {
    const text = encodeURIComponent(
      `Hello ${inv.customer?.name || "Customer"}, your invoice #${inv.invoice_number} from Shringar Jewellers for ${abbrRs(inv.total_amount_paise || 0)} is ready. Thank you for your business!`
    );
    const phone = inv.customer?.phone ? inv.customer.phone.replace(/[^0-9]/g, "") : "";
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  return (
    <div
      data-testid="mobile-invoices"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 40,
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 0",
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Invoices & Receipts
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {filteredInvoices.length} {filteredInvoices.length === 1 ? "record" : "records"}
          </Text>
        </div>

        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => navigate("/sales/new")}
          style={{
            height: 38,
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          New Sale
        </Button>
      </div>

      {/* Search Input */}
      <Input
        prefix={<Search size={16} color={token.colorTextPlaceholder} />}
        placeholder="Search invoice #, customer, phone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        allowClear
        style={{
          height: 42,
          borderRadius: 12,
          fontSize: 14,
          background: token.colorBgElevated,
        }}
      />

      {/* Status Filter Chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
          scrollbarWidth: "none",
        }}
      >
        {[
          { key: "ALL", label: "All", testId: "mobile-invoice-filter-all" },
          { key: "PAID", label: "Paid" },
          { key: "PARTIAL", label: "Partial" },
          { key: "UNPAID", label: "Unpaid" },
          { key: "CANCELLED", label: "Cancelled" },
        ].map((filter) => (
          <button
            key={filter.key}
            data-testid={filter.testId}
            type="button"
            onClick={() => setStatusFilter(filter.key)}
            style={{
              padding: "6px 12px",
              borderRadius: 14,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              backgroundColor:
                statusFilter === filter.key
                  ? token.colorPrimary
                  : token.colorFillAlter,
              color:
                statusFilter === filter.key ? "#fff" : token.colorTextSecondary,
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Invoice Cards List */}
      <div
        data-testid="mobile-invoice-cards-list"
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Empty
            description="No matching invoices found"
            style={{ margin: "32px 0" }}
          />
        ) : (
          filteredInvoices.map((inv) => {
            const isPaid = inv.payment_status === "PAID";
            const isPartial = inv.payment_status === "PARTIAL";
            const isCancelled = inv.payment_status === "CANCELLED";
            const custName = inv.customer?.name || "Walk-in Customer";
            const phone = inv.customer?.phone;

            return (
              <div
                key={inv.id}
                data-testid="mobile-invoice-card"
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 14,
                  padding: "12px 14px",
                  border: `1px solid ${token.colorBorderSecondary}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                }}
              >
                {/* Card Top: Invoice #, Date, Status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      onClick={() => handleCopy(inv.invoice_number)}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: token.colorPrimary,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      #{inv.invoice_number}
                      <Copy size={12} />
                    </span>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      • {dayjs(inv.invoice_date).format("D MMM YYYY")}
                    </Text>
                  </div>

                  <Tag
                    color={
                      isPaid
                        ? "success"
                        : isPartial
                        ? "warning"
                        : isCancelled
                        ? "default"
                        : "error"
                    }
                    style={{
                      margin: 0,
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "1px 6px",
                    }}
                  >
                    {inv.payment_status || "UNPAID"}
                  </Tag>
                </div>

                {/* Card Middle: Customer info & Amount breakdown */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <Text strong style={{ fontSize: 14, display: "block" }}>
                      {custName}
                    </Text>
                    {phone && (
                      <span
                        style={{
                          fontSize: 11,
                          color: token.colorTextSecondary,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 2,
                        }}
                      >
                        <Phone size={10} />
                        {phone}
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <Text strong style={{ fontSize: 16, display: "block" }}>
                      {abbrRs(inv.total_amount_paise || 0)}
                    </Text>
                    {inv.balance_amount_paise && inv.balance_amount_paise > 0 ? (
                      <Text type="danger" style={{ fontSize: 11, fontWeight: 500 }}>
                        Due: {abbrRs(inv.balance_amount_paise)}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {inv.payment_method || "Paid"}
                      </Text>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Touch Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: `1px solid ${token.colorFillAlter}`,
                    paddingTop: 8,
                    gap: 6,
                  }}
                >
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<Eye size={13} />}
                    onClick={() => navigate(`/invoices/show/${inv.id}`)}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      height: 32,
                    }}
                  >
                    View
                  </Button>

                  <Button
                    size="small"
                    icon={<Share2 size={13} />}
                    onClick={() => handleWhatsApp(inv)}
                    style={{
                      borderRadius: 8,
                      fontSize: 12,
                      height: 32,
                      padding: "0 10px",
                    }}
                  >
                    Share
                  </Button>

                  <div style={{ transform: "scale(0.92)", transformOrigin: "right center" }}>
                    <DownloadInvoiceButton invoiceId={inv.id} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
