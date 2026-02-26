export interface IShop {
    id: string;
    user_id: string;
    code: string;
    name: string;
    address: string;
    phone: string;
    email?: string;
    logo_url?: string;
    gst_number?: string;
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?; string;
}

export interface IMetalType {
  id: string;
  name: string;
  is_active: boolean;
}

export interface IPurityLevel {
  id: string;
  metal_type_id: string;
  purity_value: number;
  display_name: string;
  is_active: boolean;
}

interface IMakingCharge {
  id: string;
  shop_id: string;
  metal_type_id: string;
  purity_level_id: string;
  charge_per_gram_paise: number;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  created_by?: string;
  updated_by?: string;
}

export interface ICategory {
  id: string;
  shop_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface IMetalRate {
  id: string;
  shop_id: string;
  metal_type_id: string;
  rate_date: string;        // ISO date string, e.g. "2026-02-25"
  rate_per_gram_paise: number; // stored as paise per gram for all metals
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface IOrnament {
  id: string;
  shop_id: string;
  category_id: string;
  metal_type_id: string;
  purity_level_id: string;
  name: string;
  weight_mg: number;
  quantity: number;
  purchase_metal_rate_paise?: number | null;
  purchase_making_charge_paise?: number | null;
  purchase_total_cost_paise?: number | null;
  purchase_date?: string | null;
  sku?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface ICustomer {
  id: string;
  shop_id: string;
  customer_code: string;
  name: string;
  address: string;
  phone: string;
  email?: string | null;
  alternate_phone?: string | null;
  /** UUID reference to another customer who referred this customer */
  reference_by?: string | null;
  /** Joined referred customer (available when select includes the relation) */
  referred_customer?: Pick<ICustomer, "id" | "name" | "customer_code"> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

/** IOrnament with PostgREST-joined relations for display in the list/show */
export interface IOrnamentWithDetails extends IOrnament {
  category?: { id: string; name: string } | null;
  metal_type?: { id: string; name: string } | null;
  purity_level?: { id: string; display_name: string; purity_value: number } | null;
}

export interface IInvoice {
  id: string;
  shop_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string; // ISO date
  subtotal_amount_paise: number;
  total_making_charges_paise: number;
  discount_amount_paise: number;
  total_amount_paise: number;
  notes?: string | null;
  is_cancelled: boolean;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_reason?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface IInvoiceItem {
  id: string;
  invoice_id: string;
  ornament_id: string;
  item_name: string;
  weight_mg: number;
  quantity: number;
  metal_type_name: string;
  purity_value?: number | null;
  purity_display_name?: string | null;
  rate_per_gram_paise: number;
  making_charge_per_gram_paise: number;
  metal_amount_paise: number;
  making_charge_amount_paise: number;
  line_total_paise: number;
  created_at: string;
  updated_at: string;
}

/** IInvoice with joined customer and items */
export interface IInvoiceWithDetails extends IInvoice {
  customer?: Pick<ICustomer, "id" | "name" | "customer_code" | "phone"> | null;
  invoice_items?: IInvoiceItem[];
}