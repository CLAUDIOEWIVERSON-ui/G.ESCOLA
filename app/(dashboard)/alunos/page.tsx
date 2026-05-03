'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  Users, 
  BookOpen, 
  MoreVertical,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Mail,
  Hash,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Camera,
  Phone,
  MessageCircle,
  Shield,
  Calendar,
  Building,
  CreditCard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function AlunosPage() {
  const { t } = useI18n();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [currentAluno, setCurrentAluno] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      
      // Fetch Alunos
      const { data: alunosData } = await supabase
        .from('alunos')
        .select(`
          *,
          turma:turmas(id, nome, curso:cursos(nome))
        `)
        .is('deleted_at', null)
        .order('nome');
        
      if (alunosData) setAlunos(alunosData);

      // Fetch Turmas for the dropdown
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome')
        .is('deleted_at', null)
        .order('nome');
        
      if (turmasData) setTurmas(turmasData);
      
      setLoading(false);
    };

    fetchInitialData();
  }, []);

  const refreshAlunos = async () => {
    // Re-use logic for manual refresh if needed
    const { data: alunosData } = await supabase
      .from('alunos')
      .select(`
        *,
        turma:turmas(id, nome, curso:cursos(nome))
      `)
      .is('deleted_at', null)
      .order('nome');
      
    if (alunosData) setAlunos(alunosData);
  };

  const handleOpenModal = (aluno: any = null) => {
    setCurrentAluno(aluno || { 
      nome: '', 
      email: '', 
      matricula: '', 
      turma_id: '', 
      status: 'ativo',
      nif: '',
      rg: '',
      om: '',
      posto_graduacao: '',
      ano_admissao: new Date().getFullYear(),
      telefone: '',
      whatsapp: '',
      foto_url: ''
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `alunos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('escola')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('escola')
        .getPublicUrl(filePath);

      setCurrentAluno({ ...currentAluno, foto_url: publicUrl });
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSave = {
        nome: currentAluno.nome,
        email: currentAluno.email,
        matricula: currentAluno.matricula,
        turma_id: currentAluno.turma_id || null,
        status: currentAluno.status,
        nif: currentAluno.nif,
        rg: currentAluno.rg,
        om: currentAluno.om,
        posto_graduacao: currentAluno.posto_graduacao,
        ano_admissao: currentAluno.ano_admissao,
        telefone: currentAluno.telefone,
        whatsapp: currentAluno.whatsapp,
        foto_url: currentAluno.foto_url
      };

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

      await refreshAlunos();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.common.delete + '?')) return;
    setDeleting(id);
    
    try {
      const { error } = await supabase
        .from('alunos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
      await refreshAlunos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Flexible CSV parsing: Nome, Email, Matrícula, Turma_ID, NIF, RG, OM, Posto/Graduação, Ano Admissão, Telefone, WhatsApp
      const lines = bulkData.split('\n').filter(line => line.trim());
      const studentsToInsert = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        const [nome, email, matricula, turma_id, nif, rg, om, posto_graduacao, ano_admissao, telefone, whatsapp] = parts;
        
        if (!nome) return null;

        return {
          nome,
          email: email || `${nome.toLowerCase().split(' ')[0]}.${Math.floor(Math.random() * 1000)}@escola.com`,
          matricula: matricula || `MAT${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 8999)}`,
          turma_id: turma_id || null,
          nif: nif || '',
          rg: rg || '',
          om: om || '',
          posto_graduacao: posto_graduacao || '',
          ano_admissao: parseInt(ano_admissao) || new Date().getFullYear(),
          telefone: telefone || '',
          whatsapp: whatsapp || '',
          status: 'ativo'
        };
      }).filter(Boolean);

      if (studentsToInsert.length === 0) {
        throw new Error(t.common.parseError);
      }

      const { error } = await supabase.from('alunos').insert(studentsToInsert);
      if (error) throw error;

      await refreshAlunos();
      setIsBulkModalOpen(false);
      setBulkData('');
      alert(t.common.importSuccess);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.students.title}</h1>
          <p className="text-slate-500 text-sm italic">{t.students.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileText size={16} />
            {t.common.bulkAdd}
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={16} />
            {t.common.filters}
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
          >
            <Plus size={18} />
            {t.students.add}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></div>
          </div>
        ) : alunos.map((aluno, i) => (
          <motion.div
            key={aluno.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="relative group/avatar">
                {aluno.foto_url ? (
                  <img src={aluno.foto_url} alt={aluno.nome} className="w-12 h-16 object-cover rounded-lg border border-slate-100 shadow-sm" />
                ) : (
                  <div className="w-12 h-16 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors border border-slate-100 italic text-[10px] uppercase font-bold">
                    3x4
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleOpenModal(aluno)}
                  className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  disabled={deleting === aluno.id}
                  onClick={() => handleDelete(aluno.id)}
                  className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-colors disabled:opacity-50"
                >
                  {deleting === aluno.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1 mb-1">
                   {aluno.posto_graduacao && (
                     <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                       {aluno.posto_graduacao}
                     </span>
                   )}
                   {aluno.om && (
                     <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                       {aluno.om}
                     </span>
                   )}
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1 truncate">{aluno.nome}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Mail size={12} />
                    <span className="truncate max-w-[120px]">{aluno.email}</span>
                  </div>
                  {aluno.telefone && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Phone size={12} />
                      <span>{aluno.telefone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.students.registration}</p>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                    <span className="text-slate-300">#</span>{aluno.matricula}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.students.status}</p>
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-bold uppercase rounded ring-1 ring-inset",
                    aluno.status === 'ativo' 
                      ? "bg-green-100 text-green-700 ring-green-600/20" 
                      : "bg-amber-100 text-amber-700 ring-amber-600/20"
                  )}>
                    {aluno.status === 'ativo' ? t.students.active : 
                     aluno.status === 'inativo' ? t.students.inactive : 
                     aluno.status === 'transferido' ? t.students.transferred : aluno.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase">
                    {aluno.turma?.nome || 'N/A'}
                  </span>
                </div>
                <button className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  {t.nav.grades} →
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentAluno?.id ? t.common.edit : t.students.add}
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
          <div className="flex flex-col md:flex-row gap-6 mb-6 pb-6 border-b border-slate-100">
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer w-32 h-40 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all overflow-hidden">
                {currentAluno?.foto_url ? (
                  <img src={currentAluno.foto_url} alt="3x4 Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={32} strokeWidth={1.5} />
                    <span className="text-[10px] font-bold uppercase mt-2">{t.students.photo}</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">Format 3x4 recommended</p>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {t.students.name}
                </label>
                <input
                  required
                  type="text"
                  value={currentAluno?.nome || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t.students.registration}
                  </label>
                  <input
                    required
                    type="text"
                    value={currentAluno?.matricula || ''}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, matricula: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                    placeholder="MAT2024001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t.students.status}
                  </label>
                  <select
                    value={currentAluno?.status || 'ativo'}
                    onChange={(e) => setCurrentAluno({ ...currentAluno, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
                  >
                    <option value="ativo">{t.students.active}</option>
                    <option value="inativo">{t.students.inactive}</option>
                    <option value="transferido">{t.students.transferred}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.students.nif}
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={currentAluno?.nif || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, nif: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.students.rg}
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={currentAluno?.rg || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, rg: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  placeholder="0.000.000-0"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.students.rank}
              </label>
              <input
                type="text"
                value={currentAluno?.posto_graduacao || ''}
                onChange={(e) => setCurrentAluno({ ...currentAluno, posto_graduacao: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                placeholder="Ex: 2º Sargento"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.students.om}
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={currentAluno?.om || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, om: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  placeholder="Ex: 1º Batalhão"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.students.email}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  required
                  type="email"
                  value={currentAluno?.email || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  placeholder="email@servico.mil.br"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.students.forceEntryYear}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="number"
                  value={currentAluno?.ano_admissao || new Date().getFullYear()}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, ano_admissao: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.students.phone}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={currentAluno?.telefone || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, telefone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t.students.whatsapp}
              </label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={currentAluno?.whatsapp || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, whatsapp: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t.nav.classes}
            </label>
            <select
              value={currentAluno?.turma_id || ''}
              onChange={(e) => setCurrentAluno({ ...currentAluno, turma_id: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.grades.selectClass}</option>
              {turmas.map(turma => (
                <option key={turma.id} value={turma.id}>{turma.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
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
              {t.common.save}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={t.common.bulkAdd}
      >
        <form onSubmit={handleBulkSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Dados (CSV: Nome, Email, Matrícula, ID Turma, NIF, RG, OM, Posto, Ano, Fone, Zap)
            </label>
            <textarea
              required
              rows={8}
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-mono"
              placeholder="Ex: João Silva, joao@email.com, MAT2024001, f47ac10b..., 123.456.789-00, 1.234.567-8, 1º Btl, Sgt, 2020, 11999999999, 11999999999"
            />
            <p className="mt-2 text-[10px] text-slate-400 italic">
              * Separe os campos por vírgula. Somente o Nome é obrigatório. O sistema gerará valores automáticos para outros campos cruciais (Email/Matrícula) se deixados em branco.
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
