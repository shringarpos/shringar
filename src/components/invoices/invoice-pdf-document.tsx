import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ICustomer, IInvoice, IInvoiceItem, IShop } from "../../libs/interfaces";
import dayjs from "dayjs";

// ─── helpers ──────────────────────────────────────────────────────────────────

const p2Rs = (p: number) =>
  "Rs. " +
  (p / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtWeight = (mg: number) => (mg / 1000).toFixed(3) + " g";

const fmtRate = (paise: number, metalName: string) => {
  const metal = metalName.trim().toUpperCase();
  const rs = paise / 100;
  if (metal === "GOLD") {
    return "Rs. " + rs.toLocaleString("en-IN", { maximumFractionDigits: 0 }) + "/g";
  }
  return "Rs. " + rs.toLocaleString("en-IN", { minimumFractionDigits: 2 }) + "/g";
};

// ─── styles ───────────────────────────────────────────────────────────────────

const gold = "#B8860B";
const darkGray = "#1a1a1a";
const midGray = "#555";
const lightGray = "#f5f5f5";
const borderColor = "#d4af37";
const redCancel = "#d32f2f";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: darkGray,
    padding: "30pt 36pt 40pt 36pt",
    backgroundColor: "#ffffff",
  },

  /* ── header ── */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: borderColor,
    paddingBottom: 10,
    marginBottom: 14,
  },
  shopBlock: { flexDirection: "column", maxWidth: "60%" },
  shopName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: gold,
    marginBottom: 3,
    letterSpacing: 1,
  },
  shopDetail: { fontSize: 8, color: midGray, marginBottom: 2 },
  invoiceBlock: { alignItems: "flex-end" },
  invoiceTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: darkGray,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  invoiceNum: { fontSize: 10, fontFamily: "Helvetica-Bold", color: gold, marginBottom: 4 },
  invoiceMeta: { fontSize: 8, color: midGray, marginBottom: 2 },

  /* ── cancelled banner ── */
  cancelledBanner: {
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: redCancel,
    borderRadius: 3,
    padding: "5pt 10pt",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cancelledText: { fontSize: 9, color: redCancel, fontFamily: "Helvetica-Bold" },
  cancelledReason: { fontSize: 8, color: redCancel, marginTop: 2 },

  /* ── customer / bill-to ── */
  section: { flexDirection: "row", marginBottom: 14, gap: 16 },
  infoBox: { flex: 1 },
  boxTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: gold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: borderColor,
    paddingBottom: 2,
  },
  infoLine: { fontSize: 8.5, color: darkGray, marginBottom: 3 },
  infoLineLight: { fontSize: 8, color: midGray, marginBottom: 2 },

  /* ── items table ── */
  tableSection: { marginBottom: 14 },
  tableTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: gold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: borderColor,
    paddingBottom: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: gold,
    padding: "4pt 6pt",
    borderRadius: 2,
    marginBottom: 1,
  },
  thText: { color: "#fff", fontSize: 7.5, fontFamily: "Helvetica-Bold", textAlign: "left" },
  tableRow: {
    flexDirection: "row",
    padding: "4pt 6pt",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8e8e8",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: "4pt 6pt",
    backgroundColor: lightGray,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8e8e8",
  },
  tdText: { fontSize: 8, color: darkGray },
  tdTextRight: { fontSize: 8, color: darkGray, textAlign: "right" },
  tdTextCenter: { fontSize: 8, color: darkGray, textAlign: "center" },
  tdMeta: { fontSize: 7, color: midGray, marginTop: 1 },

  // column widths
  colItem: { width: "22%" },
  colMetal: { width: "11%" },
  colPurity: { width: "10%" },
  colWeight: { width: "10%", textAlign: "right" },
  colQty: { width: "5%", textAlign: "center" },
  colRate: { width: "12%", textAlign: "right" },
  colMaking: { width: "12%", textAlign: "right" },
  colMetalAmt: { width: "9%", textAlign: "right" },
  colTotal: { width: "9%", textAlign: "right" },

  /* ── summary ── */
  summarySection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  summaryBox: {
    width: "45%",
    borderWidth: 0.5,
    borderColor: borderColor,
    borderRadius: 3,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "4pt 8pt",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8e8e8",
  },
  summaryLabel: { fontSize: 8.5, color: midGray },
  summaryValue: { fontSize: 8.5, color: darkGray, textAlign: "right" },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "6pt 8pt",
    backgroundColor: gold,
  },
  summaryTotalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#fff" },
  summaryTotalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    textAlign: "right",
  },
  discountValue: { fontSize: 8.5, color: redCancel, textAlign: "right" },

  /* ── notes ── */
  noteSection: { marginTop: 14 },
  noteLabel: { fontSize: 8, color: gold, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  noteText: { fontSize: 8, color: midGray },

  /* ── footer ── */
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#aaa" },

  /* ── watermark ── */
  watermark: {
    position: "absolute",
    top: "35%",
    left: "10%",
    width: "80%",
    textAlign: "center",
    fontSize: 60,
    fontFamily: "Helvetica-Bold",
    color: "#ffcccc",
    opacity: 0.25,
    transform: "rotate(-35deg)",
  },
});

