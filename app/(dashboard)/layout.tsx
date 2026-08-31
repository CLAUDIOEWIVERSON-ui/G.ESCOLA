'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { Logo } from '@/components/Logo';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Library, 
  FileCheck, 
  FileText,
  CalendarDays,
  Settings,
  Layers as LayersIcon,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Search,
  Calendar,
  Link2,
  ArrowLeft,
  ArrowRight,
  Home,
  MessageSquare,
  MousePointer2,
  AlertCircle,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import { useTheme } from '@/lib/theme/ThemeContext';

import { useUser } from '@/lib/auth/UserContext';
import { fetchWithAuth } from '@/lib/api';
import { ProximityAlert } from '@/components/ProximityAlert';
import { EventMarquee } from '@/components/EventMarquee';
import { HeaderClock } from '@/components/HeaderClock';
import { FormGuidanceAssistant } from '@/components/FormGuidanceAssistant';
import { SuggestionsModal } from '@/components/SuggestionsModal';

// Isolated search bar component to avoid CSR bailout in layout.tsx
function HeaderSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const handleSearchChange = (val: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (val) {
      params.set('q', val);
    } else {
      params.delete('q');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input 
        type="text" 
        placeholder={t.common.search}
        value={searchParams ? (searchParams.get('q') || '') : ''}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/10 w-48"
      />
    </div>
  );
}

// Cores exclusivas e personalizadas para cada atalho na régua inferior mobile
const MOBILE_NAV_COLORS: Record<string, {
  text: string;
  activeText: string;
  bg: string;
  activeBg: string;
  border: string;
  indicator: string;
}> = {
  '/dashboard': {
    text: 'text-blue-600 dark:text-blue-400',
    activeText: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/50',
    activeBg: 'bg-blue-600 text-white shadow-xs shadow-blue-500/30 border border-blue-700',
    border: 'border-blue-200 dark:border-blue-800',
    indicator: 'bg-blue-600',
  },
  '/cursos': {
    text: 'text-amber-600 dark:text-amber-400',
    activeText: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/50',
    activeBg: 'bg-amber-500 text-white shadow-xs shadow-amber-500/30 border border-amber-600',
    border: 'border-amber-200 dark:border-amber-800',
    indicator: 'bg-amber-500',
  },
  '/turmas': {
    text: 'text-emerald-600 dark:text-emerald-400',
    activeText: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50',
    activeBg: 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 border border-emerald-700',
    border: 'border-emerald-200 dark:border-emerald-800',
    indicator: 'bg-emerald-600',
  },
  '/frequencia': {
    text: 'text-purple-600 dark:text-purple-400',
    activeText: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 text-purple-600 border border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/50',
    activeBg: 'bg-purple-600 text-white shadow-xs shadow-purple-500/30 border border-purple-700',
    border: 'border-purple-200 dark:border-purple-800',
    indicator: 'bg-purple-600',
  },
  '/horario': {
    text: 'text-cyan-600 dark:text-cyan-400',
    activeText: 'text-cyan-700 dark:text-cyan-300',
    bg: 'bg-cyan-50 text-cyan-600 border border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800/50',
    activeBg: 'bg-cyan-600 text-white shadow-xs shadow-cyan-500/30 border border-cyan-700',
    border: 'border-cyan-200 dark:border-cyan-800',
    indicator: 'bg-cyan-600',
  },
  '/calendario': {
    text: 'text-rose-600 dark:text-rose-400',
    activeText: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/50',
    activeBg: 'bg-rose-600 text-white shadow-xs shadow-rose-500/30 border border-rose-700',
    border: 'border-rose-200 dark:border-rose-800',
    indicator: 'bg-rose-600',
  },
  '/boletim': {
    text: 'text-sky-600 dark:text-sky-400',
    activeText: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-50 text-sky-600 border border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/50',
    activeBg: 'bg-sky-600 text-white shadow-xs shadow-sky-500/30 border border-sky-700',
    border: 'border-sky-200 dark:border-sky-800',
    indicator: 'bg-sky-600',
  },
  '/configuracoes': {
    text: 'text-indigo-600 dark:text-indigo-400',
    activeText: 'text-indigo-700 dark:text-indigo-300',
    bg: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800/50',
    activeBg: 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 border border-indigo-700',
    border: 'border-indigo-200 dark:border-indigo-800',
    indicator: 'bg-indigo-600',
  },
  '/usuarios': {
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    activeText: 'text-fuchsia-700 dark:text-fuchsia-300',
    bg: 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200/80 dark:bg-fuchsia-950/60 dark:text-fuchsia-400 dark:border-fuchsia-800/50',
    activeBg: 'bg-fuchsia-600 text-white shadow-xs shadow-fuchsia-500/30 border border-fuchsia-700',
    border: 'border-fuchsia-200 dark:border-fuchsia-800',
    indicator: 'bg-fuchsia-600',
  },
  '/relatorio-avaliacao': {
    text: 'text-violet-600 dark:text-violet-400',
    activeText: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-50 text-violet-600 border border-violet-200/80 dark:bg-violet-950/60 dark:text-violet-400 dark:border-violet-800/50',
    activeBg: 'bg-violet-600 text-white shadow-xs shadow-violet-500/30 border border-violet-700',
    border: 'border-violet-200 dark:border-violet-800',
    indicator: 'bg-violet-600',
  },
  '/links': {
    text: 'text-teal-600 dark:text-teal-400',
    activeText: 'text-teal-700 dark:text-teal-300',
    bg: 'bg-teal-50 text-teal-600 border border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/50',
    activeBg: 'bg-teal-600 text-white shadow-xs shadow-teal-500/30 border border-teal-700',
    border: 'border-teal-200 dark:border-teal-800',
    indicator: 'bg-teal-600',
  },
  '/avaliacao': {
    text: 'text-emerald-600 dark:text-emerald-400',
    activeText: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50',
    activeBg: 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 border border-emerald-700',
    border: 'border-emerald-200 dark:border-emerald-800',
    indicator: 'bg-emerald-600',
  },
};

