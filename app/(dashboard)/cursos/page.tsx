'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { cursoSchema } from '@/lib/validations/schemas';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type Curso = z.infer<typeof cursoSchema> & { id: string };

export default function CursosPage() {
  const { t } = useI18n();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof cursoSchema>>({
    resolver: zodResolver(cursoSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      ano_inicio: new Date().getFullYear(),
      ativo: true
    }
  });

  const fetchCursos = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .is('deleted_at', null)
      .order('nome');
    if (data) setCursos(data);
    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      await fetchCursos(false);
      setLoading(false);
    };
    init();
  }, []);

  const onSubmit = async (data: z.infer<typeof cursoSchema>) => {
    try {
      if (editingCurso) {
        const { error } = await supabase
          .from('cursos')
          .update(data)
          .eq('id', editingCurso.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cursos')
          .insert([data]);
        if (error) throw error;
      }
      reset();
      setModalOpen(false);
      setEditingCurso(null);
      fetchCursos();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteCurso = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este curso?")) {
      const { error } = await supabase
        .from('cursos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) alert(error.message);
      else fetchCursos();
    }
  };

  const filteredCursos = cursos.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.courses.title}</h1>
          <p className="text-slate-500 text-sm">Visualize e gerencie os cursos oferecidos pela instituição.</p>
        </div>
        <button 
          id="add-course-btn"
          onClick={() => { reset(); setEditingCurso(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
        >
          <Plus size={18} />
          {t.courses.add}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold" size={18} />
            <input
              type="text"
              placeholder={t.common.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table id="courses-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">{t.courses.name}</th>
                <th className="px-6 py-4 font-semibold">{t.courses.startYear}</th>
                <th className="px-6 py-4 font-semibold">{t.courses.status}</th>
                <th className="px-6 py-4 font-semibold text-right">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">{t.common.loading}</td>
                </tr>
              ) : filteredCursos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Nenhum curso encontrado.</td>
                </tr>
              ) : filteredCursos.map((curso) => (
                <tr key={curso.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{curso.nome}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{curso.descricao}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{curso.ano_inicio}</td>
                  <td className="px-6 py-4">
                    {curso.ativo ? (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-green-100 text-green-700 ring-1 ring-inset ring-green-600/20">
                        Ativo
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-600/10">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingCurso(curso); reset(curso); setModalOpen(true); }}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteCurso(curso.id)}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingCurso ? t.common.edit : t.courses.add}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <form id="course-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">{t.courses.name}</label>
                  <input
                    {...register('nome')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                    placeholder="Engenharia de Software"
                  />
                  {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">{t.courses.description}</label>
                  <textarea
                    {...register('descricao')}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                    placeholder="Descrição breve do curso..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.courses.startYear}</label>
                    <input
                      type="number"
                      {...register('ano_inicio', { valueAsNumber: true })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                    />
                    {errors.ano_inicio && <p className="text-xs text-red-500 mt-1">{errors.ano_inicio.message}</p>}
                  </div>
                  <div className="space-y-1 flex flex-col justify-center pt-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('ativo')}
                        className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                      />
                      <span className="text-sm font-semibold text-slate-700">Ativo</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100"
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
