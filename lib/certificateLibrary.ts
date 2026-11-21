'use client';

import { makeFrameCenterTransparent } from '@/lib/certificateImageUtils';
import { CertificateTemplateConfig } from '@/lib/certificateTypes';

export type CertificateAssetCategory = 'brasao' | 'marca_dagua' | 'moldura';

export type CertificateAssetTarget =
  | 'brasaoEsquerdo'
  | 'brasaoCentro'
  | 'brasaoDireito'
  | 'marcaDaguaFrente'
  | 'marcaDaguaVerso'
  | 'marcaDaguaAmbas'
  | 'molduraFrente';

export interface CertificateLibraryAsset {
  id: string;
  name: string;
  category: CertificateAssetCategory;
  url: string;
  subtitle?: string;
  source: 'builtin' | 'custom' | 'template';
  frameStyle?: 'original' | 'vetorial' | 'simples';
  defaultBorderColor?: string;
  isDefaultMarinhaCrest?: boolean;
  defaultCaption?: string;
  createdAt?: string;
}

function encodeSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s{2,}/g, ' ').trim())}`;
}

const SVG_MARINHA_CREST = encodeSvgDataUrl(`
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="56" fill="#07224d" stroke="#d4af37" stroke-width="4" />
  <circle cx="60" cy="60" r="46" fill="none" stroke="#16a34a" stroke-width="5" />
  <circle cx="60" cy="60" r="40" fill="#082454" stroke="#facc15" stroke-width="2.5" />
  <circle cx="60" cy="60" r="35" fill="none" stroke="#e2e8f0" stroke-width="1.2" stroke-dasharray="3 2" />
  <circle cx="60" cy="30" r="5.5" fill="none" stroke="#ffffff" stroke-width="3" />
  <line x1="60" y1="35.5" x2="60" y2="85" stroke="#ffffff" stroke-width="5" stroke-linecap="round" />
  <line x1="45" y1="45" x2="75" y2="45" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" />
  <path d="M36 68 C36 86 60 92 60 92 C60 92 84 86 84 68" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" />
  <polygon points="32,69 40,62 42,72" fill="#ffffff" />
  <polygon points="88,69 80,62 78,72" fill="#ffffff" />
  <circle cx="38" cy="40" r="1.8" fill="#facc15" />
  <circle cx="82" cy="40" r="1.8" fill="#facc15" />
  <circle cx="60" cy="20" r="2" fill="#facc15" />
</svg>
`);

const SVG_ANCORA_DOURADA = encodeSvgDataUrl(`
<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
  <circle cx="80" cy="80" r="72" fill="#0b1f3a" stroke="#d4af37" stroke-width="4.5" />
  <circle cx="80" cy="80" r="63" fill="none" stroke="#f5d77f" stroke-width="1.5" stroke-dasharray="4 3" />
  <circle cx="80" cy="34" r="8" fill="none" stroke="#f5d77f" stroke-width="4" />
  <line x1="80" y1="42" x2="80" y2="118" stroke="#f5d77f" stroke-width="6.5" stroke-linecap="round" />
  <line x1="56" y1="58" x2="104" y2="58" stroke="#f5d77f" stroke-width="5.5" stroke-linecap="round" />
  <path d="M44 92 C44 120 80 128 80 128 C80 128 116 120 116 92" fill="none" stroke="#f5d77f" stroke-width="6.5" stroke-linecap="round" />
  <polygon points="38,94 49,82 52,98" fill="#f5d77f" />
  <polygon points="122,94 111,82 108,98" fill="#f5d77f" />
  <path d="M26 98 C22 72 32 48 50 36" fill="none" stroke="#d4af37" stroke-width="2.5" stroke-linecap="round" />
  <path d="M134 98 C138 72 128 48 110 36" fill="none" stroke="#d4af37" stroke-width="2.5" stroke-linecap="round" />
