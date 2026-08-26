import React, { useState } from 'react';
import { 
  AuthProvider, 
  useAuth 
} from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { NewOrderTab } from './components/Customer/NewOrderTab';
import { OrdersTab } from './components/Customer/OrdersTab';
import { ServicesTab } from './components/Customer/ServicesTab';
import { WalletTab } from './components/Customer/WalletTab';
import { ApiDocsTab } from './components/Customer/ApiDocsTab';
import { SupportTab } from './components/Customer/SupportTab';

// Admin Components
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminOrders } from './components/Admin/AdminOrders';
import { AdminServices } from './components/Admin/AdminServices';
import { AdminUsers } from './components/Admin/AdminUsers';
import { AdminCoupons } from './components/Admin/AdminCoupons';
import { AdminTransactions } from './components/Admin/AdminTransactions';
import { AdminProviders } from './components/Admin/AdminProviders';
import { AdminSettings } from './components/Admin/AdminSettings';

// Global Modals
import { UpiDepositModal } from './components/UpiDepositModal';
import { InvoiceModal } from './components/InvoiceModal';
import { AuthModal } from './components/AuthModal';

import { 
  ShoppingBag, 
  Clock, 
  Layers, 
  Wallet, 
  Code2, 
  HeadphonesIcon, 
  MessageCircle, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  FileText, 
  Globe, 
  Settings as SettingsIcon,
  Phone,
  Mail,
  ExternalLink
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  
  // Navigation State
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<string>('new-order');
  
  // Modals
  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);
  const [depositDefaultAmount, setDepositDefaultAmount] = useState<number>(500);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [invoiceOrderId, setInvoiceOrderId] = useState<number | null>(null);

  const handleOpenDeposit = (amount?: number) => {
    if (amount) setDepositDefaultAmount(amount);
    setDepositModalOpen(true);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent('Hi Kritan, I am contacting you from SocialWave SMM Panel.');
    window.open(`https://wa.me/918918145186?text=${text}`, '_blank');
  };

  const customerNavItems = [
    { id: 'new-order', label: 'New Order', icon: ShoppingBag },
    { id: 'orders', label: 'Order History', icon: Clock },
    { id: 'services', label: 'Services & Pricing', icon: Layers },
    { id: 'wallet', label: 'Wallet & Topup', icon: Wallet },
    { id: 'api', label: 'API v2 Docs', icon: Code2 },
    { id: 'support', label: 'Support & Help', icon: HeadphonesIcon },
  ];

  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Overview', icon: ShieldCheck },
    { id: 'admin-orders', label: 'Orders & Fulfillment', icon: ShoppingBag },
    { id: 'admin-services', label: 'Service Pricing', icon: Layers },
    { id: 'admin-users', label: 'Users & Wallets', icon: Users },
    { id: 'admin-coupons', label: 'Coupon Codes', icon: Sparkles },
    { id: 'admin-transactions', label: 'Financial Ledger', icon: FileText },
    { id: 'admin-providers', label: 'API Gateways', icon: Globe },
    { id: 'admin-settings', label: 'System Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenDeposit={() => handleOpenDeposit()}
        onOpenAuth={() => setAuthModalOpen(true)}
        isAdminView={isAdminView}
        setIsAdminView={setIsAdminView}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80">
          {!isAdminView ? (
            customerNavItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })
          ) : (
            adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-1 ring-purple-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Dynamic Tab Body */}
        <div className="pt-2">
          {!isAdminView ? (
            <>
              {currentTab === 'new-order' && (
                <NewOrderTab
                  onOpenDeposit={handleOpenDeposit}
                  onViewInvoice={(id) => setInvoiceOrderId(id)}
                  onGoToOrders={() => setCurrentTab('orders')}
                  onGoToServices={() => setCurrentTab('services')}
                />
              )}
              {currentTab === 'orders' && (
                <OrdersTab
                  onViewInvoice={(id) => setInvoiceOrderId(id)}
                  onReorder={() => setCurrentTab('new-order')}
                />
              )}
              {currentTab === 'services' && (
                <ServicesTab
                  onSelectServiceForOrder={() => setCurrentTab('new-order')}
                />
              )}
              {currentTab === 'wallet' && (
                <WalletTab
                  onOpenDepositModal={() => handleOpenDeposit()}
                />
              )}
              {currentTab === 'api' && <ApiDocsTab />}
              {currentTab === 'support' && <SupportTab />}
            </>
          ) : (
            <>
              {currentTab === 'admin-dashboard' && (
                <AdminDashboard
                  onNavigateTab={(t) => setCurrentTab(t)}
                  onViewInvoice={(id) => setInvoiceOrderId(id)}
                />
              )}
              {currentTab === 'admin-orders' && (
                <AdminOrders
                  onViewInvoice={(id) => setInvoiceOrderId(id)}
                />
              )}
              {currentTab === 'admin-services' && <AdminServices />}
              {currentTab === 'admin-users' && <AdminUsers />}
              {currentTab === 'admin-coupons' && <AdminCoupons />}
              {currentTab === 'admin-transactions' && <AdminTransactions />}
              {currentTab === 'admin-providers' && <AdminProviders />}
              {currentTab === 'admin-settings' && <AdminSettings />}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-8 text-xs text-slate-500 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-bold text-slate-400 text-sm">SocialWave SMM Platform</p>
            <p className="text-xs text-slate-500 mt-0.5">Automated High-Performance Social Media Reseller Engine</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Admin: Kritan Chettri • Email: kritanchettri32@gmail.com • UPI: 8918145816@fam • Phone: +91 8918145186
            </p>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={handleWhatsApp} className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>WhatsApp</span>
            </button>
            <a href="mailto:kritanchettri32@gmail.com" className="hover:text-indigo-400 transition-colors flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Email Support</span>
            </a>
            <button onClick={() => setCurrentTab('api')} className="hover:text-white transition-colors flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5" />
              <span>API Docs</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Support Button */}
      <button
        id="floating-whatsapp-btn"
        onClick={handleWhatsApp}
        title="Chat on WhatsApp (+91 8918145186)"
        className="fixed bottom-6 right-6 z-40 p-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group print:hidden"
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-black">
          Chat with Kritan
        </span>
      </button>

      {/* Modals */}
      <UpiDepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        defaultAmount={depositDefaultAmount}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {invoiceOrderId !== null && (
        <InvoiceModal
          orderId={invoiceOrderId}
          onClose={() => setInvoiceOrderId(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
