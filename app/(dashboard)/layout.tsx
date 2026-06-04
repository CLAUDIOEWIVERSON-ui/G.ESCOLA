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
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

import { useUser } from '@/lib/auth/UserContext';
import { ProximityAlert } from '@/components/ProximityAlert';
import { EventMarquee } from '@/components/EventMarquee';
import { HeaderClock } from '@/components/HeaderClock';
import { FormGuidanceAssistant } from '@/components/FormGuidanceAssistant';

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useI18n();
  const { profile, isAdmin, isAluno, isInstrutor, loading: authLoading } = useUser();
  const isReadOnly = !isAdmin;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

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

  const isNifStudent = profile?.role === 'aluno' && (profile as any).isNifStudent;

  useEffect(() => {
    if (!authLoading) {
      if (!profile) {
        router.push('/login');
      } else {
        if (profile.role === 'aluno' && profile.turma_id) {
          const checkClassStatus = async () => {
            try {
              const { data: turma } = await supabase
                .from('turmas')
                .select('id, status')
                .eq('id', profile.turma_id)
                .maybeSingle();

              if (turma && (turma.status === 'concluída' || turma.status === 'cancelada')) {
                // Auto sign-out active session instantly
                await supabase.auth.signOut();
                router.push('/login?blocked=true');
              }
            } catch (err) {
              console.error('Error dynamic verifying student class status:', err);
            }
          };
          checkClassStatus();
        }

        if (isNifStudent && !['/boletim', '/horario', '/avaliacao'].includes(pathname)) {
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

  const navItems = isNifStudent ? [
    { name: t.nav.reportCard, icon: FileText, path: '/boletim' },
    { name: t.schedule.title, icon: Calendar, path: '/horario' },
    { name: "Avaliação Pós-Curso", icon: FileCheck, path: '/avaliacao' },
  ] : [
    { name: t.nav.dashboard, icon: LayoutDashboard, path: '/dashboard' },
    { name: t.nav.courses, icon: BookOpen, path: '/cursos' },
    { name: t.nav.classes, icon: Library, path: '/turmas' },
    { name: t.nav.grades, icon: FileCheck, path: '/notas' },
    { name: t.nav.reportCard, icon: FileText, path: '/boletim' },
    { name: t.schedule.title, icon: Calendar, path: '/horario' },
    { name: t.nav.attendance, icon: CalendarDays, path: '/frequencia' },
    { name: t.calendar.title, icon: CalendarDays, path: '/calendario' },
    ...(isAdmin ? [{ name: t.users.title, icon: Users, path: '/usuarios' }] : []),
    ...(isAdmin ? [{ name: "Análise de Avaliações", icon: FileCheck, path: '/relatorio-avaliacao' }] : []),
    { name: t.nav.links, icon: Link2, path: '/links' },
    { name: t.nav.settings, icon: Settings, path: '/configuracoes' },
  ];

  const firstGroup = isNifStudent ? [] : navItems.slice(0, 4);
  const secondGroup = isNifStudent ? navItems : navItems.slice(4);

  const userInitials = profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : 'US';
  const roleName = profile?.role === 'admin' 
    ? t.users.admin 
    : profile?.role === 'instrutor' 
      ? t.users.instrutor 
      : profile?.role === 'aluno' 
        ? t.users.aluno 
        : '';

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
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
            <nav id="sidebar-nav" className="px-4 py-6 space-y-8">
              <div>
                <div className={cn("text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2", !sidebarOpen && "opacity-0 invisible h-0")}>
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  {t.auth.management}
                </div>
                <div className="space-y-1.5">
                  {firstGroup.map((item: any) => {
                    const subItemPaths = item.subItems?.map((s: any) => s.path) || [];
                    const isAnySubActive = subItemPaths.some((p: string) => (pathname + (typeof window !== 'undefined' ? window.location.search : '')) === p);
                    const isParentActive = pathname === item.path || isAnySubActive;
                    
                    // A menu is expanded if its path is in expandedMenus OR if one of its subitems is active
                    const isExpanded = sidebarOpen && (expandedMenus.includes(item.path) || isAnySubActive);
                    const hasSubItems = !!item.subItems;

                    const Content = (
                      <div className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden",
                        isParentActive 
                          ? "text-white" 
                          : "text-slate-400 hover:text-white hover:bg-white/[0.03]",
                        isExpanded && hasSubItems && "bg-slate-900 rounded-b-none"
                      )}>
                        {/* Blue indicator for active OR expanded with subitems */}
                        {(isParentActive || (isExpanded && hasSubItems)) && (
                          <motion.div 
                            layoutId={hasSubItems ? `expanded-indicator-${item.path}` : "active-indicator"}
                            className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full z-10"
                          />
                        )}
                        
                        {item.name === t.nav.classes ? (
                          <div className="shrink-0 w-[18px] flex justify-center text-xs font-bold" style={{ letterSpacing: '-2px' }}>
                            <span className={cn(isParentActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")}>||\</span>
                          </div>
                        ) : (
                          <item.icon size={18} className={cn("shrink-0 transition-transform group-hover:scale-110", isParentActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                        )}
                        
                        <span className={cn(
                          "text-sm transition-opacity flex-1 whitespace-nowrap font-medium",
                          !sidebarOpen && "opacity-0 invisible w-0",
                        )}>
                          {item.name}
                        </span>
                        
                        {hasSubItems && sidebarOpen && (
                          <ChevronRight 
                            size={14} 
                            className={cn(
                              "transition-transform text-slate-600 group-hover:text-slate-400", 
                              isExpanded && "rotate-90 text-blue-400"
                            )} 
                          />
                        )}
                      </div>
                    );

                    return (
                      <div key={item.path} className={cn("flex flex-col rounded-xl overflow-hidden transition-colors", isExpanded && hasSubItems && "bg-slate-900/50")}>
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
                          {hasSubItems && isExpanded && (
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

              <div>
                <div className={cn("text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2", !sidebarOpen && "opacity-0 invisible h-0")}>
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  {t.auth.academic}
                </div>
                <div className="space-y-1.5">
                  {secondGroup.map((item) => {
                    const isActive = pathname === item.path;
                    const isCalendar = item.path === '/calendario';
                    const isSettings = item.path === '/configuracoes';
                    const needsPasswordChange = isSettings && profile && !profile.has_changed_password;
                    
                    return (
                      <Link 
                        key={item.path} 
                        href={item.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden",
                          isActive 
                            ? "bg-blue-600/10 text-white border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]" 
                            : isCalendar
                              ? "bg-amber-500/5 text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20"
                              : "hover:bg-white/[0.03] text-slate-400 hover:text-white"
                        )}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="active-indicator-academic"
                            className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full"
                          />
                        )}
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
                        <span className={cn(
                          "text-sm transition-opacity whitespace-nowrap font-medium",
                          !sidebarOpen && "opacity-0 invisible w-0",
                          needsPasswordChange && "text-amber-500 font-bold"
                        )}>
                          {item.name}
                        </span>
                        {isCalendar && sidebarOpen && (
                          <span className="ml-auto flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                        {needsPasswordChange && sidebarOpen && (
                          <span className="ml-auto text-[9px] font-black tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full uppercase animate-pulse shrink-0 font-sans">
                            Atenção
                          </span>
                        )}
                        {needsPasswordChange && !sidebarOpen && (
                          <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        )}
                      </Link>
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
      <div className="flex-1 flex flex-col min-w-0">
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
            <div className="hidden md:flex items-center gap-2">
               <Suspense fallback={<div className="w-48 h-8 bg-slate-50 border border-slate-200 rounded-lg animate-pulse" />}>
                 <HeaderSearchBar />
               </Suspense>
            </div>
            <HeaderClock />
            {/* Language toggle removed as per user request */}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto overflow-x-hidden pb-24 lg:pb-8">
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
        <FormGuidanceAssistant />
      </div>

      {/* Bottom Nav for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around z-50 h-16 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] print:hidden">
        {navItems.filter(item => {
          if (isNifStudent) {
            return ['/boletim', '/horario'].includes(item.path);
          }
          return ['/dashboard', '/cursos', '/turmas', '/horario', '/calendario', '/configuracoes'].includes(item.path);
        }).map((item) => {
          const isActive = pathname === item.path;
          const isSettings = item.path === '/configuracoes';
          const needsPasswordChange = isSettings && profile && !profile.has_changed_password;
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex flex-col items-center gap-1 p-1 transition-all min-w-0 flex-1 max-w-[64px] relative",
                isActive ? "text-blue-600 scale-110" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <item.icon size={19} className={cn(
                isActive ? "text-blue-600" : "text-slate-400",
                needsPasswordChange && "text-amber-500 animate-pulse"
              )} />
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest text-center truncate w-full",
                isActive ? "text-blue-600" : needsPasswordChange ? "text-amber-500 font-bold" : "text-slate-400"
              )}>
                {item.path === '/calendario' ? 'CALEND.' : item.name.split(' ')[0]}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="bottom-nav-indicator"
                  className="absolute -bottom-2 w-8 h-1 bg-blue-600 rounded-t-full"
                />
              )}
              {needsPasswordChange && (
                <span className="absolute top-1 right-3.5 flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-1 p-1 text-slate-400 hover:text-slate-600 min-w-0 flex-1 max-w-[64px]"
        >
          <Menu size={19} />
          <span className="text-[8px] font-black uppercase tracking-widest truncate w-full">{t.common.menu || 'Menu'}</span>
        </button>
      </nav>
    </div>
  );
}
