export type Product = { id: number; name: string; description?: string; price: number | string; stock: number; rating?: number | string; image_url?: string | null; image_urls?: string[]; category_name?: string; is_popular?: boolean; is_new_arrival?: boolean };
export type Category = { id: number; name: string; slug?: string };
export type CartItem = { id: number; product_id: number; quantity: number; unit_price: number | string; name: string; image_url?: string | null; stock?: number };
export type Address = { id: number; label?: string; province: string; city: string; neighborhood: string; street: string; number: string; is_default?: boolean };
