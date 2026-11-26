'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Calculator,
  Check,
  Copy,
  Delete,
  GripHorizontal,
  History,
  Maximize2,
  Minus,
  Trash2,
  X,
} from 'lucide-react';
import {
  CalculatorOperator,
  formatDisplayPT,
  useCalculator,
} from '@/lib/calculator/CalculatorContext';
import { useI18n } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';

const CALC_WIDTH = 304;
const CALC_HEIGHT_APPROX = 445;
const MINIMIZED_WIDTH = 228;
const MINIMIZED_HEIGHT = 44;

function clampPositionToViewport(
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y };
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - height - 8);
  return {
    x: Math.max(8, Math.min(maxX, Math.round(x))),
    y: Math.max(8, Math.min(maxY, Math.round(y))),
  };
}

export function FloatingCalculator() {
  const {
    hydrated,
    isOpen,
    isMinimized,
    position,
    display,
    operator,
    expression,
    memory,
    history,
    closeCalculator,
    setIsMinimized,
    setPosition,
    commitPosition,
    inputDigit,
    inputDecimal,
    toggleSign,
    inputPercent,
    inputSquareRoot,
    backspace,
    clearAll,
    chooseOperator,
    evaluate,
    memoryClear,
    memoryRecall,
    memoryAdd,
    memorySubtract,
    applyHistoryValue,
    clearHistory,
  } = useCalculator();

  const { language } = useI18n();
  const isPT = language !== 'en';

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  const currentWidth = isMinimized ? MINIMIZED_WIDTH : CALC_WIDTH;
  const currentHeight = isMinimized ? MINIMIZED_HEIGHT : CALC_HEIGHT_APPROX;

  const resolvedPos = useCallback(() => {
    if (position) {
      return clampPositionToViewport(position.x, position.y, currentWidth, currentHeight);
    }
    if (typeof window === 'undefined') return { x: 24, y: 84 };
    return clampPositionToViewport(
      window.innerWidth - currentWidth - 24,
      80,
      currentWidth,
      currentHeight
    );
  }, [position, currentWidth, currentHeight]);

  // Initialize default position once when opened and re-clamp on window resize
  useEffect(() => {
    if (!hydrated || !isOpen) return;
    if (!position) {
      const initial = clampPositionToViewport(
        window.innerWidth - currentWidth - 24,
        80,
        currentWidth,
        currentHeight
      );
      commitPosition(initial);
    } else {
      const clamped = clampPositionToViewport(
        position.x,
        position.y,
        currentWidth,
        currentHeight
      );
      if (clamped.x !== position.x || clamped.y !== position.y) {
        commitPosition(clamped);
      }
    }

    const handleResize = () => {
      const active = position || {
        x: window.innerWidth - currentWidth - 24,
        y: 80,
      };
      const clamped = clampPositionToViewport(
        active.x,
        active.y,
        currentWidth,
        currentHeight
      );
      if (clamped.x !== active.x || clamped.y !== active.y) {
        commitPosition(clamped);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hydrated, isOpen, position, currentWidth, currentHeight, commitPosition]);

  // Pointer drag listeners attached to window while dragging
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.startClientX;
      const dy = e.clientY - ds.startClientY;
      if (!ds.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        ds.moved = true;
      }
      const next = clampPositionToViewport(
        ds.origX + dx,
        ds.origY + dy,
        currentWidth,
        currentHeight
      );
      setPosition(next);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (ds) {
        const dx = e.clientX - ds.startClientX;
        const dy = e.clientY - ds.startClientY;
        const finalPos = clampPositionToViewport(
          ds.origX + dx,
          ds.origY + dy,
          currentWidth,
          currentHeight
        );
        commitPosition(finalPos);
      }
      dragStateRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, currentWidth, currentHeight, setPosition, commitPosition]);

  const startDrag = (e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    e.preventDefault();
    const pos = resolvedPos();
    dragStateRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
    setIsDragging(true);
    cardRef.current?.focus();
  };

  const handleCopyDisplay = async () => {
    const copyText = isPT ? display.replace('.', ',') : display;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key;

    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      inputDigit(key);
      return;
    }
    if (key === ',' || key === '.') {
      e.preventDefault();
      inputDecimal();
      return;
    }
    if (key === '+' || key === '-' || key === '*' || key === '/') {
      e.preventDefault();
      chooseOperator(key as CalculatorOperator);
      return;
    }
    if (key === '%') {
      e.preventDefault();
      inputPercent();
      return;
    }
    if (key === 'Enter' || key === '=') {
      e.preventDefault();
      evaluate();
      return;
    }
    if (key === 'Backspace') {
      e.preventDefault();
      backspace();
      return;
    }
    if (key === 'Delete' || key.toLowerCase() === 'c') {
      e.preventDefault();
      clearAll();
    }
  };

  if (!hydrated || !isOpen) return null;

  const pos = resolvedPos();
  const displayText = isPT ? formatDisplayPT(display) : display;
  const isLongDisplay = displayText.length > 11;

  if (isMinimized) {
    return (
      <div
        ref={cardRef}
        role="dialog"
        aria-label={isPT ? 'Calculadora Flutuante (Minimizada)' : 'Floating Calculator (Minimized)'}
        style={{
          position: 'fixed',
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: `${MINIMIZED_WIDTH}px`,
          zIndex: 99999,
        }}
        className="print:hidden select-none"
      >
        <div
          onPointerDown={startDrag}
          className={cn(
            'flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-900 text-white border border-slate-700/90 shadow-[0_14px_35px_rgba(2,6,23,0.45)] cursor-grab active:cursor-grabbing touch-none',
            isDragging && 'ring-2 ring-blue-500'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calculator size={15} className="text-blue-400 shrink-0" />
            <span className="text-xs font-mono font-bold truncate text-slate-100">
              {displayText}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isPT ? 'Restaurar calculadora' : 'Expand calculator'}
            >
              <Maximize2 size={13} />
            </button>
            <button
              type="button"
              onClick={closeCalculator}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
              title={isPT ? 'Fechar calculadora' : 'Close calculator'}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-label={isPT ? 'Calculadora Flutuante' : 'Floating Calculator'}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${CALC_WIDTH}px`,
        zIndex: 99999,
      }}
      className={cn(
        'print:hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-[0_24px_60px_rgba(2,6,23,0.45)] overflow-hidden outline-none focus:ring-2 focus:ring-blue-500/50 select-none',
        isDragging && 'shadow-[0_28px_70px_rgba(2,6,23,0.58)]'
      )}
    >
      {/* Draggable Title Bar */}
      <div
        onPointerDown={startDrag}
        className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-900 text-white cursor-grab active:cursor-grabbing touch-none border-b border-slate-800"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-blue-600/25 border border-blue-400/30 flex items-center justify-center shrink-0">
            <Calculator size={13} className="text-blue-300" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold leading-tight truncate flex items-center gap-1.5">
              <span>{isPT ? 'Calculadora' : 'Calculator'}</span>
              <GripHorizontal size={12} className="text-slate-500 shrink-0" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className={cn(
              'p-1.5 rounded-lg transition-colors cursor-pointer relative',
              showHistory
                ? 'bg-blue-600 text-white'
                : 'hover:bg-white/10 text-slate-300 hover:text-white'
            )}
            title={isPT ? 'Histórico de cálculos' : 'Calculation history'}
          >
            <History size={13} />
            {history.length > 0 && !showHistory && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isPT ? 'Minimizar (mantém flutuando)' : 'Minimize (keep floating)'}
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            onClick={closeCalculator}
            className="p-1.5 rounded-lg hover:bg-rose-500/25 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
            title={isPT ? 'Fechar calculadora' : 'Close calculator'}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Collapsible History View OR Standard Display + Keypad */}
      {showHistory ? (
        <div className="p-3 bg-slate-50 dark:bg-slate-900 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {isPT ? 'Histórico' : 'History'} ({history.length})
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={11} />
                <span>{isPT ? 'Limpar' : 'Clear'}</span>
              </button>
            )}
          </div>

          <div className="h-[296px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 text-slate-400">
                <History size={24} className="mb-1.5 opacity-50" />
                <p className="text-xs font-medium">
                  {isPT ? 'Nenhum cálculo recente ainda.' : 'No recent calculations yet.'}
                </p>
              </div>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    applyHistoryValue(item.result);
                    setShowHistory(false);
                  }}
                  className="w-full text-right p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors cursor-pointer"
                  title={isPT ? 'Clique para usar este resultado' : 'Click to use this result'}
                >
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    {item.expression}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {isPT ? formatDisplayPT(item.result) : item.result}
                  </div>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowHistory(false)}
            className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            {isPT ? 'Voltar ao Teclado' : 'Back to Keypad'}
          </button>
        </div>
      ) : (
        <div className="p-3 space-y-2.5 bg-slate-50 dark:bg-slate-950/60">
          {/* Display Screen */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-inner space-y-1">
            <div className="flex items-center justify-between gap-2 min-h-[18px]">
              <div className="flex items-center gap-1.5">
                {memory !== 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[9px] font-black">
                    M {isPT ? formatDisplayPT(String(memory)) : memory}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate text-right flex-1">
                {expression || '\u00A0'}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopyDisplay}
                className={cn(
                  'p-1.5 rounded-lg border transition-all cursor-pointer shrink-0',
                  copied
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                )}
                title={isPT ? 'Copiar resultado' : 'Copy result'}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>

              <div
                className={cn(
                  'font-mono font-black tracking-tight text-slate-900 dark:text-white text-right truncate flex-1 tabular-nums leading-none py-0.5',
                  isLongDisplay ? 'text-xl' : 'text-[26px]'
                )}
              >
                {displayText}
              </div>
            </div>
          </div>

          {/* Memory & Root Strip */}
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: 'MC', onClick: memoryClear, disabled: memory === 0, title: 'Limpar memória' },
              { label: 'MR', onClick: memoryRecall, disabled: memory === 0, title: 'Recuperar memória' },
              { label: 'M+', onClick: memoryAdd, disabled: false, title: 'Somar à memória' },
              { label: 'M−', onClick: memorySubtract, disabled: false, title: 'Subtrair da memória' },
              { label: '√', onClick: inputSquareRoot, disabled: false, title: 'Raiz quadrada' },
            ].map((m) => (
              <button
                key={m.label}
                type="button"
                disabled={m.disabled}
                onClick={m.onClick}
                title={m.title}
                className="py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Main Keypad */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* Row 1 */}
            <button
              type="button"
              onClick={clearAll}
              className="h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 font-bold text-sm transition-colors cursor-pointer active:scale-95"
              title={isPT ? 'Limpar tudo (C / Del)' : 'Clear all'}
            >
              C
            </button>
            <button
              type="button"
              onClick={backspace}
              className="h-11 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300/70 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              title={isPT ? 'Apagar último dígito' : 'Backspace'}
            >
              <Delete size={16} />
            </button>
            <button
              type="button"
              onClick={inputPercent}
              className="h-11 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300/70 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm transition-colors cursor-pointer active:scale-95"
              title={isPT ? 'Porcentagem' : 'Percent'}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => chooseOperator('/')}
              className={cn(
                'h-11 rounded-xl font-bold text-base border transition-colors cursor-pointer active:scale-95',
                operator === '/'
                  ? 'bg-blue-700 text-white border-blue-800'
                  : 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300'
              )}
            >
              ÷
            </button>

            {/* Row 2 */}
            {['7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => inputDigit(d)}
                className="h-11 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base shadow-2xs transition-colors cursor-pointer active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => chooseOperator('*')}
              className={cn(
                'h-11 rounded-xl font-bold text-base border transition-colors cursor-pointer active:scale-95',
                operator === '*'
                  ? 'bg-blue-700 text-white border-blue-800'
                  : 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300'
              )}
            >
              ×
            </button>

            {/* Row 3 */}
            {['4', '5', '6'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => inputDigit(d)}
                className="h-11 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base shadow-2xs transition-colors cursor-pointer active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => chooseOperator('-')}
              className={cn(
                'h-11 rounded-xl font-bold text-base border transition-colors cursor-pointer active:scale-95',
                operator === '-'
                  ? 'bg-blue-700 text-white border-blue-800'
                  : 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300'
              )}
            >
              −
            </button>

            {/* Row 4 */}
            {['1', '2', '3'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => inputDigit(d)}
                className="h-11 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base shadow-2xs transition-colors cursor-pointer active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => chooseOperator('+')}
              className={cn(
                'h-11 rounded-xl font-bold text-base border transition-colors cursor-pointer active:scale-95',
                operator === '+'
                  ? 'bg-blue-700 text-white border-blue-800'
                  : 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300'
              )}
            >
              +
            </button>

            {/* Row 5 */}
            <button
              type="button"
              onClick={toggleSign}
              className="h-11 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm shadow-2xs transition-colors cursor-pointer active:scale-95"
              title={isPT ? 'Inverter sinal (±)' : 'Toggle sign (±)'}
            >
              ±
            </button>
            <button
              type="button"
              onClick={() => inputDigit('0')}
              className="h-11 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base shadow-2xs transition-colors cursor-pointer active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={inputDecimal}
              className="h-11 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base shadow-2xs transition-colors cursor-pointer active:scale-95"
            >
              {isPT ? ',' : '.'}
            </button>
            <button
              type="button"
              onClick={evaluate}
              className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 font-bold text-base shadow-sm transition-colors cursor-pointer active:scale-95"
            >
              =
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
