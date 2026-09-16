/**
 * Automatic WCAG Luminance Engine & Color Manipulation Utilities
 */

export const calculateWcagText = (bgHex: string): string => {
  if (!bgHex || bgHex.length < 6) return '#ffffff';
  const hex = bgHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.52 ? '#0b0b0e' : '#ffffff';
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
