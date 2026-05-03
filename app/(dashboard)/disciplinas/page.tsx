'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { Plus, GraduationCap, Clock, Code } from 'lucide-react';

export default function DisciplinasPage() {
  const { t } = useI18n();
  const [disciplinas, setDisciplinas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('disciplinas').select('*, curso:cursos(nome)');
      if (data) setDisciplinas(data);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.subjects.title}</h1>
          <p className="text-slate-500 text-sm italic mt-1">{t.subjects.subtitle}</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100">
          <Plus size={18} />
          {t.subjects.add}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider bg-slate-50/30">
              <th className="px-6 py-4 font-semibold italic">{t.subjects.title}</th>
              <th className="px-6 py-4 font-semibold italic">{t.subjects.course}</th>
              <th className="px-6 py-4 font-semibold italic">{t.subjects.hours}</th>
              <th className="px-6 py-4 font-semibold italic text-right">{t.common.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-sm">{t.common.loading}</td></tr>
            ) : disciplinas.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-sm">No subjects registered.</td></tr>
            ) : disciplinas.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{d.nome}</p>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">{t.subjects.code}: {d.codigo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{d.curso?.nome}</td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                     <Clock size={14} className="text-slate-300" />
                     {d.carga_horaria}H
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-wider transition-colors">{t.common.edit}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
