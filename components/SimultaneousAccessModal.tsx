'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Activity, 
  Wifi, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Globe, 
  Clock, 
  Shield, 
  GraduationCap, 
  Eye, 
  Search, 
  RefreshCw, 
  X, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Layers,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  Radio,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/api';
import type { AccessLogItem } from '@/lib/auth/accessLogs';

export interface ActiveSessionData {
  sessionId: string;
  userId: string;
  name: string;
  role: string;
  email: string | null;
  currentPage: string;
  device: string;
  browser: string;
  os: string;
  firstSeen: number;
  lastSeen: number;
  idleTimeMs: number;
  durationMs: number;
  isIdle: boolean;
}

export interface UniqueUserData {
  userId: string;
  name: string;
  role: string;
  email: string | null;
  sessionsCount: number;
  sessions: ActiveSessionData[];
  lastSeen: number;
  devices: string[];
}

export interface SimultaneousAccessData {
  totalSessions: number;
  uniqueUsers: number;
  peakSimultaneous: number;
  byRole: {
    admin: number;
    instrutor: number;
    aluno: number;
    convidado: number;
    outros?: number;
  };
  sessions: ActiveSessionData[];
  users: UniqueUserData[];
  recentAccesses?: AccessLogItem[];
  timestamp: number;
}

