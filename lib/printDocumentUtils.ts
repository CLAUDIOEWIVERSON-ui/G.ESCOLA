import { toast } from 'sonner';

export interface PDFExportOptions {
  orientation?: 'landscape' | 'portrait';
  filename?: string;
  scale?: number;
}

/**
 * Robust loader for html2canvas to prevent chunk load errors and handle imports cleanly.
 */
export async function getHtml2Canvas(): Promise<any> {
  try {
    const mod = await import('html2canvas');
    return mod.default || mod;
  } catch (err: any) {
    console.error('Falha ao carregar html2canvas:', err);
    throw new Error('Falha ao carregar o gerador gráfico do PDF. Por favor, atualize a página (F5) ou use o botão "Imprimir".');
  }
}

/**
 * Downloads a DOM element as a crisp, single-page or multi-page A4 PDF.
 */
export async function downloadElementAsPDF(
  elementId: string,
  options: PDFExportOptions = {}
): Promise<boolean> {
  const {
    orientation = 'landscape',
    filename = 'documento.pdf',
    scale = 2
  } = options;

  const targetElem = document.getElementById(elementId);
  if (!targetElem) {
    toast.error('Elemento do documento não foi encontrado para exportação.');
    return false;
  }

  const toastId = toast.loading('Gerando arquivo PDF em alta resolução...');

  try {
    const html2canvas = await getHtml2Canvas();
    const { jsPDF } = await import('jspdf');

    // Create a temporary clone with forced white background and clean dimensions
    const canvas = await html2canvas(targetElem, {
      scale: scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: orientation === 'landscape' ? 1400 : 1000,
      onclone: (clonedDoc) => {
        const clonedElem = clonedDoc.getElementById(elementId);
        if (clonedElem) {
          clonedElem.style.color = '#000000';
          clonedElem.style.backgroundColor = '#ffffff';
          clonedElem.style.boxShadow = 'none';
          clonedElem.style.border = 'none';
          // Ensure all text elements are strictly visible and black
          const allText = clonedElem.querySelectorAll('*');
          allText.forEach((node) => {
            const htmlNode = node as HTMLElement;
            if (htmlNode.style) {
              if (htmlNode.classList.contains('text-emerald-700') || htmlNode.classList.contains('text-emerald-800')) {
                htmlNode.style.color = '#047857';
              } else if (htmlNode.classList.contains('text-rose-700') || htmlNode.classList.contains('text-rose-800')) {
                htmlNode.style.color = '#be123c';
              } else if (htmlNode.classList.contains('text-amber-700') || htmlNode.classList.contains('text-amber-800')) {
                htmlNode.style.color = '#b45309';
              } else if (htmlNode.classList.contains('text-blue-900')) {
                htmlNode.style.color = '#1e3a8a';
              } else if (htmlNode.classList.contains('text-red-600') || htmlNode.classList.contains('text-red-700') || htmlNode.classList.contains('text-red-800')) {
                htmlNode.style.color = '#b91c1c';
              } else if (!htmlNode.classList.contains('badge') && !htmlNode.style.backgroundColor) {
                htmlNode.style.color = '#000000';
              }
            }
          });
        }
      }
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = orientation === 'landscape' ? 297 : 210;
    const pdfHeight = orientation === 'landscape' ? 210 : 297;

    // Add safe margins (in mm) so content never touches the outer edge of the paper or PDF
    const marginX = orientation === 'landscape' ? 14 : 12;
    const marginY = orientation === 'landscape' ? 12 : 12;
    const contentWidth = pdfWidth - (marginX * 2);
    const contentHeight = pdfHeight - (marginY * 2);

    const imgHeight = (canvas.width > 0) ? (canvas.height * contentWidth) / canvas.width : contentHeight;

    if (imgHeight <= contentHeight) {
      // Fits on one single page with margins
      pdf.addImage(imgData, 'PNG', marginX, marginY, contentWidth, imgHeight, undefined, 'FAST');
    } else {
      // Scale slightly to fit exactly on 1 single page if it's within 12% margin
      if (imgHeight <= contentHeight * 1.12) {
        pdf.addImage(imgData, 'PNG', marginX, marginY, contentWidth, contentHeight, undefined, 'FAST');
      } else {
        // Multi-page handling with margins
        let heightLeft = imgHeight;
        let position = marginY;
        pdf.addImage(imgData, 'PNG', marginX, position, contentWidth, imgHeight, undefined, 'FAST');
        heightLeft -= contentHeight;

        while (heightLeft > 0) {
          position = position - contentHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', marginX, position, contentWidth, imgHeight, undefined, 'FAST');
          heightLeft -= contentHeight;
        }
      }
    }

    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(finalFilename);

    toast.dismiss(toastId);
    toast.success('PDF baixado com sucesso!');
    return true;
  } catch (err: any) {
    console.error('Erro ao gerar PDF:', err);
    toast.dismiss(toastId);
    const msg = err?.message || '';
    if (msg.includes('Loading chunk') || msg.includes('ChunkLoadError') || msg.includes('failed to fetch')) {
      toast.error('Módulo gráfico em atualização. Por favor, recarregue a página (F5) ou use o botão "Imprimir".', { duration: 6000 });
    } else {
      toast.error('Erro ao gerar PDF: ' + (msg || 'Falha inesperada. Tente a opção "Imprimir".'));
    }
    return false;
  }
}

/**
 * Prints a DOM element cleanly using an isolated, dedicated hidden iframe.
 * This guarantees zero background interference, zero duplicate pages, and correct A4 Landscape sizing.
 */
export function printElementIsolated(
  elementId: string, 
  customTitle = 'Documento',
  options: { orientation?: 'landscape' | 'portrait' } = {}
): void {
  const { orientation = 'portrait' } = options;
  const targetElem = document.getElementById(elementId);
  if (!targetElem) {
    toast.error('Elemento para impressão não encontrado.');
    return;
  }

  // Remove any previously created print iframe
  const existingIframe = document.getElementById('print-service-hidden-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create clean hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'print-service-hidden-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    // Fallback to standard window.print
    window.print();
    return;
  }

  // Extract element HTML
  const contentHtml = targetElem.outerHTML;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>${customTitle}</title>
      <style>
        @page {
          size: A4 ${orientation};
          margin: ${orientation === 'landscape' ? '10mm 14mm 10mm 14mm' : '12mm 14mm 12mm 14mm'};
        }
        *, *::before, *::after {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          width: 100% !important;
          height: auto !important;
        }
        #${elementId} {
          display: block !important;
          visibility: visible !important;
          position: static !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          box-shadow: none !important;
          border: none !important;
        }
        #${elementId} * {
          visibility: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          page-break-inside: auto !important;
        }
        tr, .page-break-avoid {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        thead {
          display: table-header-group !important;
        }
        .no-print, .print\\:hidden {
          display: none !important;
        }
      </style>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
      ${contentHtml}
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print failed, falling back to window.print', e);
      window.print();
    }
  }, 350);
}
