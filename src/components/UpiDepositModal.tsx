import React, { useState, useEffect } from 'react';
import { X, QrCode, Copy, Check, ExternalLink, Zap, ShieldCheck, ArrowRight, Phone, Mail } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

interface UpiDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
}

export const UpiDepositModal: React.FC<UpiDepositModalProps> = ({ isOpen, onClose, defaultAmount = 500 }) => {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [qrDetails, setQrDetails] = useState<any>(null);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [submittingUtr, setSubmittingUtr] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [instantLoading, setInstantLoading] = useState<boolean>(false);

  const presets = [100, 250, 500, 1000, 2500, 5000];

  // Fetch QR Code whenever amount changes (with debounce)
  useEffect(() => {
    if (!isOpen) return;

    const fetchQr = async () => {
      if (amount < 10) return;
      try {
        setLoadingQr(true);
        setErrorMessage(null);
        const res = await api.getUpiQr(amount, `Add Funds - ${user?.email || 'User'}`);
        setQrDetails(res.qr);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to generate QR code');
      } finally {
        setLoadingQr(false);
      }
    };

    const timer = setTimeout(fetchQr, 250);
    return () => clearTimeout(timer);
  }, [amount, isOpen, user]);

  if (!isOpen) return null;

  const copyUpiId = () => {
    const upi = qrDetails?.upiId || '8918145816@fam';
    navigator.clipboard.writeText(upi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      setErrorMessage('Please enter the 12-digit UPI UTR / Transaction Reference Number.');
      return;
    }

    try {
      setSubmittingUtr(true);
      setErrorMessage(null);
      const res = await api.submitManualUpi({
        amount: amount,
        utr_number: utrNumber.trim(),
        notes: `UPI Deposit for ${user?.email}`
      });

      setSuccessMessage(res.message);
      setUtrNumber('');
      await refreshUser();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit UTR');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleInstantSandbox = async () => {
    try {
      setInstantLoading(true);
      setErrorMessage(null);
      const res = await api.instantSandboxDeposit(amount);
      setSuccessMessage(res.message);
      await refreshUser();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed instant deposit');
    } finally {
      setInstantLoading(false);
    }
  };

  return (
    <div id="upi-deposit-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-indigo-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Add Funds via Dynamic UPI QR</h2>
              <p className="text-xs text-indigo-200">Instant scan with GPay, PhonePe, Paytm, BHIM</p>
            </div>
          </div>
          <button
            id="close-upi-modal-btn"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          {successMessage ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Deposit Processed</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">{successMessage}</p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Amount Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Select Deposit Amount (₹ INR)
                </label>
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">₹</span>
                    <input
                      id="deposit-amount-input"
                      type="number"
                      min="10"
                      step="10"
                      value={amount}
                      onChange={(e) => setAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(p)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        amount === p
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      ₹{p.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic QR Code Box */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex-shrink-0">
                  {loadingQr ? (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : qrDetails?.qrDataUrl ? (
                    <img
                      src={qrDetails.qrDataUrl}
                      alt="UPI QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400 text-center p-2">
                      Enter amount to generate QR
                    </div>
                  )}
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                    Amount: ₹{amount.toFixed(2)}
                  </div>
                </div>

                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payee Name</span>
                    <p className="text-sm font-bold text-slate-800">Kritan Chettri</p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">UPI ID</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-sm font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                        8918145816@fam
                      </span>
                      <button
                        type="button"
                        onClick={copyUpiId}
                        title="Copy UPI ID"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {qrDetails?.upiUri && (
                    <a
                      href={qrDetails.upiUri}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 pt-1"
                    >
                      <span>Pay directly via UPI App</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* UTR Submission Form */}
              <form onSubmit={handleUtrSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Enter 12-Digit UPI Reference ID (UTR)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="utr-number-input"
                    type="text"
                    placeholder="e.g. 423189181458"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    id="submit-utr-btn"
                    type="submit"
                    disabled={submittingUtr || !utrNumber.trim()}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {submittingUtr ? 'Verifying...' : 'Submit UTR'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  You can find the 12-digit UTR in your payment app transaction history (GPay, PhonePe, Paytm).
                </p>
              </form>

              {/* Sandbox Instant Demo Topup */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">Sandbox Fast Test Mode</p>
                    <p className="text-[11px] text-amber-700">Instantly credit ₹{amount} to wallet without real UPI transfer.</p>
                  </div>
                </div>
                <button
                  id="sandbox-deposit-btn"
                  type="button"
                  onClick={handleInstantSandbox}
                  disabled={instantLoading}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-xs"
                >
                  {instantLoading ? 'Crediting...' : 'Instant Test Topup'}
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Support Info */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>WhatsApp: +91 8918145186</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-indigo-600" />
                  <span>kritanchettri32@gmail.com</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
