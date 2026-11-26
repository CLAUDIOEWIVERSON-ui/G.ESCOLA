'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export type CalculatorOperator = '+' | '-' | '*' | '/';

export interface CalculatorHistoryEntry {
  id: string;
  expression: string;
  result: string;
}

export interface CalculatorPosition {
  x: number;
  y: number;
}

interface PersistedCalculatorState {
  isOpen: boolean;
  isMinimized: boolean;
  position: CalculatorPosition | null;
  display: string;
  previousValue: number | null;
  operator: CalculatorOperator | null;
  waitingForOperand: boolean;
  expression: string;
  memory: number;
  history: CalculatorHistoryEntry[];
}

const STORAGE_KEY = 'sge_floating_calculator_v1';

const DEFAULT_PERSISTED_STATE: PersistedCalculatorState = {
  isOpen: false,
  isMinimized: false,
  position: null,
  display: '0',
  previousValue: null,
  operator: null,
  waitingForOperand: false,
  expression: '',
  memory: 0,
  history: [],
};

interface CalculatorContextValue extends PersistedCalculatorState {
  hydrated: boolean;
  openCalculator: () => void;
  closeCalculator: () => void;
  toggleCalculator: () => void;
  setIsMinimized: (minimized: boolean) => void;
  setPosition: (pos: CalculatorPosition) => void;
  commitPosition: (pos: CalculatorPosition) => void;
  inputDigit: (digit: string) => void;
  inputDecimal: () => void;
  toggleSign: () => void;
  inputPercent: () => void;
  inputSquareRoot: () => void;
  backspace: () => void;
  clearAll: () => void;
  chooseOperator: (op: CalculatorOperator) => void;
  evaluate: () => void;
  memoryClear: () => void;
  memoryRecall: () => void;
  memoryAdd: () => void;
  memorySubtract: () => void;
  applyHistoryValue: (val: string) => void;
  clearHistory: () => void;
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

function roundCalc(num: number): number {
  if (!Number.isFinite(num)) return num;
  return Math.round(num * 1e10) / 1e10;
}

function formatResultString(num: number): string {
  if (!Number.isFinite(num)) return 'Erro';
  const rounded = roundCalc(num);
  if (Object.is(rounded, -0)) return '0';
  const str = String(rounded);
  if (str.length > 14 && Math.abs(rounded) >= 1e12) {
    return rounded.toExponential(6).replace('e+', 'e');
  }
  return str;
}

function formatOpSymbol(op: CalculatorOperator): string {
  switch (op) {
    case '+':
      return '+';
    case '-':
      return '−';
    case '*':
      return '×';
    case '/':
      return '÷';
  }
}

export function formatDisplayPT(raw: string): string {
  if (!raw || raw === 'Erro') return raw || '0';
  if (raw.includes('e')) return raw.replace('.', ',');
  const isNeg = raw.startsWith('-');
  const unsigned = isNeg ? raw.slice(1) : raw;
  const [intPart, decPart] = unsigned.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const signPrefix = isNeg ? '-' : '';
  return decPart !== undefined
    ? `${signPrefix}${formattedInt},${decPart}`
    : `${signPrefix}${formattedInt}`;
}

function applyArithmetic(a: number, b: number, op: CalculatorOperator): number {
  switch (op) {
    case '+':
      return roundCalc(a + b);
    case '-':
      return roundCalc(a - b);
    case '*':
      return roundCalc(a * b);
    case '/':
      return b === 0 ? NaN : roundCalc(a / b);
  }
}

export function CalculatorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedCalculatorState>(DEFAULT_PERSISTED_STATE);
  const [hydrated, setHydrated] = useState(false);
  const skipPersistRef = useRef(false);

