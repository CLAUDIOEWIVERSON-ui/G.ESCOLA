'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { 
  Plus, 
  Search, 
  User, 
  Users, 
  Mail, 
  Trash2, 
  Pencil, 
  Loader2, 
  CheckCircle2, 
  Filter, 
  Smartphone,
  BookOpen,
  Hash,
  Briefcase,
  Calendar,
  FileText,
  Upload,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function AlunosPage() {
  const { t, language } = useI18n();
  const { isAdmin } = useUser();
  const isReadOnly = !isAdmin;

  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurma, setSelectedTurma] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [currentAluno, setCurrentAluno] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  const [bulkData, setBulkData] = useState('');
  const [bulkTurmaId, setBulkTurmaId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome, ano')
        .is('deleted_at', null)
        .order('ano', { ascending: false });
      
      setTurmas(turmasData || []);

      let query = supabase
        .from('alunos')
        .select('*, turmas(nome)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (selectedTurma !== 'all') {
        query = query.eq('turma_id', selectedTurma);
      }

      const { data: alunosData } = await query;
      setAlunos(alunosData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTurma]);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
  }, [fetchData]);

  const handleOpenModal = (aluno: any = null) => {
    if (isReadOnly) return;
    setCurrentAluno(aluno || { 
      nome: '', 
      email: '',
      matricula: '',
      turma_id: selectedTurma !== 'all' ? selectedTurma : '',
      status: 'ativo',
      nif: '',
      rg: '',
      om: '',
      posto_graduacao: '',
      ano_admissao: new Date().getFullYear(),
      telefone: '',
      whatsapp: '',
      nome_pai: '',
      nome_mae: '',
      titulo_eleitor: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);
    
    try {
      const dataToSave = { ...currentAluno };
      delete dataToSave.turmas; // Remove joined data

      if (currentAluno.id) {
        const { error } = await supabase
          .from('alunos')
          .update(dataToSave)
          .eq('id', currentAluno.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('alunos')
          .insert([dataToSave]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    if (!confirm(t.common.deleteConfirm)) return;
    
    try {
      const { error } = await supabase
        .from('alunos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      
      setAlunos(alunos.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBulkImport = async () => {
    if (isReadOnly || !bulkData.trim()) return;
    setSaving(true);
    
    try {
      const lines = bulkData.split('\n').filter(l => l.trim());
      const newAlunos = lines.map(line => {
        const parts = line.split(/[;,]/).map(p => p.trim());
        const nome = parts[0];
        const email = parts[1] || `${nome.toLowerCase().replace(/\s+/g, '.')}@escola.com`;
        const matricula = parts[2] || `MAT${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const turma_id = parts[3] || bulkTurmaId || null;

        return {
          nome,
          email,
          matricula,
          turma_id,
          status: 'ativo'
        };
      });

      const { error } = await supabase.from('alunos').insert(newAlunos);
      if (error) throw error;

      setIsBulkModalOpen(false);
      setBulkData('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredAlunos = alunos.filter(a => 
    (a.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.matricula || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t.students.title}</h2>
          <p className="text-slate-500 text-sm mt-1">{t.students.subtitle}</p>
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              <Upload size={18} />
              {t.common.bulkAdd}
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98]"
            >
              <Plus size={18} />
              {t.students.add}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t.common.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all min-w-[200px]"
            >
              <option value="all">Todas as Turmas</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome} ({t.ano})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">{t.students.name}</th>
                <th className="px-6 py-4">{t.students.registration}</th>
                <th className="px-6 py-4">{t.nav.classes}</th>
                <th className="px-6 py-4">{t.students.status}</th>
                <th className="px-6 py-4 text-right">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-emerald-600 mx-auto" />
                  </td>
                </tr>
              ) : filteredAlunos.length > 0 ? (
                filteredAlunos.map((aluno) => (
                  <tr key={aluno.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{aluno.nome}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{aluno.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{aluno.matricula}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-sm text-slate-600 font-medium">{aluno.turmas?.nome || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        aluno.status === 'ativo' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : 
                        aluno.status === 'inativo' ? "bg-red-50 text-red-700 border border-red-100" :
                        "bg-amber-50 text-amber-700 border border-amber-100"
                      )}>
                        {aluno.status === 'ativo' ? t.students.active : aluno.status === 'inativo' ? t.students.inactive : t.students.transferred}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 pr-2">
                        <button 
                          onClick={() => handleOpenModal(aluno)}
                          className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(aluno.id)}
                          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm font-medium">
                    {t.common.noneFound}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aluno Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentAluno?.id ? t.common.edit : t.students.add}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Inf. Básica</h3>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.name}</label>
                <input
                  required
                  type="text"
                  value={currentAluno?.nome || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.registration}</label>
                  <input
                    required
                    type="text"
                    value={currentAluno?.matricula || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, matricula: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-mono transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.nav.classes}</label>
                  <select
                    value={currentAluno?.turma_id || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, turma_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  >
                    <option value="">Selecione uma turma</option>
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>{t.nome} ({t.ano})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    value={currentAluno?.email || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Militar / Profissional</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.rank}</label>
                  <input
                    type="text"
                    value={currentAluno?.posto_graduacao || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, posto_graduacao: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.om}</label>
                  <input
                    type="text"
                    value={currentAluno?.om || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, om: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.nif}</label>
                  <input
                    type="text"
                    value={currentAluno?.nif || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, nif: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.rg}</label>
                  <input
                    type="text"
                    value={currentAluno?.rg || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, rg: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.titulo_eleitor}</label>
                  <input
                    type="text"
                    value={currentAluno?.titulo_eleitor || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, titulo_eleitor: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.forceEntryYear}</label>
                  <input
                    type="number"
                    value={currentAluno?.ano_admissao || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, ano_admissao: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.phone}</label>
                  <input
                    type="text"
                    value={currentAluno?.telefone || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, telefone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.whatsapp}</label>
                  <input
                    type="text"
                    value={currentAluno?.whatsapp || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, whatsapp: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

            {/* Additional Info */}
            <div className="space-y-4 md:col-span-2 pt-4 border-t border-slate-100">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Dados Familiares</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.nome_pai}</label>
                  <input
                    type="text"
                    value={currentAluno?.nome_pai || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, nome_pai: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.nome_mae}</label>
                  <input
                    type="text"
                    value={currentAluno?.nome_mae || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, nome_mae: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 md:col-span-2">
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
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {t.common.save}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={t.common.bulkAdd}
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-700 font-medium leading-relaxed">
            <p className="font-bold mb-1 uppercase tracking-wider">{t.courses.bulkFormatInfo}</p>
            <p className="italic">Exemplo: João Silva, joao@email.com, MAT001</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.bulkDestinationClass}</label>
            <select
              value={bulkTurmaId}
              onChange={(e) => setBulkTurmaId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-sm transition-all"
            >
              <option value="">{t.students.noneOrSpecific}</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome} ({t.ano})</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1 italic">{t.students.bulkDestinationClassDesc}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.students.bulkPasteLabel}</label>
            <textarea
              rows={8}
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              placeholder={t.common.csvPlaceholder}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-mono transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleBulkImport}
              disabled={saving || !bulkData.trim()}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {t.common.import}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
