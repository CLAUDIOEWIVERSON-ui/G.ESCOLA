'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  MoreVertical, 
  Trash2, 
  Edit2,
  Bell,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  cor: string;
  created_at: string;
}

export default function CalendarPage() {
  const { t } = useI18n();
  const { isAdmin } = useUser();
  const isReadOnly = !isAdmin;
  
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Evento | null>(null);
  const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    cor: 'bg-blue-600'
  });

  const fetchEventos = async () => {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('data', { ascending: true });
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          console.warn('Aviso: Tabela "eventos" não encontrada. Execute a migração SQL para habilitar este recurso.');
          return;
        }
        throw error;
      }
      setEventos(data || []);
    } catch (error: any) {
      console.error('Error fetching events:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('eventos')
          .select('*')
          .order('data', { ascending: true });
        
        if (error) {
          if (error.code === '42P01' || error.code === 'PGRST205') {
            console.warn('Aviso: Tabela "eventos" não encontrada. Execute a migração SQL para habilitar este recurso.');
            return;
          }
          throw error;
        }
        if (isMounted) setEventos(data || []);
      } catch (error: any) {
        console.error('Error fetching events:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    // Ensure we send a valid timestamp to Postgres
    const timestamp = new Date(`${formData.data}T12:00:00`).toISOString();

    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('eventos')
          .update({
            titulo: formData.titulo,
            descricao: formData.descricao,
            data: timestamp,
            cor: formData.cor
          })
          .eq('id', editingEvent.id);
        if (error) throw error;
        toast.success(t.calendar.eventUpdated);
      } else {
        const { error } = await supabase
          .from('eventos')
          .insert([{
            titulo: formData.titulo,
            descricao: formData.descricao,
            data: timestamp,
            cor: formData.cor
          }]);
        if (error) throw error;
        toast.success(t.calendar.eventAdded);
      }

      setIsModalOpen(false);
      setEditingEvent(null);
      setFormData({
        titulo: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0],
        cor: 'bg-blue-600'
      });
      fetchEventos();
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error(error.message || 'Erro ao salvar evento');
    }
  };

  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success(t.calendar.eventDeleted);
      setEventToDelete(null);
      await fetchEventos();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error(error.message || 'Erro ao excluir evento');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (evento: Evento) => {
    setEditingEvent(evento);
    setFormData({
      titulo: evento.titulo,
      descricao: evento.descricao,
      data: evento.data.split('T')[0],
      cor: evento.cor
    });
    setIsModalOpen(true);
  };

  const openViewModal = (evento: Evento) => {
    setViewingEvent(evento);
  };

  const filteredEventos = eventos.filter(e => 
    e.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.descricao || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const colors = [
    { name: 'Azul', value: 'bg-blue-600' },
    { name: 'Roxo', value: 'bg-purple-600' },
    { name: 'Verde', value: 'bg-emerald-600' },
    { name: 'Amarelo', value: 'bg-amber-500' },
    { name: 'Vermelho', value: 'bg-rose-600' },
    { name: 'Indigo', value: 'bg-indigo-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-blue-600 drop-shadow-[0_0_10px_rgba(37,99,235,0.5)] uppercase tracking-tight">{t.calendar.title}</h2>
          <p className="text-sm text-slate-500">{t.calendar.subtitle}</p>
        </div>
        {!isReadOnly && (
          <button 
            onClick={() => {
              setEditingEvent(null);
              setFormData({
                titulo: '',
                descricao: '',
                data: new Date().toISOString().split('T')[0],
                cor: 'bg-blue-600'
              });
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            {t.calendar.newEvent}
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={t.common.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-slate-50 rounded-xl animate-pulse border border-slate-100" />
            ))
          ) : filteredEventos.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 italic">
              {t.calendar.noEvents}
            </div>
          ) : (
            filteredEventos.map((evento) => {
              const eventDate = new Date(evento.data);
              const today = new Date();
              today.setHours(0,0,0,0);
              const diffTime = eventDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isUpcoming = diffDays >= 0 && diffDays <= 7;
              const isToday = diffDays === 0;

              return (
                <motion.div 
                  key={evento.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => openViewModal(evento)}
                  className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className={cn("h-2", evento.cor)} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg text-white", evento.cor)}>
                          <CalendarIcon size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {eventDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            {eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                          </span>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <div className="flex items-center gap-1">
                          {eventToDelete === evento.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-100">
                              <button 
                                type="button"
                                onClick={() => handleDelete(evento.id)}
                                className="p-1 px-2 text-[10px] font-bold text-rose-600 hover:bg-rose-100 rounded"
                              >
                                {t.common.confirm || 'Sim'}
                              </button>
                              <button 
                                type="button"
                                onClick={() => setEventToDelete(null)}
                                className="p-1 px-2 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded"
                              >
                                {t.common.cancel || 'Não'}
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(evento);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title={t.common.edit}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEventToDelete(evento.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title={t.common.delete}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-slate-800 mb-2 truncate">{evento.titulo}</h4>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4 h-10">{evento.descricao || t.common.noneFound}</p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-tight">
                          {eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {isUpcoming && (
                        <div className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                          isToday ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-emerald-100 text-emerald-700"
                        )}>
                          <Bell size={10} />
                          {isToday ? t.calendar.startsToday : t.calendar.daysRemaining.replace('{count}', diffDays.toString())}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Visualização */}
      <AnimatePresence>
        {viewingEvent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingEvent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className={cn("h-3 w-full", viewingEvent.cor)} />
              
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn("p-4 rounded-2xl text-white shadow-lg", viewingEvent.cor)}>
                    <CalendarIcon size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      {new Date(viewingEvent.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    <h3 className="text-2xl font-bold text-slate-800 leading-tight">
                      {viewingEvent.titulo}
                    </h3>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-3">
                      {t.calendar.eventDescription || 'Descrição'}
                    </label>
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 min-h-[120px]">
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {viewingEvent.descricao || t.common.noneFound}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 py-4 px-2 bg-blue-50/50 rounded-xl border border-blue-100/50 hover:bg-blue-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                        <Clock size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horário</span>
                        <span className="text-sm font-bold text-slate-800">
                          {new Date(viewingEvent.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button 
                    onClick={() => setViewingEvent(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                  >
                    {t.common.close || 'Fechar'}
                  </button>
                  {!isReadOnly && (
                    <button 
                      onClick={() => {
                        const evt = viewingEvent;
                        setViewingEvent(null);
                        openEditModal(evt);
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                      <Edit2 size={16} />
                      {t.common.edit}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Cadastro/Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmit}>
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">
                    {editingEvent ? t.calendar.editEvent : t.calendar.newEvent}
                  </h3>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.calendar.eventName}</label>
                    <input 
                      required
                      value={formData.titulo}
                      onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.calendar.eventDescription}</label>
                    <textarea 
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.calendar.eventDate}</label>
                      <input 
                        required
                        type="date"
                        value={formData.data}
                        onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.calendar.eventColor}</label>
                      <select 
                        required
                        value={formData.cor}
                        onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10 outline-none appearance-none bg-white"
                      >
                        {colors.map(c => (
                          <option key={c.value} value={c.value}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {t.common.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
