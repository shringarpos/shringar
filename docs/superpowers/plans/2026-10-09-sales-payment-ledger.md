# Sales Payment Ledger & Multi-Pay Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end sales payment ledger supporting partial advance payments at checkout, multi-installment recording over time, balance snapshots, and dynamic invoice payment statuses across desktop and mobile screens.

**Architecture:** Backed by PostgreSQL `public.invoice_payments` with a resilient fallback service (`src/services/payment-ledger.ts`) for continuous zero-disruption operation. The POS checkout allows jewellers to record initial payments and preview pending balances; the invoice details page provides an interactive payment ledger timeline and an installment recording modal.

**Tech Stack:** React 19, TypeScript, Ant Design v5, Supabase JS, Lucide Icons, Vitest/Vite.

**Spec:** [`docs/superpowers/specs/2026-10-09-sales-payment-ledger-design.md`](file:///home/sahil/Shringar/docs/superpowers/specs/2026-10-09-sales-payment-ledger-design.md)

## Global Constraints
- Commit locally with conventional commit format (`feat(...)`, `fix(...)`, `docs(...)`) with **STRICTLY ZERO CO-AUTHORS**.
- **DO NOT push to `origin/main`** during implementation to avoid triggering CI/CD until full feature completion.
- Maintain full parity between Desktop and Mobile POS and Invoice detail screens.
- All code must pass `npx tsc --noEmit` and `npm run build`.

## Review Focus
1. Installment payment cannot exceed the outstanding balance due.
2. Initial sale checkout with Amount Paid = ₹0 properly marks status as `UNPAID` without crashing.
3. Partial payments properly compute and snapshot the remaining balance at each step.
4. Cash tendered greater than amount paid calculates correct change return without inflating the paid amount.
5. Invoices with cancelled status disable further payment entries.

---

### Task 1: Supabase Migration & TypeScript Interfaces

**Files:**
- Create: `supabase/migrations/20261009193000_add_invoice_payments.sql`
- Modify: `src/libs/interfaces/index.d.ts`

**Interfaces:**
- Produces: `IInvoicePayment` interface, updated `IInvoice` with payment status and balance fields.

- [ ] **Step 1: Write SQL migration file**
Create `supabase/migrations/20261009193000_add_invoice_payments.sql` defining `public.invoice_payments` table, foreign keys, check constraints (`amount_paise > 0`), indexes, and RLS policies.

- [ ] **Step 2: Update TypeScript interfaces**
Add `IInvoicePayment` and extend `IInvoice` and `IInvoiceWithDetails` in `src/libs/interfaces/index.d.ts`.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/20261009193000_add_invoice_payments.sql src/libs/interfaces/index.d.ts
git commit -m "feat(ledger): add invoice payments schema migration and typescript types"
```

---

### Task 2: Resilient Payment Ledger Service

**Files:**
- Create: `src/services/payment-ledger.ts`
- Create: `src/services/payment-ledger.test.ts`

**Interfaces:**
- Produces:
  - `getInvoiceLedger(invoiceId: string, shopId: string, notes?: string | null): Promise<IInvoicePayment[]>`
  - `recordInstallment(invoice: IInvoice, payload: NewPaymentPayload): Promise<IInvoicePayment>`
  - `calculatePaymentStatus(totalPaise: number, payments: IInvoicePayment[]): { paidPaise: number; balancePaise: number; status: 'PAID' | 'PARTIAL' | 'UNPAID' }`

- [ ] **Step 1: Write failing unit tests for ledger calculation & parsing**
Create `src/services/payment-ledger.test.ts` testing balance snapshot calculations, payment status derivation (`PAID`, `PARTIAL`, `UNPAID`), and notes metadata parsing.

- [ ] **Step 2: Run tests to verify failure**
Run: `npx vitest run src/services/payment-ledger.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/services/payment-ledger.ts`**
Implement query from Supabase `invoice_payments`, note fallback parser, snapshot calculator, and payment recorder.

- [ ] **Step 4: Run tests to verify pass**
Run: `npx vitest run src/services/payment-ledger.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**
```bash
git add src/services/payment-ledger.ts src/services/payment-ledger.test.ts
git commit -m "feat(ledger): implement resilient sales payment ledger service with snapshot calculations"
```

---

### Task 3: Desktop POS Payment Section Enhancement

**Files:**
- Modify: `src/components/invoices/sale-form.tsx`

**Interfaces:**
- Consumes: `recordInstallment`, `IInvoicePayment` from `src/services/payment-ledger.ts`

- [ ] **Step 1: Add Amount Paid Now input and quick chips to Desktop POS**
Add amount paid state (defaulting to grand total), percentage chips (`100%`, `75%`, `50%`, `₹0`), pending balance alert, and cash change calculator.

- [ ] **Step 2: Record initial payment in ledger upon sale completion**
Upon successful invoice creation, invoke `recordInstallment` if `amountPaid > 0` with calculated balance snapshot.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**
```bash
git add src/components/invoices/sale-form.tsx
git commit -m "feat(pos): support partial payment and pending balance in desktop checkout"
```

---

### Task 4: Mobile POS Payment Section Enhancement

**Files:**
- Modify: `src/pages/pos/mobile-pos.tsx`

**Interfaces:**
- Consumes: `recordInstallment` from `src/services/payment-ledger.ts`

- [ ] **Step 1: Wire Amount Paid Now input into Mobile POS payment drawer**
Add Amount Paid numeric input with quick pills, live remaining balance tag, and cash change return display.

- [ ] **Step 2: Record initial payment upon mobile checkout completion**
Upon saving invoice, call `recordInstallment` when `effectivePaid > 0`.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**
```bash
git add src/pages/pos/mobile-pos.tsx
git commit -m "feat(pos): support partial payment and pending balance in mobile checkout"
```

---

### Task 5: Payment Ledger Timeline & Record Installment Modal

**Files:**
- Create: `src/components/invoices/record-payment-modal.tsx`
- Create: `src/components/invoices/payment-ledger-timeline.tsx`
- Modify: `src/pages/invoices/show.tsx`

**Interfaces:**
- Consumes: `getInvoiceLedger`, `recordInstallment`, `calculatePaymentStatus` from `src/services/payment-ledger.ts`

- [ ] **Step 1: Implement `RecordPaymentModal`**
Modal for recording subsequent installments with amount input (capped to remaining balance), payment mode selector, date picker, and reference notes.

- [ ] **Step 2: Implement `PaymentLedgerTimeline`**
Component displaying chronological installment history with date/time, payment mode badge, amount paid in green, and balance snapshot badge.

- [ ] **Step 3: Integrate into `src/pages/invoices/show.tsx`**
Add status badge (`PAID`, `PARTIAL`, `UNPAID`), metrics cards (Total, Paid, Balance Due), "Record Payment" button, and embed `PaymentLedgerTimeline`.

- [ ] **Step 4: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**
```bash
git add src/components/invoices/record-payment-modal.tsx src/components/invoices/payment-ledger-timeline.tsx src/pages/invoices/show.tsx
git commit -m "feat(invoices): add payment ledger timeline and record installment modal to invoice show page"
```

---

### Task 6: Invoice Lists Status & Balance Parity

**Files:**
- Modify: `src/components/invoices/mobile-invoice-list.tsx`
- Modify: `src/pages/invoices/index.tsx`

- [ ] **Step 1: Update desktop and mobile invoice lists with live payment status and balance**
Derive payment status (`PAID`, `PARTIAL`, `UNPAID`) and display balance due badges on cards and table rows.

- [ ] **Step 2: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**
```bash
git add src/components/invoices/mobile-invoice-list.tsx src/pages/invoices/index.tsx
git commit -m "feat(invoices): display dynamic payment status and remaining balance across invoice lists"
```

---

### Task 7: Invoice Print Slip & WhatsApp Share Update

**Files:**
- Modify: `src/pages/invoices/show.tsx`

- [ ] **Step 1: Update WhatsApp message template and print breakdown**
Include `Total Amount`, `Amount Paid`, and `Balance Due` in the generated WhatsApp message and print slip.

- [ ] **Step 2: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**
```bash
git add src/pages/invoices/show.tsx
git commit -m "feat(invoices): include paid amount and balance due in invoice print and whatsapp templates"
```

---

### Task 8: End-to-End Verification & Build Check

**Files:**
- Test: All touched files

- [ ] **Step 1: Run all unit tests**
Run: `npm test -- --run`
Expected: PASS

- [ ] **Step 2: Run full TypeScript check**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Run full production build**
Run: `npm run build`
Expected: Exit code 0 with bundled assets.

- [ ] **Step 4: Verify git history adheres to rules**
Check: No coauthor trailers and all commits are staged/committed locally.

