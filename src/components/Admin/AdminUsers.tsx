import React, { useState, useEffect } from 'react';
import { Users, Search, DollarSign, Wallet, Shield, Plus, Minus, Key, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

export const AdminUsers: React.FC = () => {
  const { formatMoney } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Wallet adjustment modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState<string>('Manual Admin Adjustment');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [adjustMsg, setAdjustMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminUsers({ search: searchTerm.trim() || undefined });
      setUsers(res.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAdjust = (u: User) => {
    setSelectedUser(u);
    setAdjustAmount(100);
    setAdjustType('credit');
    setAdjustReason('Admin manual wallet topup');
    setAdjustMsg(null);
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || adjustAmount <= 0) return;

    try {
      setSubmittingAdjust(true);
      setAdjustMsg(null);
      const res = await api.adjustUserWallet(selectedUser.id, {
        amount: adjustAmount,
        type: adjustType,
        reason: adjustReason.trim()
      });
      setAdjustMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        setSelectedUser(null);
        fetchUsers();
      }, 1200);
    } catch (err: any) {
      setAdjustMsg({ type: 'error', text: err.message || 'Failed to adjust balance' });
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Customer Directory & Wallet Balances</h2>
            <p className="text-xs text-slate-400">View customer accounts, API keys, lifetime spend, and perform manual ledger adjustments</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-3.5 px-4">User ID & Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4 text-right">Wallet Balance</th>
                <th className="py-3.5 px-4 text-right">Lifetime Spent</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading customers...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{u.name}</p>
                          <span className="text-[10px] font-mono text-slate-500">ID: #{u.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-slate-300 font-mono">{u.email}</p>
                      {u.phone && <p className="text-slate-500 text-[11px]">{u.phone}</p>}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/15 text-emerald-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-emerald-400 whitespace-nowrap">
                      {formatMoney(u.balance)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                      {formatMoney(u.spent)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenAdjust(u)}
                        className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl font-bold transition-colors flex items-center gap-1.5 ml-auto"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Adjust Wallet</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Wallet Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base">Adjust Wallet Balance</h3>
                <p className="text-xs text-slate-400">{selectedUser.name} ({selectedUser.email})</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {adjustMsg && (
              <div className={`p-3 rounded-xl text-xs font-medium ${
                adjustMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}>
                {adjustMsg.text}
              </div>
            )}

            <form onSubmit={handleApplyAdjustment} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Current Balance:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{formatMoney(selectedUser.balance)}</span>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Adjustment Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('credit')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 ${
                      adjustType === 'credit' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Credit (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('debit')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 ${
                      adjustType === 'debit' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Debit (-)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Amount (₹ INR)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Reason / Audit Trail Note</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manual UPI Payment verification / Promotional credit"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 font-bold text-white rounded-xl shadow-xs"
                >
                  {submittingAdjust ? 'Processing...' : 'Apply to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
