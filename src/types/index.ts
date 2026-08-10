// Tipe Data Utama untuk Aplikasi ubi-cheese POS

import type { Timestamp } from "firebase/firestore";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image_url?: string;
  is_available: boolean;
  created_at?: Date;
}

export type OrderStatus = "pending_payment" | "paid" | "completed" | "cancelled";

export interface OrderItem {
  menu_id: string;
  name: string; // snapshot saat memesan
  price: number; // snapshot saat memesan
  quantity: number;
}

export interface Order {
  id: string;
  customer_name: string;
  items: OrderItem[];
  total_price: number;
  status: OrderStatus;
  /** uid sesi anonim pelanggan yang membuat pesanan */
  created_by?: string;
  created_at?: Timestamp;
}
