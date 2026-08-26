import React, { useState, useEffect } from 'react';
import { 
  HeadphonesIcon, 
  MessageCircle, 
  Mail, 
  Send, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  PhoneCall,
  ExternalLink,
  LifeBuoy
} from 'lucide-react';
import { Ticket } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

export const SupportTab: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.getTickets();
      setTickets(res.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    try {
      setSubmitting(true);
      setSuccessMsg(null);
      await api.createTicket({ subject: subject.trim(), message: message.trim() });
      setSuccessMsg('Support ticket submitted successfully. Our team will reply shortly.');
      setSubject('');
      setMessage('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => {
    const text = encodeURIComponent('Hi Kritan, I need urgent support for SocialWave SMM Panel.');
    window.open(`https://wa.me/918918145186?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Fast Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp Card */}
        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instant WhatsApp Support</h3>
                <p className="text-xs text-emerald-300">Direct chat with Kritan Chettri</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Online
            </span>
          </div>

          <p className="text-xs text-slate-300">
            For urgent order refills, payment verification, or custom reseller pricing inquiries, connect directly on WhatsApp.
          </p>

          <div className="pt-2">
            <button
              onClick={openWhatsApp}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat on WhatsApp (+91 8918145186)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Email Support Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Official Email Desk</h3>
              <p className="text-xs text-slate-400">kritanchettri32@gmail.com</p>
            </div>
          </div>

          <p className="text-xs text-slate-300">
            Send formal inquiries, invoice inquiries, or API integration logs to our administrator mailbox with quick 2-hour SLA.
          </p>

          <div className="pt-2">
            <a
              href="mailto:kritanchettri32@gmail.com?subject=SocialWave%20SMM%20Support%20Request"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4 text-indigo-400" />
              <span>Email kritanchettri32@gmail.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* Submit Support Ticket Form & Active Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Submit Ticket */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <LifeBuoy className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Submit New Support Ticket</h3>
          </div>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Subject
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Order #1002 speed or refill inquiry"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Message & Order Link Details
              </label>
              <textarea
                rows={4}
                required
                placeholder="Please describe your query with any relevant order IDs or transaction UTR numbers..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              {submitting ? 'Sending...' : 'Submit Support Ticket'}
            </button>
          </form>
        </div>

        {/* Existing Tickets List */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">Your Support Tickets</h3>
            <span className="text-xs text-slate-400 font-mono">{tickets.length} total</span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-slate-500">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading tickets...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No tickets open. You can create one anytime.
              </div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{t.subject}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'closed'
                        ? 'bg-slate-800 text-slate-400'
                        : t.status === 'answered'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{t.message}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
