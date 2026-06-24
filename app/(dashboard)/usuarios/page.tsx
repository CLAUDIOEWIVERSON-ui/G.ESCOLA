'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { fetchWithAuth } from '@/lib/api';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { Plus, Search, User, Shield, ShieldAlert, Mail, Trash2, Pencil, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Modal from '@/components/Modal';

import { toast } from 'sonner';

export default function UsuariosPage() {
  const { t, language } = useI18n();
  const { isAdmin, isConvidado } = useUser();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('items_per_page_usuarios');
      if (saved) {
        setTimeout(() => {
          setItemsPerPage(Number(saved));
        }, 0);
      }
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/admin/users');
      const data = await response.json();
      
      if (data.error && (data.error.includes('not configured') || data.error.includes('Inválida') || data.error.includes('API key'))) {
        setIsConfigured(false);
        throw new Error(data.error);
      }
      
      if (data.error) throw new Error(data.error);
      
      setIsConfigured(true);
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      // Fallback to direct supabase if API fails (maybe key not set yet)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setUsers(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const init = async () => {
        await fetchUsers();
      };
      init();
    }
  }, [isAdmin, fetchUsers]);

  const handleOpenModal = (user: any = null) => {
    setCurrentUser(user || { 
      full_name: '', 
      email: '',
      password: '',
      role: 'aluno', 
      grupo_responsavel: null,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = currentUser.id ? 'PUT' : 'POST';
      let result: any = {};

      try {
        const response = await fetchWithAuth('/api/admin/users', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentUser)
        });
        
        result = await response.json();
      } catch (apiErr) {
        console.error('API Error:', apiErr);
        result = { error: 'API connection failed' };
      }
      
      // Fallback: If API failed but we are editing, try direct profile update
      if (result.error && currentUser.id) {
        console.log('API failed, attempting direct profile update fallback...');
        const { error: directError } = await supabase
          .from('profiles')
          .update({
            full_name: currentUser.full_name,
            role: currentUser.role
          })
          .eq('id', currentUser.id);
        
        if (directError) throw new Error(result.error || directError.message);
        
        // Success via fallback
        result = { success: true, fallback: true };
      } else if (result.error) {
        throw new Error(result.error);
      }

      setIsModalOpen(false);
      fetchUsers();
      toast.success(language === 'pt' ? 'Usuário salvo com sucesso!' : 'User saved successfully!');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(language === 'pt' ? `Erro ao salvar: ${err.message}` : `Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.common.deleteConfirm)) return;
    setDeleting(id);
    try {
      const response = await fetchWithAuth(`/api/admin/users?id=${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      
      setUsers(users.filter(u => u.id !== id));
      toast.success(language === 'pt' ? 'Usuário removido!' : 'User removed!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  if (!isAdmin && !isConvidado) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
        <ShieldAlert size={64} className="text-red-500 mb-4 opacity-20" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.users.onlyAdminCanManage}</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isConfigured && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm"
        >
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">
                {language === 'pt' ? 'Configuração de Administrador Necessária' : 'Admin Configuration Required'}
              </h3>
              <p className="text-sm text-amber-700 mt-1 mb-4 leading-relaxed">
                {language === 'pt' 
                  ? 'Para habilitar a criação e edição completa de usuários (incluindo senhas), você precisa configurar a chave de serviço do Supabase.' 
                  : 'To enable full user creation and editing (including passwords), you need to configure the Supabase Service Role Key.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="bg-white/80 px-3 py-2 rounded-lg text-xs font-medium text-amber-800 border border-amber-200">
                  <span className="font-bold">PROTIP:</span> Adicione <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">SUPABASE_SERVICE_ROLE_KEY</code> nos Secrets/Env Vars.
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t.users.title}</h2>
            {isConvidado && (
              <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                {language === 'pt' ? 'Somente Leitura' : 'Read-Only'}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">{t.users.subtitle}</p>
        </div>
        {!isConvidado && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
          >
            <Plus size={18} />
            {t.users.add}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t.common.search}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 border border-slate-200/60 rounded-xl w-fit">
            {[
              { id: 'all', label: language === 'pt' ? 'Todos' : 'All' },
              { id: 'aluno', label: language === 'pt' ? 'Alunos' : 'Students' },
              { id: 'instrutor', label: language === 'pt' ? 'Instrutores' : 'Instructors' },
              { id: 'admin', label: language === 'pt' ? 'Administradores' : 'Administrators' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setRoleFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all select-none cursor-pointer",
                  roleFilter === tab.id
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/40"
                    : "text-slate-500 hover:bg-white/40 hover:text-slate-800"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">{t.users.name}</th>
                <th className="px-6 py-4">{t.users.email}</th>
                <th className="px-6 py-4">{t.users.role}</th>
                <th className="px-6 py-4">Alterou Senha?</th>
                {!isConvidado && <th className="px-6 py-4 text-right">{t.common.actions}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={isConvidado ? 4 : 5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{user.full_name || 'No Name'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">UID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={14} className="text-slate-400" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit",
                          user.role === 'admin' ? "bg-purple-50 text-purple-700 border border-purple-100" : 
                          user.role === 'instrutor' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          user.role === 'convidado' ? "bg-slate-50 text-slate-700 border border-slate-100" :
                          "bg-blue-50 text-blue-700 border border-blue-100"
                        )}>
                          {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                          {user.role === 'admin' ? t.users.admin : user.role === 'instrutor' ? t.users.instrutor : user.role === 'convidado' ? (language === 'pt' ? 'Convidado' : 'Guest') : t.users.aluno}
                        </span>
                        {user.grupo_responsavel && (
                          <span className="inline-flex items-center justify-center font-mono text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded w-fit uppercase">
                            Grupo: {user.grupo_responsavel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.has_changed_password ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 uppercase tracking-wider">
                          ● Sim (Troca Realizada)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 uppercase tracking-wider animate-pulse">
                          ● Não (Primeiro Acesso)
                        </span>
                      )}
                    </td>
                    {!isConvidado && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 pr-2">
                          <button 
                            onClick={() => handleOpenModal(user)}
                            className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            disabled={deleting === user.id}
                            onClick={() => handleDelete(user.id)}
                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                          >
                            {deleting === user.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isConvidado ? 4 : 5} className="px-6 py-12 text-center text-slate-400 italic text-sm font-medium">
                    {t.users.noUsers}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Painel de Paginação Otimizada */}
        {totalItems > 0 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-slate-500 font-semibold">
            <div className="flex items-center gap-2">
              <span>{language === 'pt' ? 'Exibir:' : 'Show:'}</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setItemsPerPage(val);
                  setCurrentPage(1);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('items_per_page_usuarios', String(val));
                  }
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 font-bold"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>{language === 'pt' ? 'registros por página' : 'records per page'}</span>
            </div>

            <div className="font-medium text-slate-400 font-mono">
              {language === 'pt' 
                ? `Exibindo ${startIndex + 1}-${endIndex} de ${totalItems} usuários`
                : `Showing ${startIndex + 1}-${endIndex} of ${totalItems} users`}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1 px-2 hover:bg-slate-100 disabled:opacity-45 rounded-lg border border-slate-200 text-slate-500 transition cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
                title={language === 'pt' ? 'Anterior' : 'Previous'}
              >
                <ChevronLeft size={14} />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition cursor-pointer",
                    currentPage === p
                      ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                      : "hover:bg-slate-100 text-slate-600 border border-transparent"
                  )}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1 px-2 hover:bg-slate-100 disabled:opacity-45 rounded-lg border border-slate-200 text-slate-500 transition cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
                title={language === 'pt' ? 'Próximo' : 'Next'}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentUser?.id ? t.common.edit : t.users.add}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.users.name}</label>
              <input
                required
                type="text"
                value={currentUser?.full_name || ''}
                onChange={(e) => setCurrentUser({ ...currentUser, full_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.users.email}</label>
              <input
                required
                type="email"
                value={currentUser?.email || ''}
                onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.users.password}</label>
            <input
              type="password"
              placeholder={currentUser?.id ? "••••••••" : ""}
              required={!currentUser?.id}
              value={currentUser?.password || ''}
              onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t.users.role}</label>
            <select
              value={currentUser?.role || 'aluno'}
              onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all"
            >
              <option value="admin">{t.users.admin}</option>
              <option value="instrutor">{t.users.instrutor}</option>
              <option value="aluno">{t.users.aluno}</option>
              <option value="convidado">{language === 'pt' ? 'Convidado (Somente Leitura)' : 'Guest (Read Only)'}</option>
            </select>
          </div>

          {currentUser?.role === 'instrutor' && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                {language === 'pt' ? 'Grupo Responsável' : 'Responsible Group'}
              </label>
              <input
                type="text"
                list="grupos-responsavel-usuarios"
                placeholder={language === 'pt' ? 'Digite ou selecione o grupo (Ex: MAN, GAT, AMBOS)' : 'Type or select group (E.g.: MAN, GAT, AMBOS)'}
                value={currentUser?.grupo_responsavel || ''}
                onChange={(e) => setCurrentUser({ ...currentUser, grupo_responsavel: e.target.value || null })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all font-sans font-medium"
              />
              <datalist id="grupos-responsavel-usuarios">
                <option value="MAN" />
                <option value="GAT" />
                <option value="AMBOS" />
              </datalist>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Shield size={12} />
              {language === 'pt' ? 'Gerenciamento de Acesso' : 'Access Management'}
            </p>
            <p className="text-[10px] text-blue-600 font-medium italic">
              {language === 'pt' 
                ? 'Novos usuários criados aqui terão acesso imediato com a senha definida.' 
                : 'New users created here will have immediate access with the defined password.'}
            </p>
          </div>

          <div className="flex gap-3 pt-6">
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
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {t.common.save}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
