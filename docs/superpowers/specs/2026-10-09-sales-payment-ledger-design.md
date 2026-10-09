# Sales Payment Ledger & Multi-Pay Lifecycle Specification

## 1. Overview & Business Intent
In retail jewellery stores, sales rarely follow an immediate, one-time settlement. Jewellers routinely encounter:
1. **Advance Bookings & Partial Payments**: Customers pay a deposit or partial amount (e.g. ₹20,000 of an ₹80,000 necklace) at bill generation, leaving the rest pending until delivery or subsequent installments.
2. **Multiple Installment Lifecycle**: Over the following weeks, customers return to make multiple partial payments using varied payment methods (Cash, UPI, Credit Card, Bank Transfer).
3. **Audit Snapshots & Customer Trust**: Both the jeweller and the customer need an immutable chronological record:
   - Exactly when each installment was received.
   - Which payment method was used.
   - The exact amount paid in that installment.
   - The remaining balance snapshot immediately following that installment.
4. **Non-Disruptive Seamless Operation**: Standard single-payment transactions must continue to work with one click, defaulting to 100% paid without requiring extra steps.

---

## 2. Architecture & Data Model

### A. PostgreSQL Database Schema (`public.invoice_payments`)
Backed by a new migration file: `supabase/migrations/20261009193000_add_invoice_payments.sql`.

```sql
create table if not exists public.invoice_payments (
    id                      uuid            primary key default gen_random_uuid(),
    shop_id                 uuid            references public.shops(id) on delete restrict not null,
    invoice_id              uuid            references public.invoices(id) on delete cascade not null,
    payment_date            date            default current_date not null,
    amount_paise            bigint          not null check (amount_paise > 0),
    payment_mode            varchar(50)     default 'CASH' not null,
    notes                   text,
    balance_snapshot_paise  bigint          not null,
    created_at              timestamp with time zone default now() not null,
    created_by              uuid            references auth.users(id)
);

create index if not exists idx_invoice_payments_invoice on public.invoice_payments(invoice_id, payment_date);
create index if not exists idx_invoice_payments_shop on public.invoice_payments(shop_id);

alter table public.invoice_payments enable row level security;

create policy "Users can view invoice payments for their shop" on public.invoice_payments
  for select using (
    exists (
      select 1 from public.shops
      where shops.id = invoice_payments.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can insert invoice payments for their shop" on public.invoice_payments
  for insert with check (
    exists (
      select 1 from public.shops
      where shops.id = invoice_payments.shop_id
      and shops.user_id = (select auth.uid())
    )
  );
```

### B. TypeScript Interface
Added to `src/libs/interfaces/index.d.ts`:

```typescript
export interface IInvoicePayment {
  id: string;
  shop_id: string;
  invoice_id: string;
  payment_date: string; // YYYY-MM-DD
  amount_paise: number;
  payment_mode: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | string;
  notes?: string | null;
  balance_snapshot_paise: number;
  created_at: string;
  created_by?: string | null;
}
```

### C. Resilient Payment Ledger Service (`src/services/payment-ledger.ts`)
To ensure continuous operation without 404s even before remote database migration deployment:
1. Primary Source: Queries `public.invoice_payments` via Supabase client.
2. Fallback & Metadata Sync: If `public.invoice_payments` is unavailable, queries and updates structured payment history embedded in `invoices.notes` under the marker `<!--PAYMENT_LEDGER:[...]-->`.
3. Unifies payment retrieval and installment creation into a single robust API:
   - `getInvoiceLedger(invoiceId: string, shopId: string, notes?: string | null): Promise<IInvoicePayment[]>`
   - `recordInstallment(invoice: IInvoice, payment: NewPaymentPayload): Promise<IInvoicePayment>`
   - `calculatePaymentStatus(totalPaise: number, payments: IInvoicePayment[]): { paidPaise: number, balancePaise: number, status: 'PAID' | 'PARTIAL' | 'UNPAID' }`

---

## 3. User Experience & Interface Specifications

