/**
 * Automatic WCAG Luminance Engine & Color Manipulation Utilities
 */

/**
 * Calculates standard WCAG relative luminance according to WCAG 2.1 specifications (0 = darkest, 1 = lightest).
 */
export function getRelativeLuminance(hexStr: string): number {
  const norm = normalizeHex(hexStr) || '#000000';
  const hex = norm.replace('#', '');
  const r = (parseInt(hex.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(hex.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(hex.substring(4, 6), 16) || 0) / 255;

  const sR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const sG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const sB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

export const calculateWcagText = (bgHex: string, threshold = 0.35): string => {
  if (!bgHex || bgHex.length < 6) return '#ffffff';
  const L = getRelativeLuminance(bgHex);
  return L > threshold ? '#0f172a' : '#ffffff';
};

/**
 * Normalizes a hex string (e.g. 'fff' -> '#FFFFFF', '#0a0d1a' -> '#0A0D1A').
 */
export function normalizeHex(input: string): string | null {
  if (!input) return null;
  let val = input.trim();
  if (val.startsWith('#')) val = val.substring(1);
  if (val.length === 3) {
    val = val.split('').map((c) => c + c).join('');
  }
  if (/^[0-9a-fA-F]{6}$/.test(val)) {
    return `#${val.toUpperCase()}`;
  }
  return null;
}

/**
 * Converts a hex code to an RGBA string with the given alpha (0 to 1).
 */
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeHex(hex) || '#000000';
  const clean = normalized.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Converts HSL values to a Hex color string.
 */
export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/**
 * Converts a Hex color string to HSL { h, s, l }.
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = normalizeHex(hex) || '#000000';
  const clean = normalized.replace('#', '');
  const r = (parseInt(clean.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(clean.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(clean.substring(4, 6), 16) || 0) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Converts a Hex color string to HWB (Hue, Whiteness, Blackness) percentages.
 * Whiteness (0-100%): White level / tint
 * Blackness (0-100%): Black level / shade
 */
export function hexToHwb(hex: string): { h: number; w: number; b: number } {
  const normalized = normalizeHex(hex) || '#000000';
  const clean = normalized.replace('#', '');
  const r = (parseInt(clean.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(clean.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(clean.substring(4, 6), 16) || 0) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const w = min;
  const blk = 1 - max;

  let h = 0;
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    w: Math.round(w * 100),
    b: Math.round(blk * 100),
  };
}

/**
 * Converts HWB (Hue, Whiteness %, Blackness %) to a Hex color string.
 */
export function hwbToHex(h: number, w: number, b: number): string {
  const wNorm = Math.max(0, Math.min(100, w)) / 100;
  const bNorm = Math.max(0, Math.min(100, b)) / 100;

  // If Whiteness + Blackness >= 1, color is achromatic gray
  if (wNorm + bNorm >= 1) {
    const grayVal = Math.round((wNorm / (wNorm + bNorm)) * 255);
    const hexPart = Math.min(255, Math.max(0, grayVal)).toString(16).padStart(2, '0');
    return `#${hexPart}${hexPart}${hexPart}`.toUpperCase();
  }

  // Pure hue RGB calculation (v=1, s=1)
  const hNorm = ((h % 360) + 360) % 360;
  const hPrime = hNorm / 60;
  const i = Math.floor(hPrime);
  const f = hPrime - i;

  let rPure = 0;
  let gPure = 0;
  let bPure = 0;

  switch (i) {
    case 0: rPure = 1; gPure = f; bPure = 0; break;
    case 1: rPure = 1 - f; gPure = 1; bPure = 0; break;
    case 2: rPure = 0; gPure = 1; bPure = f; break;
    case 3: rPure = 0; gPure = 1 - f; bPure = 1; break;
    case 4: rPure = f; gPure = 0; bPure = 1; break;
    default: rPure = 1; gPure = 0; bPure = 1 - f; break;
  }

  const factor = 1 - wNorm - bNorm;
  const r = Math.round((rPure * factor + wNorm) * 255);
  const g = Math.round((gPure * factor + wNorm) * 255);
  const bVal = Math.round((bPure * factor + wNorm) * 255);

  const toHex = (num: number) => Math.min(255, Math.max(0, num)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(bVal)}`.toUpperCase();
}
