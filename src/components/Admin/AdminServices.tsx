import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, Check, X, Search, Sparkles, RefreshCw } from 'lucide-react';
import { Service, Category } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

export const AdminServices: React.FC = () => {
  const { formatMoney } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal for add/edit service
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [ratePer1000, setRatePer1000] = useState<number>(100);
  const [minQty, setMinQty] = useState<number>(100);
  const [maxQty, setMaxQty] = useState<number>(100000);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('default');
  const [dripFeed, setDripFeed] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  // Category management
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, srvRes] = await Promise.all([
        api.getCategories(),
        api.getAdminServices()
      ]);
      setCategories(catRes.categories);
      setServices(srvRes.services);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingServiceId(null);
    setName('');
    setCategoryId(categories[0]?.id || 1);
    setRatePer1000(150);
    setMinQty(100);
    setMaxQty(50000);
    setDescription('');
    setType('default');
    setDripFeed(true);
    setServiceModalOpen(true);
  };

  const handleOpenEdit = (srv: Service) => {
    setEditingServiceId(srv.id);
    setName(srv.name);
    setCategoryId(srv.category_id);
    setRatePer1000(srv.rate_per_1000);
    setMinQty(srv.min_qty);
    setMaxQty(srv.max_qty);
    setDescription(srv.description || '');
    setType(srv.type || 'default');
    setDripFeed(Boolean(srv.drip_feed_enabled));
    setServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingServiceId) {
        await api.updateService(editingServiceId, {
          name,
          category_id: categoryId,
          rate_per_1000: ratePer1000,
          min_qty: minQty,
          max_qty: maxQty,
          description,
          type,
          drip_feed_enabled: dripFeed ? 1 : 0
        });
      } else {
        await api.createService({
          name,
          category_id: categoryId,
          rate_per_1000: ratePer1000,
          min_qty: minQty,
          max_qty: maxQty,
          description,
          type,
          drip_feed_enabled: dripFeed ? 1 : 0
        });
      }
      setServiceModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.deleteService(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete service');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setAddingCat(true);
      await api.createCategory({ name: newCatName.trim() });
      setNewCatName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    } finally {
      setAddingCat(false);
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.category_name && s.category_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Service Catalog & Margin Control</h2>
            <p className="text-xs text-slate-400">Configure rates per 1,000 units, min/max quantity limits, and platform categories</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Service</span>
            </button>
          </div>
        </div>

        {/* Categories Bar & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          {/* Create Category inline */}
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="+ New Platform Category"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500/40"
            />
            <button
              type="submit"
              disabled={addingCat || !newCatName.trim()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-bold rounded-xl border border-slate-700 disabled:opacity-50"
            >
              Add
            </button>
          </form>

          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Category & Service Name</th>
                <th className="py-3.5 px-4 text-right">Rate / 1000</th>
                <th className="py-3.5 px-4 text-center">Min / Max</th>
                <th className="py-3.5 px-4 text-center">Type</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading services...</span>
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    No services found.
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500">#{srv.id}</td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 mr-2">
                        {srv.category_name}
                      </span>
                      <p className="font-bold text-white text-xs mt-1">{srv.name}</p>
                      {srv.description && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{srv.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-purple-400 whitespace-nowrap">
                      {formatMoney(srv.rate_per_1000)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-300 whitespace-nowrap">
                      {srv.min_qty} - {srv.max_qty.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {srv.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(srv)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(srv.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Modal */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base">
                {editingServiceId ? `Edit Service #${editingServiceId}` : 'Add New Service'}
              </h3>
              <button onClick={() => setServiceModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Platform Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instagram Real Followers [Non-Drop]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Rate / 1000 (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={ratePer1000}
                    onChange={(e) => setRatePer1000(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Min Quantity</label>
                  <input
                    type="number"
                    required
                    value={minQty}
                    onChange={(e) => setMinQty(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Max Quantity</label>
                  <input
                    type="number"
                    required
                    value={maxQty}
                    onChange={(e) => setMaxQty(parseInt(e.target.value) || 100000)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1">Description & Delivery SLA</label>
                <textarea
                  rows={3}
                  placeholder="Speed: 5K/day, Start: Instant, Guaranteed refill..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="default">Default</option>
                    <option value="custom_comments">Custom Comments</option>
                    <option value="package">Package</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1">Drip-Feed Support</label>
                  <select
                    value={dripFeed ? '1' : '0'}
                    onChange={(e) => setDripFeed(e.target.value === '1')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="1">Enabled</option>
                    <option value="0">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 font-bold text-white rounded-xl shadow-xs"
                >
                  {saving ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
