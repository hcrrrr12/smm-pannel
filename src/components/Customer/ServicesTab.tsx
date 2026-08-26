import React, { useState, useEffect } from 'react';
import { Layers, Search, ShoppingBag, Info, Sparkles, Filter } from 'lucide-react';
import { Service, Category } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface ServicesTabProps {
  onSelectServiceForOrder: (serviceId: number) => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ onSelectServiceForOrder }) => {
  const { formatMoney } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [catRes, srvRes] = await Promise.all([
          api.getCategories(),
          api.getServices()
        ]);
        setCategories(catRes.categories);
        setServices(srvRes.services);
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredServices = services.filter((s) => {
    const matchCategory = selectedCategory === 'all' || s.category_id === parseInt(selectedCategory);
    const matchSearch =
      searchTerm === '' ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.category_name && s.category_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.id.toString().includes(searchTerm);
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Services & Pricing Catalog</h2>
            <p className="text-xs text-slate-400">Transparent rates, non-drop quality guarantees, and minimum/maximum order parameters</p>
          </div>
          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
            {services.length} Active Services
          </span>
        </div>

        {/* Filter by Category & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Platforms
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id.toString())}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  selectedCategory === cat.id.toString()
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Service Details</th>
                <th className="py-3.5 px-4 text-right">Rate / 1000</th>
                <th className="py-3.5 px-4 text-center">Min / Max</th>
                <th className="py-3.5 px-4 text-center">Drip Feed</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading service catalog...</span>
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Info className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-300">No services match your filter</p>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 font-mono text-slate-500 font-bold whitespace-nowrap">
                      #{service.id}
                    </td>

                    <td className="py-4 px-4 max-w-md">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {service.category_name || 'Social'}
                        </span>
                        {service.type === 'custom_comments' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Custom Text
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-white text-sm leading-snug">{service.name}</p>
                      {service.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{service.description}</p>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right font-mono font-extrabold text-sm text-indigo-400 whitespace-nowrap">
                      {formatMoney(service.rate_per_1000)}
                    </td>

                    <td className="py-4 px-4 text-center font-mono text-slate-300 whitespace-nowrap">
                      <span className="font-bold">{service.min_qty}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="font-bold">{service.max_qty.toLocaleString()}</span>
                    </td>

                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {service.drip_feed_enabled ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                          Supported
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-slate-500 text-[10px]">
                          No
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectServiceForOrder(service.id)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5 ml-auto"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Order</span>
                      </button>
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