</svg>
`);

const SVG_ROSA_DOS_VENTOS_CREST = encodeSvgDataUrl(`
<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
  <circle cx="80" cy="80" r="72" fill="#f8fafc" stroke="#0f294a" stroke-width="4" />
  <circle cx="80" cy="80" r="62" fill="none" stroke="#94a3b8" stroke-width="1.5" />
  <polygon points="80,14 91,67 80,80" fill="#0f294a" />
  <polygon points="80,14 69,67 80,80" fill="#335c81" />
  <polygon points="80,146 91,93 80,80" fill="#335c81" />
  <polygon points="80,146 69,93 80,80" fill="#0f294a" />
  <polygon points="146,80 93,91 80,80" fill="#0f294a" />
  <polygon points="146,80 93,69 80,80" fill="#335c81" />
  <polygon points="14,80 67,91 80,80" fill="#335c81" />
  <polygon points="14,80 67,69 80,80" fill="#0f294a" />
  <polygon points="34,34 73,67 80,80 67,73" fill="#b45309" />
  <polygon points="126,34 93,73 80,80 87,67" fill="#d97706" />
  <polygon points="126,126 87,93 80,80 93,87" fill="#b45309" />
  <polygon points="34,126 67,87 80,80 73,93" fill="#d97706" />
  <circle cx="80" cy="80" r="9" fill="#d4af37" stroke="#0f294a" stroke-width="2" />
</svg>
`);

const SVG_WATERMARK_ROSA = encodeSvgDataUrl(`
<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <circle cx="200" cy="200" r="176" fill="none" stroke="#1e293b" stroke-width="4" />
  <circle cx="200" cy="200" r="158" fill="none" stroke="#1e293b" stroke-width="1.8" stroke-dasharray="6 4" />
  <circle cx="200" cy="200" r="112" fill="none" stroke="#1e293b" stroke-width="1.5" />
  <polygon points="200,26 225,172 200,200" fill="#1e293b" />
  <polygon points="200,26 175,172 200,200" fill="none" stroke="#1e293b" stroke-width="2" />
  <polygon points="200,374 225,228 200,200" fill="none" stroke="#1e293b" stroke-width="2" />
  <polygon points="200,374 175,228 200,200" fill="#1e293b" />
  <polygon points="374,200 228,225 200,200" fill="#1e293b" />
  <polygon points="374,200 228,175 200,200" fill="none" stroke="#1e293b" stroke-width="2" />
  <polygon points="26,200 172,225 200,200" fill="none" stroke="#1e293b" stroke-width="2" />
  <polygon points="26,200 172,175 200,200" fill="#1e293b" />
  <circle cx="200" cy="200" r="18" fill="none" stroke="#1e293b" stroke-width="3" />
</svg>
`);

const SVG_WATERMARK_ANCORA = encodeSvgDataUrl(`
<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <circle cx="200" cy="200" r="172" fill="none" stroke="#0f172a" stroke-width="5" />
  <circle cx="200" cy="200" r="154" fill="none" stroke="#0f172a" stroke-width="2" />
  <circle cx="200" cy="84" r="18" fill="none" stroke="#0f172a" stroke-width="7" />
  <line x1="200" y1="102" x2="200" y2="294" stroke="#0f172a" stroke-width="11" stroke-linecap="round" />
  <line x1="142" y1="146" x2="258" y2="146" stroke="#0f172a" stroke-width="9" stroke-linecap="round" />
  <path d="M108 232 C108 302 200 322 200 322 C200 322 292 302 292 232" fill="none" stroke="#0f172a" stroke-width="11" stroke-linecap="round" />
  <polygon points="94,236 122,208 128,244" fill="#0f172a" />
  <polygon points="306,236 278,208 272,244" fill="#0f172a" />
