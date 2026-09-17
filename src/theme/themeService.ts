import { calculateWcagText, normalizeHex } from './colorUtils';

export interface BespokeThemeConfig {
  colors: [string, string, string, string];
  mode: 'auto' | 'manual';
  textOnAccent?: string;
  textOffAccent?: string;
  textPrimary?: string;
}

export const OBLIVION_BESPOKE_CONFIG_KEY = 'OBLIVION_BESPOKE_CONFIG';
export const LEGACY_BESPOKE_COLORS_KEY = 'oblivion_bespoke_colors';

export const DEFAULT_BESPOKE_COLORS: [string, string, string, string] = [
  '#0A0D1A',
  '#FF007F',
  '#8B5CF6',
  '#00F0FF',
];

export const DEFAULT_BESPOKE_CONFIG: BespokeThemeConfig = {
  colors: [...DEFAULT_BESPOKE_COLORS],
  mode: 'auto',
  textOnAccent: '#FFFFFF',
  textOffAccent: '#FFFFFF',
  textPrimary: '#FFFFFF',
};

/**
 * Retrieve saved bespoke configuration from localStorage with graceful fallback
 */
export function getBespokeConfig(): BespokeThemeConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_BESPOKE_CONFIG };

  try {
    const raw = localStorage.getItem(OBLIVION_BESPOKE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.colors) && parsed.colors.length >= 4) {
        return {
          colors: [
            normalizeHex(parsed.colors[0]) || DEFAULT_BESPOKE_COLORS[0],
            normalizeHex(parsed.colors[1]) || DEFAULT_BESPOKE_COLORS[1],
            normalizeHex(parsed.colors[2]) || DEFAULT_BESPOKE_COLORS[2],
            normalizeHex(parsed.colors[3]) || DEFAULT_BESPOKE_COLORS[3],
          ],
          mode: parsed.mode === 'manual' ? 'manual' : 'auto',
          textOnAccent: normalizeHex(parsed.textOnAccent) || '#FFFFFF',
          textOffAccent: normalizeHex(parsed.textOffAccent) || '#FFFFFF',
          textPrimary: normalizeHex(parsed.textPrimary) || '#FFFFFF',
        };
      }
    }

    // Check legacy storage key
    const legacy = localStorage.getItem(LEGACY_BESPOKE_COLORS_KEY);
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length >= 4) {
        return {
          ...DEFAULT_BESPOKE_CONFIG,
          colors: [
            normalizeHex(parsedLegacy[0]) || DEFAULT_BESPOKE_COLORS[0],
            normalizeHex(parsedLegacy[1]) || DEFAULT_BESPOKE_COLORS[1],
            normalizeHex(parsedLegacy[2]) || DEFAULT_BESPOKE_COLORS[2],
            normalizeHex(parsedLegacy[3]) || DEFAULT_BESPOKE_COLORS[3],
          ],
        };
      }
    }
  } catch (err) {
    console.error('Failed to parse Bespoke theme configuration:', err);
  }

  return { ...DEFAULT_BESPOKE_CONFIG };
}

/**
 * Real-time DOM CSS variable injection
 * Maps the 4 colors and contrast tokens directly to root CSS variables
 */
