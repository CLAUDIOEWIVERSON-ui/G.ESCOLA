'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { QrCode, LogIn, User, Lock, AlertCircle, Loader2, BookOpen, Camera } from 'lucide-react';
import jsQR from 'jsqr';

// Initialize client-side Supabase client using environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Authentication states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loginType, setLoginType] = useState<'admin' | 'aluno'>('aluno');
  
  // Status states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAutoLogin, setIsAutoLogin] = useState(false);

  // Camera QR scanner states
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Handle auto login when QR code is scanned / access code is in URL
  useEffect(() => {
    if (!searchParams) return;

    const codeParam = searchParams.get('code') || searchParams.get('accessCode');
    const blockedParam = searchParams.get('blocked') === 'true';

    if (blockedParam) {
      setError('Seu acesso foi encerrado porque sua turma foi concluída. Em caso de dúvidas, procure a administração.');
      setLoginType('aluno');
      return;
    }

    if (codeParam) {
      handleAutoLogin(codeParam);
    }
  }, [searchParams]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Automates student login process when QR parameters are scanned
  const handleAutoLogin = async (code: string) => {
    setIsAutoLogin(true);
    setLoading(true);
    setError(null);

    try {
      // 1. Force state clean up by signing out of any passive/stale sessions
      await supabase.auth.signOut();

      // 2. Call the backend route to exchange QR code with Supabase session metadata
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok || !data.session) {
        throw new Error(data.error || 'Código de acesso QR inválido ou expirado.');
      }

      // 3. Establish the authenticated session on the client Supabase state
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionErr) throw sessionErr;

      // 4. Redirect the student directly to the curriculum/report card view
      router.push('/boletim');
      router.refresh();
    } catch (err: any) {
      console.error('[AutoLoginError]:', err);
      setError(err.message || 'Erro ao realizar login automático com QR Code.');
      setIsAutoLogin(false);
      setLoading(false);
    }
  };

  // 2. Standard Manual Logins (Admin/Instructor or Student access code typing)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (loginType === 'admin') {
        // Admin or Instructor password sign-in
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
        
        router.push('/dashboard');
        router.refresh();
      } else {
        // Student sign-in by manual code entry
        if (!accessCode.trim()) {
          throw new Error('Por favor, informe seu código de acesso.');
        }
        await handleAutoLogin(accessCode.trim());
      }
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas. Por favor, verifique e tente novamente.');
      setLoading(false);
    }
  };

  // 3. Camera QR code reader implementations
  const startCamera = async () => {
    setError(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error('Camera Access Error:', err);
      setError('Não foi possível obter acesso à câmera para ler o QR Code.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          stopCamera();
          
          // Parse access code if the QR data happens to be an absolute URL
          let accessCodeValue = code.data;
          try {
            if (code.data.startsWith('http')) {
              const url = new URL(code.data);
              accessCodeValue = url.searchParams.get('code') || url.searchParams.get('accessCode') || code.data;
            }
          } catch (_) {}

          handleAutoLogin(accessCodeValue);
          return;
        }
      }
    }
    requestAnimationFrame(tick);
  };

  if (isAutoLogin && loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100" id="auto-login-container">
        <div className="flex flex-col items-center space-y-6 max-w-md text-center bg-zinc-900/50 backdrop-blur-md p-8 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden" id="auto-login-card">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-20 animate-pulse"></div>
          <div className="relative flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-t-2 border-indigo-500 border-r-2 border-transparent animate-spin"></div>
              <QrCode className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-indigo-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Portal do Aluno</h1>
              <p className="text-sm text-zinc-400 max-w-xs">
                Processando seu QR Code e carregando sua área de acesso exclusivo...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 text-zinc-100" id="login-root">
      <div className="w-full max-w-md" id="login-wrapper">
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8 text-center" id="login-header">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 mb-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Escola Digital</h2>
          <p className="text-sm text-zinc-400 mt-1">Conecte-se para acessar suas aulas e avaliações</p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl mb-6 relative z-10" id="tab-selection">
          <button
            onClick={() => { setLoginType('aluno'); stopCamera(); setError(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              loginType === 'aluno'
                ? 'bg-zinc-850 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            id="tab-student"
          >
            <QrCode className="h-4 w-4" />
            Área do Aluno
          </button>
          <button
            onClick={() => { setLoginType('admin'); stopCamera(); setError(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              loginType === 'admin'
                ? 'bg-zinc-850 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            id="tab-admin"
          >
            <LogIn className="h-4 w-4" />
            Equipe Escolar
          </button>
        </div>

        {/* Main Box */}
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-800 p-6 shadow-2xl relative z-10" id="login-card">
          {error && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-900/60 text-red-200 p-4 rounded-xl mb-6 text-sm" id="error-alert">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {scanning ? (
            <div className="flex flex-col items-center space-y-4" id="camera-container">
              <h3 className="text-sm font-medium text-zinc-300">Posicione o QR Code em frente à câmera</h3>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-black">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {/* QR Laser scanning visual indicator */}
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-indigo-500 animate-bounce shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="w-full py-2.5 bg-zinc-805 hover:bg-zinc-800 text-zinc-300 rounded-xl font-medium text-sm border border-zinc-800 transition"
              >
                Cancelar Leitura
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
              {loginType === 'aluno' ? (
                <>
                  <div className="space-y-2">
                    <label htmlFor="accessCode" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Código de Acesso
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <input
                        id="accessCode"
                        type="text"
                        placeholder="Insira o seu código da carteirinha"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono tracking-wider transition"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar com Código'}
                    </button>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-zinc-800"></div>
                      <span className="flex-shrink mx-4 text-zinc-600 text-xs font-bold uppercase tracking-widest">Ou</span>
                      <div className="flex-grow border-t border-zinc-800"></div>
                    </div>

                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow"
                    >
                      <Camera className="h-4 w-4" />
                      Ler QR Code da Carteirinha
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      E-mail Institucional
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <input
                        id="email"
                        type="email"
                        placeholder="professor@escola.digital"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Senha de Acesso
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <input
                        id="password"
                        type="password"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2 pt-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar na Plataforma'}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
