import type { IInvoicePayment } from "../libs/interfaces";
// Lazily imported for browser/test compatibility

const LEDGER_MARKER_START = "<!--PAYMENT_LEDGER:";
const LEDGER_MARKER_END = "-->";

/**
 * Calculates current paid amount, balance remaining, and payment status
 */
export function calculatePaymentStatus(
  totalPaise: number,
  payments: IInvoicePayment[] = []
): {
  paidPaise: number;
  balancePaise: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
} {
  const safeTotal = Math.max(0, totalPaise || 0);
  const paidPaise = payments.reduce((acc, p) => acc + (p.amount_paise || 0), 0);
  const balancePaise = Math.max(0, safeTotal - paidPaise);

  let status: "PAID" | "PARTIAL" | "UNPAID" = "UNPAID";
  if (paidPaise >= safeTotal && safeTotal > 0) {
    status = "PAID";
  } else if (paidPaise > 0) {
    status = "PARTIAL";
  } else if (safeTotal === 0 && payments.length > 0) {
    status = "PAID";
  }

  return { paidPaise, balancePaise, status };
}

/**
 * Computes remaining balance snapshot after adding a new payment amount
 */
export function computeNextBalanceSnapshot(
  totalAmountPaise: number,
  existingPayments: IInvoicePayment[] = [],
  newPaymentAmountPaise: number
): number {
  const currentStatus = calculatePaymentStatus(totalAmountPaise, existingPayments);
  return Math.max(0, currentStatus.balancePaise - Math.max(0, newPaymentAmountPaise || 0));
}

/**
 * Extracts clean user notes and structured payment ledger from notes string
 */
export function parseNotesPaymentLedger(notes?: string | null): {
  cleanNotes: string;
  payments: IInvoicePayment[];
} {
  if (!notes) {
    return { cleanNotes: "", payments: [] };
  }

  const startIndex = notes.indexOf(LEDGER_MARKER_START);
  const endIndex = notes.indexOf(LEDGER_MARKER_END, startIndex);

  if (startIndex === -1 || endIndex === -1) {
    return { cleanNotes: notes.trim(), payments: [] };
  }

  const cleanNotes = (
    notes.substring(0, startIndex) + notes.substring(endIndex + LEDGER_MARKER_END.length)
  ).trim();

  const jsonStr = notes.substring(
    startIndex + LEDGER_MARKER_START.length,
    endIndex
  );

  try {
    const rawPayments = JSON.parse(jsonStr);
    if (Array.isArray(rawPayments)) {
      return { cleanNotes, payments: rawPayments };
    }
  } catch {
    // If parsing fails, return clean notes safely
  }

  return { cleanNotes, payments: [] };
}

/**
 * Appends or updates the structured payment ledger in invoice notes
 */
export function serializeNotesPaymentLedger(
  cleanNotes: string,
  payments: IInvoicePayment[]
): string {
  const trimmed = (cleanNotes || "").trim();
  const jsonPayload = JSON.stringify(payments);
  const marker = `${LEDGER_MARKER_START}${jsonPayload}${LEDGER_MARKER_END}`;

  return trimmed ? `${trimmed}\n\n${marker}` : marker;
}

/**
 * Asynchronously retrieves invoice payment ledger, checking Supabase table first,
 * falling back to notes metadata if table is not yet migrated.
 */
export async function getInvoiceLedger(
  invoiceId: string,
  shopId: string,
  fallbackNotes?: string | null
): Promise<IInvoicePayment[]> {
  try {
    const { supabaseClient } = await import("../providers/supabase-client");
    const { data, error } = await supabaseClient
      .from("invoice_payments")
      .select("*")
      .eq("shop_id", shopId).eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as IInvoicePayment[];
    }
  } catch {
    // Table not found or network query error; fall back to invoice notes
  }

  // Fallback to embedded ledger in notes
  const parsed = parseNotesPaymentLedger(fallbackNotes);
  return parsed.payments;
}

export interface RecordPaymentPayload {
  amountPaise: number;
  paymentMode: string;
  paymentDate?: string;
  notes?: string | null;
  userId?: string | null;
}

/**
 * Records a new installment against an invoice, saving to database and notes metadata
 */
export async function recordInstallment(
  invoice: {
    id: string;
    shop_id: string;
    total_amount_paise: number;
    notes?: string | null;
  },
  payload: RecordPaymentPayload
): Promise<IInvoicePayment> {
  const existingPayments = await getInvoiceLedger(
    invoice.id,
    invoice.shop_id,
    invoice.notes
  );

  const balanceSnapshot = computeNextBalanceSnapshot(
    invoice.total_amount_paise,
    existingPayments,
    payload.amountPaise
  );

  const newPayment: IInvoicePayment = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pay_${Date.now()}`,
    shop_id: invoice.shop_id,
    invoice_id: invoice.id,
    payment_date: payload.paymentDate || new Date().toISOString().split("T")[0],
    amount_paise: payload.amountPaise,
    payment_mode: payload.paymentMode || "CASH",
    notes: payload.notes || null,
    balance_snapshot_paise: balanceSnapshot,
    created_at: new Date().toISOString(),
    created_by: payload.userId || null,
  };

  const updatedPayments = [...existingPayments, newPayment];

  // 1. Attempt insertion into public.invoice_payments table
  try {
    const { supabaseClient } = await import("../providers/supabase-client");
    await supabaseClient.from("invoice_payments").insert({
      id: newPayment.id,
      shop_id: newPayment.shop_id,
      invoice_id: newPayment.invoice_id,
      payment_date: newPayment.payment_date,
      amount_paise: newPayment.amount_paise,
      payment_mode: newPayment.payment_mode,
      notes: newPayment.notes,
      balance_snapshot_paise: newPayment.balance_snapshot_paise,
      created_by: newPayment.created_by,
    });
  } catch {
    // Graceful fallback: table migration may be pending on remote DB
  }

  // 2. Always persist structured ledger in invoice notes for resilience
  try {
    const { cleanNotes } = parseNotesPaymentLedger(invoice.notes);
    const serializedNotes = serializeNotesPaymentLedger(cleanNotes, updatedPayments);

    const { supabaseClient } = await import("../providers/supabase-client");
    await supabaseClient
      .from("invoices")
      .update({
        notes: serializedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);
  } catch (err) {
    console.warn("Failed to sync invoice notes with payment ledger", err);
  }

  return newPayment;
}
