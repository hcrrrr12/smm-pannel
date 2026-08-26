import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Check, X, QrCode, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Transaction } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

export const AdminTransactions: React.FC = () => {
  const { formatMoney } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminTransactions({ limit: 100 });
      setTransactions(res.transactions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleApproveUpi = async (txId: number) => {
    try {
      setProcessingId(txId);
      await api.approveManualDeposit(txId);
      fetchTransactions();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectUpi = async (txId: number) => {
    const reason = prompt('Please enter reason for rejection:', 'Invalid UPI UTR Number');
    if (reason === null) return;

    try {
      setProcessingId(txId);
      await api.rejectManualDeposit(txId, reason);
      fetchTransactions();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Platform Financial Ledger & UPI Approval Queue</h2>
            <p className="text-xs text-slate-400">Audit all wallet deposits, service debits, refunds, and verify customer UTR submissions</p>
          </div>
          <button
            onClick={fetchTransactions}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-3.5 px-4">TX ID & Date</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Method & UTR</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-right">Balance After</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading transactions...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    No transactions recorded.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-white">#{tx.id}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-semibold text-slate-200">{tx.user_name || 'Customer'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{tx.user_email}</p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-indigo-400 uppercase text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                        {tx.payment_method}
                      </span>
                      {tx.utr_number && (
                        <p className="text-[11px] font-mono text-amber-400 font-bold mt-1">UTR: {tx.utr_number}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-300 truncate">{tx.notes || tx.type.replace('_', ' ').toUpperCase()}</p>
                      {tx.invoice_number && (
                        <span className="text-[10px] font-mono text-slate-500">{tx.invoice_number}</span>
                      )}
                    </td>

                    <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm whitespace-nowrap ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {tx.amount > 0 ? `+${formatMoney(tx.amount)}` : formatMoney(tx.amount)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-300 whitespace-nowrap">
                      {formatMoney(tx.balance_after)}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : tx.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {tx.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {tx.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveUpi(tx.id)}
                            disabled={processingId === tx.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectUpi(tx.id)}
                            disabled={processingId === tx.id}
                            className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg font-bold border border-rose-500/30"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
