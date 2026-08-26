import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  ArrowUpRight, 
  ShieldCheck, 
  CheckCircle2, 
  RotateCcw,
  QrCode,
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';
import { AdminStats, Order, Transaction } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface AdminDashboardProps {
  onNavigateTab: (tab: string) => void;
  onViewInvoice: (orderId: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab, onViewInvoice }) => {
  const { formatMoney } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminOrders({ limit: 6 })
      ]);
      setStats(statsRes.stats);
      setRecentOrders(ordersRes.orders);
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-800/40 rounded-3xl p-6 sm:p-8 shadow-xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Executive Control Room</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">SocialWave Platform Overview</h1>
          <p className="text-xs text-slate-300 mt-1">
            Real-time management for campaigns, wallet ledgers, user accounts & automated order execution.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Analytics</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Platform Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {stats ? formatMoney(stats.totalRevenue) : '₹0.00'}
          </div>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3 h-3" />
            <span>Cumulative gross revenue</span>
          </p>
        </div>

        {/* Total Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {stats ? stats.totalOrders.toLocaleString() : '0'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Pending: <strong className="text-amber-400 font-mono">{stats?.pendingOrders || 0}</strong></span>
            <span>Completed: <strong className="text-emerald-400 font-mono">{stats?.completedOrders || 0}</strong></span>
          </div>
        </div>

        {/* Registered Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Users</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {stats ? stats.totalUsers.toLocaleString() : '0'}
          </div>
          <p className="text-[11px] text-slate-400">
            Total User Balances: <strong className="text-slate-200 font-mono">{stats ? formatMoney(stats.totalUserBalance) : '₹0.00'}</strong>
          </p>
        </div>

        {/* Action Needed */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Actions</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {(stats?.pendingDeposits || 0) + (stats?.openTickets || 0)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>UPI Deposits: <strong className="text-indigo-400 font-mono">{stats?.pendingDeposits || 0}</strong></span>
            <span>Open Tickets: <strong className="text-amber-400 font-mono">{stats?.openTickets || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateTab('admin-orders')}
          className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition-all hover:scale-[1.02] shadow-sm"
        >
          <ShoppingBag className="w-5 h-5 text-indigo-400 mb-2" />
          <p className="font-bold text-xs text-white">Manage Orders</p>
          <p className="text-[11px] text-slate-400">Update workflow & refunds</p>
        </button>

        <button
          onClick={() => onNavigateTab('admin-services')}
          className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition-all hover:scale-[1.02] shadow-sm"
        >
          <Plus className="w-5 h-5 text-purple-400 mb-2" />
          <p className="font-bold text-xs text-white">Services & Pricing</p>
          <p className="text-[11px] text-slate-400">Add or edit margins</p>
        </button>

        <button
          onClick={() => onNavigateTab('admin-users')}
          className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition-all hover:scale-[1.02] shadow-sm"
        >
          <Users className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="font-bold text-xs text-white">User Wallets</p>
          <p className="text-[11px] text-slate-400">Credit or debit balances</p>
        </button>

        <button
          onClick={() => onNavigateTab('admin-coupons')}
          className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition-all hover:scale-[1.02] shadow-sm"
        >
          <Sparkles className="w-5 h-5 text-amber-400 mb-2" />
          <p className="font-bold text-xs text-white">Coupon Codes</p>
          <p className="text-[11px] text-slate-400">Create promo discounts</p>
        </button>
      </div>

      {/* Recent Orders Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recent Customer Orders</h3>
            <p className="text-xs text-slate-400">Latest campaigns triggered across the network</p>
          </div>
          <button
            onClick={() => onNavigateTab('admin-orders')}
            className="text-xs font-bold text-purple-400 hover:text-purple-300"
          >
            View All Orders →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <th className="py-3 px-3">Order & Customer</th>
                <th className="py-3 px-3">Service</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {recentOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="font-mono font-bold text-white">#{ord.id}</span>
                    <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{ord.user_email}</p>
                  </td>
                  <td className="py-3.5 px-3 max-w-xs">
                    <p className="font-semibold text-slate-200 truncate">{ord.service_name}</p>
                    <p className="font-mono text-indigo-400 text-[11px] truncate max-w-[200px]">{ord.link}</p>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-200">
                    {ord.quantity.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                    {formatMoney(ord.charge)}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                      {ord.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => onViewInvoice(ord.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                    >
                      Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
