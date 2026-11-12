'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CalendarDays, 
  Search, 
  Globe2, 
  Clock, 
  PartyPopper,
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  CalendarRange, 
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  Holiday, 
  getAllHolidaysForYear, 
  getUpcomingHolidays, 
  getHolidaysOnDate, 
  getDaysDifference 
} from '@/lib/holidays';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';

export default function FeriadosPage() {
  const { language } = useI18n();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [mounted, setMounted] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<'ALL' | 'STP' | 'BR'>('ALL');
  const [viewFilter, setViewFilter] = useState<'all_year' | 'upcoming'>('all_year');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedHolidayModal, setSelectedHolidayModal] = useState<Holiday | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date());
    const interval = setInterval(() => setCurrentDate(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const todayHolidays = useMemo(() => {
    if (!mounted) return [];
    return getHolidaysOnDate(currentDate);
  }, [currentDate, mounted]);

  const allHolidays = useMemo(() => {
    if (!mounted) return [];
    const baseList = viewFilter === 'upcoming' 
      ? getUpcomingHolidays(currentDate, 35, selectedCountry)
      : getAllHolidaysForYear(selectedYear, selectedCountry);

    return baseList.map(h => {
      const diff = getDaysDifference(h.date, currentDate);
      return {
        ...h,
        daysRemaining: diff,
        isToday: diff === 0,
      };
    });
  }, [selectedYear, selectedCountry, currentDate, mounted, viewFilter]);

  const filteredHolidays = useMemo(() => {
    return allHolidays.filter(h => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        h.name.toLowerCase().includes(q) || 
        h.nameEn.toLowerCase().includes(q) || 
        h.meaning.toLowerCase().includes(q) || 
        h.countryName.toLowerCase().includes(q) ||
        h.dateStr.includes(q);

      const matchesType = selectedType === 'all' || h.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [allHolidays, searchQuery, selectedType]);

  const formatDateHuman = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <Toaster position="top-right" richColors />

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-500/20">
            <CalendarRange size={14} className="text-indigo-600" />
            <span>Calendário Oficial de Feriados</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Tabela Oficial de Feriados</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
            Relação completa em formato tabular dos feriados nacionais e datas comemorativas oficiais de São Tomé e Príncipe e do Brasil.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setSelectedCountry('ALL')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                selectedCountry === 'ALL' ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Globe2 size={13} className="text-blue-600" />
              <span>Todos</span>
            </button>
            <button
              onClick={() => setSelectedCountry('STP')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                selectedCountry === 'STP' ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>🇸🇹</span>
              <span>STP</span>
            </button>
            <button
              onClick={() => setSelectedCountry('BR')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                selectedCountry === 'BR' ? "bg-white text-blue-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>🇧🇷</span>
              <span>Brasil</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-all hover:border-slate-300"
          >
            <Printer size={15} className="text-slate-500" />
            <span>Imprimir Tabela</span>
          </button>
        </div>
      </div>

      {/* TODAY'S CELEBRATION BANNER */}
      {mounted && todayHolidays.length > 0 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl shadow-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-black">
              <PartyPopper size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                  🎉 HOJE É FERIADO OFICIAL!
                </span>
                <span className="text-xs text-amber-900 font-bold capitalize">
                  {formatDateHuman(currentDate)}
                </span>
              </div>
              <div className="text-sm font-black text-slate-900 flex flex-wrap items-center gap-2 mt-0.5">
                {todayHolidays.map(th => (
                  <span key={th.id} className="flex items-center gap-1">
                    <span>{th.countryFlag}</span>
                    <span>{th.name} ({th.countryName})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR & CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewFilter('all_year')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                viewFilter === 'all_year' ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarDays size={14} className="text-indigo-600" />
              <span>Ano Completo ({selectedYear})</span>
            </button>
            <button
              onClick={() => setViewFilter('upcoming')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                viewFilter === 'upcoming' ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Clock size={14} className="text-blue-600" />
              <span>Apenas Próximos Feriados</span>
            </button>
          </div>

          {viewFilter === 'all_year' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedYear(y => y - 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-black text-slate-900 text-sm px-2">
                Ano {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear(y => y + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-8 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar por feriado, significado, data ou país..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs outline-none"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
            >
              <option value="all">Todas as Classificações</option>
              <option value="nacional">Nacional / Cívico</option>
              <option value="religioso">Religioso / Cristão</option>
            </select>
          </div>
        </div>
      </div>

      {/* OFFICIAL TABLE VIEW */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-black uppercase tracking-wider text-slate-600 select-none">
                <th className="py-3 px-4 w-40">Data Oficial</th>
                <th className="py-3 px-3 w-32">País</th>
                <th className="py-3 px-4">Nome do Feriado</th>
                <th className="py-3 px-3 w-36">Classificação</th>
                <th className="py-3 px-3 w-36">Situação</th>
                <th className="py-3 px-4">Significado Histórico</th>
                <th className="py-3 px-3 w-20 text-center print:hidden">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 italic">
                    Nenhum feriado correspondente aos filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredHolidays.map((h, idx) => {
                  const isToday = h.isToday;
                  const dayFormatted = h.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  return (
                    <tr
                      key={`${h.id}-${idx}`}
                      onClick={() => setSelectedHolidayModal(h)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{dayFormatted}</td>
                      <td className="py-3.5 px-3">{h.countryFlag} {h.country}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{h.name}</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          {h.typeLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {isToday ? '🎉 É Hoje!' : h.daysRemaining > 0 ? `Em ${h.daysRemaining} dias` : 'Já ocorrido'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 line-clamp-2 max-w-xl">{h.meaning}</td>
                      <td className="py-3.5 px-3 text-center print:hidden">
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedHolidayModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedHolidayModal.countryFlag}</span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{selectedHolidayModal.name}</h3>
                    <p className="text-xs text-slate-500">{selectedHolidayModal.countryName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHolidayModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl">
                {selectedHolidayModal.meaning}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedHolidayModal(null)}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
