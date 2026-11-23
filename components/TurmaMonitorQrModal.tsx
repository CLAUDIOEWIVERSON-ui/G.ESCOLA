'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { fetchWithAuth } from '@/lib/api';
import { downloadElementAsPDF } from '@/lib/printDocumentUtils';
import {
  QrCode,
  ShieldCheck,
  Copy,
  Check,
  Download,
  RefreshCcw,
  Trash2,
  Loader2,
  UserCheck,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import QRCodeLib from 'qrcode';

export interface TurmaMonitorInfo {
  turma_id: string;
  user_id?: string;
  full_name: string;
  email?: string | null;
  access_code?: string;
  last_login?: string | null;
  login_count?: number;
  updated_at?: string;
}

interface TurmaMonitorQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  turma: any | null;
  initialMonitor: TurmaMonitorInfo | null;
  canManage: boolean;
  language?: string;
  onMonitorChanged: (turmaId: string, monitor: TurmaMonitorInfo | null) => void;
}

export default function TurmaMonitorQrModal({
  isOpen,
  onClose,
  turma,
  initialMonitor,
  canManage,
  language = 'pt',
  onMonitorChanged,
}: TurmaMonitorQrModalProps) {
  const isPt = language === 'pt';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [monitor, setMonitor] = useState<TurmaMonitorInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMonitor(initialMonitor);
      setFullName(initialMonitor?.full_name || '');
      setEmail(initialMonitor?.email || '');
      setConfirmRemove(false);
      setCopiedCode(false);
      setCopiedLink(false);
    }
  }, [isOpen, initialMonitor, turma?.id]);

  useEffect(() => {
    let active = true;
    const generateQr = async () => {
      if (!isOpen || !monitor?.access_code || typeof window === 'undefined') {
        if (active) setQrDataUrl('');
        return;
      }
      try {
        const loginUrl = `${window.location.origin}/login?code=${encodeURIComponent(monitor.access_code)}`;
        const url = await QRCodeLib.toDataURL(loginUrl, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        if (active) setQrDataUrl(url);
      } catch (err) {
        console.error('Erro ao gerar imagem QR Code:', err);
        if (active) setQrDataUrl('');
      }
    };
    generateQr();
    return () => {
      active = false;
    };
  }, [isOpen, monitor?.access_code]);

  const handleSaveMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turma?.id || !canManage) return;
    if (!fullName.trim()) {
      toast.error(isPt ? 'Informe o nome do Monitor da Turma.' : 'Enter the monitor full name.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/turmas/acompanhante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turma.id,
          full_name: fullName.trim(),
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isPt ? 'Erro ao salvar monitor.' : 'Error saving monitor.'));
      }
      setMonitor(data.monitor);
      onMonitorChanged(turma.id, data.monitor);
      toast.success(
        isPt
          ? 'Monitor da turma salvo com QR Code exclusivo!'
          : 'Class monitor saved with exclusive QR Code!'
      );
    } catch (err: any) {
      toast.error(err?.message || (isPt ? 'Erro ao salvar monitor.' : 'Error saving monitor.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateQr = async () => {
    if (!turma?.id || !canManage || !fullName.trim()) return;
    setRegenerating(true);
    try {
      const res = await fetchWithAuth('/api/turmas/acompanhante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma_id: turma.id,
          full_name: fullName.trim(),
          email: email.trim() || undefined,
          regenerate_qr: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar novo QR Code.');
      }
      setMonitor(data.monitor);
      onMonitorChanged(turma.id, data.monitor);
      toast.success(
        isPt
          ? 'Novo QR Code exclusivo gerado! O código anterior foi invalidado.'
          : 'New exclusive QR Code generated! Previous code was revoked.'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao regerar QR Code.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleRemoveMonitor = async () => {
    if (!turma?.id || !canManage) return;
    setRemoving(true);
    try {
      const res = await fetchWithAuth(`/api/turmas/acompanhante?turma_id=${encodeURIComponent(turma.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao remover monitor.');
      }
      setMonitor(null);
      setFullName('');
      setEmail('');
      setConfirmRemove(false);
      onMonitorChanged(turma.id, null);
      toast.success(isPt ? 'Monitor removido da turma.' : 'Monitor removed from class.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover monitor.');
    } finally {
      setRemoving(false);
    }
  };

  const handleCopyCode = async () => {
    if (!monitor?.access_code) return;
    try {
      await navigator.clipboard.writeText(monitor.access_code);
      setCopiedCode(true);
      toast.success(isPt ? 'Código copiado!' : 'Code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error(isPt ? 'Não foi possível copiar o código.' : 'Could not copy code.');
    }
  };

  const handleCopyLink = async () => {
    if (!monitor?.access_code || typeof window === 'undefined') return;
    const loginUrl = `${window.location.origin}/login?code=${encodeURIComponent(monitor.access_code)}`;
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopiedLink(true);
      toast.success(isPt ? 'Link de acesso direto copiado!' : 'Direct access link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error(isPt ? 'Não foi possível copiar o link.' : 'Could not copy link.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!monitor?.access_code) return;
    setDownloadingPdf(true);
    try {
      const cleanName = (turma?.nome || 'turma').replace(/[^a-zA-Z0-9_-]/g, '_');
      await downloadElementAsPDF('print-monitor-qr-card', {
        orientation: 'portrait',
        filename: `qrcode_monitor_${cleanName}.pdf`,
        scale: 2,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const cursoNome = turma?.curso?.nome || turma?.curso_nome || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isPt
          ? `Monitor da Turma — ${turma?.nome || ''}`
          : `Class Monitor — ${turma?.nome || ''}`
      }
      className="max-w-xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="text-xs text-teal-900 leading-relaxed">
            <p className="font-bold">
              {isPt ? 'Monitor da Turma & QR Code Exclusivo' : 'Class Monitor & Exclusive QR Code'}
            </p>
            <p className="text-teal-800 mt-0.5">
              {isPt
                ? 'O monitor aparece na Relação da Turma apenas para indicar quem é o monitor da turma (sem entrar na contagem de alunos) e acessa diretamente via QR Code exclusivo.'
                : 'The monitor appears in the class roster only to indicate the class monitor (outside student counts) and signs in directly with an exclusive QR Code.'}
            </p>
          </div>
        </div>

        {canManage && (
          <form onSubmit={handleSaveMonitor} className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] mb-1.5">
                {isPt ? 'Nome do Monitor da Turma' : 'Monitor Full Name'}
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isPt ? 'Ex: SO-FN João da Silva' : 'Ex: John Smith'}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] mb-1.5">
                {isPt ? 'E-mail (Opcional — para acesso adicional ou identificação)' : 'Email (Optional)'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isPt ? 'Deixe vazio para acesso exclusivo por QR Code' : 'Leave blank for QR Code only access'}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 min-w-[180px] px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                <span>
                  {monitor?.access_code
                    ? isPt
                      ? 'Atualizar Monitor'
                      : 'Update Monitor'
                    : isPt
                      ? 'Salvar e Gerar QR Code'
                      : 'Save & Generate QR Code'}
                </span>
              </button>

              {monitor && (
                confirmRemove ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={removing}
                      onClick={handleRemoveMonitor}
                      className="px-3 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      <span>{isPt ? 'Confirmar' : 'Confirm'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(false)}
                      className="px-3 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-[11px] uppercase cursor-pointer"
                    >
                      {isPt ? 'Cancelar' : 'Cancel'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(true)}
                    className="px-3.5 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>{isPt ? 'Remover' : 'Remove'}</span>
                  </button>
                )
              )}
            </div>
          </form>
        )}

        {monitor?.access_code ? (
          <div className="space-y-4">
            <div
              id="print-monitor-qr-card"
              className="bg-white border-2 border-dashed border-teal-700 rounded-2xl p-6 text-center shadow-sm max-w-sm mx-auto"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-black uppercase tracking-widest mb-3">
                <ShieldCheck size={12} />
                <span>{isPt ? 'Credencial Exclusiva • Monitor da Turma' : 'Exclusive Credential • Class Monitor'}</span>
              </div>

              <h4 className="text-lg font-black text-slate-900 leading-tight">{monitor.full_name}</h4>
              <p className="text-xs font-bold text-slate-600 mt-1">
                {turma?.nome} {cursoNome ? `• ${cursoNome}` : ''}
              </p>

              <div className="my-5 flex justify-center">
                <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl inline-flex items-center justify-center shadow-xs">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt={`QR Code ${monitor.full_name}`}
                      className="w-44 h-44 object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center bg-slate-50 text-slate-400">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="inline-block font-mono text-sm font-black tracking-wider bg-slate-100 text-teal-900 border border-slate-300 px-4 py-1.5 rounded-lg">
                {monitor.access_code}
              </div>

              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                {isPt
                  ? 'Escaneie este QR Code no celular para acessar diretamente a turma e enviar recados individuais aos alunos.'
                  : 'Scan this QR Code on mobile to access the class workspace and send individual student messages.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedCode ? (isPt ? 'Código Copiado' : 'Copied') : (isPt ? 'Copiar Código' : 'Copy Code')}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedLink ? (isPt ? 'Link Copiado' : 'Link Copied') : (isPt ? 'Copiar Link QR' : 'Copy QR Link')}</span>
              </button>

              <button
                type="button"
                disabled={downloadingPdf || !qrDataUrl}
                onClick={handleDownloadPdf}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>{isPt ? 'Baixar Cartão QR (PDF)' : 'Download QR Card (PDF)'}</span>
              </button>

              {canManage && (
                <button
                  type="button"
                  disabled={regenerating}
                  onClick={handleRegenerateQr}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  <span>{isPt ? 'Regerar QR' : 'Regenerate QR'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
            {isPt
              ? 'Nenhum monitor vinculado a esta turma ainda. Preencha o nome acima para gerar o QR Code exclusivo.'
              : 'No monitor assigned to this class yet. Fill the name above to generate the exclusive QR Code.'}
          </div>
        )}
      </div>
    </Modal>
  );
}
