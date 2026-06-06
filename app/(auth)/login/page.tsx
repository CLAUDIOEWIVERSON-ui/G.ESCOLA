'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { useUser } from '@/lib/auth/UserContext';
import { Logo } from '@/components/Logo';
import { LogIn, Mail, Lock, AlertCircle, FileText, QrCode, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import jsQR from 'jsqr';

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

  // QR Reader state
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (searchParams && searchParams.get('blocked') === 'true') {
      setError('Seu acesso foi encerrado porque sua turma foi concluída. Em caso de dúvidas, procure a administração.');
      setLoginType('aluno');
    }
  }, [searchParams]);

  // Clean raw media stream when unmounting
  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startScan = async () => {
    setIsScanning(true);
    setScanError(null);
    setScanSuccess(null);
    setError(null);

    // Minor delay to ensure component and dynamic ref mounts in the DOM
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
          requestRef.current = requestAnimationFrame(tick);
        }
      } catch (err: any) {
        console.error('[Camera Access Error]:', err);
        const errMsg = err?.message || '';
        const errName = err?.name || '';
        if (errName === 'NotAllowedError' || errMsg.toLowerCase().includes('not allowed') || errMsg.toLowerCase().includes('permission')) {
          setScanError('Acesso bloqueado pelo navegador. Por favor, clique em "Abrir aplicativo em nova aba" acima para permitir o uso da câmera.');
        } else {
          setScanError('Câmera indisponível ou permissão negada.');
        }
      }
    }, 150);
  };

  const stopScan = () => {
    setIsScanning(false);
    setScanError(null);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Use internal jsqr library
          const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (decoded) {
            handleQRCodeDecoded(decoded.data);
            return; // Exit recursion
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  const handleQRCodeDecoded = async (text: string) => {
    // 1. Immediately kill media tracks and animation loop
    setIsScanning(false);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 2. Play beautiful successful scan chime
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(800, audioCtx.currentTime); // Standard high frequency beep
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (_) {
      // Ignored if blocked by gesture restriction
    }

    setScanSuccess('QR Code lido com sucesso!');

    // 3. Fallback smart parsing algorithms for barcode scan codes
    let codeValue = text.trim();
    let passValue = '123'; // Standard student password default

    try {
      if (text.startsWith('{') && text.endsWith('}')) {
        const parsed = JSON.parse(text);
        if (parsed.accessCode || parsed.codigo || parsed.code) {
          codeValue = String(parsed.accessCode || parsed.codigo || parsed.code).trim().toUpperCase();
        }
        if (parsed.password || parsed.senha || parsed.pass) {
          passValue = String(parsed.password || parsed.senha || parsed.pass).trim();
        }
      } else if (text.includes(':')) {
        const parts = text.split(':');
        if (parts.length >= 2) {
          codeValue = parts[0].trim().toUpperCase();
          passValue = parts[1].trim();
        }
      } else if (text.includes(';')) {
        const parts = text.split(';');
        if (parts.length >= 2) {
          codeValue = parts[0].trim().toUpperCase();
          passValue = parts[1].trim();
        }
      } else if (text.includes('?')) {
        const urlParams = new URLSearchParams(text.split('?')[1] || text);
        const codeParam = urlParams.get('accessCode') || urlParams.get('code') || urlParams.get('codigo');
        const passParam = urlParams.get('password') || urlParams.get('pass') || urlParams.get('senha');
        if (codeParam) codeValue = codeParam.trim().toUpperCase();
        if (passParam) passValue = passParam.trim();
      }
    } catch (_) {
      // Fall back to literal trimmed string value
    }

    setAccessCode(codeValue);
    setPassword(passValue);
    setLoginType('aluno');

    // 4. Kick-start auto-login process
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: codeValue, password: passValue })
      });
      
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao realizar login.');
      }

      // Authenticate inside client-side Supabase helper
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });
      
      if (signInError) throw signInError;

      await refreshProfile();
      router.push('/boletim');
    } catch (err: any) {
      setError(err.message || 'Código lido, mas houve um erro ao realizar o login automático. Tente novamente ou verifique se o QR Code está correto.');
      setScanSuccess(null);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="w-full max-w-sm bg-white rounded-xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200 overflow-hidden min-h-[420px] flex flex-col justify-between">
      <div>
        <div className="flex flex-col items-center mb-6">
          <Logo className="mb-0" dark={true} />
        </div>

        <AnimatePresence mode="wait">
          {isScanning ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              <div className="text-center mb-4">
                <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide">Leitor de QR Code</span>
                <span className="text-[11px] text-slate-400">Aponte a câmera da carteirinha escolar</span>
              </div>

              {/* Viewfinder block */}
              <div className="relative w-full aspect-square max-w-[220px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ display: 'block' }}
                  playsInline
                  muted
                />
                
                {/* Laser scan lines */}
                <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl-sm"></div>
                    <div className="w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr-sm"></div>
                  </div>
                  
                  <div className="w-full h-0.5 bg-blue-500 shadow-[0_0_8px_2px_rgba(59,130,246,0.8)] animate-bounce"></div>

                  <div className="flex justify-between">
                    <div className="w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl-sm"></div>
                    <div className="w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br-sm"></div>
                  </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {scanError && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center space-y-1.5 overflow-y-auto">
                    <AlertCircle size={24} className="text-red-500 shrink-0" />
                    <span className="text-[11px] text-white font-bold leading-tight">{scanError}</span>
                    <p className="text-[9px] text-slate-300 leading-normal max-w-[170px]">
                      Dica: Se estiver usando o preview, clique no botão <span className="font-semibold text-blue-400">&quot;Abrir aplicativo em nova aba&quot;</span> no canto superior direito para dar permissão de câmera com segurança.
                    </p>
                  </div>
                )}
              </div>

              {/* Cancel Button */}
              <div className="flex gap-2 w-full max-w-[220px] mt-4">
                <button
                  type="button"
                  onClick={stopScan}
                  className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopScan();
                    startScan();
                  }}
                  className="p-1.5 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-lg cursor-pointer transition-all flex items-center justify-center"
                  title="Recarregar"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
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
                  {scanSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-lg text-xs flex items-center gap-2"
                    >
                      <span className="leading-relaxed">{scanSuccess}</span>
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
                  <div className="space-y-4">
                    {/* Quick QR Reader Trigger */}
                    <button
                      type="button"
                      onClick={startScan}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-200 active:scale-[0.98]"
                    >
                      <QrCode size={16} />
                      Acessar o &quot;Questionário via QR Code&quot;
                    </button>
                  </div>
                )}

                {loginType === 'staff' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
                        {t.auth.password}
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
                  </>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
