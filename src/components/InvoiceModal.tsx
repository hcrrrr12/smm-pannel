import React, { useEffect, useState } from 'react';
import { X, Printer, CheckCircle2, AlertCircle, Clock, Copy, Check } from 'lucide-react';
import { api } from '../api';
import { InvoiceData } from '../types';

interface InvoiceModalProps {
  orderId: number;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ orderId, onClose }) => {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await api.getInvoice(orderId);
        setInvoice(res.invoice);
      } catch (err: any) {
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const copyInvoiceNumber = () => {
    if (!invoice) return;
    navigator.clipboard.writeText(invoice.invoiceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="invoice-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Header Actions (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Official Tax Invoice</span>
            {invoice && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                {invoice.invoiceNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              id="print-invoice-btn"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
            <button
              id="close-invoice-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-8 print:p-0 print:m-0" id="printable-invoice">
          {loading ? (
            <div className="py-20 text-center text-slate-500">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Generating printable invoice...</p>
            </div>
          ) : error || !invoice ? (
            <div className="py-12 text-center text-rose-500">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 text-rose-400" />
              <p className="text-sm">{error || 'Could not retrieve invoice.'}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      S
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">SocialWave SMM</span>
                  </div>
                  <p className="text-xs text-slate-500">{invoice.seller.company}</p>
                  <p className="text-xs text-slate-500">Email: {invoice.seller.email}</p>
                  <p className="text-xs text-slate-500">WhatsApp / Phone: {invoice.seller.phone}</p>
                  <p className="text-xs text-slate-500">UPI ID: {invoice.seller.upiId}</p>
                </div>

                <div className="sm:text-right">
                  <h1 className="text-2xl font-extrabold text-slate-800 uppercase tracking-wide">INVOICE</h1>
                  <div className="mt-2 flex items-center sm:justify-end gap-1.5 font-mono text-sm text-indigo-600 font-semibold">
                    <span>{invoice.invoiceNumber}</span>
                    <button
                      onClick={copyInvoiceNumber}
                      title="Copy Invoice Number"
                      className="text-slate-400 hover:text-slate-600 print:hidden"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Date: {new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PAID via Wallet</span>
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Billed To</h3>
                  <p className="text-sm font-semibold text-slate-800">{invoice.customer.name}</p>
                  <p className="text-xs text-slate-600">{invoice.customer.email}</p>
                  {invoice.customer.phone !== 'N/A' && (
                    <p className="text-xs text-slate-600">Phone: {invoice.customer.phone}</p>
                  )}
                </div>
                <div className="sm:text-right">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Order Details</h3>
                  <p className="text-xs text-slate-700">Order ID: <span className="font-semibold text-slate-900">#{invoice.orderId}</span></p>
                  <p className="text-xs text-slate-700 capitalize">Status: <span className="font-semibold text-slate-900">{invoice.status}</span></p>
                  <p className="text-xs text-slate-700">Payment: <span className="font-semibold text-slate-900">Verified & Processed</span></p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-3">Service Description</th>
                      <th className="py-3 px-3 text-center">Quantity</th>
                      <th className="py-3 px-3 text-right">Rate / 1000</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-slate-800">{item.description}</p>
                          <p className="text-xs font-mono text-indigo-600 mt-0.5 truncate max-w-md">{item.link}</p>
                        </td>
                        <td className="py-3.5 px-3 text-center font-medium text-slate-700">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right text-slate-600">
                          ₹{item.ratePer1000.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-slate-900">
                          ₹{item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 max-w-sm">
                  <p className="font-semibold text-slate-700 mb-1">Terms & Conditions:</p>
                  <p>All automated marketing deliveries adhere to platform terms. In case of link issues or partial delivery, auto-refills or refunds are credited to the user wallet.</p>
                </div>

                <div className="w-full sm:w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{invoice.subtotal.toFixed(2)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Coupon Discount:</span>
                      <span>-₹{invoice.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST / Taxes:</span>
                    <span>₹0.00</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-bold text-slate-900">
                    <span>Total Paid:</span>
                    <span className="text-indigo-600">₹{invoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-6 border-t border-dashed border-slate-200 text-center text-xs text-slate-400">
                <p>Thank you for choosing SocialWave SMM Panel. For priority queries, contact WhatsApp: {invoice.seller.phone}</p>
                <p className="mt-0.5">Authorized Digital Invoice • Generated automatically upon order execution</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
