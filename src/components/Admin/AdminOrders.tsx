import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  RefreshCw, 
  FileText, 
  Edit3, 
  Check, 
  RotateCcw, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Filter
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface AdminOrdersProps {
  onViewInvoice: (orderId: number) => void;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ onViewInvoice }) => {
  const { formatMoney } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Edit order status modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');
  const [startCount, setStartCount] = useState<number>(0);
  const [remains, setRemains] = useState<number>(0);
  const [updating, setUpdating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminOrders({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchTerm.trim() || undefined
      });
      setOrders(res.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setNewStatus(order.status);
    setStartCount(order.start_count || 0);
    setRemains(order.remains || 0);
    setActionNotice(null);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      setUpdating(true);
      const res = await api.updateOrderStatus(editingOrder.id, {
        status: newStatus,
        start_count: startCount,
        remains: remains
      });
      setActionNotice(res.message);
      setTimeout(() => {
        setEditingOrder(null);
        fetchOrders();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Order Lifecycle & Fulfillment</h2>
            <p className="text-xs text-slate-400">
              Manage fulfillment states: Pending → Processing → In Progress → Completed. Cancelling or refunding an order automatically returns funds to user balance.
            </p>
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
            {['all', 'pending', 'processing', 'in_progress', 'completed', 'cancelled', 'refunded'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-all ${
                  selectedStatus === status
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ID, customer email, link..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-3.5 px-4">Order ID & Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Service & Target Link</th>
                <th className="py-3.5 px-4 text-center">Qty / Remains</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading platform orders...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    No orders found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-white text-sm">#{ord.id}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(ord.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500">{ord.invoice_number}</span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-semibold text-slate-200">{ord.user_name || 'Customer'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{ord.user_email}</p>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-200 truncate">{ord.service_name}</p>
                      <a
                        href={ord.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-400 font-mono text-[11px] hover:underline truncate block max-w-xs"
                      >
                        {ord.link}
                      </a>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono whitespace-nowrap">
                      <span className="font-bold text-white">{ord.quantity.toLocaleString()}</span>
                      <span className="text-slate-500 text-[10px] block">Remains: {ord.remains || 0}</span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                      {formatMoney(ord.charge)}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ord.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : ord.status === 'processing'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : ord.status === 'in_progress'
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                          : ord.status === 'cancelled'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : ord.status === 'refunded'
                          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {ord.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(ord)}
                          className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg font-bold border border-purple-500/30 transition-colors flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Update</span>
                        </button>
                        <button
                          onClick={() => onViewInvoice(ord.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold border border-slate-700 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base">Update Order #{editingOrder.id}</h3>
                <p className="text-xs text-slate-400">{editingOrder.user_email}</p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {actionNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                {actionNotice}
              </div>
            )}

            <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Fulfillment Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="partial">Partial</option>
                  <option value="cancelled">Cancelled (Auto-Refund to Wallet)</option>
                  <option value="refunded">Refunded (Auto-Refund to Wallet)</option>
                </select>
                {(newStatus === 'cancelled' || newStatus === 'refunded') && (
                  <p className="text-rose-400 text-[11px] mt-1">
                    ⚠️ Changing status to {newStatus} will immediately credit ₹{editingOrder.charge} back to customer wallet.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Start Count</label>
                  <input
                    type="number"
                    value={startCount}
                    onChange={(e) => setStartCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Remains</label>
                  <input
                    type="number"
                    value={remains}
                    onChange={(e) => setRemains(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 font-bold text-white rounded-xl shadow-xs"
                >
                  {updating ? 'Saving...' : 'Apply Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
