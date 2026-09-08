/**
 * Global service to trigger the "Salvar Documento" (Save Document) modal window
 * whenever any PDF document or form is downloaded in the system.
 */

export interface SaveDocumentModalRequest {
  blob: Blob;
  suggestedFilename: string;
  documentTitle?: string;
  pageCount?: number;
  orientation?: 'portrait' | 'landscape';
}

type Resolver = (saved: boolean) => void;

interface PendingModal {
  request: SaveDocumentModalRequest;
  resolve: Resolver;
}

let activeListener: ((modalData: PendingModal) => void) | null = null;

export function registerSaveModalListener(listener: (modalData: PendingModal) => void) {
  activeListener = listener;
  return () => {
    if (activeListener === listener) {
      activeListener = null;
    }
  };
}

/**
 * Prompts the user with the Save Document modal window to choose where and how to save.
 */
export function openSaveDocumentModal(request: SaveDocumentModalRequest): Promise<boolean> {
  return new Promise((resolve) => {
    if (activeListener) {
      activeListener({ request, resolve });
    } else {
      // Fallback if modal is not currently mounted: fallback to standard download
      try {
        const url = URL.createObjectURL(request.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = request.suggestedFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve(true);
      } catch (e) {
        console.error('Fallback download failed:', e);
        resolve(false);
      }
    }
  });
}
