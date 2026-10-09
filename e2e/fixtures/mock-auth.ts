import { Page } from "@playwright/test";

export const MOCK_USER = {
  id: "test-user-id-0000-0000-0000-000000000000",
  aud: "authenticated",
  role: "authenticated",
  email: "designer@shringar.test",
  phone: "",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Lead UX Designer" },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

export const MOCK_SHOP = {
  id: "test-shop-id-0000-0000-0000-000000000000",
  user_id: MOCK_USER.id,
  name: "Shringar Fine Jewels",
  code: "SFJ01",
  address: "MG Road, Suite 402, Mumbai",
  phone: "+91 98765 43210",
  email: "contact@shringarjewels.com",
  gst_number: "27AAAAA0000A1Z5",
  logo_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

export const MOCK_SESSION = {
  access_token: "mock-jwt-token-for-e2e-testing-playwright",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token",
  user: MOCK_USER,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

export const MOCK_METAL_TYPES = [
  { id: "00000000-0000-0000-0000-000000000001", name: "GOLD", is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "00000000-0000-0000-0000-000000000002", name: "SILVER", is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
];

export const MOCK_PURITY_LEVELS = [
  { id: "purity-g-18k", metal_type_id: "00000000-0000-0000-0000-000000000001", purity_value: 78, display_name: "18K", is_active: true },
  { id: "purity-g-20k", metal_type_id: "00000000-0000-0000-0000-000000000001", purity_value: 84, display_name: "20K", is_active: true },
  { id: "purity-g-22k", metal_type_id: "00000000-0000-0000-0000-000000000001", purity_value: 92, display_name: "22K", is_active: true },
  { id: "purity-g-24k", metal_type_id: "00000000-0000-0000-0000-000000000001", purity_value: 99, display_name: "24K", is_active: true },
  { id: "purity-s-925", metal_type_id: "00000000-0000-0000-0000-000000000002", purity_value: 92.5, display_name: "92.5%", is_active: true },
];

export const MOCK_CATEGORIES = [
  { id: "cat-1", shop_id: MOCK_SHOP.id, name: "Necklaces", description: "Traditional & bridal necklaces", image_url: null, is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-2", shop_id: MOCK_SHOP.id, name: "Rings", description: "Diamond & gold rings for all occasions", image_url: null, is_active: true, created_at: "2026-01-02T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" },
  { id: "cat-3", shop_id: MOCK_SHOP.id, name: "Bangles & Bracelets", description: "Handcrafted bangles and kadas", image_url: null, is_active: true, created_at: "2026-01-03T00:00:00Z", updated_at: "2026-01-03T00:00:00Z" },
  { id: "cat-4", shop_id: MOCK_SHOP.id, name: "Earrings", description: "Jhumkis, studs and drops", image_url: null, is_active: true, created_at: "2026-01-04T00:00:00Z", updated_at: "2026-01-04T00:00:00Z" },
];

export const MOCK_CUSTOMERS = [
  {
    id: "cust-1",
    shop_id: MOCK_SHOP.id,
    customer_code: "CUST-001",
    name: "Priya Sharma",
    phone: "9876543210",
    alternate_phone: "9876543211",
    email: "priya.sharma@example.com",
    address: "Flat 402, Lotus Towers, Andheri West, Mumbai",
    reference_by: null,
    is_active: true,
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-10T10:00:00Z",
  },
  {
    id: "cust-2",
    shop_id: MOCK_SHOP.id,
    customer_code: "CUST-002",
    name: "Rahul Verma",
    phone: "9823456789",
    alternate_phone: null,
    email: "rahul.v@example.com",
    address: "12 Marine Drive, Nariman Point, Mumbai",
    reference_by: "cust-1",
    is_active: true,
    created_at: "2026-02-15T11:30:00Z",
    updated_at: "2026-02-15T11:30:00Z",
  },
  {
    id: "cust-3",
    shop_id: MOCK_SHOP.id,
    customer_code: "CUST-003",
    name: "Ananya Patel",
    phone: "9712345678",
    alternate_phone: null,
    email: null,
    address: "78 Juhu Tara Road, Juhu, Mumbai",
    reference_by: null,
    is_active: false,
    created_at: "2026-03-01T09:00:00Z",
    updated_at: "2026-03-01T09:00:00Z",
  },
];

export const MOCK_ORNAMENTS = [
  {
    id: "orn-1",
    shop_id: MOCK_SHOP.id,
    category_id: "cat-1",
    metal_type_id: "00000000-0000-0000-0000-000000000001",
    purity_level_id: "purity-g-22k",
    name: "Royal Kundan Choker",
    weight_mg: 45000,
    quantity: 4,
    purchase_metal_rate_paise: 685000,
    purchase_making_charge_paise: 45000,
    purchase_total_cost_paise: 32850000,
    purchase_date: "2026-09-15",
    sku: "NK-KND-001",
    description: "22K Bridal Kundan Choker with emerald drop",
    is_active: true,
    created_at: "2026-09-15T10:00:00Z",
    updated_at: "2026-09-15T10:00:00Z",
  },
  {
    id: "orn-2",
    shop_id: MOCK_SHOP.id,
    category_id: "cat-2",
    metal_type_id: "00000000-0000-0000-0000-000000000001",
    purity_level_id: "purity-g-18k",
    name: "Solitaire Diamond Ring",
    weight_mg: 6500,
    quantity: 1,
    purchase_metal_rate_paise: 560000,
    purchase_making_charge_paise: 15000,
    purchase_total_cost_paise: 3737500,
    purchase_date: "2026-09-20",
    sku: "RG-SOL-002",
    description: "18K Gold Solitaire Ring",
    is_active: true,
    created_at: "2026-09-20T14:00:00Z",
    updated_at: "2026-09-20T14:00:00Z",
  },
  {
    id: "orn-3",
    shop_id: MOCK_SHOP.id,
    category_id: "cat-3",
    metal_type_id: "00000000-0000-0000-0000-000000000001",
    purity_level_id: "purity-g-22k",
    name: "Temple Kada Bangles",
    weight_mg: 32000,
    quantity: 2,
    purchase_metal_rate_paise: 685000,
    purchase_making_charge_paise: 35000,
    purchase_total_cost_paise: 23040000,
    purchase_date: "2026-09-25",
    sku: "BG-TMP-003",
    description: "22K Traditional temple finish kada pair",
    is_active: true,
    created_at: "2026-09-25T16:00:00Z",
    updated_at: "2026-09-25T16:00:00Z",
  },
];

export const MOCK_RATES = [
  {
    id: "rate-today-gold",
    shop_id: MOCK_SHOP.id,
    metal_type_id: "00000000-0000-0000-0000-000000000001",
    rate_date: "2026-10-05",
    rate_per_gram_paise: 725000,
    created_at: "2026-10-05T06:00:00Z",
    updated_at: "2026-10-05T06:00:00Z",
  },
  {
    id: "rate-today-silver",
    shop_id: MOCK_SHOP.id,
    metal_type_id: "00000000-0000-0000-0000-000000000002",
    rate_date: "2026-10-05",
    rate_per_gram_paise: 9200,
    created_at: "2026-10-05T06:00:00Z",
    updated_at: "2026-10-05T06:00:00Z",
  },
  {
    id: "rate-prev-gold",
    shop_id: MOCK_SHOP.id,
    metal_type_id: "00000000-0000-0000-0000-000000000001",
    rate_date: "2026-10-04",
    rate_per_gram_paise: 721000,
    created_at: "2026-10-04T06:00:00Z",
    updated_at: "2026-10-04T06:00:00Z",
  },
  {
    id: "rate-prev-silver",
    shop_id: MOCK_SHOP.id,
    metal_type_id: "00000000-0000-0000-0000-000000000002",
    rate_date: "2026-10-04",
    rate_per_gram_paise: 9150,
    created_at: "2026-10-04T06:00:00Z",
    updated_at: "2026-10-04T06:00:00Z",
  },
];

export const MOCK_MAKING_CHARGES = [
  {
    id: "mc-1",
    shop_id: MOCK_SHOP.id,
    metal_type_id: "00000000-0000-0000-0000-000000000001",
    purity_level_id: "purity-g-22k",
    charge_per_gram_paise: 45000,
    is_active: true,
    effective_from: "2026-01-01T00:00:00Z",
    effective_to: null,
  },
  {
    id: "mc-2",
    shop_id: MOCK_SHOP.id,
    metal_type_id: "00000000-0000-0000-0000-000000000001",
    purity_level_id: "purity-g-18k",
    charge_per_gram_paise: 55000,
    is_active: true,
    effective_from: "2026-01-01T00:00:00Z",
    effective_to: null,
  },
];


export const MOCK_DESIGN_ALBUMS = [
  {
    id: "album-1",
    user_id: MOCK_USER.id,
    name: "Solitaire & Engagement Rings",
    description: "Classic solitaire and pave diamond ring references",
    cover_image_url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "album-2",
    user_id: MOCK_USER.id,
    name: "Antique Temple Necklaces",
    description: "Traditional South Indian temple choker patterns",
    cover_image_url: null,
    created_at: "2026-09-02T10:00:00Z",
    updated_at: "2026-09-02T10:00:00Z",
  },
];

export const MOCK_DESIGN_PHOTOS = [
  {
    id: "photo-1",
    album_id: "album-1",
    user_id: MOCK_USER.id,
    image_url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500",
    storage_path: "album-1/ring-1.jpg",
    title: "Classic 6-Prong Solitaire",
    created_at: "2026-09-01T11:00:00Z",
  },
  {
    id: "photo-2",
    album_id: "album-1",
    user_id: MOCK_USER.id,
    image_url: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500",
    storage_path: "album-1/ring-2.jpg",
    title: "Halo Diamond Band",
    created_at: "2026-09-01T12:00:00Z",
  },
];

export const MOCK_GOLD_LOANS = [
  {
    id: "loan-1",
    user_id: MOCK_USER.id,
    customer_name: "Meera Singhania",
    contact_no: "9988776655",
    address: "B-22 Silver Oak Heights, Mumbai",
    nominee: "Rajesh Singhania",
    metal_type: "Gold",
    purity: "22K",
    ornament_details: "Bridal Gold Choker Set - 58g",
    loan_date: "2026-09-01",
    closure_date: null,
    loan_amount: 300000,
    duration_months: 12,
    interest_rate: 18,
    interest_amount: 54000,
    total_amount: 354000,
    status: "running",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "loan-2",
    user_id: MOCK_USER.id,
    customer_name: "Suresh Gupta",
    contact_no: "9811223344",
    address: "Flat 101, Shanti Niketan, Pune",
    nominee: "Geeta Gupta",
    metal_type: "Gold",
    purity: "20K",
    ornament_details: "2 Gold Chains & 1 Ring - 32g",
    loan_date: "2026-08-15",
    closure_date: "2026-09-30",
    loan_amount: 150000,
    duration_months: 6,
    interest_rate: 15,
    interest_amount: 11250,
    total_amount: 161250,
    status: "closed",
    created_at: "2026-08-15T11:00:00Z",
    updated_at: "2026-09-30T15:00:00Z",
  },
];

export const MOCK_INVOICES = [
  {
    id: "inv-1",
    shop_id: MOCK_SHOP.id,
    customer_id: "cust-1",
    invoice_number: "INV-2026-0001",
    invoice_date: "2026-10-04",
    subtotal_amount_paise: 30825000,
    total_making_charges_paise: 2025000,
    discount_amount_paise: 50000,
    total_amount_paise: 32800000,
    notes: "Delivered in gift box",
    is_cancelled: false,
    cancelled_at: null,
    cancelled_by: null,
    cancelled_reason: null,
    created_at: "2026-10-04T12:00:00Z",
    updated_at: "2026-10-04T12:00:00Z",
  },
  {
    id: "inv-2",
    shop_id: MOCK_SHOP.id,
    customer_id: "cust-2",
    invoice_number: "INV-2026-0002",
    invoice_date: "2026-10-03",
    subtotal_amount_paise: 3640000,
    total_making_charges_paise: 97500,
    discount_amount_paise: 0,
    total_amount_paise: 3737500,
    notes: null,
    is_cancelled: false,
    cancelled_at: null,
    cancelled_by: null,
    cancelled_reason: null,
    created_at: "2026-10-03T15:00:00Z",
    updated_at: "2026-10-03T15:00:00Z",
  },
];

export const MOCK_INVOICE_PAYMENTS = [
  {
    id: "pay-1",
    shop_id: MOCK_SHOP.id,
    invoice_id: "inv-1",
    payment_date: "2026-10-04",
    amount_paise: 20000000,
    payment_mode: "UPI",
    notes: "Advance via GooglePay",
    balance_snapshot_paise: 12800000,
    created_at: "2026-10-04T12:00:00Z",
  },
];

export const MOCK_INVOICE_ITEMS = [
  {
    id: "inv-item-1",
    invoice_id: "inv-1",
    ornament_id: "orn-1",
    item_name: "Royal Kundan Choker",
    weight_mg: 45000,
    quantity: 1,
    metal_type_name: "GOLD",
    purity_value: 92,
    purity_display_name: "22K",
    rate_per_gram_paise: 685000,
    making_charge_per_gram_paise: 45000,
    metal_amount_paise: 30825000,
    making_charge_amount_paise: 2025000,
    line_total_paise: 32850000,
    created_at: "2026-10-04T12:00:00Z",
    updated_at: "2026-10-04T12:00:00Z",
  },
];

/**
 * Injects authenticated session and mocks Supabase REST queries so E2E tests
 * can run deterministically in any environment.
 */
export async function setupAuthenticatedContext(
  page: Page,
  options?:
    | {
        colorMode?: "light" | "dark";
        loans?: typeof MOCK_GOLD_LOANS;
      }
    | typeof MOCK_GOLD_LOANS
) {
  const isArray = Array.isArray(options);
  const loansData = isArray
    ? [...options]
    : [...((options as any)?.loans ?? MOCK_GOLD_LOANS)];
  const albumsData = (!isArray && (options as any)?.albums !== undefined)
    ? [...((options as any).albums)]
    : [...MOCK_DESIGN_ALBUMS];
  const photosData = (!isArray && (options as any)?.photos !== undefined)
    ? [...((options as any).photos)]
    : [...MOCK_DESIGN_PHOTOS];
  const chosenColorMode = (!isArray && (options as any)?.colorMode) || "light";

  const customersData = [...MOCK_CUSTOMERS];
  const ornamentsData = [...MOCK_ORNAMENTS];
  const categoriesData = [...MOCK_CATEGORIES];
  const invoicesData = [...MOCK_INVOICES];
  const invoiceItemsData = [...MOCK_INVOICE_ITEMS];
  const paymentsData = [...MOCK_INVOICE_PAYMENTS];
  const ratesData = [...MOCK_RATES];

  // Mock Supabase Auth API
  await page.route("**/auth/v1/user*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USER),
    });
  });

  await page.route("**/auth/v1/session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSION),
    });
  });

  // Generic helper for standard REST mock with PostgREST conventions
  const handleRestResource = async (
    route: any,
    items: any[],
    options?: {
      transformGet?: (item: any) => any;
      onPost?: (newItem: any) => void;
    }
  ) => {
    const request = route.request();
    const method = request.method();
    const headers = request.headers();
    const isSingle = headers["accept"]?.includes("vnd.pgrst.object+json");

    if (method === "GET") {
      let result = items.map((i) => (options?.transformGet ? options.transformGet(i) : i));
      const body = isSingle ? JSON.stringify(result[0] || {}) : JSON.stringify(result);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "content-range": `0-${Math.max(0, result.length - 1)}/${result.length}`,
        },
        body,
      });
    } else if (method === "POST") {
      const postData = request.postDataJSON();
      const records = Array.isArray(postData) ? postData : [postData];
      const created = records.map((r, idx) => ({
        ...r,
        id: r.id || `mock-${Date.now()}-${idx}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      items.push(...created);
      created.forEach((c) => options?.onPost?.(c));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(isSingle ? created[0] : created),
      });
    } else if (method === "PATCH") {
      const patchData = request.postDataJSON();
      items.forEach((item, index) => {
        items[index] = { ...item, ...patchData, updated_at: new Date().toISOString() };
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(isSingle ? items[0] : items),
      });
    } else if (method === "DELETE") {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  };

  // Mock Shops
  await page.route("**/rest/v1/shops*", async (route) => {
    await handleRestResource(route, [MOCK_SHOP]);
  });

  // Mock Metal Types
  await page.route("**/rest/v1/metal_types*", async (route) => {
    await handleRestResource(route, MOCK_METAL_TYPES);
  });

  // Mock Purity Levels
  await page.route("**/rest/v1/purity_levels*", async (route) => {
    await handleRestResource(route, MOCK_PURITY_LEVELS);
  });

  // Mock Categories
  await page.route("**/rest/v1/ornament_categories*", async (route) => {
    await handleRestResource(route, categoriesData);
  });

  // Mock Ornaments (join category, metal_type, purity_level)
  await page.route("**/rest/v1/ornaments*", async (route) => {
    await handleRestResource(route, ornamentsData, {
      transformGet: (o) => ({
        ...o,
        category: categoriesData.find((c) => c.id === o.category_id) || { id: o.category_id, name: "Jewellery" },
        metal_type: MOCK_METAL_TYPES.find((m) => m.id === o.metal_type_id) || { id: o.metal_type_id, name: "GOLD" },
        purity_level: MOCK_PURITY_LEVELS.find((p) => p.id === o.purity_level_id) || { id: o.purity_level_id, display_name: "22K", purity_value: 92 },
      }),
    });
  });

  // Mock Customers (join referred_customer)
  await page.route("**/rest/v1/customers*", async (route) => {
    await handleRestResource(route, customersData, {
      transformGet: (c) => ({
        ...c,
        referred_customer: c.reference_by
          ? customersData.find((ref) => ref.id === c.reference_by) || null
          : null,
      }),
    });
  });

  // Mock Metal Rates
  await page.route("**/rest/v1/ornament_rates*", async (route) => {
    await handleRestResource(route, ratesData);
  });

  // Mock Making Charges
  await page.route("**/rest/v1/making_charges*", async (route) => {
    await handleRestResource(route, MOCK_MAKING_CHARGES);
  });

  // Mock Design Albums
  await page.route("**/rest/v1/design_albums*", async (route) => {
    await handleRestResource(route, albumsData);
  });

  // Mock Design Photos
  await page.route("**/rest/v1/design_photos*", async (route) => {
    await handleRestResource(route, photosData);
  });

  // Mock Gold Loans
  await page.route("**/rest/v1/gold_loans*", async (route) => {
    await handleRestResource(route, loansData);
  });

  // Mock Invoices (join customer & items)
  await page.route("**/rest/v1/invoices*", async (route) => {
    await handleRestResource(route, invoicesData, {
      transformGet: (inv) => ({
        ...inv,
        customer: customersData.find((c) => c.id === inv.customer_id) || null,
        invoice_items: invoiceItemsData.filter((it) => it.invoice_id === inv.id),
      }),
    });
  });

  // Mock Invoice Payments
  await page.route("**/rest/v1/invoice_payments*", async (route) => {
    await handleRestResource(route, paymentsData);
  });

  // Mock Invoice Items
  await page.route("**/rest/v1/invoice_items*", async (route) => {
    await handleRestResource(route, invoiceItemsData);
  });

  // Mock Storage
  await page.route("**/storage/v1/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ Key: "mock-image.png" }),
    });
  });

  // Seed localStorage before page loads
  await page.addInitScript(
    ({ session, colorMode }) => {
      const storageKey = "sb-yxixgwbdevpurnahckid-auth-token";
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      window.localStorage.setItem("colorMode", colorMode);
    },
    { session: MOCK_SESSION, colorMode: chosenColorMode }
  );
}
