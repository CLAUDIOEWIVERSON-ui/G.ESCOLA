'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { fetchWithAuth } from '@/lib/api';
import { Plus, Search, Layers, Trash2, Pencil, Loader2, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';

interface Widget {
  id: string;
  name: string;
  type: string;
  config: any;
  active: boolean;
  created_at: string;
}

export default function WidgetsPage() {
  const { t, language } = useI18n();
  const { profile } = useUser();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentWidget, setCurrentWidget] = useState<Partial<Widget> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchWidgets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/widgets');
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setWidgets(data || []);
    } catch (err: any) {
      console.error('Error fetching widgets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchWidgets();
    };
    init();
  }, [fetchWidgets]);

  const handleOpenModal = (widget: Partial<Widget> | null = null) => {
    setCurrentWidget(widget || { 
      name: '', 
      type: 'chart',
      config: {},
      active: true
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = currentWidget?.id ? 'PUT' : 'POST';
      const response = await fetchWithAuth('/api/widgets', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentWidget)
      });
      
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      setIsModalOpen(false);
      fetchWidgets();
    } catch (err: any) {
      console.error('Save error:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.common.deleteConfirm)) return;
    setDeleting(id);
    try {
      const response = await fetchWithAuth(`/api/widgets?id=${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      
      setWidgets(widgets.filter(w => w.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filteredWidgets = widgets.filter(w => 
    (w.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t.widgets.title}</h2>
          <p className="text-slate-500 text-sm mt-1">{t.widgets.subtitle}</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
        >
          <Plus size={18} />
          {t.widgets.add}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t.common.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">{t.widgets.name}</th>
                <th className="px-6 py-4">{t.widgets.type}</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : filteredWidgets.length > 0 ? (
                filteredWidgets.map((widget) => (
                  <tr key={widget.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                          <Layers size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{widget.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">ID: {widget.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                        {widget.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        widget.active ? "bg-green-50 text-green-700 border border-green-100" : "bg-slate-50 text-slate-500 border border-slate-100"
                      )}>
                        {widget.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 pr-2">
                        <button 
                          onClick={() => handleOpenModal(widget)}
                          className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          disabled={deleting === widget.id}
                          onClick={() => handleDelete(widget.id)}
                          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                        >
                          {deleting === widget.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm font-medium">
                    {t.widgets.noWidgets}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentWidget?.id ? t.common.edit : t.widgets.add}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.widgets.name}</label>
            <input
              required
              type="text"
              value={currentWidget?.name || ''}
              onChange={(e) => setCurrentWidget({ ...currentWidget, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.widgets.type}</label>
              <select
                value={currentWidget?.type || 'chart'}
                onChange={(e) => setCurrentWidget({ ...currentWidget, type: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all"
              >
                <option value="chart">Gráfico</option>
                <option value="stats">Estatísticas</option>
                <option value="list">Lista</option>
                <option value="weather">Clima</option>
              </select>
            </div>
            <div className="space-y-1.5 flex items-end pb-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={currentWidget?.active ?? true}
                  onChange={(e) => setCurrentWidget({ ...currentWidget, active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500/20"
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ativo</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.widgets.config} (JSON)</label>
            <textarea
              rows={4}
              value={JSON.stringify(currentWidget?.config || {}, null, 2)}
              onChange={(e) => {
                try {
                  const config = JSON.parse(e.target.value);
                  setCurrentWidget({ ...currentWidget, config });
                } catch (err) {
                  // Ignore invalid JSON while typing
                }
              }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-xs font-mono transition-all"
              placeholder="{}"
            />
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {t.common.save}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
