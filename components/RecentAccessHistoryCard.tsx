'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, 
  Clock, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Globe, 
  RefreshCw, 
  UserCheck, 
  ShieldCheck, 
  GraduationCap, 
  Eye, 
  Radio, 
  CheckCircle2, 
  Search,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { fetchWithAuth } from '@/lib/api';
import { toast } from 'sonner';

export interface AccessLogItem {
  id: string;
  userId: string;
  userName: string;
  email: string | null;
  role: string;
  createdAt: string;
  timestamp: number;
  device: string;
  browser: string;
  os: string;
  path: string;
  accessType: string;
  ipAddress?: string | null;
  isOnline?: boolean;
}

interface RecentAccessHistoryCardProps {
  limit?: number;
  compact?: boolean;
  className?: string;
  showSearch?: boolean;
  onViewAll?: () => void;
}

export default function RecentAccessHistoryCard({
  limit = 10,
  compact = false,
  className,
  showSearch = true,
  onViewAll
}: RecentAccessHistoryCardProps) {
  const { language } = useI18n();
  const isPt = language === 'pt';

  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchLogs = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/auth/access-logs?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          setLogs(data.logs);
          setLastUpdated(new Date());
        }
      }
    } catch (err) {
      console.warn('Error fetching access logs:', err);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // Format relative time (e.g. "Há 2 minutos")
  const formatTimeAgo = (isoString?: string, ts?: number) => {
    if (!isoString && !ts) return '-';
    const timestamp = ts || new Date(isoString!).getTime();
    const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

    if (diffSeconds < 30) return isPt ? 'Agora mesmo' : 'Just now';
    if (diffSeconds < 60) return isPt ? `Há ${diffSeconds} seg` : `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return isPt ? `Há ${diffMinutes} min` : `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return isPt ? `Há ${diffHours} h` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return isPt ? `Há ${diffDays} d` : `${diffDays}d ago`;
  };

  // Format full date time
  const formatFullDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Role badges
  const getRoleBadge = (role?: string) => {
    const r = (role || '').toLowerCase();
    if (r === 'admin') {
      return {
        label: 'Administrador',
        bg: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: ShieldCheck,
        dot: 'bg-purple-600'
      };
    }
    if (r === 'instrutor') {
      return {
        label: 'Instrutor',
        bg: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: UserCheck,
        dot: 'bg-blue-600'
      };
    }
    if (r === 'convidado') {
      return {
        label: 'Convidado',
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Eye,
        dot: 'bg-amber-600'
      };
    }
    return {
      label: 'Aluno',
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: GraduationCap,
      dot: 'bg-emerald-600'
    };
  };

  // Device icon helper
  const getDeviceIcon = (device?: string) => {
    const d = (device || '').toLowerCase();
    if (d.includes('mobile') || d.includes('celular') || d.includes('phone')) {
      return <Smartphone size={13} className="text-blue-600 shrink-0" />;
    }
    if (d.includes('tablet') || d.includes('ipad')) {
      return <Tablet size={13} className="text-purple-600 shrink-0" />;
    }
    return <Laptop size={13} className="text-slate-600 shrink-0" />;
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.userName.toLowerCase().includes(term) ||
      (log.email && log.email.toLowerCase().includes(term)) ||
      log.role.toLowerCase().includes(term) ||
      (log.device && log.device.toLowerCase().includes(term)) ||
      (log.browser && log.browser.toLowerCase().includes(term)) ||
      (log.path && log.path.toLowerCase().includes(term))
    );
  });

  return (
    <div className={cn("bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden", className)}>
      {/* CARD HEADER */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10 shrink-0">
            <History size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {isPt ? 'Histórico dos Últimos 10 Acessos' : 'Last 10 Accesses History'}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Clock size={10} className="text-slate-500" />
                {isPt ? `Top ${limit} Recentes` : `Top ${limit} Recent`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isPt 
                ? 'Auditoria com o nome do usuário, papel no sistema, data, horário e dispositivo' 
                : 'Access audit log highlighting user name, role, timestamp and device'}
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {showSearch && !compact && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isPt ? 'Filtrar por nome...' : 'Filter by name...'}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400/20 text-slate-900 w-36 sm:w-44 transition-all"
              />
            </div>
          )}

          <button
            onClick={() => {
              fetchLogs();
              toast.success(isPt ? 'Histórico de acessos atualizado!' : 'Access logs updated!');
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            title={isPt ? 'Atualizar histórico agora' : 'Refresh history now'}
          >
            <RefreshCw size={13} className={cn(isLoading && "animate-spin text-blue-600")} />
            <span className="hidden sm:inline">{isPt ? 'Atualizar' : 'Refresh'}</span>
          </button>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
            >
              <span>{isPt ? 'Ver Detalhes' : 'View Details'}</span>
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>

      {/* CONTENT LIST */}
      <div className="p-3 sm:p-4 divide-y divide-slate-100">
        {isLoading && logs.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-blue-500" />
            <p className="text-xs font-medium text-slate-500">
              {isPt ? 'Carregando histórico dos últimos acessos...' : 'Loading recent access history...'}
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400">
            <Clock size={28} className="mx-auto mb-2 opacity-30 text-slate-500" />
            <p className="text-sm font-bold text-slate-600">
              {isPt ? 'Nenhum acesso registrado no histórico.' : 'No access logs recorded yet.'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm 
                ? (isPt ? 'Nenhum resultado para a busca.' : 'No results found for this search.')
                : (isPt ? 'Os acessos de alunos e instrutores ao sistema serão registrados automaticamente aqui.' : 'User logins and accesses will appear automatically.')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.slice(0, limit).map((log, index) => {
              const roleInfo = getRoleBadge(log.role);
              const RoleIcon = roleInfo.icon;
              const initials = log.userName
                ? log.userName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(p => p[0].toUpperCase())
                    .join('')
                : 'U';

              return (
                <div
                  key={log.id || `log-${index}`}
                  className="p-3 bg-slate-50/60 hover:bg-white border border-slate-100 hover:border-slate-300 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group shadow-2xs"
                >
                  {/* LEFT: Index, Avatar and User Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Access order number */}
                    <div className="w-6 h-6 rounded-md bg-slate-200/70 text-slate-600 text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                      #{index + 1}
                    </div>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {initials}
                      </div>
                      {log.isOnline ? (
                        <span 
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                          title={isPt ? 'Online agora' : 'Online now'}
                        >
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        </span>
                      ) : (
                        <span 
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white"
                          title={isPt ? 'Sessão concluída' : 'Logged'}
                        />
                      )}
                    </div>

                    {/* User Name & Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* THE PROMINENT USER NAME */}
                        <span className="text-sm font-extrabold text-slate-900 truncate">
                          {log.userName}
                        </span>

                        {/* Role Badge */}
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1", roleInfo.bg)}>
                          <RoleIcon size={11} />
                          {roleInfo.label}
                        </span>

                        {/* Online / Recorded Badge */}
                        {log.isOnline && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {isPt ? 'Online' : 'Online'}
                          </span>
                        )}
                      </div>

                      {/* Secondary user info */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        {log.email && (
                          <span className="text-slate-600 font-mono text-[11px] truncate max-w-[200px]">
                            {log.email}
                          </span>
                        )}
                        {log.accessType && (
                          <span className="text-slate-400 text-[11px]">
                            • {log.accessType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Device & Timestamp */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Device & Browser */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                      {getDeviceIcon(log.device)}
                      <span className="font-medium text-[11px]">
                        {log.device}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 text-[11px]">
                        {log.browser}
                      </span>
                    </div>

                    {/* Date & Relative Time */}
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
                        <Clock size={12} className="text-slate-400" />
                        <span>{formatTimeAgo(log.createdAt, log.timestamp)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatFullDate(log.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Radio size={12} className="text-emerald-500 animate-pulse" />
          <span>
            {isPt ? 'Registros ordenados cronologicamente pelo acesso mais recente' : 'Chronologically ordered by most recent access'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
          {isPt ? 'Última sincronização:' : 'Last sync:'} {lastUpdated.toLocaleTimeString(isPt ? 'pt-BR' : 'en-US')}
        </span>
      </div>
    </div>
  );
}
