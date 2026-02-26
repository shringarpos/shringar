import React, { useState } from "react";
import { Button, Tooltip } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { pdf } from "@react-pdf/renderer";
import { useList } from "@refinedev/core";
import dayjs from "dayjs";
import { InvoicePdfDocument } from "./invoice-pdf-document";
import type { ICustomer, IInvoice, IInvoiceItem, IShop } from "../../libs/interfaces";
import { supabaseClient } from "../../providers/supabase-client";
import { useShopCheck } from "../../hooks/use-shop-check";

// ─── types ────────────────────────────────────────────────────────────────────

type InvoiceWithDetails = IInvoice & {
  customer?: Pick<ICustomer, "id" | "name" | "customer_code" | "phone" | "address" | "email"> | null;
  invoice_items?: IInvoiceItem[];
};

interface Props {
  /** Pass the fully-loaded invoice (show page) OR just the id to lazy-fetch (list page). */
  invoice?: InvoiceWithDetails;
  invoiceId?: string;
  /** Optional: override label */
  label?: string;
  /** Antd button size */
  size?: "small" | "middle" | "large";
  /** Antd button type */
  buttonType?: "default" | "text" | "link" | "primary" | "dashed";
  /** Whether to show only icon (no text) */
  iconOnly?: boolean;
}

// ─── component ────────────────────────────────────────────────────────────────

export const DownloadInvoiceButton: React.FC<Props> = ({
  invoice: preloadedInvoice,
  invoiceId,
  label = "Download PDF",
  size = "middle",
  buttonType = "default",
  iconOnly = false,
}) => {
  const [loading, setLoading] = useState(false);
  const { shops } = useShopCheck();

  // Fetch shop details (for PDF header)
  const { query: shopQuery } = useList<IShop>({
    resource: "shops",
    pagination: { mode: "off" },
    queryOptions: { staleTime: 5 * 60 * 1000 },
  });

  const shopData = (shopQuery?.data?.data?.[0] ?? null) as IShop | null;

  const handleDownload = async () => {
    setLoading(true);
    try {
      let invoice = preloadedInvoice;

      // If no preloaded invoice, fetch by id
      if (!invoice) {
        const id = invoiceId;
        if (!id) throw new Error("No invoice id provided");

        const { data, error } = await supabaseClient
          .from("invoices")
          .select("*, customer:customers(id,name,customer_code,phone,address,email), invoice_items(*)")
          .eq("id", id)
          .single();

        if (error) throw error;
        invoice = data as InvoiceWithDetails;
      }

      // Ensure customer has email field (may be absent from show page select)
      const invoiceForPdf: InvoiceWithDetails = {
        ...invoice,
        customer: invoice.customer
          ? { email: undefined, ...invoice.customer }
          : null,
      };

      const blob = await pdf(
        <InvoicePdfDocument invoice={invoiceForPdf} shop={shopData ?? shops?.[0] as unknown as IShop | null} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${invoice.invoice_number}_${dayjs(invoice.invoice_date).format("YYYY-MM-DD")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (iconOnly) {
    return (
      <Tooltip title={label}>
        <Button
          type={buttonType}
          size={size}
          icon={<DownloadOutlined />}
          loading={loading}
          onClick={handleDownload}
        />
      </Tooltip>
    );
  }

  return (
    <Button
      type={buttonType}
      size={size}
      icon={<DownloadOutlined />}
      loading={loading}
      onClick={handleDownload}
    >
      {label}
    </Button>
  );
};
