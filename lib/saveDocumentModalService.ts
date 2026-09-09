/**
 * Direct file download service replacing intermediate modal prompts.
 */

export interface SaveDocumentModalRequest {
  blob: Blob;
  suggestedFilename: string;
  documentTitle?: string;
  pageCount?: number;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Downloads the document directly without opening any modal dialog.
 */
export function openSaveDocumentModal(request: SaveDocumentModalRequest): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(request.blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = request.suggestedFilename || 'documento.pdf';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 1000);
      resolve(true);
    } catch (e) {
      console.error('Download falhou:', e);
      resolve(false);
    }
  });
}

export function registerSaveModalListener(_listener: any) {
  return () => {};
}
