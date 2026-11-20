'use client';

const processedFrameCache = new Map<string, string>();
const inFlightFrameCache = new Map<string, Promise<string>>();

function isNearWhitePixel(r: number, g: number, b: number): boolean {
  const minC = Math.min(r, g, b);
  const maxC = Math.max(r, g, b);
  return minC >= 232 && maxC - minC <= 24;
}

/**
 * Converts the central white area (and any outer white margin connected to corners)
 * of an imported or base certificate frame image into true transparent alpha (0),
 * preserving dark/colored frame ornaments so watermarks behind the frame remain visible
 * in both live preview and PDF/image export (html2canvas).
 */
export function makeFrameCenterTransparent(src: string): Promise<string> {
  if (!src || typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(src);
  }

  const cached = processedFrameCache.get(src);
  if (cached) return Promise.resolve(cached);

  const inFlight = inFlightFrameCache.get(src);
  if (inFlight) return inFlight;

  const task = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        if (!origW || !origH) {
          resolve(src);
          return;
        }

        // Keep high print quality while capping extreme uploads for fast pixel processing
        const maxDim = 2200;
        const scaleRatio = Math.min(1, maxDim / Math.max(origW, origH));
        const w = Math.max(1, Math.round(origW * scaleRatio));
        const h = Math.max(1, Math.round(origH * scaleRatio));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // Seed points inside the central interior region + outer corners
        const seeds: Array<[number, number]> = [];
        const centerFracs = [0.35, 0.42, 0.5, 0.58, 0.65];
        for (const fx of centerFracs) {
          for (const fy of centerFracs) {
            seeds.push([Math.round(w * fx), Math.round(h * fy)]);
          }
        }
        seeds.push([0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]);

        // Quick check: does any seed need white-to-transparent knockout?
        let hasOpaqueWhiteSeed = false;
        for (const [sx, sy] of seeds) {
          const idx = (sy * w + sx) * 4;
          const a = data[idx + 3];
          if (a > 20 && isNearWhitePixel(data[idx], data[idx + 1], data[idx + 2])) {
            hasOpaqueWhiteSeed = true;
            break;
          }
        }

        if (!hasOpaqueWhiteSeed) {
          // Center and corners are already transparent
          processedFrameCache.set(src, src);
          resolve(src);
          return;
        }

        const total = w * h;
        const visited = new Uint8Array(total);
        const cleared = new Uint8Array(total);
        const queue = new Int32Array(total);
        let head = 0;
        let tail = 0;

        const tryEnqueue = (x: number, y: number) => {
          if (x < 0 || x >= w || y < 0 || y >= h) return;
          const pos = y * w + x;
          if (visited[pos]) return;
          const idx = pos * 4;
          const a = data[idx + 3];
          if (a <= 15 || isNearWhitePixel(data[idx], data[idx + 1], data[idx + 2])) {
            visited[pos] = 1;
            queue[tail++] = pos;
          }
        };

        for (const [sx, sy] of seeds) {
          tryEnqueue(sx, sy);
        }

        while (head < tail) {
          const pos = queue[head++];
          const idx = pos * 4;
          data[idx + 3] = 0;
          cleared[pos] = 1;

          const x = pos % w;
          const y = (pos - x) / w;

          if (x > 0) tryEnqueue(x - 1, y);
          if (x + 1 < w) tryEnqueue(x + 1, y);
          if (y > 0) tryEnqueue(x, y - 1);
          if (y + 1 < h) tryEnqueue(x, y + 1);
        }

        // Smooth 1px anti-aliased fringe immediately bordering the cleared white area
        for (let pos = 0; pos < total; pos++) {
          if (cleared[pos]) continue;
          const idx = pos * 4;
          if (data[idx + 3] <= 15) continue;

          const x = pos % w;
          const y = (pos - x) / w;
          const touchesCleared =
            (x > 0 && cleared[pos - 1]) ||
            (x + 1 < w && cleared[pos + 1]) ||
            (y > 0 && cleared[pos - w]) ||
            (y + 1 < h && cleared[pos + w]);

          if (!touchesCleared) continue;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const minC = Math.min(r, g, b);
          const maxC = Math.max(r, g, b);
          if (minC >= 200 && maxC - minC <= 32) {
            const alphaFactor = Math.max(0, Math.min(1, (240 - minC) / 40));
            data[idx + 3] = Math.round(data[idx + 3] * alphaFactor);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const resultUrl = canvas.toDataURL('image/png');
        processedFrameCache.set(src, resultUrl);
        resolve(resultUrl);
      } catch {
        resolve(src);
      }
    };

    img.onerror = () => resolve(src);
    img.src = src;
  }).finally(() => {
    inFlightFrameCache.delete(src);
  });

  inFlightFrameCache.set(src, task);
  return task;
}

export function getCachedTransparentFrameSrc(src: string): string | undefined {
  return processedFrameCache.get(src);
}