  const persistToStorage = useCallback((next: PersistedCalculatorState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedCalculatorState>;
        skipPersistRef.current = true;
        setState({
          ...DEFAULT_PERSISTED_STATE,
          ...parsed,
          history: Array.isArray(parsed.history) ? parsed.history.slice(0, 20) : [],
        });
      }
    } catch {
      // ignore invalid cache
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    persistToStorage(state);
  }, [state, hydrated, persistToStorage]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as Partial<PersistedCalculatorState>;
        skipPersistRef.current = true;
        setState({
          ...DEFAULT_PERSISTED_STATE,
          ...parsed,
          history: Array.isArray(parsed.history) ? parsed.history.slice(0, 20) : [],
        });
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const openCalculator = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      isMinimized: false,
    }));
  }, []);

  const closeCalculator = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      isMinimized: false,
    }));
  }, []);

  const toggleCalculator = useCallback(() => {
    setState((prev) => {
      if (!prev.isOpen) {
        return { ...prev, isOpen: true, isMinimized: false };
      }
      if (prev.isMinimized) {
        return { ...prev, isMinimized: false };
      }
      return { ...prev, isOpen: false };
    });
  }, []);

  const setIsMinimized = useCallback((minimized: boolean) => {
    setState((prev) => ({ ...prev, isMinimized: minimized }));
  }, []);

  const setPosition = useCallback((pos: CalculatorPosition) => {
    setState((prev) => {
      if (prev.position?.x === pos.x && prev.position?.y === pos.y) return prev;
      skipPersistRef.current = true;
      return { ...prev, position: pos };
    });
  }, []);

  const commitPosition = useCallback(
    (pos: CalculatorPosition) => {
      setState((prev) => {
        const next = { ...prev, position: pos };
        persistToStorage(next);
        return next;
      });
    },
    [persistToStorage]
  );

  const inputDigit = useCallback((digit: string) => {
    setState((prev) => {
      if (prev.display === 'Erro' || prev.waitingForOperand) {
        return {
          ...prev,
          display: digit,
          waitingForOperand: false,
          expression: prev.operator === null ? '' : prev.expression,
        };
      }
      if (prev.display === '0') {
        return { ...prev, display: digit };
      }
      if (prev.display.replace('-', '').replace('.', '').length >= 14) {
        return prev;
      }
      return { ...prev, display: `${prev.display}${digit}` };
    });
  }, []);

  const inputDecimal = useCallback(() => {
    setState((prev) => {
      if (prev.display === 'Erro' || prev.waitingForOperand) {
        return {
          ...prev,
          display: '0.',
          waitingForOperand: false,
          expression: prev.operator === null ? '' : prev.expression,
        };
      }
      if (prev.display.includes('.')) return prev;
      return { ...prev, display: `${prev.display}.` };
    });
  }, []);

  const toggleSign = useCallback(() => {
    setState((prev) => {
      if (prev.display === 'Erro' || prev.display === '0') return prev;
      const next = prev.display.startsWith('-') ? prev.display.slice(1) : `-${prev.display}`;
      return { ...prev, display: next };
    });
  }, []);

  const backspace = useCallback(() => {
    setState((prev) => {
      if (prev.display === 'Erro' || prev.waitingForOperand) {
        return { ...prev, display: '0', waitingForOperand: false };
      }
      if (prev.display.length <= 1 || (prev.display.length === 2 && prev.display.startsWith('-'))) {
        return { ...prev, display: '0' };
      }
      return { ...prev, display: prev.display.slice(0, -1) };
    });
  }, []);

  const clearAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      display: '0',
      previousValue: null,
      operator: null,
      waitingForOperand: false,
      expression: '',
    }));
  }, []);

  const chooseOperator = useCallback((nextOp: CalculatorOperator) => {
    setState((prev) => {
      const currentVal = Number(prev.display);
      if (Number.isNaN(currentVal)) {
        return {
          ...prev,
          display: '0',
          previousValue: 0,
          operator: nextOp,
          waitingForOperand: true,
          expression: `0 ${formatOpSymbol(nextOp)}`,
        };
      }

      if (prev.previousValue !== null && prev.operator && !prev.waitingForOperand) {
        const result = applyArithmetic(prev.previousValue, currentVal, prev.operator);
        const resultStr = formatResultString(result);
        if (resultStr === 'Erro') {
          return {
            ...prev,
            display: 'Erro',
            previousValue: null,
            operator: null,
            waitingForOperand: true,
            expression: '',
          };
        }
        return {
          ...prev,
          display: resultStr,
          previousValue: Number(resultStr),
          operator: nextOp,
          waitingForOperand: true,
          expression: `${formatDisplayPT(resultStr)} ${formatOpSymbol(nextOp)}`,
        };
      }

      const normalized = formatResultString(currentVal);
      return {
        ...prev,
        display: normalized,
        previousValue: Number(normalized),
        operator: nextOp,
        waitingForOperand: true,
        expression: `${formatDisplayPT(normalized)} ${formatOpSymbol(nextOp)}`,
      };
    });
  }, []);

  const evaluate = useCallback(() => {
    setState((prev) => {
      if (prev.previousValue === null || !prev.operator) {
        return prev;
      }
      const currentVal = Number(prev.display);
      if (Number.isNaN(currentVal)) return prev;

      const result = applyArithmetic(prev.previousValue, currentVal, prev.operator);
      const resultStr = formatResultString(result);
      const fullExpr = `${formatDisplayPT(formatResultString(prev.previousValue))} ${formatOpSymbol(
        prev.operator
      )} ${formatDisplayPT(formatResultString(currentVal))} =`;

      if (resultStr === 'Erro') {
        return {
          ...prev,
          display: 'Erro',
          previousValue: null,
          operator: null,
          waitingForOperand: true,
          expression: fullExpr,
        };
      }

      const entry: CalculatorHistoryEntry = {
        id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        expression: fullExpr,
        result: resultStr,
      };

      return {
        ...prev,
        display: resultStr,
        previousValue: null,
        operator: null,
        waitingForOperand: true,
        expression: fullExpr,
        history: [entry, ...prev.history].slice(0, 20),
      };
    });
  }, []);

  const inputPercent = useCallback(() => {
    setState((prev) => {
      const currentVal = Number(prev.display);
      if (Number.isNaN(currentVal)) return prev;
      const pctVal =
        prev.previousValue !== null && (prev.operator === '+' || prev.operator === '-')
          ? roundCalc((prev.previousValue * currentVal) / 100)
          : roundCalc(currentVal / 100);
      return {
        ...prev,
        display: formatResultString(pctVal),
        waitingForOperand: false,
      };
    });
  }, []);

  const inputSquareRoot = useCallback(() => {
    setState((prev) => {
      const currentVal = Number(prev.display);
      if (Number.isNaN(currentVal) || currentVal < 0) {
        return {
          ...prev,
          display: 'Erro',
          previousValue: null,
          operator: null,
          waitingForOperand: true,
          expression: '',
        };
      }
      const resStr = formatResultString(Math.sqrt(currentVal));
      const expr = `√(${formatDisplayPT(formatResultString(currentVal))}) =`;
      const entry: CalculatorHistoryEntry = {
        id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        expression: expr,
        result: resStr,
      };
      return {
        ...prev,
        display: resStr,
        waitingForOperand: true,
        expression: expr,
        history: [entry, ...prev.history].slice(0, 20),
      };
    });
  }, []);

  const memoryClear = useCallback(() => {
    setState((prev) => ({ ...prev, memory: 0 }));
  }, []);

  const memoryRecall = useCallback(() => {
    setState((prev) => ({
      ...prev,
      display: formatResultString(prev.memory),
      waitingForOperand: true,
    }));
  }, []);

  const memoryAdd = useCallback(() => {
    setState((prev) => {
      const currentVal = Number(prev.display);
      if (Number.isNaN(currentVal)) return prev;
      return { ...prev, memory: roundCalc(prev.memory + currentVal), waitingForOperand: true };
    });
  }, []);

  const memorySubtract = useCallback(() => {
    setState((prev) => {
      const currentVal = Number(prev.display);
      if (Number.isNaN(currentVal)) return prev;
      return { ...prev, memory: roundCalc(prev.memory - currentVal), waitingForOperand: true };
    });
  }, []);

  const applyHistoryValue = useCallback((val: string) => {
    setState((prev) => ({
      ...prev,
      display: val,
      waitingForOperand: false,
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, history: [] }));
  }, []);

  return (
    <CalculatorContext.Provider
      value={{
        ...state,
        hydrated,
        openCalculator,
        closeCalculator,
        toggleCalculator,
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
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return ctx;
}
