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
  AlertCircle,
  FileText,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/Modal';

type Curso = z.infer<typeof cursoSchema> & { id: string };

export default function CursosPage() {
  const { t } = useI18n();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [skipHeader, setSkipHeader] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof cursoSchema>>({
    resolver: zodResolver(cursoSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      ano_inicio: new Date().getFullYear(),
      ativo: true,
      internacional: false,
      localizacao: '',
      data_inicio: '',
      data_fim: ''
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

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Robust multi-format parsing
      const rawLines = bulkData.split(/\r?\n/).filter(line => line.trim());
      if (rawLines.length === 0) throw new Error(t.common.parseError);

      const firstLine = rawLines[0];
      const separator = firstLine.includes(';') ? ';' : ',';

      const dataLines = skipHeader ? rawLines.slice(1) : rawLines;
      const results: { success: any[], errors: string[] } = { success: [], errors: [] };

      const coursesToInsert = dataLines.map((line, index) => {
        const parts = line.split(separator).map(s => s.trim());
        const [nome, codigo, descricao] = parts;
        
        if (!nome) {
          results.errors.push(`Linha ${index + (skipHeader ? 2 : 1)}: Nome não encontrado.`);
          return null;
        }

        return {
          nome,
          codigo: codigo || nome.substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 899),
          descricao: descricao || '',
          ano_inicio: new Date().getFullYear(),
          ativo: true
        };
      }).filter(Boolean) as any[];

      if (coursesToInsert.length === 0) {
        throw new Error(results.errors.length > 0 ? results.errors.join('\n') : t.common.parseError);
      }

      const { data, error } = await supabase.from('cursos').upsert(coursesToInsert, {
        onConflict: 'nome',
        ignoreDuplicates: false
      }).select();
      
      if (error) throw error;

      await fetchCursos();
      setIsBulkModalOpen(false);
      setBulkData('');
      
      const successCount = data?.length || 0;
      alert(`Sucesso! ${successCount} cursos importados.${results.errors.length > 0 ? '\n\nErros:\n' + results.errors.join('\n') : ''}`);
    } catch (err: any) {
      alert('Erro na importação: ' + (err.message || 'Verifique o formato dos dados.'));
    } finally {
      setSaving(false);
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
        <div className="flex gap-2">
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileText size={18} />
            {t.common.bulkAdd}
          </button>
          <button 
            id="add-course-btn"
            onClick={() => { reset(); setEditingCurso(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
          >
            <Plus size={18} />
            {t.courses.add}
          </button>
        </div>
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
                    <div className="flex items-center gap-2">
                       <div className="font-semibold text-slate-900">{curso.nome}</div>
                       {curso.internacional && (
                         <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[8px] font-bold uppercase tracking-widest border border-purple-200">Exterior</span>
                       )}
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]">
                       {curso.localizacao && <span className="text-slate-900 font-bold mr-1">[{curso.localizacao}]</span>}
                       {curso.descricao}
                    </div>
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
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                    placeholder="Descrição breve do curso..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 flex flex-col justify-center pt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        {...register('internacional')}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-bold text-slate-700 group-hover:text-purple-600 transition-colors">{t.dashboard.internationalCourses}</span>
                    </label>
                  </div>
                  <div className="space-y-1 flex flex-col justify-center pt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        {...register('ativo')}
                        className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                      />
                      <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Ativo</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">{t.dashboard.location}</label>
                  <input
                    {...register('localizacao')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                    placeholder="Ex: Portugal, Angola, Brasília..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.dashboard.courseStart}</label>
                    <input
                      type="date"
                      {...register('data_inicio')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.dashboard.courseEnd}</label>
                    <input
                      type="date"
                      {...register('data_fim')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-colors"
                    />
                  </div>
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

      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={t.common.bulkAdd}
      >
        <form onSubmit={handleBulkSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Dados (CSV: Nome, Código, Descrição)
            </label>
            <textarea
              required
              rows={8}
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-mono"
              placeholder="Ex: Engenharia, ENG101, Curso de base&#10;Administração, ADM, Gestão&#10;Direito"
            />
            
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={skipHeader}
                  onChange={(e) => setSkipHeader(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                  Pular primeira linha (Cabeçalho)
                </span>
              </label>
              
              <button
                type="button"
                onClick={() => setBulkData('')}
                className="text-[10px] font-bold text-slate-400 uppercase hover:text-red-500 transition-colors"
              >
                Limpar Campo
              </button>
            </div>

            <p className="mt-4 text-[10px] text-slate-400 italic">
              * Suporta separadores por vírgula (,) ou ponto-e-vírgula (;).<br/>
              * Somente o <strong>Nome</strong> é obrigatório. Se o código for omitido, será gerado automaticamente.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {t.common.import}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
