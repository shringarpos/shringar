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