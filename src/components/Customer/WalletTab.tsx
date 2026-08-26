import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  QrCode, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  Phone,
  Mail
} from 'lucide-react';
import { Transaction } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface WalletTabProps {
  onOpenDepositModal: () => void;
}

export const WalletTab: React.FC<WalletTabProps> = ({ onOpenDepositModal }) => {
  const { user, formatMoney, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Dynamic QR generator embedded in wallet view
  const [qrAmount, setQrAmount] = useState<number>(500);
  const [qrData, setQrData] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [depositMsg, setDepositMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [instantLoading, setInstantLoading] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({ limit: 50 });
      setTransactions(res.transactions);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Update dynamic QR code whenever amount changes
  useEffect(() => {
    const loadQr = async () => {
      if (qrAmount < 10) return;
      try {
        setQrLoading(true);
        const res = await api.getUpiQr(qrAmount, `Wallet Topup - ${user?.email}`);
        setQrData(res.qr);
      } catch (err) {
        console.error('Error generating QR:', err);
      } finally {
        setQrLoading(false);
      }
    };
    const t = setTimeout(loadQr, 300);
    return () => clearTimeout(t);
  }, [qrAmount, user]);

  const copyUpiId = () => {
    navigator.clipboard.writeText('8918145816@fam');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) return;
    try {
      setSubmittingUtr(true);
      setDepositMsg(null);
      const res = await api.submitManualUpi({
        amount: qrAmount,
        utr_number: utrNumber.trim()
      });
      setDepositMsg({ type: 'success', text: res.message });
      setUtrNumber('');
      await refreshUser();
      fetchTransactions();
    } catch (err: any) {
      setDepositMsg({ type: 'error', text: err.message || 'Failed to submit UTR' });
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleInstantDemo = async () => {
    try {
      setInstantLoading(true);
      setDepositMsg(null);
      const res = await api.instantSandboxDeposit(qrAmount);
      setDepositMsg({ type: 'success', text: res.message });
      await refreshUser();
      fetchTransactions();
    } catch (err: any) {
      setDepositMsg({ type: 'error', text: err.message || 'Failed sandbox deposit' });
    } finally {
      setInstantLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 border border-indigo-700/50 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Available Balance</span>
            <div className="p-2 rounded-xl bg-white/10 text-indigo-300">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono tracking-tight text-white mb-2">
            {user ? formatMoney(user.balance) : '₹0.00'}
          </div>
          <p className="text-xs text-indigo-200">Instant checkout ready for all campaigns</p>
        </div>

        {/* Total Spent */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Spent</span>
            <div className="p-2 rounded-xl bg-slate-800 text-purple-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono tracking-tight text-white mb-2">
            {user ? formatMoney(user.spent) : '₹0.00'}
          </div>
          <p className="text-xs text-slate-400">Lifetime investment in social reach</p>
        </div>

        {/* Payment Methods */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Payment Gateways</span>
            <p className="text-sm font-bold text-white">Dynamic UPI QR + Cards</p>
            <p className="text-xs text-slate-400 mt-1">Zero transaction fees on UPI QR payments</p>
          </div>
          <div className="flex items-center gap-2 pt-3">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              UPI Live (GPay/PhonePe)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
              Razorpay / Cards
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic UPI Payment Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Dynamic UPI QR Code Generator</h2>
              <p className="text-xs text-slate-400">
                Amount dynamically encoded with Payee: <strong className="text-slate-200">Kritan Chettri</strong> (UPI: <strong className="text-indigo-400">8918145816@fam</strong>)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: QR Display */}
          <div className="lg:col-span-5 flex flex-col items-center bg-slate-950/60 p-6 rounded-2xl border border-slate-800 text-center">
            <div className="relative bg-white p-3 rounded-2xl shadow-md border border-slate-200">
              {qrLoading ? (
                <div className="w-52 h-52 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : qrData?.qrDataUrl ? (
                <img
                  src={qrData.qrDataUrl}
                  alt="Dynamic UPI QR"
                  className="w-52 h-52 object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-400">
                  Enter amount to generate QR
                </div>
              )}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                Scan to Pay: ₹{qrAmount.toFixed(2)}
              </div>
            </div>

            <div className="mt-6 space-y-2 w-full max-w-xs text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Payee Name:</span>
                <span className="font-bold text-white">Kritan Chettri</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>UPI ID:</span>
                <div className="flex items-center gap-1.5 font-mono text-indigo-400 font-bold">
                  <span>8918145816@fam</span>
                  <button
                    type="button"
                    onClick={copyUpiId}
                    title="Copy UPI ID"
                    className="p-1 hover:text-white rounded-md transition-colors"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>WhatsApp:</span>
                <span className="font-mono text-slate-200">+91 8918145186</span>
              </div>
            </div>

            {qrData?.upiUri && (
              <a
                href={qrData.upiUri}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300"
              >
                <span>Direct Open in UPI App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Right: Controls & UTR Verification */}
          <div className="lg:col-span-7 space-y-5">
            {/* Amount Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                1. Select or Enter Top-up Amount (₹)
              </label>
              <div className="relative mb-3">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  min="10"
                  step="50"
                  value={qrAmount}
                  onChange={(e) => setQrAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                  className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[100, 250, 500, 1000, 2000, 5000].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setQrAmount(p)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      qrAmount === p
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    +₹{p}
                  </button>
                ))}
              </div>
            </div>

            {/* UTR Verification Form */}
            <form onSubmit={handleUtrSubmit} className="space-y-3 pt-4 border-t border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Enter 12-Digit UPI UTR Reference Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 423189181458"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={submittingUtr || !utrNumber.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
                >
                  {submittingUtr ? 'Verifying...' : 'Submit UTR'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Funds are verified and added directly to your available balance.
              </p>
            </form>

            {/* Sandbox 1-Click Test Button */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Rapid Sandbox Testing</p>
                  <p className="text-[11px] text-slate-400">Instantly credit ₹{qrAmount} to your wallet without real transfer.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstantDemo}
                disabled={instantLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap shadow-xs"
              >
                {instantLoading ? 'Crediting...' : `Add ₹${qrAmount} Demo Funds`}
              </button>
            </div>

            {depositMsg && (
              <div className={`p-3.5 rounded-xl text-xs font-medium ${
                depositMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}>
                {depositMsg.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Transaction Ledger & History</h3>
            <p className="text-xs text-slate-400">Complete immutable record of all deposits, order charges, refunds, and adjustments</p>
          </div>
          <button
            onClick={fetchTransactions}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-3 px-4">Transaction ID & Date</th>
                <th className="py-3 px-4">Description / Notes</th>
                <th className="py-3 px-4">Method & UTR</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading ledger...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No transactions recorded yet.
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
                      {tx.invoice_number && (
                        <span className="text-[10px] font-mono text-slate-500">{tx.invoice_number}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-200">{tx.notes || tx.type.replace('_', ' ').toUpperCase()}</p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-indigo-400 uppercase text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                        {tx.payment_method}
                      </span>
                      {tx.utr_number && (
                        <p className="text-[11px] font-mono text-slate-400 mt-1">{tx.utr_number}</p>
                      )}
                    </td>

                    <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {tx.amount > 0 ? `+${formatMoney(tx.amount)}` : formatMoney(tx.amount)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-300">
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
