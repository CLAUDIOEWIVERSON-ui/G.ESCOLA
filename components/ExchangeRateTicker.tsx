"use client";

import { useEffect, useState } from 'react';
import { DollarSign, ArrowRightLeft, Loader2, TrendingUp } from 'lucide-react';

export default function ExchangeRateTicker() {
  const [rates, setRates] = useState<{ BRL: number; EUR: number; STN: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        if (data && data.rates) {
          setRates({
            BRL: data.rates.BRL,
            EUR: data.rates.EUR,
            STN: data.rates.STN
          });
          if (data.time_last_update_unix) {
            setLastUpdate(new Date(data.time_last_update_unix * 1000));
          }
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
    // Refresh every 60 minutes
    const interval = setInterval(fetchRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !rates) {
    return (
      <div className="flex items-center gap-3 bg-white/50 border border-slate-200/60 rounded-xl p-3 shadow-sm mb-6 animate-pulse">
        <div className="h-6 w-6 bg-slate-200 rounded-full"></div>
        <div className="h-4 w-48 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-3 mb-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-sm">
          <DollarSign size={16} strokeWidth={2.5} />
        </div>
        <span className="text-xs font-black text-emerald-900 uppercase tracking-widest">
          Cotação do Dólar (USD)
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full xl:w-auto justify-end">
        <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Real</span>
            <span className="text-emerald-700 font-mono tracking-tight">R$ {rates.BRL.toFixed(2)}</span>
          </div>
          <div className="h-4 w-px bg-emerald-200/60 hidden sm:block"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Euro</span>
            <span className="text-emerald-700 font-mono tracking-tight">€ {rates.EUR.toFixed(2)}</span>
          </div>
          <div className="h-4 w-px bg-emerald-200/60 hidden sm:block"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Dobras</span>
            <span className="text-emerald-700 font-mono tracking-tight">Db {rates.STN.toFixed(2)}</span>
          </div>
        </div>

        <div className="hidden sm:block h-4 w-px bg-emerald-200/60"></div>
        
        <div className="flex flex-col gap-0.5 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-none border-emerald-100 w-full sm:w-auto">
          {lastUpdate && (
            <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              Atualizado: {lastUpdate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            Fonte: 
            <a 
              href="https://www.xe.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-0.5"
            >
              XE.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
