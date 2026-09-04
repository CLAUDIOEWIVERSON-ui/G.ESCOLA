import { toast } from 'sonner';

export interface PDFExportOptions {
  orientation?: 'landscape' | 'portrait';
  filename?: string;
  scale?: number;
}

/**
 * Standard neutral avatar SVG in data-uri format as fail-safe fallback
 * if an external photo fails CORS or network checks.
 */
const FALLBACK_AVATAR_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%2394a3b8"><rect width="100" height="100" fill="%23f1f5f9"/><circle cx="50" cy="38" r="22"/><path d="M16 90c0-18.78 15.22-34 34-34s34 15.22 34 34z"/></svg>';

/**
 * Robust loader for html2canvas-pro (with fallback to html2canvas) to support Tailwind v4, oklch colors and modern CSS.
 */
export async function getHtml2Canvas(): Promise<any> {
  try {
    const mod = await import('html2canvas-pro');
    return mod.default || mod;
  } catch (err) {
    console.warn('html2canvas-pro não encontrado, tentando html2canvas padrão:', err);
    try {
      const fallback = await import('html2canvas');
      return fallback.default || fallback;
    } catch (e: any) {
      console.error('Falha ao carregar gerador de canvas:', e);
      throw new Error('Falha ao carregar o gerador gráfico do PDF. Por favor, atualize a página (F5) ou use o botão "Imprimir".');
    }
  }
}

/**
 * Converts remote image URLs to inline Base64 data-URIs safely.
 * This guarantees zero CORS errors, avoids Cloudflare cookie blocking (__cf_bm),
 * and prevents the canvas from becoming tainted during PDF rendering.
 */
