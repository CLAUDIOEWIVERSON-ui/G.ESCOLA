'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/auth/UserContext';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { 
  Users, 
  Monitor, 
  Clock, 
  Shield, 
  Activity, 
  Smartphone, 
  Globe, 
  MoreHorizontal,
  RefreshCw,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Session = {
  id: string;
  user_id: string;
  session_id: string;
  last_activity: string;
  login_at: string;
  ip_address: string;
  user_agent: string;
  device_info: any;
  profile?: {
    full_name: string;
    role: string;
  };
};

export default function MonitoringPage() {
  const { t, language } = useI18n();
  const { isAdmin } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(0);

  const fetchSessions = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/sessions');
      if (!res.ok) throw new Error('Falha ao carregar sessões');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar monitoramento');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    let isMounted = true;
    setTimeout(() => {
      if (isMounted) setNow(Date.now());
    }, 0);
    const run = async () => {
      if (isMounted) {
        await fetchSessions();
      }
    };
    run();

    const interval = setInterval(() => {
      if (isMounted) fetchSessions();
    }, 30000);

    const timeInterval = setInterval(() => {
      if (isMounted) setNow(Date.now());
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [isAdmin]);

  const getStatus = (lastActivity: string) => {
    const diff = now - new Date(lastActivity).getTime();
    const minutes = diff / 60000;

    if (minutes < 2) return { label: 'Online', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    if (minutes < 10) return { label: 'Inativo', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Offline', color: 'text-slate-400', bg: 'bg-slate-400/10' };
  };

  const handleForceLogout = async (sessionId: string) => {
    if (!confirm('Deseja realmente encerrar esta sessão remotamente?')) return;
    
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        toast.success('Sessão encerrada com sucesso');
        fetchSessions();
      }
    } catch (err) {
      toast.error('Erro ao encerrar sessão');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center">
          <Shield size={40} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">403 - ACESSO NEGADO</h1>
        <p className="text-slate-500 font-medium max-w-md">
          Você não tem permissão para acessar esta área restrita. Apenas administradores podem monitorar sessões.
        </p>
      </div>
    );
  }

  const onlineCount = sessions.filter(s => getStatus(s.last_activity).label === 'Online').length;
  const inactiveCount = sessions.filter(s => getStatus(s.last_activity).label === 'Inativo').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-8">
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Centro de Comando</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Monitoramento em Tempo Real</h1>
          <p className="text-slate-500 font-medium">Controle de acessos e sessões ativas no sistema.</p>
        </div>
        <button 
          onClick={fetchSessions}
          disabled={refreshing}
          className="mt-4 sm:mt-0 flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all font-bold text-sm shadow-sm"
        >
          <RefreshCw size={18} className={cn(refreshing && "animate-spin")} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Sessões</p>
            <p className="text-2xl font-black text-slate-900">{sessions.length}</p>
          </div>
        </div>

        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Ativos Agora</p>
            <p className="text-2xl font-black text-emerald-700">{onlineCount}</p>
          </div>
        </div>

        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest">Inativos (2-10m)</p>
            <p className="text-2xl font-black text-amber-700">{inactiveCount}</p>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center gap-6">
          <div className="w-12 h-12 bg-slate-800 text-blue-400 rounded-2xl flex items-center justify-center">
            <Globe size={24} />
          </div>
          <div className="text-white">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status da Rede</p>
            <p className="text-lg font-black tracking-tight">PROTEGIDO</p>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Atividade</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Conectado</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispositivo / IP</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center text-slate-300">
                      <Monitor size={48} className="mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-sm">Nenhuma sessão ativa rastreada</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const status = getStatus(session.last_activity);
                  const device = session.device_info || {};
                  
                  return (
                    <motion.tr 
                      key={session.id} 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black", 
                            session.profile?.role === 'admin' ? "bg-red-50 text-red-600" :
                            session.profile?.role === 'instrutor' ? "bg-blue-50 text-blue-600" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {session.profile?.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{session.profile?.full_name || 'Desconhecido'}</p>
                            <p className="text-[10px] font-mono text-slate-400">{session.session_id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ring-inset", 
                           session.profile?.role === 'admin' ? "bg-red-50 text-red-600 ring-red-200" :
                           session.profile?.role === 'instrutor' ? "bg-blue-50 text-blue-600 ring-blue-200" :
                           "bg-slate-100 text-slate-600 ring-slate-200"
                         )}>
                            <Shield size={10} />
                            {session.profile?.role}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", status.color.replace('text-', 'bg-'))} />
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", status.color)}>{status.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-600">
                          {formatDistanceToNow(new Date(session.last_activity), { 
                            addSuffix: true, 
                            locale: language === 'pt' ? ptBR : enUS 
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-400">
                          {formatDistanceToNow(new Date(session.login_at), { 
                            locale: language === 'pt' ? ptBR : enUS 
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-slate-600">
                             {device.platform?.toLowerCase().includes('win') ? <Monitor size={12} /> : <Smartphone size={12} />}
                             <span className="text-[10px] font-bold">{device.platform || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                             <Globe size={10} />
                             <span className="text-[10px] font-mono">{session.ip_address}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleForceLogout(session.session_id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Encerrar Sessão"
                        >
                          <LogOut size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-4">
        <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">Aviso Detecção de Status</p>
          <p className="text-xs text-amber-700 mt-1">
            Usuários são considerados <b>Offline</b> se não houver atividade registrada nos últimos 10 minutos ou após logout manual.
            A verificação é feita via pulso automático (heartbeat) enviado pelo navegador do usuário a cada minuto.
          </p>
        </div>
      </div>
    </div>
  );
}
