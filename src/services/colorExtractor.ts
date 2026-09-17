import { ColorPalette } from '../types/player';

const DEFAULT_PALETTE: ColorPalette = {
  primary: '#F472B6', // Bright Rose Pink
  secondary: '#FB923C', // Vivid Tangerine
  darkMuted: '#3B122D',
  accent: '#FFFFFF',
  background: '#050507',
};

/**
 * Extracts a vibrant 4-color palette from an image URL using HTML5 Canvas
 */
export async function extractPaletteFromImage(imageUrl?: string): Promise<ColorPalette> {
  if (!imageUrl) return DEFAULT_PALETTE;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(DEFAULT_PALETTE);

        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        const imageData = ctx.getImageData(0, 0, 64, 64).data;
        const colorCounts: Record<string, { r: number; g: number; b: number; count: number; sat: number; lum: number }> = {};

        // Sample pixels
        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];

          // Skip pure black / pure white
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lum = (max + min) / 510;
          const sat = max === 0 ? 0 : (max - min) / max;

          // Round to quantize
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;

          if (!colorCounts[key]) {
            colorCounts[key] = { r, g, b, count: 0, sat, lum };
          }
          colorCounts[key].count++;
        }

        const sortedColors = Object.values(colorCounts).sort((a, b) => {
          // Weight towards vibrant/saturated tones
          const scoreA = a.count * (1 + a.sat * 2) * (a.lum > 0.15 && a.lum < 0.85 ? 1.5 : 0.5);
          const scoreB = b.count * (1 + b.sat * 2) * (b.lum > 0.15 && b.lum < 0.85 ? 1.5 : 0.5);
          return scoreB - scoreA;
        });

        if (sortedColors.length === 0) return resolve(DEFAULT_PALETTE);

        const top = sortedColors[0];
        const second = sortedColors[1] || top;
        const third = sortedColors[2] || second;

        const rgbToHex = (r: number, g: number, b: number) =>
          `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;

        const primary = rgbToHex(top.r, top.g, top.b);
        const secondary = rgbToHex(second.r, second.g, second.b);
        const darkMuted = rgbToHex(
          Math.floor(third.r * 0.35),
          Math.floor(third.g * 0.35),
          Math.floor(third.b * 0.35)
        );

        resolve({
          primary,
          secondary,
          darkMuted,
          accent: '#FFFFFF',
          background: '#060407',
        });
      } catch {
        resolve(DEFAULT_PALETTE);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_PALETTE);
    };
  });
}
