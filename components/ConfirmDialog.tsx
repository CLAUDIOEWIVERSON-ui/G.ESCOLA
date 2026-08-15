'use client';

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Exclusão",
  message = "Tem certeza de que deseja excluir este registro? Esta ação não poderá ser desfeita.",
  confirmText = "Sim, Excluir",
  cancelText = "Cancelar",
  isDanger = true,
  isLoading = false
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const loading = isLoading || internalLoading;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col"
          >
            {/* Header / Accent bar */}
            <div className={cn(
              "px-6 pt-6 pb-2 flex items-start gap-4",
              isDanger ? "text-red-600" : "text-amber-600"
            )}>
              <div className={cn(
                "p-3 rounded-xl flex items-center justify-center shrink-0",
                isDanger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
              )}>
                {isDanger ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {title}
                </h3>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Confirmação de segurança necessária
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Message Body */}
            <div className="px-6 py-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-sm leading-relaxed">
                {message}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3 bg-white">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  isDanger
                    ? "bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-500/20"
                    : "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-500/20"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    {isDanger && <Trash2 size={15} />}
                    <span>{confirmText}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
