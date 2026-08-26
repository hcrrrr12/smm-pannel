import React, { useState } from 'react';
import { 
  Wallet, 
  PlusCircle, 
  MessageCircle, 
  ShieldCheck, 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  Globe, 
  ChevronDown,
  Layers,
  Sparkles,
  ShoppingBag,
  Clock,
  Code2,
  HeadphonesIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenDeposit: () => void;
  onOpenAuth: () => void;
  isAdminView: boolean;
  setIsAdminView: (isAdmin: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenDeposit,
  onOpenAuth,
  isAdminView,
  setIsAdminView
}) => {
  const { user, logout, currency, setCurrency, formatMoney, quickLoginDemo } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleWhatsAppHelp = () => {
    const text = encodeURIComponent('Hi Kritan, I need support with SocialWave SMM Panel.');
    window.open(`https://wa.me/918918145186?text=${text}`, '_blank');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsAdminView(false);
                setCurrentTab('new-order');
              }}
              className="flex items-center gap-2.5 text-left focus:outline-hidden"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-black text-lg shadow-inner">
                S
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                    SocialWave
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    SMM
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">Automated Growth Engine</p>
              </div>
            </button>

            {/* Admin toggle if authorized */}
            {user?.role === 'admin' && (
              <div className="ml-4 pl-4 border-l border-slate-800 hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl">
                <button
                  id="tab-customer-view-toggle"
                  onClick={() => setIsAdminView(false)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    !isAdminView ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Customer View
                </button>
                <button
                  id="tab-admin-portal-toggle"
                  onClick={() => setIsAdminView(true)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    isAdminView ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Panel</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Currency Selector */}
            <div className="flex items-center rounded-lg bg-slate-800 p-0.5 text-xs font-bold border border-slate-700">
              <button
                onClick={() => setCurrency('INR')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  currency === 'INR' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ₹ INR
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  currency === 'USD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                $ USD
              </button>
            </div>

            {/* WhatsApp Direct Help */}
            <button
              id="nav-whatsapp-btn"
              onClick={handleWhatsAppHelp}
              title="Chat with Kritan on WhatsApp (+91 8918145186)"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp Support</span>
            </button>

            {/* Wallet Balance & Add Funds */}
            {user ? (
              <div className="flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-slate-800">
                <div className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-none">Balance</span>
                    <span className="text-xs font-bold text-white font-mono leading-tight">
                      {formatMoney(user.balance)}
                    </span>
                  </div>
                </div>

                <button
                  id="nav-add-funds-btn"
                  onClick={onOpenDeposit}
                  title="Dynamic UPI QR Deposit"
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Funds</span>
                </button>
              </div>
            ) : (
              <button
                id="nav-signin-btn"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            )}

            {/* User Profile / Quick Switcher */}
            {user && (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl py-2 z-50 text-slate-300 text-xs">
                    <div className="px-4 py-2.5 border-b border-slate-800">
                      <p className="font-bold text-white text-sm truncate">{user.name}</p>
                      <p className="text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {user.role === 'admin' ? 'Administrator' : 'Customer'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">ID: #{user.id}</span>
                      </div>
                    </div>

                    <div className="p-1">
                      {user.role === 'admin' && (
                        <button
                          onClick={() => {
                            setIsAdminView(!isAdminView);
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 text-left"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-400" />
                          <span>{isAdminView ? 'Switch to Customer View' : 'Switch to Admin Panel'}</span>
                        </button>
                      )}

                      {/* Demo Switch Shortcuts */}
                      <div className="my-1 border-t border-slate-800/80 pt-1">
                        <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Switch Demo Account
                        </p>
                        <button
                          onClick={async () => {
                            await quickLoginDemo('admin');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 text-left text-xs"
                        >
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          <span>Admin (Kritan Chettri)</span>
                        </button>
                        <button
                          onClick={async () => {
                            await quickLoginDemo('customer');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 text-left text-xs"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Demo Marketer</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-800 pt-1 mt-1">
                        <button
                          onClick={() => {
                            logout();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