const MENU_BUTTON_COLOR = {
  text: 'text-slate-600 dark:text-slate-400',
  activeText: 'text-slate-900 dark:text-white',
  bg: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  activeBg: 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs border border-slate-900 dark:border-white',
  indicator: 'bg-slate-800 dark:bg-slate-200',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, setLanguage } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const { profile, isAdmin, isAluno, isInstrutor, isConvidado, loading: authLoading } = useUser();
  const isReadOnly = !isAdmin;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [showAssistant, setShowAssistant] = useState(false);

  const fetchOnlineUsers = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetchWithAuth('/api/auth/heartbeat');
      const data = await res.json();
      if (data.success) {
        setOnlineCount(data.count || 0);
      }
    } catch (err) {
      // Silently fail network errors for polling
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 15000); // refresh every 15s for admins
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const toggleSubmenu = (path: string, e: React.MouseEvent) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      if (!expandedMenus.includes(path)) {
        setExpandedMenus([path]);
      }
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    setExpandedMenus(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path) 
        : [...prev, path]
    );
  };

  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen(isDesktop);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  const isNifStudent = profile?.role === 'aluno' && (profile as any).isNifStudent;

  useEffect(() => {
    if (!authLoading) {
      if (!profile) {
        if (pathname === '/avaliacao') {
          return;
        }
        router.push('/login');
      } else {
        if (profile.role === 'aluno' && profile.turma_id) {
          const checkClassStatus = async () => {
            try {
              const { data: turma } = await supabase
                .from('turmas')
                .select('id, status, data_fim, data_postergacao, liberar_formularios')
                .eq('id', profile.turma_id)
                .maybeSingle();

              if (turma) {
                if (turma.status === 'cancelada') {
                  // Auto sign-out active session instantly
                  await supabase.auth.signOut();
                  router.push('/login?blocked=true');
                } else if (turma.status === 'concluída') {
                  const isFormReleased = turma.liberar_formularios === true;
                  const effectiveEndDate = turma.data_postergacao || turma.data_fim;
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isPostponedExpired = effectiveEndDate ? todayStr > effectiveEndDate : true;

                  // Se o formulário não estiver liberado OU o prazo de postergação estiver expirado, encerra a sessão
                  if (!isFormReleased || isPostponedExpired) {
                    await supabase.auth.signOut();
                    router.push('/login?blocked=true');
                  }
                }
              }
            } catch (err) {
              console.error('Error dynamic verifying student class status:', err);
            }
          };
          checkClassStatus();
        }

        if (isNifStudent && !['/boletim', '/horario', '/avaliacao'].includes(pathname || '')) {
          // Force students logged in via NIF to only access allowed sections
          router.push('/boletim');
        }
      }
    }
  }, [authLoading, profile, isNifStudent, pathname, router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Server signout failed, trying local signout:', e);
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (localError) {
        console.error('Local signout failed:', localError);
      }
    }
    router.push('/login');
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const rawNavItems = isNifStudent ? [
    { name: t.nav.reportCard, icon: FileText, path: '/boletim' },
    { name: t.schedule.title, icon: Calendar, path: '/horario' },
    { name: "Avaliação Pós-Curso", icon: FileCheck, path: '/avaliacao' },
  ] : [
    { name: t.nav.dashboard, icon: LayoutDashboard, path: '/dashboard' },
    { name: t.nav.courses, icon: BookOpen, path: '/cursos' },
    { name: t.nav.classes, icon: Library, path: '/turmas' },
    { name: t.nav.reportCard, icon: FileText, path: '/boletim' },
    { name: t.schedule.title, icon: Calendar, path: '/horario' },
    { name: t.nav.attendance, icon: CalendarDays, path: '/frequencia' },
    { name: t.calendar.title, icon: CalendarDays, path: '/calendario' },
    ...((isAdmin || isConvidado) ? [{ name: t.users.title, icon: Users, path: '/usuarios' }] : []),
    ...((isAdmin || isInstrutor || isConvidado) ? [{ name: "Análise de Avaliações", icon: FileCheck, path: '/relatorio-avaliacao' }] : []),
    { name: t.nav.links, icon: Link2, path: '/links' },
    { name: t.nav.settings, icon: Settings, path: '/configuracoes' },
  ];

  // Ordenar todos os módulos por ordem alfabética de acordo com o idioma ativo
  const navItems = [...rawNavItems].sort((a, b) =>
    a.name.localeCompare(b.name, language === 'pt' ? 'pt-BR' : 'en', { sensitivity: 'base' })
  );

  const userInitials = profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : 'US';
  const roleName = profile?.role === 'admin' 
    ? t.users.admin 
    : profile?.role === 'instrutor' 
      ? t.users.instrutor 
      : profile?.role === 'aluno' 
        ? t.users.aluno 
        : profile?.role === 'convidado'
          ? (language === 'pt' ? 'Convidado' : 'Guest')
          : '';

  // Definir navegação dinâmica (Voltar/Próximo) baseada na ordem dos módulos em navItems
  const currentPath = pathname || '';
  const currentNavIndex = navItems.findIndex(item => item.path === currentPath);

  const getPreviousPagePath = () => {
    if (navItems.length === 0) return '/dashboard';
    if (currentNavIndex === -1) {
      return '/dashboard';
    }
    const prevIndex = (currentNavIndex - 1 + navItems.length) % navItems.length;
    return navItems[prevIndex].path;
  };

  const getNextPagePath = () => {
    if (navItems.length === 0) return '/dashboard';
    if (currentNavIndex === -1) {
      return navItems[0].path;
    }
    const nextIndex = (currentNavIndex + 1) % navItems.length;
    return navItems[nextIndex].path;
  };

  const prevPagePath = getPreviousPagePath();
  const nextPagePath = getNextPagePath();

  if (!profile && pathname === '/avaliacao') {
    return (
      <div className="min-h-screen bg-slate-50 relative">
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </div>
    );
  }

  if (!authLoading && profile?.role === 'aluno' && !profile?.turma_id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 relative p-6 font-sans text-slate-900">
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-4 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2 border border-red-100">
             <AlertCircle className="text-red-500" size={32} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-800">
            {language === 'pt' ? 'Nenhuma matrícula' : 'No enrollment'}
          </h2>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            {language === 'pt' 
              ? 'Não foi encontrado nenhuma matricula em turma do aluno, favor procurar a coordenação de cursos.'
              : 'No enrollment was found for the student, please contact the course coordination.'}
          </p>
          <button 
            onClick={handleLogout}
            className="mt-6 flex items-center justify-center gap-2 w-full px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider rounded-xl transition-colors text-xs shadow-md"
          >
            <LogOut size={16} />
            {language === 'pt' ? 'Sair da Conta' : 'Sign Out'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 print:block print:bg-white print:text-black print:min-h-0">
      {/* Sidebar Overlay (Mobile only) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-[rgba(15,23,42,0.6)] z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-slate-950 text-slate-300 border-r border-white/5 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 overflow-hidden shadow-2xl print:hidden",
          sidebarOpen ? "w-64" : "w-20 -translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className={cn("px-4 py-6 flex flex-col items-center justify-center border-b border-white/5 bg-white/[0.02] overflow-hidden transition-all duration-300", sidebarOpen ? "h-[250px]" : "h-20")}>
            <Logo collapsed={!sidebarOpen} size="md" orientation="vertical" userRole={roleName} isInternal={true} />
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <nav id="sidebar-nav" className="px-4 py-6 space-y-6">
              <div>
                <div className={cn("text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2", !sidebarOpen && "opacity-0 invisible h-0")}>
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  {language === 'pt' ? 'Módulos' : 'Modules'}
                </div>
                <div className="space-y-1.5">
                  {navItems.map((item: any, idx: number) => {
                    const subItemPaths = item.subItems?.map((s: any) => s.path) || [];
                    const isAnySubActive = subItemPaths.some((p: string) => (pathname + (typeof window !== 'undefined' ? window.location.search : '')) === p);
                    const isActive = pathname === item.path || isAnySubActive;
                    const isItemExpanded = sidebarOpen && (expandedMenus.includes(item.path) || isAnySubActive);
                    const hasSubItems = !!item.subItems;
                    const isCalendar = item.path === '/calendario';
                    const isSettings = item.path === '/configuracoes';
                    const needsPasswordChange = isSettings && profile && !profile.has_changed_password;

                    const Content = (
                      <div className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden",
                        isActive 
                          ? "bg-blue-600/10 text-white border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]" 
                          : isCalendar
                            ? "bg-amber-500/5 text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20"
                            : "text-slate-400 hover:text-white hover:bg-white/[0.03]",
                        isItemExpanded && hasSubItems && "bg-slate-900 rounded-b-none"
                      )}>
                        {/* Blue indicator for active item */}
                        {isActive && (
                          <motion.div 
                            layoutId="active-indicator"
                            className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full z-10"
                          />
                        )}
                        
                        {item.name === t.nav.classes ? (
                          <div className="shrink-0 w-[18px] flex justify-center text-xs font-bold" style={{ letterSpacing: '-2px' }}>
                            <span className={cn(isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")}>||\</span>
                          </div>
                        ) : (
                          <item.icon size={18} className={cn(
                            "shrink-0 transition-transform group-hover:scale-110", 
                            isActive 
                              ? "text-blue-400" 
                              : isCalendar 
                                ? "text-amber-500" 
                                : needsPasswordChange
                                  ? "text-amber-500 animate-pulse bg-amber-500/10 p-0.5 rounded-md"
                                  : "text-slate-500 group-hover:text-slate-300"
                          )} />
                        )}
                        
                        <span className={cn(
                          "text-sm transition-opacity flex-1 whitespace-nowrap font-medium",
                          !sidebarOpen && "opacity-0 invisible w-0",
                          needsPasswordChange && "text-amber-500 font-bold"
                        )}>
                          {item.name}
                        </span>

                        {isCalendar && sidebarOpen && (
                          <span className="ml-auto flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        )}

                        {needsPasswordChange && sidebarOpen && (
                          <span className="ml-auto text-[9px] font-black tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full uppercase animate-pulse shrink-0 font-sans">
                            Atenção
                          </span>
                        )}

                        {needsPasswordChange && !sidebarOpen && (
                          <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        )}
                        
                        {hasSubItems && sidebarOpen && (
                          <ChevronRight 
                            size={14} 
                            className={cn(
                              "transition-transform text-slate-600 group-hover:text-slate-400 ml-auto shrink-0", 
                              isItemExpanded && "rotate-90 text-blue-400"
                            )} 
                          />
                        )}
                      </div>
                    );

                    return (
                      <div key={`nav-item-${item.path}-${idx}`} className={cn("flex flex-col rounded-xl overflow-hidden transition-colors", isItemExpanded && hasSubItems && "bg-slate-900/50")}>
                        {hasSubItems ? (
                          <button 
                            onClick={(e) => toggleSubmenu(item.path, e)}
                            className="w-full text-left outline-none"
                          >
                            {Content}
                          </button>
                        ) : (
                          <Link href={item.path} className="outline-none">
                            {Content}
                          </Link>
                        )}

                        <AnimatePresence>
                          {hasSubItems && isItemExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="ml-8 my-1 space-y-1 border-l border-white/10 pl-4 py-1">
                                {item.subItems.map((sub: any) => {
                                  const isSubActive = (pathname + (typeof window !== 'undefined' ? window.location.search : '')) === sub.path;
                                  return (
                                    <Link 
                                      key={sub.path}
                                      href={sub.path}
                                      className={cn(
                                        "block py-1.5 text-xs font-medium transition-all",
                                        isSubActive
                                          ? "text-blue-400 font-bold" 
                                          : "text-slate-500 hover:text-slate-300"
                                      )}
                                    >
                                      {sub.name}
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </nav>
          </div>

          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-xs border border-white/10 text-white font-bold transition-transform hover:scale-105 cursor-pointer shadow-lg shadow-black/20">
                {userInitials}
              </div>
              <div className={cn("flex-1 overflow-hidden transition-opacity", !sidebarOpen && "opacity-0 w-0 invisible")}>
                <p className="text-xs font-bold text-white truncate uppercase tracking-tight">{profile?.full_name || profile?.id.slice(0, 8)}</p>
                <p className="text-[10px] text-slate-500 truncate font-semibold uppercase tracking-wider">{profile?.role === 'admin' ? t.users.admin : profile?.role === 'instrutor' ? t.users.instrutor : t.users.aluno}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all group text-xs font-bold uppercase tracking-wider",
                !sidebarOpen && "justify-center"
              )}
            >
              <LogOut size={16} className="shrink-0 transition-transform group-hover:-translate-x-1" />
              <span className={cn("transition-opacity whitespace-nowrap", !sidebarOpen && "hidden")}>{t.common.logout}</span>
            </button>
            {sidebarOpen && (
              <div id="sidebar-footer-credit" className="mt-4 pt-3 border-t border-white/5 text-[9px] text-slate-500 text-center font-medium leading-normal tracking-wide normal-case">
                Made by &ldquo;an old sailor radar operator&rdquo;<br />advisory mission of 2025.
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 print:block print:w-full print:min-h-0 print:bg-white">
        <div className="print:hidden">
          <EventMarquee />
        </div>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 print:hidden">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-slate-800 leading-none">
                {navItems.find(item => item.path === pathname)?.name || t.dashboard.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            {isAdmin && (
              <div 
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 shadow-sm"
                title={language === 'pt' ? 'Usuários online' : 'Online users'}
              >
                <MousePointer2 size={14} className="animate-pulse" />
                <span className="text-xs font-bold">{onlineCount}</span>
              </div>
            )}
            <div className="hidden md:flex items-center gap-2">
               <Suspense fallback={<div className="w-48 h-8 bg-slate-50 border border-slate-200 rounded-lg animate-pulse" />}>
                 <HeaderSearchBar />
               </Suspense>
            </div>
            <HeaderClock />
            {/* Assistente IA toggle on régua / header */}
            <button
              onClick={() => setShowAssistant(!showAssistant)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-xs",
                showAssistant 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20" 
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              )}
              title={language === 'pt' ? 'Solicitar Assistente IA' : 'Request AI Assistant'}
            >
              <Sparkles size={14} className={cn("shrink-0", showAssistant ? "text-amber-300 animate-spin" : "text-indigo-500")} />
              <span className="hidden sm:inline">{language === 'pt' ? 'Assistente' : 'Assistant'}</span>
            </button>
            {/* Language toggle */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-lg shadow-inner">
              <button
                onClick={() => setLanguage('pt')}
                className={cn(
                  "px-2 py-1 text-[9px] font-black rounded-md transition-all cursor-pointer",
                  language === 'pt' ? "bg-white text-blue-600 shadow-xs" : "text-slate-400 hover:text-slate-600"
                )}
              >
                PT
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={cn(
                  "px-2 py-1 text-[9px] font-black rounded-md transition-all cursor-pointer",
                  language === 'en' ? "bg-white text-blue-600 shadow-xs" : "text-slate-400 hover:text-slate-600"
                )}
              >
                EN
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center",
                isDark
                  ? "bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700 hover:text-amber-300"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              )}
              title={
                isDark 
                  ? (language === 'pt' ? 'Mudar para Modo Claro' : 'Switch to Light Mode')
                  : (language === 'pt' ? 'Mudar para Modo Escuro' : 'Switch to Dark Mode')
              }
              aria-label="Alternar modo escuro / claro"
            >
              {isDark ? (
                <Sun size={15} className="text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon size={15} className="text-slate-600 transition-transform hover:-rotate-12" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto overflow-x-hidden pb-24 lg:pb-8 print:p-0 print:m-0 print:overflow-visible print:block print:h-auto print:min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <ProximityAlert />
        <FormGuidanceAssistant isOpen={showAssistant} onClose={() => setShowAssistant(false)} />
        <SuggestionsModal isOpen={suggestionsOpen} onClose={() => setSuggestionsOpen(false)} />
      </div>

      {/* Bottom Nav for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 flex items-center justify-around z-50 h-16 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] print:hidden overflow-x-auto custom-scrollbar">
        {navItems.filter(item => {
          if (isNifStudent) {
            return ['/boletim', '/horario'].includes(item.path);
          }
          return ['/dashboard', '/cursos', '/turmas', '/frequencia', '/horario', '/calendario', '/configuracoes'].includes(item.path);
        }).map((item, idx) => {
          const isActive = pathname === item.path;
          const isSettings = item.path === '/configuracoes';
          const needsPasswordChange = isSettings && profile && !profile.has_changed_password;
          const colorConfig = MOBILE_NAV_COLORS[item.path] || {
            text: 'text-blue-600 dark:text-blue-400',
            activeText: 'text-blue-700 dark:text-blue-300',
            bg: 'bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-400',
            activeBg: 'bg-blue-600 text-white',
            indicator: 'bg-blue-600',
            border: 'border-blue-200',
          };
          
          return (
            <Link 
              key={`mobile-nav-${item.path}-${idx}`} 
              href={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 p-0.5 transition-all min-w-0 flex-1 max-w-[56px] shrink-0 relative group",
                isActive ? "scale-105" : "hover:opacity-100"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0",
                isActive ? colorConfig.activeBg : colorConfig.bg,
                needsPasswordChange && "ring-2 ring-amber-500 animate-pulse"
              )}>
                <item.icon size={17} className={cn(
                  isActive ? "text-white" : "",
                  needsPasswordChange && "text-amber-500"
                )} />
              </div>
              <span className={cn(
                "text-[8px] uppercase tracking-wider text-center truncate w-full transition-colors",
                isActive ? `${colorConfig.activeText} font-black` : `${colorConfig.text} font-bold`,
                needsPasswordChange && "text-amber-500 font-bold"
              )}>
                {item.path === '/calendario' 
                  ? (language === 'pt' ? 'AGENDA' : 'CALENDAR') 
                  : item.path === '/frequencia'
                    ? (language === 'pt' ? 'FREQ.' : 'ATTEND.')
                    : item.name.split(' ')[0]}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="bottom-nav-indicator"
                  className={cn("absolute -bottom-1.5 w-6 h-1 rounded-t-full", colorConfig.indicator)}
                />
              )}
              {needsPasswordChange && (
                <span className="absolute top-0.5 right-2 flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          className={cn(
            "flex flex-col items-center gap-0.5 p-0.5 transition-all min-w-0 flex-1 max-w-[56px] shrink-0 relative group",
            sidebarOpen ? "scale-105" : "hover:opacity-100"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0",
            sidebarOpen ? MENU_BUTTON_COLOR.activeBg : MENU_BUTTON_COLOR.bg
          )}>
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </div>
          <span className={cn(
            "text-[8px] uppercase tracking-wider truncate w-full text-center transition-colors",
            sidebarOpen ? `${MENU_BUTTON_COLOR.activeText} font-black` : `${MENU_BUTTON_COLOR.text} font-bold`
          )}>
            {t.common.menu || 'Menu'}
          </span>
          {sidebarOpen && (
            <motion.div 
              layoutId="bottom-nav-indicator"
              className={cn("absolute -bottom-1.5 w-6 h-1 rounded-t-full", MENU_BUTTON_COLOR.indicator)}
            />
          )}
        </button>
      </nav>
    </div>
  );
}
