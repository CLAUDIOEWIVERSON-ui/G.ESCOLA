import { toast } from 'sonner';

export interface PDFExportOptions {
  orientation?: 'landscape' | 'portrait';
  filename?: string;
  scale?: number;
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
    const html2canvas = (await import('html2canvas-pro')).default;
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

    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight <= pdfHeight) {
      // Fits on one single page
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
    } else {
      // Scale slightly to fit exactly on 1 single page if it's within 15% margin
      if (imgHeight <= pdfHeight * 1.15) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      } else {
        // Multi-page handling if exceptionally tall
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = position - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
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
    toast.error('Erro ao gerar PDF: ' + (err?.message || 'Falha inesperada'));
    return false;
  }
}

/**
 * Prints a DOM element cleanly using an isolated, dedicated hidden iframe.
 * This guarantees zero background interference, zero duplicate pages, and correct A4 Landscape sizing.
 */
export function printElementIsolated(elementId: string, customTitle = 'Documento'): void {
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
    document.body.classList.add('printing-attendance-sheet');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-attendance-sheet');
      }, 1000);
    }, 50);
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
          size: A4 landscape;
          margin: 3mm 4mm 3mm 4mm;
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
        #print-attendance-sheet {
          display: block !important;
          position: static !important;
          width: 100% !important;
          max-width: 297mm !important;
          margin: 0 auto !important;
          padding: 2mm 3mm !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          box-shadow: none !important;
          border: none !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        #print-attendance-sheet * {
          color: #000000 !important;
          visibility: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #print-attendance-sheet .print-attendance-table {
          width: 100% !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
          border: 1.5px solid #000000 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        #print-attendance-sheet .print-attendance-table th,
        #print-attendance-sheet .print-attendance-table td {
          border: 1px solid #000000 !important;
          color: #000000 !important;
          overflow: visible !important;
          white-space: normal !important;
          background-color: #ffffff !important;
        }
        #print-attendance-sheet .print-attendance-table th {
          background-color: #f1f5f9 !important;
          font-weight: 900 !important;
        }
        #print-attendance-sheet .text-emerald-700,
        #print-attendance-sheet .text-emerald-800 {
          color: #047857 !important;
        }
        #print-attendance-sheet .text-rose-700,
        #print-attendance-sheet .text-rose-800 {
          color: #be123c !important;
        }
        #print-attendance-sheet .text-amber-700,
        #print-attendance-sheet .text-amber-800 {
          color: #b45309 !important;
        }
        #print-attendance-sheet .text-blue-900 {
          color: #1e3a8a !important;
        }
        #print-attendance-sheet .text-red-600,
        #print-attendance-sheet .text-red-700,
        #print-attendance-sheet .text-red-800 {
          color: #b91c1c !important;
        }
        .no-print {
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
  }, 300);
}
