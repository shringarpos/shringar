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

interface IMetalType {
  id: string;
  name: string;
  is_active: boolean;
}

interface IPurityLevel {
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
  updated_by?: string;
}