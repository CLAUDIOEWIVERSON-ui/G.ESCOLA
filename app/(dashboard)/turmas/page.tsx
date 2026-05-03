'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { Plus, Search, Layers, Calendar, Clock, MapPin } from 'lucide-react';

export default function TurmasPage() {
  const { t } = useI18n();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTurmas = async () => {
      setLoading(true);
      const { data } = await supabase.from('turmas').select('*, curso:cursos(nome)');
      if (data) setTurmas(data);
      setLoading(false);
    };
    fetchTurmas();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.classes.title}</h1>
          <p className="text-slate-500 text-sm italic mt-1">{t.classes.subtitle}</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100">
          <Plus size={18} />
          {t.classes.add}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></div>
          </div>
        ) : turmas.map((turma) => (
          <div key={turma.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rotate-45 translate-x-8 -translate-y-8 group-hover:bg-blue-50 transition-colors"></div>
            
            <div className="relative z-10">
              <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <Layers size={20} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-0.5 truncate">{turma.nome}</h3>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-4 truncate">{turma.curso?.nome}</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-slate-300" />
                    <span>{turma.ano}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-slate-300" />
                    <span className="capitalize">{turma.periodo}</span>
                  </div>
                </div>
                
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <span>{t.classes.capacity}</span>
                    <span className="text-slate-600">{turma.alunos_matriculados} / {turma.capacidade_max}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-700 ease-out" 
                      style={{ width: `${(turma.alunos_matriculados / turma.capacidade_max) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
              <button className="text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors">{t.nav.students}</button>
              <button className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Manage</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
