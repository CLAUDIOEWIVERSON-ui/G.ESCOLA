'use client';

import { useState, useEffect, useCallback } from 'react';
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
  RefreshCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';
import Image from 'next/image';

export default function AlunosPage() {
  const { t, language } = useI18n();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedTurmaForBulk, setSelectedTurmaForBulk] = useState('');
  const [skipHeader, setSkipHeader] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [currentAluno, setCurrentAluno] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTurmas = useCallback(async () => {
    const { data } = await supabase
      .from('turmas')
      .select('id, nome')
      .is('deleted_at', null)
      .order('nome');
    if (data) setTurmas(data);
  }, []);

  const fetchAlunos = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);

    const { data } = await supabase
      .from('alunos')
      .select(`
        *,
        turma:turmas(id, nome, curso:cursos(nome))
      `)
      .is('deleted_at', null)
      .order('nome');
      
    if (data) setAlunos(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchAlunos(), fetchTurmas()]);
    };
    init();
  }, [fetchAlunos, fetchTurmas]);

  const refreshAlunos = () => fetchAlunos(true);

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
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
      const filePath = `alunos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('escola')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('O bucket "escola" não foi encontrado no Supabase Storage. Crie o bucket "escola" com acesso público para habilitar o upload de fotos.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('escola')
        .getPublicUrl(filePath);

      setCurrentAluno({ ...currentAluno, foto_url: publicUrl });
    } catch (err: any) {
      console.error('Photo upload error:', err);
      alert(t.common.uploadError + ': ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!currentAluno.nome || currentAluno.nome.trim().length < 2) {
        throw new Error(language === 'pt' ? 'Nome é obrigatório (mínimo 3 caracteres)' : 'Name is required (min 3 characters)');
      }

      // Generate matricula if missing as it's NOT NULL in DB
      let matricula = currentAluno.matricula;
      if (!matricula || matricula.length < 2) {
        matricula = `MAT${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 899999)}`;
      }

      const dataToSave: any = {
        nome: currentAluno.nome,
        matricula: matricula,
        status: currentAluno.status || 'ativo'
      };

      // Only attach optional fields if they have values to avoid PGRST204 if columns are missing
      if (currentAluno.email && currentAluno.email.includes('@')) dataToSave.email = currentAluno.email;
      if (currentAluno.turma_id && currentAluno.turma_id.length > 5) dataToSave.turma_id = currentAluno.turma_id;
      if (currentAluno.posto_graduacao) dataToSave.posto_graduacao = currentAluno.posto_graduacao;
      if (currentAluno.nif) dataToSave.nif = currentAluno.nif;
      if (currentAluno.rg) dataToSave.rg = currentAluno.rg;
      if (currentAluno.om) dataToSave.om = currentAluno.om;
      if (currentAluno.telefone) dataToSave.telefone = currentAluno.telefone;
      if (currentAluno.whatsapp) dataToSave.whatsapp = currentAluno.whatsapp;
      if (currentAluno.foto_url) dataToSave.foto_url = currentAluno.foto_url;
      
      const parsedAno = currentAluno.ano_admissao ? parseInt(currentAluno.ano_admissao.toString()) : NaN;
      if (!isNaN(parsedAno)) dataToSave.ano_admissao = parsedAno;

      let saveError;
      if (currentAluno.id) {
        const { error } = await supabase
          .from('alunos')
          .update(dataToSave)
          .eq('id', currentAluno.id);
        saveError = error;
      } else {
        const { error } = await supabase
          .from('alunos')
          .insert([dataToSave]);
        saveError = error;
      }

      if (saveError) {
        console.error('Supabase error result details:', {
          message: saveError.message,
          code: saveError.code,
          details: saveError.details,
          hint: saveError.hint
        });
        
        throw saveError;
      }

      await refreshAlunos();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save error occurred:', err);
      
      const errorMsg = err.message || 'Unknown error';
      const errorDetails = err.details || '';
      const errorCode = err.code || '';

      if (errorCode === 'PGRST204' || errorMsg.toLowerCase().includes('column')) {
        const columnMatch = errorMsg.match(/'([^']+)'/);
        const colName = columnMatch ? columnMatch[1] : 'unknown';
        alert(language === 'pt' 
          ? `Erro de Banco de Dados: A coluna "${colName}" não existe na tabela 'alunos'. O administrador precisa atualizar o banco de dados.` 
          : `Database Error: Column "${colName}" does not exist in 'alunos' table. Administrator needs to update the database.`);
      } else if (errorCode === '23505') {
        alert(language === 'pt' ? 'Erro: Já existe um aluno com esta Matrícula ou E-mail.' : 'Error: A student already exists with this Registration or Email.');
      } else {
        alert(t.common.saveError + ': ' + errorMsg + (errorDetails ? ' - ' + errorDetails : ''));
      }
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
      console.error('Delete error:', err);
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkData.trim()) return;
    setSaving(true);

    try {
      const rawLines = bulkData.split(/\r?\n/).filter(line => line.trim());
      if (rawLines.length === 0) throw new Error(t.common.parseError);

      const firstLine = rawLines[0];
      let separator = ',';
      if (firstLine.includes('\t')) separator = '\t';
      else if (firstLine.includes(';')) separator = ';';

      const dataLines = skipHeader ? rawLines.slice(1) : rawLines;
      const results: { success: any[], errors: string[] } = { success: [], errors: [] };

      const studentsToInsert = dataLines.map((line, index) => {
        const lineTrimmed = line.trim();
        if (!lineTrimmed) return null;

        // Try to detect if this line is JUST a name or structured data
        // If it doesn't contain the separator, treat it as just a name
        let nome, email, matricula, turma_id, nif, rg, om, posto_graduacao, ano_admissao, telefone, whatsapp, data_nascimento;
        
        if (!line.includes(separator)) {
          nome = lineTrimmed;
        } else {
          const parts = line.split(separator).map(s => s.trim());
          [nome, email, matricula, turma_id, nif, rg, om, posto_graduacao, ano_admissao, telefone, whatsapp, data_nascimento] = parts;
        }
        
        // Limit base string to avoid huge strings
        const cleanNome = (nome || '').trim().replace(/['"]/g, '');
        if (!cleanNome) {
          results.errors.push(`Linha ${index + (skipHeader ? 2 : 1)}: ${language === 'pt' ? 'Nome é obrigatório' : 'Name is required'}.`);
          return null;
        }

        const fallbackMatricula = `MAT${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 899999)}`;

        // Enhanced ID detection
        let finalTurmaId = selectedTurmaForBulk || null;
        if (turma_id && turma_id.length > 0) {
          if (turma_id.length > 20) { // Likely UUID
            finalTurmaId = turma_id;
          } else {
             // Search in fetched turmas by name
             const found = turmas.find(t => t.nome.toLowerCase() === turma_id.toLowerCase());
             if (found) finalTurmaId = found.id;
          }
        }

        const studentData: any = {
          nome: cleanNome,
          matricula: (matricula && matricula.length > 2) ? matricula.replace(/['"]/g, '') : fallbackMatricula,
          status: 'ativo'
        };

        if (email && email.includes('@')) studentData.email = email.replace(/['"]/g, '');
        if (finalTurmaId) studentData.turma_id = finalTurmaId;
        if (nif) studentData.nif = nif;
        if (rg) studentData.rg = rg;
        if (om) studentData.om = om;
        if (posto_graduacao) studentData.posto_graduacao = posto_graduacao;
        if (telefone) studentData.telefone = telefone;
        if (whatsapp) studentData.whatsapp = whatsapp;
        if (data_nascimento && data_nascimento.length >= 8) studentData.data_nascimento = data_nascimento;

        // Only add ano_admissao if it's a valid number
        const parsedAno = parseInt(ano_admissao || '');
        if (!isNaN(parsedAno)) studentData.ano_admissao = parsedAno;

        return studentData;
      }).filter(Boolean) as any[];

      if (studentsToInsert.length === 0) {
        throw new Error(results.errors.length > 0 ? results.errors.join('\n') : t.common.parseError);
      }

      console.log('Inserting students:', studentsToInsert);

      // Use insert instead of upsert to see if it's more stable for multiple unique constraints
      const { data, error } = await supabase
        .from('alunos')
        .insert(studentsToInsert)
        .select();
      
      if (error) {
        console.error('Full Supabase Error Object:', JSON.stringify(error, null, 2));
        console.error('Supabase Insert Error Details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Special handling for common errors
        const errorMsg = error.message || 'Unknown Supabase error';
        const errorDetails = error.details || '';
        const errorCode = error.code || '';
        
        if (errorCode === '23505') {
          throw new Error(`${language === 'pt' ? 'Conflito de duplicidade' : 'Duplicity conflict'}: ${errorDetails || (language === 'pt' ? 'Matrícula ou E-mail já existente.' : 'Registration or Email already exists.')}`);
        }
        
        if (errorCode === 'PGRST204' || errorMsg.toLowerCase().includes('column')) {
           const columnMatch = errorMsg.match(/'([^']+)'/);
           const colName = columnMatch ? columnMatch[1] : 'ano_admissao';
           throw new Error(language === 'pt' 
             ? `Coluna ausente no Banco de Dados: "${colName}". Por favor, execute o SQL do arquivo supabase_schema.sql.` 
             : `Missing column in Database: "${colName}". Please run the SQL from supabase_schema.sql.`);
        }
        
        throw new Error(`${errorMsg}${errorDetails ? ': ' + errorDetails : ''} (Code: ${errorCode})`);
      }

      await refreshAlunos();
      setIsBulkModalOpen(false);
      setBulkData('');
      
      const successCount = data?.length || 0;
      alert(t.common.processedSuccess.replace('{count}', successCount.toString()) + (results.errors.length > 0 ? `\n\n${t.common.detectedErrors}\n` + results.errors.join('\n') : ''));
    } catch (err: any) {
      console.error('Import error details:', err);
      alert(t.common.importErrorMsg + ': ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkData(text);
    };
    reader.readAsText(file);
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
            onClick={refreshAlunos}
            className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <RefreshCcw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
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
              <div className="relative group/avatar w-12 h-16 overflow-hidden rounded-lg border border-slate-100 shadow-sm">
                {aluno.foto_url ? (
                  <Image 
                    src={aluno.foto_url} 
                    alt={aluno.nome} 
                    fill 
                    className="object-cover"
                    sizes="48px"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors italic text-[10px] uppercase font-bold">
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
                  <Image 
                    src={currentAluno.foto_url} 
                    alt="3x4 Preview" 
                    fill 
                    className="object-cover" 
                    sizes="128px"
                    referrerPolicy="no-referrer"
                  />
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
              <p className="text-[10px] text-slate-400 font-medium italic">{language === 'pt' ? 'Formato 3x4 recomendado' : '3x4 format recommended'}</p>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {t.students.name} <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={currentAluno?.nome || ''}
                  onChange={(e) => setCurrentAluno({ ...currentAluno, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm border-l-4 border-l-blue-500"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t.students.registration}
                  </label>
                  <input
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
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
            <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
              {t.students.bulkDestinationClass}
            </label>
            <select
              value={selectedTurmaForBulk}
              onChange={(e) => setSelectedTurmaForBulk(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm appearance-none"
            >
              <option value="">{t.students.noneOrSpecific}</option>
              {turmas.map(turma => (
                <option key={turma.id} value={turma.id}>{turma.nome}</option>
              ))}
            </select>
            <p className="text-[10px] text-blue-600 mt-2 italic">
              {t.students.bulkDestinationClassDesc}
            </p>
          </div>

          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.students.bulkPasteLabel}
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleBulkFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <button
                type="button"
                className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase hover:bg-blue-100 transition-colors"
              >
                <Plus size={12} />
                {t.students.importCsvFile}
              </button>
            </div>
          </div>
          <div>
            <textarea
              required
              rows={10}
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-mono"
              placeholder={t.common.csvPlaceholder}
            />
            
            {bulkData.trim() && (
              <div className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                {bulkData.split(/\r?\n/).filter(l => l.trim()).length} {language === 'pt' ? 'registros detectados' : 'records detected'}
              </div>
            )}
            
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
                {t.common.clearField}
              </button>
            </div>

            <p className="mt-4 text-[10px] text-slate-400 italic leading-relaxed">
              * {t.courses.bulkFormatInfo}<br/>
              * {t.students.bulkNameRequired}<br/>
              * {t.students.bulkAutoGenerateInfo}
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