async function convertImgToBase64(imgElement: HTMLImageElement): Promise<void> {
  const src = imgElement.src;
  if (!src || src.startsWith('data:')) {
    return;
  }

  try {
    // Attempt fetch with anonymous CORS credentials omitted
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(src, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Formato de imagem inválido'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    imgElement.crossOrigin = 'anonymous';
    imgElement.src = base64;
  } catch {
    // If CORS or network fails, gracefully replace with a crisp neutral silhouette
    // so html2canvas never crashes or taints the canvas.
    imgElement.crossOrigin = 'anonymous';
    imgElement.src = FALLBACK_AVATAR_SVG;
  }
}

/**
 * Sanitizes all <img> elements inside a DOM tree to Base64 in parallel.
 */
async function inlineAllImagesInElement(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  if (images.length === 0) return;

  // Process in small batches so we don't overwhelm network
  const promises = images.map((img) => convertImgToBase64(img));
  await Promise.allSettled(promises);
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

  const toastId = toast.loading('Processando imagens e gerando PDF...');

  try {
    const html2canvas = await getHtml2Canvas();
    const { jsPDF } = await import('jspdf');

    // Adapt scale to avoid exceeding browser GPU canvas limits on very long reports
    const targetHeight = targetElem.offsetHeight || targetElem.scrollHeight || 1000;
    let effectiveScale = scale;
    if (targetHeight * effectiveScale > 10000) {
      effectiveScale = Math.max(1.0, Math.floor((10000 / targetHeight) * 10) / 10);
    }

    // Create a temporary clone with forced white background and clean dimensions
    const canvas = await html2canvas(targetElem, {
      scale: effectiveScale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: orientation === 'landscape' ? 1400 : 1000,
      onclone: async (clonedDoc: Document) => {
        const clonedElem = clonedDoc.getElementById(elementId);
        if (clonedElem) {
          clonedElem.style.color = '#000000';
          clonedElem.style.backgroundColor = '#ffffff';
          clonedElem.style.boxShadow = 'none';
          clonedElem.style.border = 'none';

          // Inline all images in the clone to base64 to eliminate any CORS / taint problems
          await inlineAllImagesInElement(clonedElem);

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

    let imgData: string;
    try {
      imgData = canvas.toDataURL('image/png', 1.0);
    } catch (taintErr: any) {
      console.warn('Canvas tainted, tentando fallback em JPEG:', taintErr);
      try {
        imgData = canvas.toDataURL('image/jpeg', 0.95);
      } catch (jpegErr: any) {
        throw new Error('As imagens externas bloquearam a captura de tela. Utilize a opção "Imprimir" e escolha "Salvar como PDF".');
      }
    }

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = orientation === 'landscape' ? 297 : 210;
    const pdfHeight = orientation === 'landscape' ? 210 : 297;

    // Safe margins (in mm)
    const marginX = orientation === 'landscape' ? 12 : 10;
    const marginY = orientation === 'landscape' ? 10 : 10;
    const contentWidth = pdfWidth - (marginX * 2);
    const contentHeight = pdfHeight - (marginY * 2);

    const imgHeight = (canvas.width > 0) ? (canvas.height * contentWidth) / canvas.width : contentHeight;

    if (imgHeight <= contentHeight * 1.05) {
      // Fits on a single page with margins (with up to 5% safe scaling tolerance)
      const renderHeight = Math.min(imgHeight, contentHeight);
      pdf.addImage(imgData, 'PNG', marginX, marginY, contentWidth, renderHeight, undefined, 'FAST');
      
      // Page footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Missão de Assessoria Naval do Brasil • Emissão: ${new Date().toLocaleDateString('pt-BR')}`,
        marginX,
        pdfHeight - 4
      );
      pdf.text('Página 1 de 1', pdfWidth - marginX, pdfHeight - 4, { align: 'right' });
    } else {
      // Multi-page document: Use smart row-aligned canvas slicing
      // 1. Extract all DOM break boundaries (rows, headers, avoid-break blocks)
      const containerRect = targetElem.getBoundingClientRect();
      const scaleY = canvas.height / (containerRect.height || targetElem.offsetHeight || 1);

      const rowBreaks: number[] = [];
      const headerBlocks: { top: number; bottom: number }[] = [];
      const avoidBreakBlocks: { top: number; bottom: number }[] = [];

      // Extract table rows
      const rows = Array.from(targetElem.querySelectorAll<HTMLTableRowElement>('tr'));
      for (const tr of rows) {
        const r = tr.getBoundingClientRect();
        const bottomPx = (r.bottom - containerRect.top) * scaleY;
        if (bottomPx > 0) {
          rowBreaks.push(bottomPx);
        }
      }
      rowBreaks.sort((a, b) => a - b);

      // Extract headers (section headers, avoid-break-after, thead)
      const headers = Array.from(targetElem.querySelectorAll<HTMLElement>(
        '.print-section-header, .print-avoid-break-after, thead'
      ));
      for (const h of headers) {
        const r = h.getBoundingClientRect();
        headerBlocks.push({
          top: (r.top - containerRect.top) * scaleY,
          bottom: (r.bottom - containerRect.top) * scaleY
        });
      }

      // Extract avoid-break blocks (summaries, signatures, turma units)
      const avoids = Array.from(targetElem.querySelectorAll<HTMLElement>(
        '.print-avoid-break, .break-inside-avoid, .print-summary-box, .print-signature, .print-turma-unit'
      ));
      for (const b of avoids) {
        const r = b.getBoundingClientRect();
        avoidBreakBlocks.push({
          top: (r.top - containerRect.top) * scaleY,
          bottom: (r.bottom - containerRect.top) * scaleY
        });
      }

      // 2. Compute intelligent cut points so rows and headers are never cut or orphaned
      const maxPageCanvasHeight = (contentHeight / contentWidth) * canvas.width;
      const cuts: number[] = [0];
      let currentTop = 0;

      while (currentTop < canvas.height) {
        // If the remaining content fits on the current page
        if (canvas.height - currentTop <= maxPageCanvasHeight * 1.05) {
          cuts.push(canvas.height);
          break;
        }

        const idealBottom = currentTop + maxPageCanvasHeight;
        let chosenCut = idealBottom;

        // A. Check if an avoid-break block crosses the page boundary
        let blockCut: number | null = null;
        for (const b of avoidBreakBlocks) {
          if (b.top > currentTop && b.top < idealBottom && b.bottom > idealBottom) {
            if (b.top - currentTop >= maxPageCanvasHeight * 0.3) {
              blockCut = b.top;
              break;
            }
          }
        }

        // B. Find best row boundary <= idealBottom
        const eligibleRows = rowBreaks.filter(
          (y) => y > currentTop + maxPageCanvasHeight * 0.35 && y <= idealBottom
        );

        if (blockCut && eligibleRows.length === 0) {
          chosenCut = blockCut;
        } else if (eligibleRows.length > 0) {
          const lastRowBottom = eligibleRows[eligibleRows.length - 1];
          chosenCut = blockCut ? Math.min(blockCut, lastRowBottom) : lastRowBottom;
        } else {
          chosenCut = blockCut || idealBottom;
        }

        // C. Prevent orphaned headers at the bottom of the page
        // "não imprimir somente o cabeçalho em uma pagina e na outra o conteúdo da tabela"
        for (const h of headerBlocks) {
          if (h.top > currentTop && h.top < chosenCut) {
            const contentAfterHeader = chosenCut - h.bottom;
            if (contentAfterHeader < 110) {
              if (h.top - currentTop >= maxPageCanvasHeight * 0.25) {
                chosenCut = h.top;
                break;
              }
            }
          }
        }

        // Safeguard against infinite loop
        if (chosenCut <= currentTop + 80) {
          chosenCut = idealBottom;
        }

        cuts.push(chosenCut);
        currentTop = chosenCut;
      }

      // 3. Slice master canvas cleanly per page
      const totalPages = cuts.length - 1;

      for (let p = 0; p < totalPages; p++) {
        const startY = cuts[p];
        const endY = cuts[p + 1];
        const sliceHeight = endY - startY;

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const pCtx = pageCanvas.getContext('2d');
        if (pCtx) {
          pCtx.fillStyle = '#ffffff';
          pCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pCtx.drawImage(
            canvas,
            0, startY, canvas.width, sliceHeight,
            0, 0, canvas.width, sliceHeight
          );
        }

        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        const sliceHeightMm = (sliceHeight / canvas.width) * contentWidth;

        if (p > 0) {
          pdf.addPage();
        }

        pdf.addImage(pageImgData, 'PNG', marginX, marginY, contentWidth, sliceHeightMm, undefined, 'FAST');

        // Page footer with page count and date
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          `Missão de Assessoria Naval do Brasil • Emissão: ${new Date().toLocaleDateString('pt-BR')}`,
          marginX,
          pdfHeight - 4
        );
        pdf.text(
          `Página ${p + 1} de ${totalPages}`,
          pdfWidth - marginX,
          pdfHeight - 4,
          { align: 'right' }
        );
      }
    }

    const sanitizedFilename = (filename || 'documento.pdf')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_');
    const finalFilename = sanitizedFilename.endsWith('.pdf') ? sanitizedFilename : `${sanitizedFilename}.pdf`;
    
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
      toast.error('Não foi possível gerar o PDF direto: ' + (msg || 'Erro inesperado.') + ' Dica: clique em "Imprimir Documento" para salvar como PDF.', { duration: 7000 });
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
          break-inside: avoid !important;
        }
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        th, td {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        tbody {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        .print-avoid-break,
        .break-inside-avoid,
        .print-summary-box,
        .print-signature,
        .print-turma-unit {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .print-section-header,
        .print-avoid-break-after {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          break-after: avoid !important;
          page-break-after: avoid !important;
        }
        .print-group-block {
          break-inside: auto !important;
          page-break-inside: auto !important;
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