export function applyBespokeCssVariables(
  configOrColors?: Partial<BespokeThemeConfig> | [string, string, string, string] | string[]
): BespokeThemeConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_BESPOKE_CONFIG };

  let bespokeConfig = getBespokeConfig();

  if (Array.isArray(configOrColors)) {
    bespokeConfig = {
      ...bespokeConfig,
      colors: [
        normalizeHex(configOrColors[0]) || bespokeConfig.colors[0],
        normalizeHex(configOrColors[1]) || bespokeConfig.colors[1],
        normalizeHex(configOrColors[2]) || bespokeConfig.colors[2],
        normalizeHex(configOrColors[3]) || bespokeConfig.colors[3],
      ],
    };
  } else if (configOrColors) {
    bespokeConfig = {
      ...bespokeConfig,
      ...configOrColors,
      colors: configOrColors.colors
        ? [
            normalizeHex(configOrColors.colors[0]) || bespokeConfig.colors[0],
            normalizeHex(configOrColors.colors[1]) || bespokeConfig.colors[1],
            normalizeHex(configOrColors.colors[2]) || bespokeConfig.colors[2],
            normalizeHex(configOrColors.colors[3]) || bespokeConfig.colors[3],
          ]
        : bespokeConfig.colors,
    };
  }

  const [c1, c2, c3, c4] = bespokeConfig.colors;

  // Set core 4-color palette tokens
  document.documentElement.style.setProperty('--bespoke-c1', c1);
  document.documentElement.style.setProperty('--bespoke-c2', c2);
  document.documentElement.style.setProperty('--bespoke-c3', c3);
  document.documentElement.style.setProperty('--bespoke-c4', c4);

  // Strictly limit button gradients to a clean 2-color transition using Color 1 & Color 2
  document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${c1}, ${c2})`);
  document.documentElement.style.setProperty('--bespoke-accent-gradient', `linear-gradient(135deg, ${c1}, ${c2})`);
  document.documentElement.style.setProperty('--accent-primary', c2);
  document.documentElement.style.setProperty('--accent-secondary', c3);

  // Determine text contrast mode
  const isAuto = bespokeConfig.mode === 'auto';
  const textOnAccent = isAuto ? calculateWcagText(c1) : (bespokeConfig.textOnAccent || calculateWcagText(c1));
  const textOffAccent = isAuto ? calculateWcagText(c3) : (bespokeConfig.textOffAccent || calculateWcagText(c3));
  const textPrimary = isAuto ? calculateWcagText(c4) : (bespokeConfig.textPrimary || calculateWcagText(c4));

  // Inject text color variables into root
  document.documentElement.style.setProperty('--text-on-accent', textOnAccent);
  document.documentElement.style.setProperty('--text-off-accent', textOffAccent);
  document.documentElement.style.setProperty('--text-primary', textPrimary);

  // Additional helper variables
  document.documentElement.style.setProperty('--accent-contrast-text', textOnAccent);

  return {
    ...bespokeConfig,
    textOnAccent,
    textOffAccent,
    textPrimary,
  };
}

/**
 * Persist Bespoke config to localStorage and update DOM variables immediately
 */
export function saveBespokeConfig(newConfig: Partial<BespokeThemeConfig>): BespokeThemeConfig {
  const current = getBespokeConfig();
  const merged: BespokeThemeConfig = {
    ...current,
    ...newConfig,
    colors: newConfig.colors
      ? [
          normalizeHex(newConfig.colors[0]) || current.colors[0],
          normalizeHex(newConfig.colors[1]) || current.colors[1],
          normalizeHex(newConfig.colors[2]) || current.colors[2],
          normalizeHex(newConfig.colors[3]) || current.colors[3],
        ]
      : current.colors,
    mode: newConfig.mode !== undefined ? newConfig.mode : current.mode,
    textOnAccent: newConfig.textOnAccent || current.textOnAccent,
    textOffAccent: newConfig.textOffAccent || current.textOffAccent,
    textPrimary: newConfig.textPrimary || current.textPrimary,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(OBLIVION_BESPOKE_CONFIG_KEY, JSON.stringify(merged));
      localStorage.setItem(LEGACY_BESPOKE_COLORS_KEY, JSON.stringify(merged.colors));
    } catch (e) {
      console.error('Failed to persist Bespoke theme configuration:', e);
    }
  }

  const effective = applyBespokeCssVariables(merged);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('oblivion_bespoke_config_updated', { detail: effective })
    );
    window.dispatchEvent(
      new CustomEvent('oblivion_bespoke_colors_updated', { detail: effective.colors })
    );
  }

  return effective;
}

/**
 * Legacy wrapper: get colors
 */
export function getBespokeColors(): [string, string, string, string] {
  return getBespokeConfig().colors;
}

/**
 * Legacy wrapper: save colors
 */
export function saveBespokeColors(
  colors: [string, string, string, string] | string[]
): [string, string, string, string] {
  const updated = saveBespokeConfig({
    colors: [colors[0], colors[1], colors[2], colors[3]],
  });
  return updated.colors;
}
