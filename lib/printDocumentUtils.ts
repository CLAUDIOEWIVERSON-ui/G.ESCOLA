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

    // Add safe margins (in mm) so content never touches the outer edge of the paper or PDF
    const marginX = orientation === 'landscape' ? 14 : 12;
    const marginY = orientation === 'landscape' ? 12 : 12;
    const contentWidth = pdfWidth - (marginX * 2);
    const contentHeight = pdfHeight - (marginY * 2);

    const imgHeight = (canvas.width > 0) ? (canvas.height * contentWidth) / canvas.width : contentHeight;

    if (imgHeight <= contentHeight) {
      // Fits on one single page with margins
      pdf.addImage(imgData, 'PNG', marginX, marginY, contentWidth, imgHeight, undefined, 'FAST');
    } else if (imgHeight <= contentHeight * 1.08) {
      // Scale slightly to fit exactly on 1 single page if it's within 8% margin
      pdf.addImage(imgData, 'PNG', marginX, marginY, contentWidth, contentHeight, undefined, 'FAST');
    } else {
      // Multi-page smart slicing: Avoid cutting through rows, cards or section headers
      const scaleY = canvas.height / (targetElem.offsetHeight || 1);
      const pxPerMm = canvas.width / contentWidth;
      const maxPageHeightPx = contentHeight * pxPerMm;

      // Find all element boundaries that should not be sliced
      const containerRect = targetElem.getBoundingClientRect();
      const breakCandidates = targetElem.querySelectorAll(
        '.print-turma-unit, tr, .print-section-header, .print-avoid-break, .print-group-block, .print-summary-box, .print-signature, .print-student-item'
      );

      const elementsY: { top: number; bottom: number }[] = [];
      breakCandidates.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const top = (rect.top - containerRect.top) * scaleY;
        const bottom = (rect.bottom - containerRect.top) * scaleY;
        if (bottom > top && bottom <= canvas.height + 5) {
          elementsY.push({ top, bottom });
        }
      });

      // Sort elements by top position
      elementsY.sort((a, b) => a.top - b.top);

      // Calculate smart page slices
      const pageSlices: { startY: number; endY: number }[] = [];
      let currentStartY = 0;

      while (currentStartY < canvas.height - 2) {
        const idealEndY = currentStartY + maxPageHeightPx;

        if (idealEndY >= canvas.height) {
          pageSlices.push({ startY: currentStartY, endY: canvas.height });
          break;
        }

        // Find if an element is intersected by idealEndY
        let bestCutY = idealEndY;
        for (const el of elementsY) {
          if (el.top < idealEndY && el.bottom > idealEndY) {
            // Found element being cut in half!
            // Adjust cut point to before this element, as long as page is at least 45% full
            if (el.top > currentStartY + maxPageHeightPx * 0.45) {
              bestCutY = Math.floor(el.top);
            }
            break;
          }
        }

        // Safety fallback if bestCutY didn't advance
        if (bestCutY <= currentStartY) {
          bestCutY = idealEndY;
        }

        pageSlices.push({ startY: currentStartY, endY: bestCutY });
        currentStartY = bestCutY;
      }

      // Render each sliced sub-canvas to its own PDF page
      for (let i = 0; i < pageSlices.length; i++) {
        const { startY, endY } = pageSlices[i];
        const sliceHeightPx = endY - startY;
        if (sliceHeightPx <= 0) continue;

        if (i > 0) {
          pdf.addPage();
        }

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, startY, canvas.width, sliceHeightPx,
            0, 0, canvas.width, sliceHeightPx
          );
          const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
          const slicePdfHeight = (sliceHeightPx * contentWidth) / canvas.width;
          pdf.addImage(sliceImgData, 'PNG', marginX, marginY, contentWidth, slicePdfHeight, undefined, 'FAST');
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
 * This guarantees zero background interference, zero duplicate pages, and correct A4 sizing with smart page breaks.
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

  // Extract all existing style sheets from main document head to guarantee identical styling
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(tag => tag.outerHTML)
    .join('\n');

  // Extract element HTML
  const contentHtml = targetElem.outerHTML;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>${customTitle}</title>
      ${styleTags}
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
        
        /* Core page break and table pagination rules */
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        thead {
          display: table-header-group !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          break-after: avoid !important;
          page-break-after: avoid !important;
        }
        tfoot {
          display: table-footer-group !important;
        }
        tbody {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        tbody.print-turma-unit {
          display: table-row-group !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: auto !important;
          break-after: auto !important;
        }
        td, th {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* Section containers break naturally across pages, but headers never get orphaned */
        .print-section {
          break-inside: auto !important;
          page-break-inside: auto !important;
          margin-bottom: 24px !important;
        }
        .print-section-header {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          break-after: avoid !important;
          page-break-after: avoid !important;
        }
        .print-avoid-break, .page-break-avoid {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        .print-avoid-break-after {
          break-after: avoid !important;
          page-break-after: avoid !important;
        }
        .print-student-item {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
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

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print failed, falling back to window.print', e);
      window.print();
    }
  };

  // Wait for all images inside the iframe to load before printing
  const images = Array.from(doc.images || []);
  if (images.length > 0) {
    let loadedCount = 0;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= images.length) {
        setTimeout(triggerPrint, 150);
      }
    };
    images.forEach(img => {
      if (img.complete) {
        checkAllLoaded();
      } else {
        img.onload = checkAllLoaded;
        img.onerror = checkAllLoaded;
      }
    });
    // Fallback timer in case an image takes too long
    setTimeout(triggerPrint, 1000);
  } else {
    setTimeout(triggerPrint, 250);
  }
}
