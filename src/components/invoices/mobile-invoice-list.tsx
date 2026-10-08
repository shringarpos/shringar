import React, { useState, useMemo } from "react";
import { useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  Typography,
  Input,
  Button,
  Tag,
  Skeleton,
  theme,
  Empty,
  message,
} from "antd";
import {
  Search,
  Plus,
  Eye,
  Copy,
  Phone,
  MessageCircle,
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
  payment_status?: string;
  payment_method?: string;
  paid_amount_paise?: number;
  balance_amount_paise?: number;
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

      if (!matchSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "CANCELLED") return !!inv.is_cancelled;
      return (inv.payment_status || "UNPAID").toUpperCase() === statusFilter && !inv.is_cancelled;
    });
  }, [invoices, searchTerm, statusFilter]);

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    message.success(`Copied #${text}`);
  };

  const handleWhatsApp = (e: React.MouseEvent, inv: IInvoiceRow) => {
    e.stopPropagation();
    const custName = inv.customer?.name || "Valued Customer";
    const total = abbrRs(inv.total_amount_paise || 0);
    const balance = inv.balance_amount_paise ? abbrRs(inv.balance_amount_paise) : null;
    const msg = balance
      ? `Hello ${custName}, thank you for shopping with Shringar Jewellers! Your invoice #${inv.invoice_number} is for ${total}. Outstanding balance due: ${balance}.`
      : `Hello ${custName}, thank you for your payment at Shringar Jewellers! Your invoice #${inv.invoice_number} for ${total} is fully settled.`;

    const digits = inv.customer?.phone ? inv.customer.phone.replace(/\D/g, "") : "";
    const waNumber = digits.length === 10 ? `91${digits}` : digits;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div
      data-testid="mobile-invoices"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: "calc(88px + env(safe-area-inset-bottom, 16px))",
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
            {filteredInvoices.length} {filteredInvoices.length === 1 ? "bill" : "bills"} found
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
        placeholder="Search bill #, customer, phone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        allowClear
        inputMode="search"
        style={{
          height: 44,
          borderRadius: 12,
          fontSize: 14,
          background: token.colorBgElevated,
          border: `1px solid ${token.colorBorderSecondary}`,
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
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[
          { key: "ALL", label: "All", testId: "mobile-invoice-filter-all" },
          { key: "PAID", label: "Paid" },
          { key: "PARTIAL", label: "Partial" },
          { key: "UNPAID", label: "Unpaid" },
          { key: "CANCELLED", label: "Cancelled" },
        ].map((filter) => {
          const isSelected = statusFilter === filter.key;
          return (
            <button
              key={filter.key}
              data-testid={filter.testId}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              style={{
                padding: "8px 16px",
                minHeight: 44,
                borderRadius: 20,
                border: isSelected ? "none" : `1px solid ${token.colorBorderSecondary}`,
                fontSize: 12,
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                backgroundColor: isSelected ? token.colorPrimary : token.colorBgElevated,
                color: isSelected ? "#fff" : token.colorTextSecondary,
                boxShadow: isSelected ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {filter.label}
            </button>
          );
        })}
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
            const isCancelled = !!inv.is_cancelled;
            const custName = inv.customer?.name || "Walk-in Customer";
            const phone = inv.customer?.phone;

            return (
              <div
                key={inv.id}
                data-testid="mobile-invoice-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/invoices/show/${inv.id}`)}
                style={{
                  backgroundColor: token.colorBgElevated,
                  borderRadius: 14,
                  padding: "12px 14px",
                  border: `1px solid ${token.colorBorderSecondary}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                  cursor: "pointer",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  opacity: isCancelled ? 0.75 : 1,
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
                      onClick={(e) => handleCopy(e, inv.invoice_number)}
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
                      isCancelled
                        ? "default"
                        : isPaid
                        ? "success"
                        : isPartial
                        ? "warning"
                        : "error"
                    }
                    style={{
                      margin: 0,
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "1px 6px",
                      border: "none",
                    }}
                  >
                    {isCancelled ? "CANCELLED" : inv.payment_status || "UNPAID"}
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
                      <Text type="danger" style={{ fontSize: 11, fontWeight: 600 }}>
                        Due: {abbrRs(inv.balance_amount_paise)}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {inv.payment_method || "Paid"}
                      </Text>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: `1px solid ${token.colorFillAlter}`,
                    paddingTop: 8,
                    gap: 8,
                  }}
                >
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<Eye size={13} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/invoices/show/${inv.id}`);
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      height: 44,
                    }}
                  >
                    View Bill
                  </Button>

                  <Button
                    size="small"
                    icon={<MessageCircle size={13} color="#16a34a" />}
                    onClick={(e) => handleWhatsApp(e, inv)}
                    style={{
                      borderRadius: 8,
                      fontSize: 12,
                      height: 44,
                      padding: "0 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    WhatsApp
                  </Button>

                  <div onClick={(e) => e.stopPropagation()}>
                    <DownloadInvoiceButton invoiceId={inv.id} iconOnly style={{ height: 44, width: 44 }} />
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