</svg>
`);

const SVG_MOLDURA_DOURADA = encodeSvgDataUrl(`
<svg viewBox="0 0 1123 794" xmlns="http://www.w3.org/2000/svg">
  <rect x="16" y="16" width="1091" height="762" fill="none" stroke="#92702a" stroke-width="5" />
  <rect x="25" y="25" width="1073" height="744" fill="none" stroke="#d4af37" stroke-width="2.2" />
  <rect x="35" y="35" width="1053" height="724" fill="none" stroke="#92702a" stroke-width="1.5" />
  <rect x="44" y="44" width="1035" height="706" fill="none" stroke="#d4af37" stroke-width="1" stroke-dasharray="8 4" />
  <path d="M16 16 L84 16 L84 28 L34 28 L28 34 L28 84 L16 84 Z" fill="#d4af37" stroke="#785616" stroke-width="1.5" />
  <path d="M1107 16 L1039 16 L1039 28 L1089 28 L1095 34 L1095 84 L1107 84 Z" fill="#d4af37" stroke="#785616" stroke-width="1.5" />
  <path d="M16 778 L84 778 L84 766 L34 766 L28 760 L28 710 L16 710 Z" fill="#d4af37" stroke="#785616" stroke-width="1.5" />
  <path d="M1107 778 L1039 778 L1039 766 L1089 766 L1095 760 L1095 710 L1107 710 Z" fill="#d4af37" stroke="#785616" stroke-width="1.5" />
  <circle cx="42" cy="42" r="8" fill="#fef3c7" stroke="#92702a" stroke-width="2" />
  <circle cx="1081" cy="42" r="8" fill="#fef3c7" stroke="#92702a" stroke-width="2" />
  <circle cx="42" cy="752" r="8" fill="#fef3c7" stroke="#92702a" stroke-width="2" />
  <circle cx="1081" cy="752" r="8" fill="#fef3c7" stroke="#92702a" stroke-width="2" />
</svg>
`);

const SVG_MOLDURA_NAVAL_AZUL = encodeSvgDataUrl(`
<svg viewBox="0 0 1123 794" xmlns="http://www.w3.org/2000/svg">
  <rect x="14" y="14" width="1095" height="766" fill="none" stroke="#071b3b" stroke-width="8" />
  <rect x="26" y="26" width="1071" height="742" fill="none" stroke="#c9a227" stroke-width="2.5" />
  <rect x="34" y="34" width="1055" height="726" fill="none" stroke="#071b3b" stroke-width="1.5" />
  <polygon points="14,14 78,14 14,78" fill="#071b3b" />
  <polygon points="1109,14 1045,14 1109,78" fill="#071b3b" />
  <polygon points="14,780 78,780 14,716" fill="#071b3b" />
  <polygon points="1109,780 1045,780 1109,716" fill="#071b3b" />
  <circle cx="34" cy="34" r="6" fill="#c9a227" />
  <circle cx="1089" cy="34" r="6" fill="#c9a227" />
  <circle cx="34" cy="760" r="6" fill="#c9a227" />
  <circle cx="1089" cy="760" r="6" fill="#c9a227" />
</svg>
`);

const SVG_MOLDURA_VETORIAL_PREVIEW = encodeSvgDataUrl(`
<svg viewBox="0 0 280 198" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="268" height="186" fill="#ffffff" stroke="#52525b" stroke-width="2.5" />
  <rect x="13" y="13" width="254" height="172" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 3" />
  <rect x="19" y="19" width="242" height="160" fill="none" stroke="#52525b" stroke-width="1" />
  <circle cx="14" cy="14" r="6" fill="#e2e8f0" stroke="#52525b" stroke-width="1.5" />
  <circle cx="266" cy="14" r="6" fill="#e2e8f0" stroke="#52525b" stroke-width="1.5" />
  <circle cx="14" cy="184" r="6" fill="#e2e8f0" stroke="#52525b" stroke-width="1.5" />
  <circle cx="266" cy="184" r="6" fill="#e2e8f0" stroke="#52525b" stroke-width="1.5" />
  <ellipse cx="140" cy="184" rx="18" ry="6" fill="#e2e8f0" stroke="#52525b" stroke-width="1.5" />
</svg>
`);

const SVG_MOLDURA_SIMPLES_PREVIEW = encodeSvgDataUrl(`
<svg viewBox="0 0 280 198" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="264" height="182" fill="#ffffff" stroke="#071b3b" stroke-width="3" />
  <rect x="14" y="14" width="252" height="170" fill="none" stroke="#64748b" stroke-width="1" />