interface SimultaneousAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SimultaneousAccessData | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function SimultaneousAccessModal({
  isOpen,
  onClose,
  data,
  isLoading,
  onRefresh
}: SimultaneousAccessModalProps) {
  const { language } = useI18n();
  const isPt = language === 'pt';

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'instrutor' | 'aluno' | 'convidado'>('all');
  const [activeTab, setActiveTab] = useState<'sessions' | 'users' | 'history'>('sessions');
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const totalSessions = data?.totalSessions ?? 0;
  const uniqueUsers = data?.uniqueUsers ?? 0;
  const peakSimultaneous = data?.peakSimultaneous ?? 0;
  const byRole = data?.byRole ?? { admin: 0, instrutor: 0, aluno: 0, convidado: 0 };

  // Page name prettifier
  const formatPageName = (path?: string) => {
    if (!path || path === '/') return isPt ? 'Início / Dashboard' : 'Home / Dashboard';
    if (path.includes('/turmas')) return isPt ? 'Turmas & Alunos' : 'Classes & Students';
    if (path.includes('/boletim')) return isPt ? 'Boletim Escolar' : 'Report Cards';
    if (path.includes('/frequencia')) return isPt ? 'Controle de Frequência' : 'Attendance';
    if (path.includes('/avaliacao')) return isPt ? 'Avaliação Pós-Curso' : 'Evaluation';
    if (path.includes('/relatorio-avaliacao')) return isPt ? 'Relatórios de Avaliação' : 'Evaluation Reports';
    if (path.includes('/horario')) return isPt ? 'Grade de Horários' : 'Schedules';
    if (path.includes('/calendario')) return isPt ? 'Calendário Escolar' : 'Calendar';
    if (path.includes('/cursos')) return isPt ? 'Catálogo de Cursos' : 'Courses';
    if (path.includes('/usuarios')) return isPt ? 'Gestão de Usuários' : 'Users Management';
    if (path.includes('/configuracoes')) return isPt ? 'Configurações' : 'Settings';
    if (path.includes('/links')) return isPt ? 'Links Úteis' : 'Useful Links';
    if (path.includes('/widgets')) return isPt ? 'Widgets' : 'Widgets';
    return path;
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    if (totalSec < 60) return isPt ? `${totalSec}s` : `${totalSec}s`;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min < 60) return `${min}m ${sec > 0 ? `${sec}s` : ''}`;
    const hours = Math.floor(min / 60);
    const remMin = min % 60;
    return `${hours}h ${remMin}m`;
  };

  const formatIdleTime = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    if (sec <= 5) return isPt ? 'ativo agora' : 'active now';
    if (sec < 60) return isPt ? `há ${sec}s` : `${sec}s ago`;
    const min = Math.floor(sec / 60);
    return isPt ? `há ${min}m` : `${min}m ago`;
  };

  const getRoleBadge = (role: string) => {
    const r = (role || 'aluno').toLowerCase();
    switch (r) {
      case 'admin':
        return {
          label: isPt ? 'Administrador' : 'Administrator',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500'
        };
      case 'instrutor':
        return {
          label: isPt ? 'Instrutor' : 'Instructor',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'convidado':
        return {
          label: isPt ? 'Convidado' : 'Guest',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'aluno':
      default:
        return {
          label: isPt ? 'Aluno' : 'Student',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500'
        };
    }
  };

  const getDeviceIcon = (device: string) => {
    const d = (device || '').toLowerCase();
    if (d.includes('mobile') || d.includes('phone')) {
      return <Smartphone size={14} className="text-slate-500" />;
    }
    if (d.includes('tablet') || d.includes('ipad')) {
      return <Tablet size={14} className="text-slate-500" />;
    }
    return <Laptop size={14} className="text-slate-500" />;
  };

  const handleDisconnect = async (sessionId: string, userName: string) => {
    if (!confirm(isPt 
      ? `Deseja encerrar a sessão de "${userName}"? O usuário precisará reconectar.` 
      : `Disconnect session for "${userName}"?`)) return;

    setDisconnectingId(sessionId);
    try {
      const res = await fetchWithAuth(`/api/auth/heartbeat?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isPt ? 'Sessão desconectada com sucesso.' : 'Session disconnected.');
        onRefresh();
      } else {
        toast.error(json.error || 'Erro ao desconectar sessão');
      }
    } catch {
      toast.error('Erro de conexão ao desconectar sessão');
    } finally {
      setDisconnectingId(null);
    }
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    if (!data?.sessions) return [];
    return data.sessions.filter(s => {
      const matchesSearch = searchTerm === '' || 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.currentPage.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.browser.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'all' || s.role.toLowerCase() === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [data?.sessions, searchTerm, roleFilter]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    return data.users.filter(u => {
      const matchesSearch = searchTerm === '' || 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        u.devices.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = roleFilter === 'all' || u.role.toLowerCase() === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [data?.users, searchTerm, roleFilter]);

  const filteredHistory = useMemo(() => {
    const list = data?.recentAccesses || [];
    return list.filter(item => {
      const matchesSearch = 
        !searchTerm ||
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.device && item.device.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.browser && item.browser.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesRole = roleFilter === 'all' || item.role.toLowerCase() === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [data?.recentAccesses, searchTerm, roleFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* TOP HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0">
              <Activity size={20} />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {isPt ? 'Monitor de Acessos Simultâneos' : 'Simultaneous Access Monitor'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Radio size={10} className="animate-pulse text-emerald-600" />
                  {isPt ? 'Tempo Real' : 'Real Time'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isPt 
                  ? 'Controle de conexões ativas, dispositivos conectados e usuários simultâneos' 
                  : 'Active connections, connected devices, and simultaneous users control'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
              title={isPt ? 'Atualizar agora' : 'Refresh now'}
            >
              <RefreshCw size={16} className={cn(isLoading && "animate-spin text-emerald-600")} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              title={isPt ? 'Fechar' : 'Close'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200/80">
          {/* Card 1: Total Simultaneous Sessions */}
          <div className="bg-white border border-emerald-200/70 p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                {isPt ? 'Acessos Simultâneos' : 'Concurrent Accesses'}
              </span>
              <Activity size={16} className="text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {totalSessions}
              </span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                {isPt ? 'sessões' : 'sessions'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isPt ? 'Abas e conexões ativas' : 'Active tabs & connections'}
            </div>
          </div>

          {/* Card 2: Unique Users */}
          <div className="bg-white border border-blue-200/70 p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                {isPt ? 'Usuários Únicos' : 'Unique Users'}
              </span>
              <Users size={16} className="text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {uniqueUsers}
              </span>
              <span className="text-xs font-semibold text-blue-600">
                {isPt ? 'contas' : 'accounts'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isPt ? 'Contas distintas online' : 'Distinct accounts online'}
            </div>
          </div>

          {/* Card 3: Peak Recorded */}
          <div className="bg-white border border-indigo-200/70 p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                {isPt ? 'Pico Registrado' : 'Peak Recorded'}
              </span>
              <TrendingUp size={16} className="text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {Math.max(peakSimultaneous, totalSessions)}
              </span>
              <span className="text-xs font-semibold text-indigo-600">
                {isPt ? 'máximo' : 'peak'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isPt ? 'Nesta sessão do servidor' : 'In this server uptime'}
            </div>
          </div>

          {/* Card 4: Role Breakdown */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                {isPt ? 'Por Perfil' : 'By Role'}
              </span>
              <Layers size={16} className="text-slate-500" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800" title="Admins">
                Adm: {byRole.admin}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800" title="Instrutores">
                Inst: {byRole.instrutor}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800" title="Alunos">
                Alu: {byRole.aluno}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title="Convidados">
                Conv: {byRole.convidado}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isPt ? 'Distribuição dos acessos' : 'Access distribution'}
            </div>
          </div>
        </div>

        {/* CONTROLS & SEARCH */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('sessions')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === 'sessions'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Activity size={14} className="text-emerald-600" />
              {isPt ? `Todas as Conexões (${totalSessions})` : `All Connections (${totalSessions})`}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === 'users'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Users size={14} className="text-blue-600" />
              {isPt ? `Usuários Únicos (${uniqueUsers})` : `Unique Users (${uniqueUsers})`}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === 'history'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <History size={14} className="text-amber-600" />
              {isPt ? `Últimos 10 Acessos (${data?.recentAccesses?.length || 0})` : `Last 10 Accesses (${data?.recentAccesses?.length || 0})`}
            </button>
          </div>

          {/* Search bar & Role Chips */}
          <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isPt ? 'Buscar usuário, página ou IP...' : 'Search user, page, device...'}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 transition-all"
              />
            </div>
          </div>
        </div>

        {/* ROLE FILTER CHIPS */}
        <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 shrink-0">
            {isPt ? 'Filtrar:' : 'Filter:'}
          </span>
          {[
            { id: 'all', label: isPt ? `Todos (${totalSessions})` : `All (${totalSessions})` },
            { id: 'admin', label: isPt ? `Admins (${byRole.admin})` : `Admins (${byRole.admin})` },
            { id: 'instrutor', label: isPt ? `Instrutores (${byRole.instrutor})` : `Instructors (${byRole.instrutor})` },
            { id: 'aluno', label: isPt ? `Alunos (${byRole.aluno})` : `Students (${byRole.aluno})` },
            { id: 'convidado', label: isPt ? `Convidados (${byRole.convidado})` : `Guests (${byRole.convidado})` },
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setRoleFilter(chip.id as any)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                roleFilter === chip.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* CONTENT LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {activeTab === 'sessions' ? (
            /* SESSIONS VIEW */
            filteredSessions.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <Wifi size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-bold text-slate-600">
                  {isPt ? 'Nenhuma conexão simultânea encontrada.' : 'No concurrent connections found.'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {searchTerm 
                    ? (isPt ? 'Tente ajustar os termos da busca ou filtros.' : 'Try adjusting search or filter.') 
                    : (isPt ? 'As presenças de usuários conectados aparecerão aqui automaticamente.' : 'Active sessions will appear here.')}
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const roleInfo = getRoleBadge(session.role);
                const isDisconnecting = disconnectingId === session.sessionId;

                return (
                  <div
                    key={session.sessionId}
                    className="p-3.5 bg-white border border-slate-200/80 hover:border-emerald-300 rounded-xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* User Identity */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                          {session.name ? session.name.substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <span 
                          className={cn(
                            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white shadow-xs",
                            session.isIdle ? "bg-amber-400" : "bg-emerald-500 animate-pulse"
                          )}
                          title={session.isIdle ? 'Ocioso' : 'Ativo agora'}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {session.name}
                          </h4>
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1", roleInfo.bg)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", roleInfo.dot)} />
                            {roleInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          {session.email && (
                            <span className="truncate max-w-[180px] sm:max-w-[240px]">
                              {session.email}
                            </span>
                          )}
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: {session.sessionId.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Page Location */}
                    <div className="flex items-center gap-3 sm:gap-6 flex-wrap sm:flex-nowrap shrink-0">
                      {/* Current Page */}
                      <div className="flex flex-col text-left sm:text-right min-w-[120px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {isPt ? 'Página Atual' : 'Current Page'}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px]" title={session.currentPage}>
                          {formatPageName(session.currentPage)}
                        </span>
                      </div>

                      {/* Device & OS */}
                      <div className="flex flex-col text-left sm:text-right min-w-[110px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {isPt ? 'Dispositivo' : 'Device'}
                        </span>
                        <span className="text-xs font-medium text-slate-700 flex items-center sm:justify-end gap-1.5">
                          {getDeviceIcon(session.device)}
                          <span>{session.browser} • {session.os}</span>
                        </span>
                      </div>

                      {/* Activity & Duration */}
                      <div className="flex flex-col text-left sm:text-right min-w-[90px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {isPt ? 'Atividade' : 'Activity'}
                        </span>
                        <span className={cn("text-xs font-bold", session.isIdle ? "text-amber-600" : "text-emerald-600")}>
                          {formatIdleTime(session.idleTimeMs)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isPt ? 'online ' : 'up '} {formatDuration(session.durationMs)}
                        </span>
                      </div>

                      {/* Disconnect Action */}
                      <button
                        onClick={() => handleDisconnect(session.sessionId, session.name)}
                        disabled={isDisconnecting}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer disabled:opacity-50"
                        title={isPt ? 'Encerrar esta sessão' : 'Disconnect session'}
                      >
                        {isDisconnecting ? (
                          <RefreshCw size={15} className="animate-spin text-red-600" />
                        ) : (
                          <LogOut size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : activeTab === 'users' ? (
            /* UNIQUE USERS VIEW */
            filteredUsers.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <Users size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-bold text-slate-600">
                  {isPt ? 'Nenhum usuário conectado.' : 'No connected users.'}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const roleInfo = getRoleBadge(user.role);

                return (
                  <div
                    key={user.userId}
                    className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                          {user.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">
                            {user.name}
                          </h4>
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1", roleInfo.bg)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", roleInfo.dot)} />
                            {roleInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {user.email || 'Email não informado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                      {/* Active Sessions count badge */}
                      <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2">
                        <Activity size={14} className="text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800">
                          {user.sessionsCount} {user.sessionsCount === 1 ? (isPt ? 'acesso ativo' : 'active access') : (isPt ? 'acessos simultâneos' : 'simultaneous accesses')}
                        </span>
                      </div>

                      {/* Devices used */}
                      <div className="flex items-center gap-1">
                        {user.devices.map((d, i) => (
                          <span key={i} className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600" title={d}>
                            {getDeviceIcon(d)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* HISTORY (ÚLTIMOS 10 ACESSOS) VIEW */
            filteredHistory.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <History size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-bold text-slate-600">
                  {isPt ? 'Nenhum registro de acesso recente encontrado.' : 'No recent access records found.'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {searchTerm 
                    ? (isPt ? 'Tente ajustar os termos da busca.' : 'Try adjusting search filter.') 
                    : (isPt ? 'Os acessos de login e visitas aparecerão aqui.' : 'Login and access records will appear here.')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHistory.slice(0, 10).map((log, index) => {
                  const roleInfo = getRoleBadge(log.role);
                  return (
                    <div
                      key={log.id || `history-${index}`}
                      className="p-3.5 bg-white border border-slate-200/80 hover:border-amber-300 rounded-xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                          #{index + 1}
                        </div>
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                            {log.userName ? log.userName.substring(0, 2).toUpperCase() : 'U'}
                          </div>
                          {log.isOnline && (
                            <span 
                              className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse"
                              title={isPt ? 'Online agora' : 'Online now'}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-slate-900 truncate">
                              {log.userName}
                            </h4>
                            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1", roleInfo.bg)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", roleInfo.dot)} />
                              {roleInfo.label}
                            </span>
                            {log.isOnline && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {isPt ? 'Online agora' : 'Online now'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            {log.email && (
                              <span className="truncate max-w-[200px] font-mono text-[11px]">
                                {log.email}
                              </span>
                            )}
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 text-[11px]">
                              {log.accessType}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                          {getDeviceIcon(log.device)}
                          <span className="font-medium text-[11px]">{log.device}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 text-[11px]">{log.browser}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
                            <Clock size={11} className="text-slate-400" />
                            <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.createdAt).toLocaleDateString(isPt ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>
              {isPt 
                ? 'Atualização automática a cada 10 segundos.' 
                : 'Auto-refreshes every 10 seconds.'}
            </span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
