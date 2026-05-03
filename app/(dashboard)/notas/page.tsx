'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  FileText, 
  Search, 
  Save, 
  RefreshCcw,
  CheckCircle,
  XCircle,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function NotasPage() {
  const { t } = useI18n();
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotas = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notas')
        .select(`
          *,
          aluno:alunos(nome, matricula),
          disciplina:disciplinas(nome, codigo)
        `);
      if (data) setNotas(data);
      setLoading(false);
    };
    fetchNotas();
  }, []);

  const getStatus = (final: number, freq: number) => {
    if (final >= 6 && freq >= 75) return { 
      label: 'Approved', 
      className: 'bg-green-100 text-green-700 ring-green-600/20' 
    };
    if (freq < 75) return { 
      label: 'Low Frequency', 
      className: 'bg-orange-100 text-orange-700 ring-orange-600/20' 
    };
    return { 
      label: 'Retake Required', 
      className: 'bg-red-100 text-red-700 ring-red-600/20' 
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.grades.title}</h1>
          <p className="text-slate-500 text-sm">Lançamento de avaliações e acompanhamento de frequência.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100">
            <Plus size={18} />
            Lançar Notas
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input type="text" placeholder="Filtrar por aluno..." className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none" />
          </div>
          <button className="text-slate-500 hover:text-slate-900 p-2"><RefreshCcw size={18} /></button>
        </div>

        <div className="overflow-x-auto">
          <table id="grades-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold italic">Estudante</th>
                <th className="px-6 py-4 font-semibold italic">Disciplina</th>
                <th className="px-6 py-4 font-semibold italic text-center w-20">N1</th>
                <th className="px-6 py-4 font-semibold italic text-center w-20">N2</th>
                <th className="px-6 py-4 font-semibold italic text-center w-20">Média</th>
                <th className="px-6 py-4 font-semibold italic text-center w-24">Freq. %</th>
                <th className="px-6 py-4 font-semibold italic w-32">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8">{t.common.loading}</td></tr>
              ) : notas.map((nota) => {
                const status = getStatus(nota.nota_final, nota.frequencia);
                return (
                  <tr key={nota.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{nota.aluno?.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">#{nota.aluno?.matricula}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-700">{nota.disciplina?.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{nota.disciplina?.codigo}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-sm">{nota.nota1?.toFixed(1) || '-'}</td>
                    <td className="px-6 py-4 text-center font-mono text-sm">{nota.nota2?.toFixed(1) || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("font-bold font-mono", nota.nota_final >= 6 ? "text-blue-600" : "text-red-600")}>
                        {nota.nota_final?.toFixed(1) || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-sm">{nota.frequencia}%</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase rounded ring-1 ring-inset", status.className)}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
