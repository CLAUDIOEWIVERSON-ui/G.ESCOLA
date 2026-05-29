'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { Logo } from '@/components/Logo';
import { LogIn, Mail, Lock, AlertCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { refreshProfile } = useUser();
  const [loginType, setLoginType] = useState<'staff' | 'aluno'>('staff');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams && searchParams.get('blocked') === 'true') {
      setError('Seu acesso foi encerrado porque sua turma foi concluída. Em caso de dúvidas, procure a administração.');
      setLoginType('aluno');
    }
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured()) {
      setError(t.auth.configRequired);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (loginType === 'aluno') {
        // Student login via accessCode
        const response = await fetch('/api/auth/student-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode, password })
        });
        
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || 'Erro ao realizar login.');
        }

        // Authenticate client-side to Supabase with shadow account
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
        
        if (signInError) throw signInError;

        // Force reload context profile information in a blocking await
        await refreshProfile();

        router.push('/boletim');
        return;
      }

      // Staff login (Standard admin / instrutor login)
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Force reload context profile information in a blocking await
        await refreshProfile();
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { role: 'admin' } // Metadata for initial user
          }
        });

        if (signUpError) throw signUpError;
        
        if (signUpData?.user) {
          // Create profile record
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: signUpData.user.id,
              role: 'admin',
              full_name: email.split('@')[0],
              created_at: new Date().toISOString()
            });
            
          if (profileError) console.error('Profile creation error:', profileError);
        }

        setError(t.auth.accountCreated);
        setIsLogin(true);
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200">
      <div className="flex flex-col items-center mb-6">
        <Logo className="mb-0" dark={true} />
      </div>

      {/* Access Role Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => {
            setLoginType('staff');
            setError(null);
          }}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
            loginType === 'staff' 
              ? "bg-white text-blue-600 shadow-sm" 
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          Gestão / Instrutor
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginType('aluno');
            setError(null);
          }}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer",
            loginType === 'aluno' 
              ? "bg-white text-blue-600 shadow-sm" 
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          Aluno (Código)
        </button>
      </div>

      <form id="auth-form" onSubmit={handleAuth} className="space-y-4">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2"
            >
              <AlertCircle size={14} className="shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {loginType === 'staff' ? (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">{t.auth.email}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all"
                placeholder={t.auth.emailPlaceholder}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Código de Acesso do Aluno</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
                placeholder="Ex: 2026-T05-0001"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all font-mono"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
            {loginType === 'aluno' ? 'Senha do Aluno (padrão 123)' : t.auth.password}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          id="auth-submit"
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-70 shadow-sm shadow-blue-200 cursor-pointer mt-2"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <LogIn size={16} />
              {t.auth.login}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
      <Suspense fallback={
        <div className="w-full max-w-sm bg-white rounded-xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200 flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </div>
  );
}
