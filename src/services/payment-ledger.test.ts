import { test } from "node:test";
import assert from "node:assert";
import {
  calculatePaymentStatus,
  parseNotesPaymentLedger,
  serializeNotesPaymentLedger,
  computeNextBalanceSnapshot,
} from "./payment-ledger.ts";
import type { IInvoicePayment } from "../libs/interfaces";

test("calculatePaymentStatus returns UNPAID when zero payments recorded", () => {
  const result = calculatePaymentStatus(500000, []);
  assert.strictEqual(result.paidPaise, 0);
  assert.strictEqual(result.balancePaise, 500000);
  assert.strictEqual(result.status, "UNPAID");
});

test("calculatePaymentStatus returns PARTIAL when partial amount paid", () => {
  const payments: IInvoicePayment[] = [
    {
      id: "p1",
      shop_id: "s1",
      invoice_id: "i1",
      payment_date: "2026-10-09",
      amount_paise: 200000,
      payment_mode: "UPI",
      notes: "Advance",
      balance_snapshot_paise: 300000,
      created_at: "2026-10-09T10:00:00Z",
    },
  ];
  const result = calculatePaymentStatus(500000, payments);
  assert.strictEqual(result.paidPaise, 200000);
  assert.strictEqual(result.balancePaise, 300000);
  assert.strictEqual(result.status, "PARTIAL");
});

test("calculatePaymentStatus returns PAID when full amount settled across installments", () => {
  const payments: IInvoicePayment[] = [
    {
      id: "p1",
      shop_id: "s1",
      invoice_id: "i1",
      payment_date: "2026-10-09",
      amount_paise: 200000,
      payment_mode: "UPI",
      balance_snapshot_paise: 300000,
      created_at: "2026-10-09T10:00:00Z",
    },
    {
      id: "p2",
      shop_id: "s1",
      invoice_id: "i1",
      payment_date: "2026-10-10",
      amount_paise: 300000,
      payment_mode: "CASH",
      balance_snapshot_paise: 0,
      created_at: "2026-10-10T11:00:00Z",
    },
  ];
  const result = calculatePaymentStatus(500000, payments);
  assert.strictEqual(result.paidPaise, 500000);
  assert.strictEqual(result.balancePaise, 0);
  assert.strictEqual(result.status, "PAID");
});

test("computeNextBalanceSnapshot accurately calculates remaining balance", () => {
  const totalPaise = 1000000; // ₹10,000
  const existing: IInvoicePayment[] = [
    {
      id: "p1",
      shop_id: "s1",
      invoice_id: "i1",
      payment_date: "2026-10-09",
      amount_paise: 400000,
      payment_mode: "CASH",
      balance_snapshot_paise: 600000,
      created_at: "2026-10-09T10:00:00Z",
    },
  ];
  // Next installment of ₹3,000 -> remaining balance snapshot should be ₹3,000
  const nextSnapshot = computeNextBalanceSnapshot(totalPaise, existing, 300000);
  assert.strictEqual(nextSnapshot, 300000);
});

test("parseNotesPaymentLedger and serializeNotesPaymentLedger roundtrips metadata transparently", () => {
  const cleanNotes = "Wedding order delivery on Friday";
  const payments: IInvoicePayment[] = [
    {
      id: "p-test",
      shop_id: "s1",
      invoice_id: "i1",
      payment_date: "2026-10-09",
      amount_paise: 150000,
      payment_mode: "CASH",
      balance_snapshot_paise: 50000,
      created_at: "2026-10-09T12:00:00Z",
    },
  ];

  const serialized = serializeNotesPaymentLedger(cleanNotes, payments);
  assert.ok(serialized.includes(cleanNotes));
  assert.ok(serialized.includes("<!--PAYMENT_LEDGER:"));

  const parsed = parseNotesPaymentLedger(serialized);
  assert.strictEqual(parsed.cleanNotes, cleanNotes);
  assert.strictEqual(parsed.payments.length, 1);
  assert.strictEqual(parsed.payments[0].amount_paise, 150000);
});