### A. Desktop POS Checkout (`src/components/invoices/sale-form.tsx`)
1. **Amount Paid Now Input**:
   - Numeric input allowing any amount from `₹0` up to `Total Bill Amount`.
   - Defaults to `Total Bill Amount` (1-click full payment).
   - Quick preset chips: `[Full 100%]`, `[75%]`, `[50%]`, `[₹0 Credit]`.
2. **Dynamic Live Calculations**:
   - If `Amount Paid < Total`: Displays an amber alert banner:
     `Pending Balance: ₹XX,XXX.00 • Invoice will be issued as PARTIAL`.
   - If `Payment Mode == 'CASH'` and `Cash Tendered > Amount Paid`: Displays Change Return banner:
     `Return Change: ₹XX,XXX.00`.
3. **Transaction Creation**:
   - Creates the invoice record.
   - If `Amount Paid > 0`, records the initial installment entry in the ledger with `balance_snapshot_paise = Total - Amount Paid`.

### B. Mobile POS Checkout (`src/pages/pos/mobile-pos.tsx`)
1. **Payment Amount Input**:
   - Native touch-friendly numeric input for Amount Paid Now.
   - Quick selector pills: `Full`, `50%`, `Custom`.
   - Live remaining balance indicator.
2. **Checkout Finalization**:
   - Saves invoice and initial payment record via the ledger service.

### C. Invoice Detail Show Page (`src/pages/invoices/show.tsx`)
1. **Header & Summary Cards**:
   - Dynamic Status Tag:
     - `PAID` (Green Tag with CheckCircle icon).
     - `PARTIAL` (Orange Tag with ClockCircle icon, displaying `Due: ₹XX,XXX`).
     - `UNPAID` (Red Tag with ExclamationCircle icon).
   - Key Metrics Grid: Total Bill Value, Total Paid to Date, Outstanding Balance Due.
2. **Record Payment Action**:
   - Prominent **"Record Payment"** button visible whenever `Balance Due > 0`.
   - Opens the **Installment Payment Modal**:
     - Pre-fills amount with remaining balance due.
     - Caps maximum payment to balance due.
     - Date picker (defaults to today).
     - Payment Mode selector (`Cash`, `UPI`, `Card`, `Bank Transfer`).
     - Reference / Note input (e.g. "GPay txn ref #1234").
     - On submission: saves payment, updates balance snapshot, and refreshes ledger timeline immediately.
3. **Payment History Ledger Timeline**:
   - Chronological audit timeline displaying all installments:
     - Date & time formatted cleanly (`DD MMM YYYY, hh:mm A`).
     - Payment mode tag with corresponding icon (`Cash`, `UPI`, `Card`, `Bank`).
     - Amount paid: `+ ₹XX,XXX.00` in green.
     - Balance Snapshot badge: `Balance: ₹XX,XXX.00`.
     - Transaction note / reference.

### D. Mobile Invoice List (`src/components/invoices/mobile-invoice-list.tsx`)
- Status tags accurately reflect live payment status (`PAID`, `PARTIAL`, `UNPAID`) derived from ledger payments.
- Displays remaining balance due clearly on partial/unpaid invoice cards.

### E. Print & WhatsApp Invoicing
- Invoice printout itemizes: `Total Amount`, `Amount Received`, `Balance Due`.
- WhatsApp share message details total amount, paid amount, and outstanding balance due with shop contact.

---

## 4. Edge Cases & Safeguards
1. **Overpayment Guard**: Amount paid cannot exceed remaining balance due.
2. **Negative Payment Guard**: Amounts must be positive (`> 0`).
3. **Cancelled Invoices**: If an invoice is cancelled, "Record Payment" is disabled and warning displayed.
4. **Historical Invoices**: Existing invoices created prior to this feature without ledger records default gracefully to treating `total_amount_paise` as paid if marked settled, or checking notes for payment details.
5. **No Direct Remote Push Rule**: All commits remain local until feature completion and review.

