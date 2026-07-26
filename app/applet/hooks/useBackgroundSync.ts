import { useEffect, useRef, useState, useCallback } from 'react';

interface UseBackgroundSyncOptions {
  /** 
   * Função disparada quando a aba volta a ficar visível/focada.
   * Ideal para refazer requisições e garantir que os dados estão atualizados.
   */
  onFocus?: () => void;
  
  /** 
   * Função disparada quando a aba vai para background.
   * Ideal para pausar animações, vídeos ou desconectar sockets não críticos.
   */
  onBackground?: () => void;
  
  /** 
   * Intervalo em milissegundos para polling em background. 
   * Se for maior que 0, um Web Worker é instanciado para evitar que 
   * o navegador limite (throttle) os timers (setInterval/setTimeout).
   */
  workerSyncIntervalMs?: number; 
  
  /**
   * Função disparada a cada "tick" do Worker enquanto estiver em background.
   */
  onWorkerSync?: () => void;
}

/**
 * Hook para lidar com ciclos de vida de background/foreground de forma segura,
 * evitando memory leaks e prevenindo que o navegador adormeça escutas ativas.
 */
export function useBackgroundSync({
  onFocus,
  onBackground,
  workerSyncIntervalMs = 0,
  onWorkerSync,
}: UseBackgroundSyncOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const workerRef = useRef<Worker | null>(null);

  // 1. Tratamento de Ciclo de Vida (Page Visibility API)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      
      if (visible) {
        if (onFocus) onFocus();
      } else {
        if (onBackground) onBackground();
      }
    };

    // Ouve o evento de mudança de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup evita vazamento de memória (memory leak) ao desmontar o componente
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onFocus, onBackground]);

  // 2. Estratégia de Web Worker (Para evitar Throttling de Timers em Background)
  useEffect(() => {
    // Só cria o Worker se um intervalo for especificado
    if (workerSyncIntervalMs <= 0) return;

    // Criamos um Inline Web Worker via Blob para não precisar hospedar um arquivo externo separadamente.
    // O Web Worker roda numa thread separada e não sofre o limite de 1 min do setTimeout em background.
    const workerCode = `
      let intervalId = null;
      self.onmessage = function(e) {
        if (e.data.command === 'start') {
          intervalId = setInterval(() => {
            self.postMessage('sync');
          }, e.data.interval);
        } else if (e.data.command === 'stop') {
          if (intervalId) clearInterval(intervalId);
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data === 'sync') {
        // Dispara a função de sync configurada sem afetar a thread principal pesadamente
        if (onWorkerSync) onWorkerSync();
      }
    };

    // Inicia o worker
    worker.postMessage({ command: 'start', interval: workerSyncIntervalMs });

    // Cleanup: Destrói o worker e limpa URLs para não vazar memória
    return () => {
      worker.postMessage({ command: 'stop' });
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      workerRef.current = null;
    };
  }, [workerSyncIntervalMs, onWorkerSync]);

  return { isVisible };
}
