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
  UserPlus,
  GraduationCap,
  Library, 
  FileCheck, 
  FileText,
  CalendarDays,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

import { useUser } from '@/lib/auth/UserContext';
import { ProximityAlert } from '@/components/ProximityAlert';
import { EventMarquee } from '@/components/EventMarquee';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useI18n();
  const { profile, isAdmin, isAluno, isProfessor, loading: authLoading } = useUser();
  const isReadOnly = !isAdmin;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [coursesMenuOpen, setCoursesMenuOpen] = useState(false);

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

  const managementItems = [
    { name: t.nav.dashboard, icon: LayoutDashboard, path: '/dashboard' },
    { 
      name: t.nav.courses, 
      icon: BookOpen, 
      path: '/cursos',
      isDropdown: true,
      subItems: [
        { name: t.courses.categoryEspecial, path: '/cursos', icon: BookOpen },
        { name: t.courses.categoryExpedito, path: '/cursos-expeditos', icon: GraduationCap },
        { name: t.courses.categoryCarreira, path: '/cursos-carreira', icon: Library },
      ]
    },
    { name: t.nav.classes, icon: Users, path: '/turmas' },
  ];

  const academicItems = [
    { name: t.nav.grades, icon: FileCheck, path: '/notas' },
    { name: t.nav.reportCard, icon: FileText, path: '/boletim' },
    { name: t.nav.attendance, icon: CalendarDays, path: '/frequencia' },
    { name: t.calendar.title, icon: CalendarDays, path: '/calendario' },
    ...(isAdmin ? [{ name: t.users.title, icon: Shield, path: '/usuarios' }] : []),
    { name: t.nav.settings, icon: Settings, path: '/configuracoes' },
  ];

  const userInitials = profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : 'US';

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 overflow-hidden",
          sidebarOpen ? "w-64" : "w-20 -translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-5 flex items-center border-b border-slate-800 h-16">
            <Logo collapsed={!sidebarOpen} />
          </div>

          <nav id="sidebar-nav" className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
            <div>
              <div className={cn("text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3", !sidebarOpen && "opacity-0 invisible h-0")}>
                {t.auth.management}
              </div>
              <div className="space-y-1">
                {managementItems.map((item) => {
                  const isActive = pathname === item.path || (item.subItems?.some(sub => pathname === sub.path));
                  
                  if (item.isDropdown) {
                    const isOpen = coursesMenuOpen;
                    return (
                      <div key={item.name} className="space-y-1">
                        <button
                          onClick={() => setCoursesMenuOpen(!isOpen)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-md transition-all group",
                            isActive ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon size={18} className={cn("shrink-0 opacity-75", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                            <span className={cn(
                              "text-sm transition-opacity whitespace-nowrap",
                              !sidebarOpen && "opacity-0 invisible w-0"
                            )}>
                              {item.name}
                            </span>
                          </div>
                          {sidebarOpen && (
                            <ChevronDown size={14} className={cn("transition-transform duration-200", isOpen ? "rotate-180" : "")} />
                          )}
                        </button>
                        
                        <AnimatePresence>
                          {isOpen && sidebarOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-1 pl-9"
                            >
                              {item.subItems?.map((sub) => {
                                const isSubActive = pathname === sub.path;
                                return (
                                  <Link
                                    key={sub.path}
                                    href={sub.path}
                                    className={cn(
                                      "flex items-center gap-3 px-3 py-1.5 rounded-md transition-all group",
                                      isSubActive ? "text-blue-400 font-semibold" : "text-slate-400 hover:text-white"
                                    )}
                                  >
                                    <span className="text-xs">{sub.name}</span>
                                  </Link>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md transition-all group",
                        isActive 
                          ? "bg-slate-800 text-white" 
                          : "hover:bg-slate-800/50 hover:text-white"
                      )}
                    >
                      <item.icon size={18} className={cn("shrink-0 opacity-75", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                      <span className={cn(
                        "text-sm transition-opacity whitespace-nowrap px-2 py-0.5 rounded",
                        !sidebarOpen && "opacity-0 invisible w-0",
                        isActive && "bg-[#dfe0e7] text-[#518aff] drop-shadow-[0_0_8px_rgba(81,138,255,0.6)] font-bold uppercase border border-[#518aff]/30"
                      )}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <div className={cn("text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3", !sidebarOpen && "opacity-0 invisible h-0")}>
                {t.auth.academic}
              </div>
              <div className="space-y-1">
                {academicItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md transition-all group",
                        isActive 
                          ? "bg-slate-800 text-white" 
                          : "hover:bg-slate-800/50 hover:text-white"
                      )}
                    >
                      <item.icon size={18} className={cn("shrink-0 opacity-75", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                      <span className={cn(
                        "text-sm transition-opacity whitespace-nowrap px-2 py-0.5 rounded",
                        !sidebarOpen && "opacity-0 invisible w-0",
                        isActive && "bg-[#dfe0e7] text-[#518aff] drop-shadow-[0_0_8px_rgba(81,138,255,0.6)] font-bold uppercase border border-[#518aff]/30"
                      )}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs border border-slate-600 text-white font-bold">
                {userInitials}
              </div>
              <div className={cn("flex-1 overflow-hidden transition-opacity", !sidebarOpen && "opacity-0 w-0 invisible")}>
                <p className="text-sm font-medium text-white truncate">{profile?.role === 'admin' ? t.users.admin : profile?.role === 'professor' ? t.users.professor : t.users.aluno}</p>
                <p className="text-xs text-slate-500 truncate">{profile?.full_name || profile?.id.slice(0, 8)}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group text-sm",
                !sidebarOpen && "justify-center"
              )}
            >
              <LogOut size={18} className="shrink-0" />
              <span className={cn("transition-opacity whitespace-nowrap", !sidebarOpen && "hidden")}>{t.common.logout}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <EventMarquee />
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-slate-800 leading-none">
                {[...managementItems, ...academicItems].find(item => item.path === pathname)?.name || 
                 managementItems.flatMap(m => m.subItems || []).find(s => s.path === pathname)?.name ||
                 t.dashboard.title}
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

        <main className="flex-1 p-8 overflow-y-auto overflow-x-hidden">
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
    </div>
  );
}
