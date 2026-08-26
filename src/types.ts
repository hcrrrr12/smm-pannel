export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  balance: number;
  spent: number;
  api_key: string;
  phone?: string;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  sort_order: number;
  status: 'active' | 'inactive';
  service_count?: number;
}

export interface Service {
  id: number;
  category_id: number;
  name: string;
  type: 'default' | 'custom_comments' | 'package';
  rate_per_1000: number;
  min_qty: number;
  max_qty: number;
  description?: string;
  profit_margin_percent: number;
  status: 'active' | 'inactive';
  drip_feed_enabled: number;
  category_name?: string;
  category_icon?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'in_progress' | 'completed' | 'partial' | 'cancelled' | 'refunded';

export interface Order {
  id: number;
  user_id: number;
  service_id: number;
  link: string;
  quantity: number;
  charge: number;
  original_rate: number;
  coupon_id?: number | null;
  discount_amount: number;
  custom_comments?: string | null;
  status: OrderStatus;
  start_count: number;
  remains: number;
  provider_order_id?: string | null;
  invoice_number: string;
  created_at: string;
  updated_at: string;
  service_name?: string;
  service_type?: string;
  category_name?: string;
  category_icon?: string;
  user_name?: string;
  user_email?: string;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number | null;
  max_discount?: number | null;
  max_uses: number;
  times_used?: number;
  used_count: number;
  expires_at?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'deposit' | 'order_debit' | 'refund' | 'admin_adjustment' | 'coupon_cashback';
  amount: number;
  balance_after: number;
  status: 'completed' | 'pending' | 'failed' | 'rejected';
  payment_method: 'upi_qr' | 'razorpay' | 'stripe' | 'admin_manual' | 'wallet';
  utr_number?: string | null;
  notes?: string;
  invoice_number?: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_role: 'admin' | 'user';
  message: string;
  created_at: string;
  sender_name?: string;
}

export interface Ticket {
  id: number;
  user_id: number;
  subject: string;
  order_id?: number | null;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'answered' | 'closed';
  created_at: string;
  updated_at: string;
  message_count?: number;
  user_name?: string;
  user_email?: string;
}

export interface Provider {
  id: number;
  name: string;
  api_url: string;
  api_key: string;
  balance: number;
  currency: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface AdminMetrics {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalUserBalance: number;
  pendingDeposits: number;
  openTickets: number;
}

export type AdminStats = AdminMetrics;

export interface InvoiceData {
  invoiceNumber: string;
  orderId: number;
  date: string;
  status: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  seller: {
    company: string;
    email: string;
    phone: string;
    upiId: string;
    website: string;
  };
  items: Array<{
    description: string;
    link: string;
    quantity: number;
    ratePer1000: number;
    amount: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  currencySymbol: string;
}
