import { User, Service, Category, Order, Coupon, Transaction, Ticket, Provider, AdminMetrics, AdminStats, InvoiceData } from './types';

// Helper for fetch with credentials
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('smm_auth_token');
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Send cookies
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data as T;
}

export const api = {
  // Auth
  register: (body: { name: string; email: string; password: string; phone?: string }) =>
    request<{ message: string; user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  login: (body: { email: string; password: string }) =>
    request<{ message: string; user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  getMe: () => request<{ user: User }>('/api/auth/me'),

  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  regenerateApiKey: () => request<{ apiKey: string; message: string }>('/api/auth/api-key/regenerate', { method: 'POST' }),

  // Services
  getServices: () => request<{ services: Service[] }>('/api/services'),
  getCategories: () => request<{ categories: Category[] }>('/api/services/categories'),

  // Orders
  createOrder: (body: { service_id: number; link: string; quantity: number; coupon_code?: string; custom_comments?: string }) =>
    request<{ message: string; order: Order; newBalance: number; invoiceNumber: string }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  getOrders: (params: { status?: string; search?: string; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.offset) q.append('offset', params.offset.toString());
    return request<{ orders: Order[]; total: number }>(`/api/orders?${q.toString()}`);
  },

  getInvoice: (orderId: number) => request<{ invoice: InvoiceData }>(`/api/orders/${orderId}/invoice`),

  // Coupons
  validateCoupon: (code: string, amount: number) =>
    request<{
      valid: boolean;
      coupon: {
        id: number;
        code: string;
        discountType: string;
        discountValue: number;
        calculatedDiscount: number;
        finalAmount: number;
      };
    }>('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, amount })
    }),

  // Wallet & Payments
  getUpiQr: (amount: number, note?: string) =>
    request<{
      success: boolean;
      qr: {
        upiId: string;
        payeeName: string;
        amount: number;
        currency: string;
        note: string;
        upiUri: string;
        qrDataUrl: string;
      };
      supportContact: { email: string; phone: string; upiId: string };
    }>('/api/wallet/upi-qr', {
      method: 'POST',
      body: JSON.stringify({ amount, note })
    }),

  submitManualUpi: (body: { amount: number; utr_number: string; notes?: string }) =>
    request<{ message: string; transaction: Transaction }>('/api/wallet/deposit/manual-upi', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  instantSandboxDeposit: (amount: number) =>
    request<{ message: string; newBalance: number; transactionId: string }>('/api/wallet/deposit/instant-test', {
      method: 'POST',
      body: JSON.stringify({ amount })
    }),

  getTransactions: (params: { limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.offset) q.append('offset', params.offset.toString());
    return request<{ transactions: Transaction[]; total: number }>(`/api/wallet/transactions?${q.toString()}`);
  },

  // Tickets
  getTickets: () => request<{ tickets: Ticket[] }>('/api/tickets'),
  createTicket: (body: { subject: string; order_id?: number; priority?: string; message: string }) =>
    request<{ message: string; ticketId: number }>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  getTicketDetails: (id: number) => request<{ ticket: Ticket; messages: any[] }>(`/api/tickets/${id}`),
  replyTicket: (id: number, message: string) =>
    request<{ message: string }>(`/api/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message })
    }),

  // Flat Admin Helpers
  getAdminStats: async () => {
    const res = await request<{ metrics: AdminMetrics; recentOrders: any[]; topServices: any[] }>('/api/admin/stats');
    return { stats: res.metrics, recentOrders: res.recentOrders, topServices: res.topServices };
  },
  getAdminOrders: (params: { status?: string; search?: string; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.offset) q.append('offset', params.offset.toString());
    return request<{ orders: Order[]; total: number }>(`/api/orders/admin/all?${q.toString()}`);
  },
  updateOrderStatus: (id: number, body: { status: string; start_count?: number; remains?: number; reason?: string }) =>
    request<{ message: string; orderId: number; status: string }>(`/api/orders/admin/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  getAdminServices: () => request<{ services: Service[]; categories: Category[] }>('/api/services/admin/all'),
  createService: (body: any) => request<{ message: string; serviceId: number }>('/api/services/admin', { method: 'POST', body: JSON.stringify(body) }),
  updateService: (id: number, body: any) => request<{ message: string }>(`/api/services/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteService: (id: number) => request<{ message: string }>(`/api/services/admin/${id}`, { method: 'DELETE' }),
  createCategory: (body: any) => request<{ message: string; categoryId: number }>('/api/services/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
  getAdminUsers: (params: { search?: string; role?: string; status?: string; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.role) q.append('role', params.role);
    if (params.status) q.append('status', params.status);
    return request<{ users: User[]; total: number }>(`/api/admin/users?${q.toString()}`);
  },
  adjustUserWallet: (userId: number, body: { amount: number; type: 'credit' | 'debit'; reason?: string }) =>
    request<{ message: string; newBalance: number; userId: number }>('/api/wallet/admin/adjust', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, action: body.type, amount: body.amount, reason: body.reason })
    }),
  getAdminCoupons: () => request<{ coupons: Coupon[] }>('/api/coupons/admin/all'),
  createCoupon: (body: any) => request<{ message: string; couponId: number }>('/api/coupons/admin', { method: 'POST', body: JSON.stringify(body) }),
  deleteCoupon: (id: number) => request<{ message: string }>(`/api/coupons/admin/${id}`, { method: 'DELETE' }),
  getAdminTransactions: (params: { type?: string; status?: string; search?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.type) q.append('type', params.type);
    if (params.status) q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    return request<{ transactions: Transaction[]; total: number }>(`/api/wallet/admin/transactions?${q.toString()}`);
  },
  approveManualDeposit: (id: number) =>
    request<{ message: string }>(`/api/wallet/admin/transactions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' })
    }),
  rejectManualDeposit: (id: number, reason?: string) =>
    request<{ message: string }>(`/api/wallet/admin/transactions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected', admin_notes: reason })
    }),
  getAdminProviders: () => request<{ providers: Provider[] }>('/api/providers/admin/providers'),
  createProvider: (body: any) => request<{ message: string; providerId: number }>('/api/providers/admin/providers', { method: 'POST', body: JSON.stringify(body) }),
  getAdminSettings: () => request<{ settings: Record<string, string>; list: any[] }>('/api/admin/settings'),
  updateAdminSettings: (settings: Record<string, string>) =>
    request<{ message: string }>('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ settings })
    }),
  testTelegramAlert: async (message?: string) => {
    const res = await request<{ success: boolean; message: string; detail?: string }>('/api/admin/telegram/test', { method: 'POST' });
    return { sent: res.success, reason: res.message };
  },

  // Nested Admin Namespace
  admin: {
    getStats: () => request<{ metrics: AdminMetrics; recentOrders: any[]; topServices: any[] }>('/api/admin/stats'),
    getUsers: (params: { search?: string; role?: string; status?: string; limit?: number; offset?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.search) q.append('search', params.search);
      if (params.role) q.append('role', params.role);
      if (params.status) q.append('status', params.status);
      return request<{ users: User[]; total: number }>(`/api/admin/users?${q.toString()}`);
    },
    updateUserStatus: (id: number, body: { status?: string; role?: string }) =>
      request<{ message: string; user: any }>(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    adjustWallet: (body: { user_id: number; action: 'credit' | 'debit'; amount: number; reason?: string }) =>
      request<{ message: string; newBalance: number; userId: number }>('/api/wallet/admin/adjust', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    getAllOrders: (params: { status?: string; search?: string; limit?: number; offset?: number } = {}) => {
      const q = new URLSearchParams();
      if (params.status) q.append('status', params.status);
      if (params.search) q.append('search', params.search);
      return request<{ orders: Order[]; total: number }>(`/api/orders/admin/all?${q.toString()}`);
    },
    updateOrderStatus: (id: number, body: { status: string; start_count?: number; remains?: number; reason?: string }) =>
      request<{ message: string; orderId: number; status: string }>(`/api/orders/admin/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    getAllServices: () => request<{ services: Service[]; categories: Category[] }>('/api/services/admin/all'),
    createService: (body: any) => request<{ message: string; serviceId: number }>('/api/services/admin', { method: 'POST', body: JSON.stringify(body) }),
    updateService: (id: number, body: any) => request<{ message: string }>(`/api/services/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteService: (id: number) => request<{ message: string }>(`/api/services/admin/${id}`, { method: 'DELETE' }),
    createCategory: (body: any) => request<{ message: string; categoryId: number }>('/api/services/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
    updateCategory: (id: number, body: any) => request<{ message: string }>(`/api/services/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    getAllCoupons: () => request<{ coupons: Coupon[] }>('/api/coupons/admin/all'),
    createCoupon: (body: any) => request<{ message: string; couponId: number }>('/api/coupons/admin', { method: 'POST', body: JSON.stringify(body) }),
    deleteCoupon: (id: number) => request<{ message: string }>(`/api/coupons/admin/${id}`, { method: 'DELETE' }),
    getAllTransactions: (params: { type?: string; status?: string; search?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.type) q.append('type', params.type);
      if (params.status) q.append('status', params.status);
      if (params.search) q.append('search', params.search);
      return request<{ transactions: Transaction[]; total: number }>(`/api/wallet/admin/transactions?${q.toString()}`);
    },
    updateTransactionStatus: (id: number, body: { status: 'completed' | 'rejected'; admin_notes?: string }) =>
      request<{ message: string }>(`/api/wallet/admin/transactions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    getProviders: () => request<{ providers: Provider[] }>('/api/providers/admin/providers'),
    createProvider: (body: any) => request<{ message: string; providerId: number }>('/api/providers/admin/providers', { method: 'POST', body: JSON.stringify(body) }),
    getSettings: () => request<{ settings: Record<string, string>; list: any[] }>('/api/admin/settings'),
    saveSettings: (settings: Record<string, string>) =>
      request<{ message: string }>('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ settings })
      }),
    testTelegram: () => request<{ success: boolean; message: string; detail?: string }>('/api/admin/telegram/test', { method: 'POST' })
  }
};
