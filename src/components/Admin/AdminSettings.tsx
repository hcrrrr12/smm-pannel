import React, { useState, useEffect } from 'react';
import { Settings, Send, MessageCircle, QrCode, Mail, Phone, ShieldCheck, Check, AlertCircle, Save } from 'lucide-react';
import { api } from '../../api';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminSettings();
      setSettings(res.settings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg(null);
      await api.updateAdminSettings(settings);
      setMsg({ type: 'success', text: 'System settings saved successfully.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      setTestSending(true);
      setMsg(null);
      const res = await api.testTelegramAlert('🔔 [Test Alert] SocialWave SMM Panel notifications are active!');
      if (res.sent) {
        setMsg({ type: 'success', text: 'Test message sent to Telegram bot successfully!' });
      } else {
        setMsg({ type: 'error', text: res.reason || 'Telegram bot token or chat ID not configured in .env' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Telegram test failed' });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">System & Support Configuration</h2>
            <p className="text-xs text-slate-400">Configure administrator UPI payout ID, Telegram push notifications, and WhatsApp support</p>
          </div>
          <button
            onClick={handleTestTelegram}
            disabled={testSending}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{testSending ? 'Sending...' : 'Test Telegram Alert'}</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl text-xs font-medium ${
          msg.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Administrator UPI & Invoice Credentials */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <QrCode className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">UPI Dynamic Payment & Invoice Seller Info</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Payee Name</label>
              <input
                type="text"
                value={settings.admin_name || 'Kritan Chettri'}
                onChange={(e) => handleChange('admin_name', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">UPI ID (For Dynamic QR)</label>
              <input
                type="text"
                value={settings.upi_id || '8918145816@fam'}
                onChange={(e) => handleChange('upi_id', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-indigo-300"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Official Email Desk</label>
              <input
                type="email"
                value={settings.admin_email || 'kritanchettri32@gmail.com'}
                onChange={(e) => handleChange('admin_email', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Phone / WhatsApp Number</label>
              <input
                type="text"
                value={settings.admin_phone || '+91 8918145186'}
                onChange={(e) => handleChange('admin_phone', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Telegram Notifications Integration */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Send className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Telegram Admin Notifications Integration</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Telegram Bot Token</label>
              <input
                type="password"
                placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                value={settings.telegram_bot_token || ''}
                onChange={(e) => handleChange('telegram_bot_token', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase mb-1">Telegram Chat ID</label>
              <input
                type="text"
                placeholder="e.g. 123456789"
                value={settings.telegram_chat_id || ''}
                onChange={(e) => handleChange('telegram_chat_id', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            When enabled, real-time alerts are pushed directly to your Telegram channel for new orders, manual UPI UTR submissions, and customer support tickets.
          </p>
        </div>

        {/* Save CTA */}
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes...' : 'Save System Settings'}</span>
        </button>
      </form>
    </div>
  );
};