</svg>
`);

export const BUILTIN_CERTIFICATE_ASSETS: CertificateLibraryAsset[] = [
  // BRASÕES
  {
    id: 'builtin-brasao-gc-stp',
    name: 'Guarda Costeira — STP',
    category: 'brasao',
    url: '/assets/aistudio/imagem_01_2da3aec8.png',
    subtitle: 'Brasão oficial Guarda Costeira',
    source: 'builtin',
  },
  {
    id: 'builtin-brasao-manbrstp',
    name: 'Missão Naval Brasileira (MANBrSTP)',
    category: 'brasao',
    url: '/assets/aistudio/WhatsApp_Image_2026-02-11_at_22.02.18_8edf921e.jpeg',
    subtitle: 'Selo institucional da Missão Naval',
    source: 'builtin',
  },
  {
    id: 'builtin-brasao-marinha-padrao',
    name: 'Marinha do Brasil (Padrão)',
    category: 'brasao',
    url: SVG_MARINHA_CREST,
    subtitle: 'Brasão vetorial da Marinha do Brasil',
    source: 'builtin',
    isDefaultMarinhaCrest: true,
    defaultCaption: 'MARINHA DO BRASIL',
  },
  {
    id: 'builtin-brasao-ancora-dourada',
    name: 'Âncora Naval Dourada',
    category: 'brasao',
    url: SVG_ANCORA_DOURADA,
    subtitle: 'Brasão em azul naval e ouro',
    source: 'builtin',
  },
  {
    id: 'builtin-brasao-rosa-ventos',
    name: 'Rosa dos Ventos Naval',
    category: 'brasao',
    url: SVG_ROSA_DOS_VENTOS_CREST,
    subtitle: 'Insígnia náutica clássica',
    source: 'builtin',
  },

  // MARCAS D'ÁGUA
  {
    id: 'builtin-wm-manbrstp',
    name: "Marca d'Água MANBrSTP",
    category: 'marca_dagua',
    url: '/assets/aistudio/WhatsApp_Image_2026-02-11_at_22.02.18_8edf921e.jpeg',
    subtitle: 'Fundo padrão institucional da Frente',
    source: 'builtin',
  },
  {
    id: 'builtin-wm-gc-stp',
    name: "Marca d'Água Guarda Costeira",
    category: 'marca_dagua',
    url: '/assets/aistudio/imagem_01_2da3aec8.png',
    subtitle: 'Fundo padrão institucional do Verso',
    source: 'builtin',
  },
  {
    id: 'builtin-wm-rosa-ventos',
    name: 'Rosa dos Ventos Náutica',
    category: 'marca_dagua',
    url: SVG_WATERMARK_ROSA,
    subtitle: 'Vetorial monocromática de alta definição',
    source: 'builtin',
  },
  {
    id: 'builtin-wm-ancora-louros',
    name: 'Âncora Institucional',
    category: 'marca_dagua',
    url: SVG_WATERMARK_ANCORA,
    subtitle: 'Selo náutico centralizado vetorial',
    source: 'builtin',
  },

  // MOLDURAS
  {
    id: 'builtin-moldura-prateada-original',
    name: 'Moldura Prateada Clássica',
    category: 'moldura',
    url: '/assets/certificado-moldura-frente.png',
    subtitle: 'Moldura original com nó náutico',
    source: 'builtin',
    frameStyle: 'original',
  },
  {
    id: 'builtin-moldura-dourada',
    name: 'Moldura Dourada Clássica',
    category: 'moldura',
    url: SVG_MOLDURA_DOURADA,
    subtitle: 'Cantoneiras douradas e borda dupla',
    source: 'builtin',
    frameStyle: 'original',
  },
  {
    id: 'builtin-moldura-naval-azul',
    name: 'Moldura Azul Naval & Ouro',
    category: 'moldura',
    url: SVG_MOLDURA_NAVAL_AZUL,
    subtitle: 'Borda solene marinha com filete ouro',
    source: 'builtin',
    frameStyle: 'original',
  },
  {
    id: 'builtin-moldura-vetorial-nautica',
    name: 'Moldura Vetorial Náutica',
    category: 'moldura',
    url: SVG_MOLDURA_VETORIAL_PREVIEW,
    subtitle: 'Estilo vetorial parametrizável por cor',
    source: 'builtin',
    frameStyle: 'vetorial',
    defaultBorderColor: '#52525b',
  },
  {
    id: 'builtin-moldura-simples',
    name: 'Moldura Simples (Linha Limpa)',
    category: 'moldura',
    url: SVG_MOLDURA_SIMPLES_PREVIEW,
    subtitle: 'Borda dupla minimalista configurável',
    source: 'builtin',
    frameStyle: 'simples',
    defaultBorderColor: '#071b3b',
  },
];

export async function prepareUploadedAssetDataUrl(
  file: File,
  category: CertificateAssetCategory
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.readAsDataURL(file);
  });

  if (!rawDataUrl) return '';

  if (file.type === 'image/svg+xml' || rawDataUrl.startsWith('data:image/svg+xml')) {
    return rawDataUrl;
  }

  if (category === 'moldura') {
    return makeFrameCenterTransparent(rawDataUrl);
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const maxDim = 900;
        if (!w || !h || (w <= maxDim && h <= maxDim)) {
          resolve(rawDataUrl);
          return;
        }
        const ratio = Math.min(1, maxDim / Math.max(w, h));
        const targetW = Math.max(1, Math.round(w * ratio));
        const targetH = Math.max(1, Math.round(h * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

function getDownloadExtension(url: string, mimeType?: string): string {
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('png')) return 'png';
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.svg')) return 'svg';
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'jpg';
  if (cleanUrl.endsWith('.webp')) return 'webp';
  return 'png';
}

function slugifyFileName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'recurso-certificado'
  );
}

export async function downloadCertificateAsset(asset: CertificateLibraryAsset): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !asset.url) {
    return;
  }

  let blob: Blob;
  let ext: string;

  if (asset.url.startsWith('data:')) {
    const commaIdx = asset.url.indexOf(',');
    const meta = commaIdx >= 0 ? asset.url.slice(5, commaIdx) : '';
    const dataPart = commaIdx >= 0 ? asset.url.slice(commaIdx + 1) : '';
    const mimeMatch = meta.match(/^([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    ext = getDownloadExtension(asset.url, mimeType);

    if (meta.includes(';base64')) {
      const binary = atob(dataPart);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: mimeType });
    } else {
      const decoded = decodeURIComponent(dataPart);
      blob = new Blob([decoded], { type: mimeType });
    }
  } else {
    const response = await fetch(asset.url);
    if (!response.ok) {
      throw new Error('Não foi possível baixar o arquivo selecionado.');
    }
    const fetchedBlob = await response.blob();
    ext = getDownloadExtension(asset.url, fetchedBlob.type);
    blob = fetchedBlob;
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${slugifyFileName(asset.name)}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export function extractTemplateAssetsForLibrary(
  savedTemplates: Array<{ id: string; template_data: CertificateTemplateConfig }>,
  existingUrls: Set<string>
): CertificateLibraryAsset[] {
  const out: CertificateLibraryAsset[] = [];
  const seenUrls = new Set<string>(existingUrls);

  for (const rec of savedTemplates || []) {
    const td = rec?.template_data;
    if (!td || (td as any).__isAssetLibrary) continue;
    const modelLabel = td.nomeModelo || 'Modelo Salvo';

    const candidates: Array<{
      url?: string;
      category: CertificateAssetCategory;
      label: string;
    }> = [
      { url: td.logoEsquerdaUrl, category: 'brasao', label: `Brasão Esq. (${modelLabel})` },
      { url: td.logoCentroUrl, category: 'brasao', label: `Brasão Centro (${modelLabel})` },
      { url: td.logoDireitaUrl, category: 'brasao', label: `Brasão Dir. (${modelLabel})` },
      { url: td.marcaDaguaFrenteUrl, category: 'marca_dagua', label: `Marca Frente (${modelLabel})` },
      { url: td.marcaDaguaVersoUrl, category: 'marca_dagua', label: `Marca Verso (${modelLabel})` },
      { url: td.molduraFrenteUrl, category: 'moldura', label: `Moldura (${modelLabel})` },
    ];

    candidates.forEach((c, idx) => {
      const clean = (c.url || '').trim();
      if (!clean || seenUrls.has(clean)) return;
      seenUrls.add(clean);
      out.push({
        id: `tpl-${rec.id}-${c.category}-${idx}`,
        name: c.label,
        category: c.category,
        url: clean,
        subtitle: 'Extraído de modelo salvo',
        source: 'template',
        ...(c.category === 'moldura' ? { frameStyle: 'original' as const } : {}),
      });
    });
  }

  return out;
}
