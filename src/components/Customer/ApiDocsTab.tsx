import React, { useState } from 'react';
import { Code2, Copy, Check, Key, Terminal, Send, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export const ApiDocsTab: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const apiKey = user?.api_key || 'smm_live_usr_demo_key_9921';
  const baseUrl = window.location.origin;

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copyCurlCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCurl(id);
    setTimeout(() => setCopiedCurl(null), 2000);
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm('Are you sure you want to regenerate your API Key? Any existing scripts will need to be updated.')) return;
    try {
      setRegenerating(true);
      await api.regenerateApiKey();
      await refreshUser();
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };

  const codeSnippets = [
    {
      id: 'add_order',
      title: '1. Add Campaign Order (action: add)',
      description: 'Places a new campaign order and deducts balance atomically.',
      curl: `curl -X POST ${baseUrl}/api/v2 \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${apiKey}",
    "action": "add",
    "service": 1,
    "link": "https://instagram.com/growth_viral_brand",
    "quantity": 1000
  }'`
    },
    {
      id: 'order_status',
      title: '2. Check Single Order Status (action: status)',
      description: 'Returns real-time execution status, start count, and remains.',
      curl: `curl -X POST ${baseUrl}/api/v2 \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${apiKey}",
    "action": "status",
    "order": 1001
  }'`
    },
    {
      id: 'multiple_status',
      title: '3. Multiple Orders Status (action: status with orders list)',
      description: 'Fetches status for up to 100 comma-separated order IDs.',
      curl: `curl -X POST ${baseUrl}/api/v2 \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${apiKey}",
    "action": "status",
    "orders": "1001,1002,1003"
  }'`
    },
    {
      id: 'service_list',
      title: '4. Service List (action: services)',
      description: 'Returns JSON array of all active services, rates, min/max limits, and dripfeed flags.',
      curl: `curl -X POST ${baseUrl}/api/v2 \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${apiKey}",
    "action": "services"
  }'`
    },
    {
      id: 'user_balance',
      title: '5. Account Balance (action: balance)',
      description: 'Returns your current wallet balance.',
      curl: `curl -X POST ${baseUrl}/api/v2 \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "${apiKey}",
    "action": "balance"
  }'`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header & API Key Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Standard SMM API v2 Documentation</h2>
              <p className="text-xs text-slate-400">Industry-standard SMM API specification. Compatible with any reseller script.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            HTTP POST • JSON
          </span>
        </div>

        {/* User API Key Display */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Your Personal API Key</span>
            </div>
            <p className="font-mono text-sm font-bold text-indigo-300 break-all">{apiKey}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={copyKey}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copied' : 'Copy API Key'}</span>
            </button>
            <button
              onClick={handleRegenerateKey}
              disabled={regenerating}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
              title="Regenerate API Key"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Endpoint Blocks */}
      <div className="space-y-6">
        {codeSnippets.map((snippet) => (
          <div key={snippet.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{snippet.title}</h3>
                <p className="text-xs text-slate-400">{snippet.description}</p>
              </div>
              <button
                onClick={() => copyCurlCode(snippet.id, snippet.curl)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                {copiedCurl === snippet.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl === snippet.id ? 'Copied cURL' : 'Copy cURL'}</span>
              </button>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 overflow-x-auto">
              <pre className="font-mono text-xs text-indigo-300 leading-relaxed">
                <code>{snippet.curl}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
