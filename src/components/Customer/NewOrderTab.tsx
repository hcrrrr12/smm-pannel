import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Tag, 
  Link as LinkIcon, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  QrCode, 
  FileText, 
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Service, Category, Order } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface NewOrderTabProps {
  onOpenDeposit: (amount?: number) => void;
  onViewInvoice: (orderId: number) => void;
  onGoToOrders: () => void;
  onGoToServices: () => void;
}

export const NewOrderTab: React.FC<NewOrderTabProps> = ({
  onOpenDeposit,
  onViewInvoice,
  onGoToOrders,
  onGoToServices
}) => {
  const { user, formatMoney, refreshUser, updateLocalBalance } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  
  const [link, setLink] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [couponCode, setCouponCode] = useState<string>('');
  const [customComments, setCustomComments] = useState<string>('');
  
  const [couponLoading, setCouponLoading] = useState<boolean>(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{ order: Order; invoiceNumber: string } | null>(null);

  // Fetch categories and services
  useEffect(() => {
    const loadData = async () => {
      try {
        const [catRes, srvRes] = await Promise.all([
          api.getCategories(),
          api.getServices()
        ]);
        setCategories(catRes.categories);
        setServices(srvRes.services);

        if (catRes.categories.length > 0) {
          setSelectedCategory(catRes.categories[0].id);
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    };
    loadData();
  }, []);

  // Filter services by category
  const filteredServices = services.filter(s => s.category_id === selectedCategory);

  // Auto-select first service when category changes
  useEffect(() => {
    if (filteredServices.length > 0) {
      setSelectedServiceId(filteredServices[0].id);
      setQuantity(Math.max(filteredServices[0].min_qty, 1000));
    } else {
      setSelectedServiceId(null);
    }
  }, [selectedCategory, services]);

  const currentService = services.find(s => s.id === selectedServiceId);

  // Update quantity when comments change (if custom comments)
  useEffect(() => {
    if (currentService?.type === 'custom_comments') {
      const lines = customComments.split('\n').filter(l => l.trim().length > 0);
      setQuantity(Math.max(currentService.min_qty, lines.length));
    }
  }, [customComments, currentService]);

  // Base Calculation
  const baseCharge = currentService ? (quantity / 1000) * currentService.rate_per_1000 : 0;
  const discountAmount = appliedCoupon ? appliedCoupon.calculatedDiscount : 0;
  const finalCharge = Math.max(0, Math.round((baseCharge - discountAmount) * 100) / 100);
  const shortfall = user ? Math.max(0, finalCharge - user.balance) : finalCharge;

  // Validate coupon handler
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setCouponLoading(true);
      setCouponError(null);
      const res = await api.validateCoupon(couponCode.trim(), baseCharge);
      if (res.valid) {
        setAppliedCoupon(res.coupon);
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setOrderError('Please sign in to place an order.');
      return;
    }

    if (!selectedServiceId || !link.trim() || quantity <= 0) {
      setOrderError('Please fill in all required fields.');
      return;
    }

    if (user.balance < finalCharge) {
      setOrderError(`Insufficient balance. You need ₹${shortfall.toFixed(2)} more to place this order.`);
      return;
    }

    try {
      setSubmitting(true);
      setOrderError(null);
      const res = await api.createOrder({
        service_id: selectedServiceId,
        link: link.trim(),
        quantity: quantity,
        coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
        custom_comments: currentService?.type === 'custom_comments' ? customComments : undefined
      });

      setOrderSuccess({ order: res.order, invoiceNumber: res.invoiceNumber });
      updateLocalBalance(res.newBalance);
      await refreshUser();
      
      // Reset form fields
      setLink('');
      setCustomComments('');
      setAppliedCoupon(null);
      setCouponCode('');
    } catch (err: any) {
      setOrderError(err.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Success Alert / Modal View */}
      {orderSuccess && (
        <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 mt-0.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Order #{orderSuccess.order.id} Placed Successfully!</h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                Workflow status: <span className="font-semibold uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded-md text-[10px] text-emerald-300">Pending Execution</span>
              </p>
              <p className="text-xs text-slate-300 mt-1 font-mono">Invoice: {orderSuccess.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onViewInvoice(orderSuccess.order.id)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Invoice</span>
            </button>
            <button
              onClick={() => {
                setOrderSuccess(null);
                onGoToOrders();
              }}
              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors border border-slate-700"
            >
              Order History
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Order Form */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">New Campaign Order</h2>
                <p className="text-xs text-slate-400">Select target platform, service, and enter campaign link</p>
              </div>
            </div>
            <button
              onClick={onGoToServices}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Full Price List →
            </button>
          </div>

          {/* Platform / Category Selector Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              1. Select Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400/30'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 opacity-80" />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handlePlaceOrder} className="space-y-5">
            {/* Service Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                2. Select Service
              </label>
              <select
                id="service-dropdown"
                value={selectedServiceId || ''}
                onChange={(e) => setSelectedServiceId(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              >
                {filteredServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatMoney(s.rate_per_1000)} / 1K (Min: {s.min_qty} • Max: {s.max_qty.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Service Description Box */}
            {currentService?.description && (
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">Service Details:</span>
                  <p className="text-slate-300">{currentService.description}</p>
                </div>
              </div>
            )}

            {/* Target Link Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                3. Campaign Target Link
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="order-link-input"
                  type="url"
                  required
                  placeholder="https://instagram.com/username or https://youtu.be/video_id"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Quantity Input */}
            {currentService?.type !== 'custom_comments' ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    4. Quantity
                  </label>
                  {currentService && (
                    <span className="text-[11px] text-slate-400">
                      Min: <span className="text-white font-mono">{currentService.min_qty}</span> • Max: <span className="text-white font-mono">{currentService.max_qty.toLocaleString()}</span>
                    </span>
                  )}
                </div>
                <input
                  id="order-quantity-input"
                  type="number"
                  required
                  min={currentService?.min_qty || 10}
                  max={currentService?.max_qty || 100000}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  4. Custom Comments (1 per line)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Great post!🔥&#10;Love this content!👏&#10;Keep it up!🚀"
                  value={customComments}
                  onChange={(e) => setCustomComments(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Total comments detected: <span className="font-bold text-white">{quantity}</span>
                </p>
              </div>
            )}

            {/* Coupon Code Engine */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                5. Discount Coupon (Optional)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="coupon-input"
                    type="text"
                    placeholder="Try WELCOME10, BOOST20, KRITAN50"
                    value={couponCode}
                    disabled={Boolean(appliedCoupon)}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 disabled:opacity-60"
                  />
                </div>
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/30 transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    {couponLoading ? 'Checking...' : 'Apply'}
                  </button>
                )}
              </div>

              {appliedCoupon && (
                <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Coupon {appliedCoupon.code} applied! Saved {formatMoney(appliedCoupon.calculatedDiscount)}</span>
                </div>
              )}

              {couponError && (
                <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{couponError}</span>
                </div>
              )}
            </div>

            {orderError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{orderError}</span>
                </div>
                {shortfall > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenDeposit(Math.ceil(shortfall))}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg whitespace-nowrap shadow-xs"
                  >
                    Add ₹{Math.ceil(shortfall)} via QR
                  </button>
                )}
              </div>
            )}

            {/* Place Order CTA */}
            <button
              id="place-order-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 disabled:opacity-60 text-white font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Place Campaign Order — {formatMoney(finalCharge)}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Real-time Order Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
              Live Order Breakdown
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Selected Service:</span>
                <span className="text-slate-200 font-semibold text-right truncate max-w-[170px]">
                  {currentService?.name || 'None'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Rate per 1000:</span>
                <span className="text-slate-200 font-mono font-medium">
                  {currentService ? formatMoney(currentService.rate_per_1000) : '₹0.00'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Quantity:</span>
                <span className="text-slate-200 font-mono font-bold">{quantity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="text-slate-200 font-mono">{formatMoney(baseCharge)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Coupon Discount:</span>
                  <span className="font-mono">-{formatMoney(discountAmount)}</span>
                </div>
              )}
              
              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                <span className="text-white">Total Charge:</span>
                <span className="text-indigo-400 text-base font-mono font-black">{formatMoney(finalCharge)}</span>
              </div>
            </div>

            {/* Wallet Status */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-slate-400">Your Wallet Balance:</span>
                <span className="font-mono font-bold text-white">
                  {user ? formatMoney(user.balance) : '₹0.00'}
                </span>
              </div>

              {shortfall > 0 ? (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                    <span>Shortfall of {formatMoney(shortfall)} to place this order.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDeposit(Math.ceil(shortfall))}
                    className="w-full py-2 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Add Funds via Dynamic QR</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sufficient balance for instant order delivery.</span>
                </div>
              )}
            </div>
          </div>

          {/* Guarantee Badges */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-3 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>SocialWave Delivery Standards</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Instant dispatch via high-speed API gateways</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>Automatic full refund if order fails or is cancelled</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Automated digital tax invoice generated for every order</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
