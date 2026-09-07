"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Globe2, 
  Clock, 
  Sparkles, 
  PartyPopper,
  Info,
  CalendarDays,
  Flame,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  Holiday, 
  CountryCode, 
  getAllHolidaysForYear, 
  getUpcomingHolidays, 
  getHolidaysOnDate, 
  getDaysDifference 
} from '@/lib/holidays';
import { cn } from '@/lib/utils';

export default function HolidaysWidget() {
  const { language } = useI18n();
  const isPt = language === 'pt';

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [mounted, setMounted] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<'ALL' | 'STP' | 'BR'>('ALL');
  const [viewMode, setViewMode] = useState<'upcoming' | 'year'>('upcoming');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Daily auto-refresh and mounting
  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date());

    // Update current date every 60 seconds
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Today's holidays (if any)
  const todayHolidays = useMemo(() => {
    if (!mounted) return [];
    return getHolidaysOnDate(currentDate);
  }, [currentDate, mounted]);

  // Next immediate holiday for STP
  const nextStpHoliday = useMemo(() => {
    if (!mounted) return null;
    const list = getUpcomingHolidays(currentDate, 1, 'STP');
    return list[0] || null;
  }, [currentDate, mounted]);

  // Next immediate holiday for Brazil
  const nextBrHoliday = useMemo(() => {
    if (!mounted) return null;
    const list = getUpcomingHolidays(currentDate, 1, 'BR');
    return list[0] || null;
  }, [currentDate, mounted]);

  // Upcoming holidays list
  const upcomingHolidays = useMemo(() => {
    if (!mounted) return [];
    return getUpcomingHolidays(currentDate, 12, selectedCountry);
  }, [currentDate, mounted, selectedCountry]);

  // Full year holidays list
  const fullYearHolidays = useMemo(() => {
    if (!mounted) return [];
    return getAllHolidaysForYear(selectedYear, selectedCountry).map(h => {
      const diff = getDaysDifference(h.date, currentDate);
      return {
        ...h,
        daysRemaining: diff,
        isToday: diff === 0,
      };
    });
  }, [selectedYear, selectedCountry, currentDate, mounted]);

  // Display list based on view mode and search filter
  const displayedHolidays = useMemo(() => {
    const raw = viewMode === 'upcoming' ? upcomingHolidays : fullYearHolidays;
    if (!searchQuery.trim()) return raw;
    const q = searchQuery.toLowerCase().trim();
    return raw.filter(h => 
      h.name.toLowerCase().includes(q) ||
      h.nameEn.toLowerCase().includes(q) ||
      h.meaning.toLowerCase().includes(q) ||
      h.countryName.toLowerCase().includes(q)
    );
  }, [viewMode, upcomingHolidays, fullYearHolidays, searchQuery]);

  const formatDateHuman = (date: Date) => {
    return date.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div id="holidays-daily-widget" className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
      {/* Top Banner / Today's Status */}
      <div className="p-4 sm:p-5 bg-white border-b border-slate-200/90 text-slate-800 relative">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          {/* Title & Today's Date */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600">
                  {isPt ? 'Calendário Oficial de Feriados' : 'Official Public Holidays'}
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {isPt ? 'Atualizado Diariamente' : 'Daily Live Sync'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 capitalize flex items-center gap-2 mt-0.5">
                {mounted ? formatDateHuman(currentDate) : 'Carregando data...'}
              </h3>
            </div>
          </div>

          {/* Action: Expand/Collapse Details */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                🇸🇹 STP
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                🇧🇷 Brasil
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              <span>{isExpanded ? (isPt ? 'Recolher Feriados' : 'Collapse') : (isPt ? 'Ver Todos os Feriados' : 'View All Holidays')}</span>
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* TODAY IS A HOLIDAY CELEBRATORY BANNER */}
        {mounted && todayHolidays.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md font-bold">
                <PartyPopper size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                    🎉 {isPt ? 'HOJE É FERIADO!' : 'TODAY IS A HOLIDAY!'}
                  </span>
                  {todayHolidays.map(th => (
                    <span key={th.id} className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <span>{th.countryFlag}</span>
                      <span>{th.name} ({th.countryName})</span>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-amber-800/90 font-medium mt-1">
                  {todayHolidays.map(th => th.meaning).join(' • ')}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-lg border border-amber-300 whitespace-nowrap">
              {isPt ? 'Dia Comemorativo Oficial' : 'Official Holiday'}
            </span>
          </motion.div>
        )}
      </div>

      {/* QUICK SUMMARY CARDS: NEXT IN STP & NEXT IN BRAZIL */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50/60 border-b border-slate-100">
        {/* Next STP Holiday */}
        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs hover:border-emerald-300 transition-colors flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl select-none shrink-0" role="img" aria-label="São Tomé e Príncipe">🇸🇹</span>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                {isPt ? 'Próximo Feriado em São Tomé e Príncipe' : 'Next Holiday in São Tomé & Príncipe'}
              </span>
              {nextStpHoliday ? (
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm truncate" title={nextStpHoliday.name}>
                    {nextStpHoliday.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium capitalize flex items-center gap-1 mt-0.5">
                    <Clock size={12} className="text-slate-400" />
                    {formatDateHuman(nextStpHoliday.date)}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">{isPt ? 'Nenhum próximo feriado registrado' : 'No upcoming holiday registered'}</span>
              )}
            </div>
          </div>

          {nextStpHoliday && (
            <div className="text-right shrink-0">
              <span className={cn(
                "inline-block px-2.5 py-1 rounded-full text-xs font-black tracking-tight shadow-2xs",
                nextStpHoliday.isToday 
                  ? "bg-emerald-600 text-white" 
                  : nextStpHoliday.daysRemaining <= 7
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              )}>
                {nextStpHoliday.isToday 
                  ? (isPt ? '🎉 É Hoje!' : '🎉 Today!') 
                  : nextStpHoliday.daysRemaining === 1 
                  ? (isPt ? 'Amanhã' : 'Tomorrow') 
                  : `${isPt ? 'Em' : 'In'} ${nextStpHoliday.daysRemaining} ${isPt ? 'dias' : 'days'}`}
              </span>
            </div>
          )}
        </div>

        {/* Next Brazil Holiday */}
        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs hover:border-blue-300 transition-colors flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl select-none shrink-0" role="img" aria-label="Brasil">🇧🇷</span>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                {isPt ? 'Próximo Feriado no Brasil' : 'Next Holiday in Brazil'}
              </span>
              {nextBrHoliday ? (
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm truncate" title={nextBrHoliday.name}>
                    {nextBrHoliday.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium capitalize flex items-center gap-1 mt-0.5">
                    <Clock size={12} className="text-slate-400" />
                    {formatDateHuman(nextBrHoliday.date)}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">{isPt ? 'Nenhum próximo feriado registrado' : 'No upcoming holiday registered'}</span>
              )}
            </div>
          </div>

          {nextBrHoliday && (
            <div className="text-right shrink-0">
              <span className={cn(
                "inline-block px-2.5 py-1 rounded-full text-xs font-black tracking-tight shadow-2xs",
                nextBrHoliday.isToday 
                  ? "bg-blue-600 text-white" 
                  : nextBrHoliday.daysRemaining <= 7
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
              )}>
                {nextBrHoliday.isToday 
                  ? (isPt ? '🎉 É Hoje!' : '🎉 Today!') 
                  : nextBrHoliday.daysRemaining === 1 
                  ? (isPt ? 'Amanhã' : 'Tomorrow') 
                  : `${isPt ? 'Em' : 'In'} ${nextBrHoliday.daysRemaining} ${isPt ? 'dias' : 'days'}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* EXPANDABLE FULL HOLIDAYS BROWSER */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {/* Filters Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Country Tabs */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedCountry('ALL')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    selectedCountry === 'ALL' 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <Globe2 size={13} />
                  <span>{isPt ? 'Ambos (STP & Brasil)' : 'Both (STP & Brazil)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCountry('STP')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    selectedCountry === 'STP' 
                      ? "bg-emerald-600 text-white shadow-xs" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <span>🇸🇹</span>
                  <span>São Tomé e Príncipe</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCountry('BR')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    selectedCountry === 'BR' 
                      ? "bg-blue-600 text-white shadow-xs" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <span>🇧🇷</span>
                  <span>Brasil</span>
                </button>
              </div>

              {/* View Mode & Year Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-white border border-slate-200/80 rounded-xl p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setViewMode('upcoming')}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                      viewMode === 'upcoming' 
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {isPt ? 'Próximos' : 'Upcoming'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('year')}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                      viewMode === 'year' 
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {isPt ? 'Ano Inteiro' : 'Full Year'}
                  </button>
                </div>

                {viewMode === 'year' && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-white border border-slate-200/80 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 shadow-2xs outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}

                {/* Instant search input */}
                <div className="relative flex-1 sm:w-56">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isPt ? 'Pesquisar feriado...' : 'Search holiday...'}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Holidays List Grid */}
            <div className="p-4 sm:p-5 max-h-[460px] overflow-y-auto space-y-2.5">
              {displayedHolidays.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  {isPt ? 'Nenhum feriado encontrado com os filtros selecionados.' : 'No holidays found matching the current filters.'}
                </div>
              ) : (
                displayedHolidays.map((holiday) => {
                  const isStp = holiday.country === 'STP';
                  return (
                    <div
                      key={holiday.id}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                        holiday.isToday 
                          ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20" 
                          : holiday.daysRemaining > 0 && holiday.daysRemaining <= 7
                          ? "bg-slate-50/90 border-slate-200 hover:border-indigo-300"
                          : "bg-white border-slate-150 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="text-2xl select-none shrink-0 mt-0.5">
                          {holiday.countryFlag}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h5 className="font-extrabold text-slate-800 text-sm leading-snug">
                              {holiday.name}
                            </h5>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              isStp 
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200/80" 
                                : "bg-blue-50 text-blue-800 border-blue-200/80"
                            )}>
                              {holiday.countryName}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {holiday.typeLabel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-normal">
                            {holiday.meaning}
                          </p>
                        </div>
                      </div>

                      {/* Date & Countdown badge */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-none border-slate-100">
                        <span className="text-xs font-black text-slate-800 capitalize font-mono">
                          {formatShortDate(holiday.date)} • {holiday.year}
                        </span>
                        
                        <span className={cn(
                          "text-[11px] font-black px-2.5 py-0.5 rounded-full whitespace-nowrap",
                          holiday.isToday
                            ? "bg-amber-500 text-slate-950 shadow-2xs font-extrabold"
                            : holiday.daysRemaining === 1
                            ? "bg-emerald-600 text-white"
                            : holiday.daysRemaining > 1 && holiday.daysRemaining <= 15
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            : holiday.daysRemaining > 15
                            ? "bg-slate-100 text-slate-600"
                            : "bg-slate-100 text-slate-400 italic"
                        )}>
                          {holiday.isToday
                            ? (isPt ? '🎉 É Hoje!' : '🎉 Today!')
                            : holiday.daysRemaining === 1
                            ? (isPt ? 'Amanhã' : 'Tomorrow')
                            : holiday.daysRemaining > 1
                            ? `${isPt ? 'Em' : 'In'} ${holiday.daysRemaining} ${isPt ? 'dias' : 'days'}`
                            : (isPt ? 'Já ocorrido' : 'Past')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with official legal references */}
            <div className="p-3 bg-slate-100/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
              <div className="flex items-center gap-1 text-slate-600">
                <Info size={13} className="text-slate-400 shrink-0" />
                <span>
                  {isPt 
                    ? 'Base oficial: Legislação Nacional de São Tomé e Príncipe e Leis Federais do Brasil (nº 662/49, 10.607/02 e 14.759/23).'
                    : 'Official basis: National Legislation of São Tomé and Príncipe & Brazilian Federal Laws.'}
                </span>
              </div>
              <span className="font-semibold text-slate-600 text-[10px] uppercase">
                {isPt ? 'Sincronização Diária em Tempo Real' : 'Real-time Daily Sync'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
