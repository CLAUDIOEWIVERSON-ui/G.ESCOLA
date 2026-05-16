'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

import { useUser } from '@/lib/auth/UserContext';
import { ProximityAlert } from '@/components/ProximityAlert';
import { EventMarquee } from '@/components/EventMarquee';
import { SidebarClock } from '@/components/SidebarClock';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useI18n();
  const { profile, isAdmin, isAluno, isInstrutor, loading: authLoading } = useUser();
  const isReadOnly = !isAdmin;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen(isDesktop);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const navItems = [
    { name: t.nav.dashboard, icon: LayoutDashboard, path: '/dashboard' },
    { name: t.nav.courses, icon: BookOpen, path: '/cursos' },
    { 
      name: t.nav.classes, 
      icon: Library, 
      path: '/turmas',
      subItems: [
        { name: t.classes.categoryExpedito, path: '/turmas?cat=expedito' },
        { name: t.classes.categoryEspecial, path: '/turmas?cat=especial' },
        { name: t.classes.categoryCarreira, path: '/turmas?cat=carreira' },
      ]
    },
    { name: t.nav.grades, icon: FileCheck, path: '/notas' },
    { name: t.nav.reportCard, icon: FileText, path: '/boletim' },
    { name: t.nav.attendance, icon: CalendarDays, path: '/frequencia' },
    { name: t.calendar.title, icon: CalendarDays, path: '/calendario' },
    ...(isAdmin ? [{ name: t.users.title, icon: Users, path: '/usuarios' }] : []),
    { name: t.nav.settings, icon: Settings, path: '/configuracoes' },
  ];

  const userInitials = profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : 'US';

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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-slate-950 text-slate-300 border-r border-white/5 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 overflow-hidden shadow-2xl",
          sidebarOpen ? "w-64" : "w-20 -translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className={cn(
            "flex items-center justify-center border-b border-white/5 bg-white/[0.02] transition-all",
            sidebarOpen ? "p-8 py-12" : "h-20 p-2"
          )}>
            <Logo collapsed={!sidebarOpen} size="lg" orientation="vertical" />
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <nav id="sidebar-nav" className="px-4 py-6 space-y-8">
              {/* Clock Widget */}
              <div className="px-2">
                <SidebarClock collapsed={!sidebarOpen} />
              </div>

              <div>
                <div className={cn("text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2", !sidebarOpen && "opacity-0 invisible h-0")}>
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  {t.auth.management}
                </div>
                <div className="space-y-1.5">
                  {navItems.slice(0, 4).map((item: any) => {
                    const subItemPaths = item.subItems?.map((s: any) => s.path) || [];
                    const isAnySubActive = subItemPaths.some((p: string) => pathname + (typeof window !== 'undefined' ? window.location.search : '') === p);
                    const isParentActive = pathname === item.path || isAnySubActive;
                    const isExpanded = sidebarOpen && (isParentActive || isAnySubActive);

                    return (
                      <div key={item.path} className="flex flex-col">
                        <Link 
                          href={item.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden",
                            isParentActive 
                              ? "bg-blue-600/10 text-white border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]" 
                              : "hover:bg-white/[0.03] text-slate-400 hover:text-white"
                          )}
                        >
                          {isParentActive && (
                            <motion.div 
                              layoutId="active-indicator"
                              className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full"
                            />
                          )}
                          <item.icon size={18} className={cn("shrink-0 transition-transform group-hover:scale-110", isParentActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                          <span className={cn(
                            "text-sm transition-opacity flex-1 whitespace-nowrap font-medium",
                            !sidebarOpen && "opacity-0 invisible w-0",
                          )}>
                            {item.name}
                          </span>
                          {item.subItems && sidebarOpen && (
                            <ChevronRight size={14} className={cn("transition-transform text-slate-600 group-hover:text-slate-400", isExpanded && "rotate-90 text-blue-400")} />
                          )}
                        </Link>

                        {item.subItems && isExpanded && (
                          <div className="ml-9 mt-1 space-y-1 border-l border-white/5 pl-4 py-1">
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
                        )}
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
                  {navItems.slice(4).map((item) => {
                    const isActive = pathname === item.path;
                    const isCalendar = item.path === '/calendario';
                    
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
                          isActive ? "text-blue-400" : isCalendar ? "text-amber-500" : "text-slate-500 group-hover:text-slate-300"
                        )} />
                        <span className={cn(
                          "text-sm transition-opacity whitespace-nowrap font-medium",
                          !sidebarOpen && "opacity-0 invisible w-0",
                        )}>
                          {item.name}
                        </span>
                        {isCalendar && sidebarOpen && (
                          <span className="ml-auto flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
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
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <EventMarquee />
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
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
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{t.auth.term}</p>
                {isReadOnly && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-amber-200 flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    {t.users.readOnlyWarning}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2">
               <div className="relative">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder={t.common.search}
                   className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/10 w-48"
                 />
               </div>
            </div>
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
      </div>

      {/* Bottom Nav for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around z-50 h-16 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {navItems.filter(item => ['/dashboard', '/cursos', '/turmas', '/configuracoes'].includes(item.path)).map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex flex-col items-center gap-1 p-2 transition-all min-w-[64px]",
                isActive ? "text-blue-600 scale-110" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <item.icon size={20} className={isActive ? "text-blue-600" : "text-slate-400"} />
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest text-center",
                isActive ? "text-blue-600" : "text-slate-400"
              )}>
                {item.name.split(' ')[0]}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="bottom-nav-indicator"
                  className="absolute -bottom-2 w-8 h-1 bg-blue-600 rounded-t-full"
                />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 min-w-[64px]"
        >
          <Menu size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">{t.common.menu || 'Menu'}</span>
        </button>
      </nav>
    </div>
  );
}