// ─── types ────────────────────────────────────────────────────────────────────

export interface InvoicePdfProps {
  invoice: IInvoice & {
    customer?: Pick<ICustomer, "id" | "name" | "customer_code" | "phone" | "address" | "email"> | null;
    invoice_items?: IInvoiceItem[];
  };
  shop?: IShop | null;
}

// ─── component ────────────────────────────────────────────────────────────────

export const InvoicePdfDocument: React.FC<InvoicePdfProps> = ({ invoice, shop }) => {
  const items = invoice.invoice_items ?? [];

  return (
    <Document
      title={`Invoice ${invoice.invoice_number}`}
      author={shop?.name ?? "Shringar"}
      subject="Jewellery Invoice"
    >
      <Page size="A4" style={s.page}>
        {/* Cancelled watermark */}
        {invoice.is_cancelled && (
          <Text style={s.watermark}>CANCELLED</Text>
        )}

        {/* ── Header ── */}
        <View style={s.header}>
          {/* Shop details */}
          <View style={s.shopBlock}>
            <Text style={s.shopName}>{shop?.name ?? "Your Jewellery Shop"}</Text>
            {shop?.address ? (
              <Text style={s.shopDetail}>{shop.address}</Text>
            ) : null}
            {shop?.phone ? (
              <Text style={s.shopDetail}>Phone: {shop.phone}</Text>
            ) : null}
            {shop?.email ? (
              <Text style={s.shopDetail}>Email: {shop.email}</Text>
            ) : null}
            {shop?.gst_number ? (
              <Text style={s.shopDetail}>GSTIN: {shop.gst_number}</Text>
            ) : null}
          </View>

          {/* Invoice meta */}
          <View style={s.invoiceBlock}>
            <Text style={s.invoiceTitle}>TAX INVOICE</Text>
            <Text style={s.invoiceNum}># {invoice.invoice_number}</Text>
            <Text style={s.invoiceMeta}>
              Date: {dayjs(invoice.invoice_date).format("D MMMM YYYY")}
            </Text>
            <Text style={s.invoiceMeta}>
              Issued: {dayjs(invoice.created_at).format("D MMM YYYY")}
            </Text>
          </View>
        </View>

        {/* ── Cancelled Banner ── */}
        {invoice.is_cancelled && (
          <View style={s.cancelledBanner}>
            <View>
              <Text style={s.cancelledText}>
                ✕  INVOICE CANCELLED — {dayjs(invoice.cancelled_at).format("D MMM YYYY HH:mm")}
              </Text>
              {invoice.cancelled_reason ? (
                <Text style={s.cancelledReason}>Reason: {invoice.cancelled_reason}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* ── Bill To / Invoice Info ── */}
        <View style={s.section}>
          <View style={s.infoBox}>
            <Text style={s.boxTitle}>Bill To</Text>
            {invoice.customer ? (
              <>
                <Text style={s.infoLine}>{invoice.customer.name}</Text>
                <Text style={s.infoLineLight}>
                  Code: {invoice.customer.customer_code}
                </Text>
                {invoice.customer.phone ? (
                  <Text style={s.infoLineLight}>Phone: {invoice.customer.phone}</Text>
                ) : null}
                {invoice.customer.address ? (
                  <Text style={s.infoLineLight}>{invoice.customer.address}</Text>
                ) : null}
                {invoice.customer.email ? (
                  <Text style={s.infoLineLight}>{invoice.customer.email}</Text>
                ) : null}
              </>
            ) : (
              <Text style={s.infoLineLight}>Walk-in Customer</Text>
            )}
          </View>

          <View style={[s.infoBox, { alignItems: "flex-end" }]}>
            <Text style={s.boxTitle}>Invoice Details</Text>
            <Text style={s.infoLine}>
              Invoice: {invoice.invoice_number}
            </Text>
            <Text style={s.infoLineLight}>
              Date: {dayjs(invoice.invoice_date).format("D MMMM YYYY")}
            </Text>
            <Text style={s.infoLineLight}>
              Items: {items.length}
            </Text>
          </View>
        </View>

        {/* ── Items Table ── */}
        <View style={s.tableSection}>
          <Text style={s.tableTitle}>Items</Text>

          {/* Header row */}
          <View style={s.tableHeader}>
            <Text style={[s.thText, s.colItem]}>Item</Text>
            <Text style={[s.thText, s.colMetal]}>Metal</Text>
            <Text style={[s.thText, s.colPurity]}>Purity</Text>
            <Text style={[s.thText, s.colWeight, { textAlign: "right" }]}>Weight</Text>
            <Text style={[s.thText, s.colQty, { textAlign: "center" }]}>Qty</Text>
            <Text style={[s.thText, s.colRate, { textAlign: "right" }]}>Rate/g</Text>
            <Text style={[s.thText, s.colMaking, { textAlign: "right" }]}>Making/g</Text>
            <Text style={[s.thText, s.colMetalAmt, { textAlign: "right" }]}>Metal Amt</Text>
            <Text style={[s.thText, s.colTotal, { textAlign: "right" }]}>Total</Text>
          </View>

          {/* Data rows */}
          {items.map((item, idx) => {
            const RowStyle = idx % 2 === 0 ? s.tableRow : s.tableRowAlt;
            return (
              <View key={item.id} style={RowStyle}>
                <View style={s.colItem}>
                  <Text style={s.tdText}>{item.item_name}</Text>
                </View>
                <Text style={[s.tdText, s.colMetal]}>{item.metal_type_name}</Text>
                <Text style={[s.tdText, s.colPurity]}>
                  {item.metal_type_name.trim().toUpperCase() === "GOLD"
                    ? (item.purity_display_name ?? "—")
                    : "—"}
                </Text>
                <Text style={[s.tdTextRight, s.colWeight]}>{fmtWeight(item.weight_mg)}</Text>
                <Text style={[s.tdTextCenter, s.colQty]}>{item.quantity}</Text>
                <Text style={[s.tdTextRight, s.colRate]}>
                  {fmtRate(item.rate_per_gram_paise, item.metal_type_name)}
                </Text>
                <Text style={[s.tdTextRight, s.colMaking]}>
                  Rs. {(item.making_charge_per_gram_paise / 100).toFixed(2)}
                </Text>
                <Text style={[s.tdTextRight, s.colMetalAmt]}>
                  {p2Rs(item.metal_amount_paise)}
                </Text>
                <Text style={[s.tdTextRight, s.colTotal]}>
                  {p2Rs(item.line_total_paise)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Summary ── */}
        <View style={s.summarySection}>
          <View style={s.summaryBox}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Metal Subtotal</Text>
              <Text style={s.summaryValue}>{p2Rs(invoice.subtotal_amount_paise)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Making Charges</Text>
              <Text style={s.summaryValue}>{p2Rs(invoice.total_making_charges_paise)}</Text>
            </View>
            {invoice.discount_amount_paise > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Discount</Text>
                <Text style={s.discountValue}>- {p2Rs(invoice.discount_amount_paise)}</Text>
              </View>
            )}
            <View style={s.summaryTotalRow}>
              <Text style={s.summaryTotalLabel}>Grand Total</Text>
              <Text style={s.summaryTotalValue}>{p2Rs(invoice.total_amount_paise)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {invoice.notes ? (
          <View style={s.noteSection}>
            <Text style={s.noteLabel}>Notes</Text>
            <Text style={s.noteText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {shop?.name ?? "Shringar"} — Thank you for your business!
          </Text>
          <Text style={s.footerText}>
            Invoice {invoice.invoice_number} | Generated {dayjs().format("D MMM YYYY")}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
