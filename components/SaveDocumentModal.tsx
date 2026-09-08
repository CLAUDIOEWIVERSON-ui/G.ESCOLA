'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderDown, 
  Printer, 
  Download, 
  X, 
  FileText, 
  Check, 
  ExternalLink, 
  Info, 
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  registerSaveModalListener, 
  SaveDocumentModalRequest 
} from '@/lib/saveDocumentModalService';

export default function SaveDocumentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<SaveDocumentModalRequest | null>(null);
  const [resolver, setResolver] = useState<((saved: boolean) => void) | null>(null);
  const [filenameInput, setFilenameInput] = useState('');
  const [iframeRestriction, setIframeRestriction] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unregister = registerSaveModalListener(({ request, resolve }) => {
      setCurrentRequest(request);
      setResolver(() => resolve);
      
      const cleanName = (request.suggestedFilename || 'documento.pdf')
        .replace(/\.pdf$/i, '')
        .replace(/[/\\?%*:|"<>]/g, '_');
      setFilenameInput(cleanName);
      setIframeRestriction(false);
      setIsProcessing(false);
      setIsOpen(true);
    });

    return () => {
      unregister();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 150);
    }
  }, [isOpen]);

  const getFinalFilename = (): string => {
    const raw = filenameInput.trim() || 'documento';
    const sanitized = raw.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
    return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
  };

  const handleClose = (saved: boolean) => {
    setIsOpen(false);
    if (resolver) {
      resolver(saved);
    }
    setCurrentRequest(null);
    setResolver(null);
    setIsProcessing(false);
    setIframeRestriction(false);
  };

  const handleCancel = () => {
    toast.info('Salvamento do documento cancelado.');
    handleClose(false);
  };

  /**
   * Option 1: Native System Save As File Picker (File System Access API)
   * Opens the OS File Explorer / Finder dialog so the user can choose the exact folder!
   */
  const handleNativeSavePicker = async () => {
    if (!currentRequest) return;
    setIsProcessing(true);
    const finalFilename = getFinalFilename();

    try {
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: finalFilename,
          types: [
            {
              description: 'Documento PDF (*.pdf)',
              accept: {
                'application/pdf': ['.pdf'],
              },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(currentRequest.blob);
        await writable.close();

        toast.success(`Arquivo "${finalFilename}" salvo com sucesso na pasta escolhida!`);
        handleClose(true);
        return;
      } else {
        // Not supported in this browser
        setIframeRestriction(true);
        toast.error('Este navegador não suporta a seleção direta de pastas. Use o diálogo do sistema ou o download.');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User closed or clicked cancel in the native OS dialog
        setIsProcessing(false);
        return;
      }
      
      console.warn('showSaveFilePicker falhou (possível restrição de iframe ou segurança):', err);
      setIframeRestriction(true);
      toast.warning('O ambiente de visualização do navegador bloqueou a seleção direta. Use o Diálogo do Sistema ou abra em nova aba.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Option 2: System Print-to-PDF / System Dialog
   * Opens the browser's system print dialog targeting PDF, where the OS prompts the destination folder!
   */
  const handleSystemDialogSave = () => {
    if (!currentRequest) return;
    setIsProcessing(true);
    const finalFilename = getFinalFilename();

    try {
      const url = URL.createObjectURL(currentRequest.blob);
      
      // Open in a new tab/window which allows the user to use the browser's native Save / Print dialog without iframe locks
      const pdfWindow = window.open(url, '_blank');
      
      if (pdfWindow) {
        pdfWindow.document.title = finalFilename;
        toast.success('Documento aberto na janela do sistema! Clique no ícone de salvar ou imprimir para escolher a pasta.', {
          duration: 6000,
        });
        handleClose(true);
      } else {
        // Popup was blocked, trigger standard download
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.info(`Download de "${finalFilename}" iniciado!`);
        handleClose(true);
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('Erro ao abrir diálogo do sistema:', err);
      toast.error('Não foi possível abrir o diálogo. Realizando download direto.');
      handleDirectDownload();
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Option 3: Direct Download
   * Saves to the default browser Downloads folder
   */
  const handleDirectDownload = () => {
    if (!currentRequest) return;
    const finalFilename = getFinalFilename();

    try {
      const url = URL.createObjectURL(currentRequest.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      toast.success(`Documento "${finalFilename}" baixado com sucesso!`);
      handleClose(true);
    } catch (err: any) {
      console.error('Erro no download:', err);
      toast.error('Erro ao realizar download do documento.');
      handleClose(false);
    }
  };

  /**
   * Preview in new tab
   */
  const handlePreview = () => {
    if (!currentRequest) return;
    const url = URL.createObjectURL(currentRequest.blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  if (!isOpen || !currentRequest) return null;

  const fileSizeKB = Math.round(currentRequest.blob.size / 1024);

  return (
    <div 
      id="save-document-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        id="save-document-modal-card"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col scale-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <FolderDown size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Salvar Documento PDF
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 border border-blue-400/30">
                  {fileSizeKB > 0 ? `${fileSizeKB} KB` : 'PDF'}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Escolha o nome e onde deseja salvar o documento no seu computador
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Cancelar e fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Filename Input */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Nome do Arquivo (você pode editar antes de salvar):
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={filenameInput}
                  onChange={(e) => setFilenameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleNativeSavePicker();
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome do arquivo..."
                />
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-200/80 px-2.5 py-2 rounded-lg border border-slate-300 select-none">
                .pdf
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Nome final: <span className="font-semibold text-slate-700">{getFinalFilename()}</span>
            </p>
          </div>

          {/* Iframe warning if triggered */}
          {iframeRestriction && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <div className="space-y-1">
                <p className="font-semibold">Acesso restrito pelo navegador em modo iframe</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Para selecionar a pasta diretamente, utilize a opção <strong>&ldquo;Salvar via Janela do Sistema&rdquo;</strong> abaixo ou abra a aplicação em uma nova aba do navegador.
                </p>
              </div>
            </div>
          )}

          {/* Save Destination Options */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Escolha a opção de salvamento:
            </p>

            {/* Option 1: OS Save As Dialog */}
            <button
              onClick={handleNativeSavePicker}
              disabled={isProcessing}
              className="w-full text-left p-3.5 rounded-xl border-2 border-blue-600/30 bg-blue-50/50 hover:bg-blue-100/60 hover:border-blue-600 transition-all flex items-start gap-3 group cursor-pointer shadow-sm"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <FolderDown size={19} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-950 group-hover:text-blue-700 transition-colors">
                    Escolher Pasta no Meu Computador
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-200/60 px-2 py-0.5 rounded">
                    Salvar Como
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Abre a janela do explorador do seu sistema (Windows / macOS / Linux) para você escolher a pasta exata de destino.
                </p>
              </div>
            </button>

            {/* Option 2: System Dialog / Print to PDF */}
            <button
              onClick={handleSystemDialogSave}
              disabled={isProcessing}
              className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-start gap-3 group cursor-pointer shadow-sm"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Printer size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Salvar via Janela do Sistema / Navegador
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Janela PDF
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Abre o documento na janela integrada do sistema com o botão oficial de salvar do leitor de PDF.
                </p>
              </div>
            </button>

            {/* Option 3: Direct Download to Downloads folder */}
            <button
              onClick={handleDirectDownload}
              disabled={isProcessing}
              className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-start gap-3 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Download size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                    Download Direto
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    Pasta Padrão
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Salva o arquivo diretamente na sua pasta padrão de Downloads.
                </p>
              </div>
            </button>
          </div>

          {/* Helpful Tip */}
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-start gap-2 text-[10px] text-slate-500">
            <Info size={14} className="shrink-0 text-blue-500 mt-0.5" />
            <p>
              <strong>Dica:</strong> Se você deseja que o navegador sempre pergunte a pasta para qualquer download automático, ative a opção <em>&ldquo;Perguntar onde salvar cada arquivo antes de fazer download&rdquo;</em> nas Configurações de Downloads do seu navegador (Chrome/Edge/Firefox).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handlePreview}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ExternalLink size={13} />
            Visualizar PDF
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleNativeSavePicker}
              disabled={isProcessing}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-200 flex items-center gap-1.5 cursor-pointer"
            >
              <FolderDown size={14} />
              Escolher Pasta e Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
