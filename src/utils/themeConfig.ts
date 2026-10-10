import { FULL_APP_DESIGNS, FULL_APP_DESIGNS_LIST, FullAppDesignConfig, getFullAppDesign } from './appDesignThemes';
import { ThemeRegistry, ThemeMeta } from './themeMap';
import { ThemePreset, FullAppDesignId } from '../types';

export {
  FULL_APP_DESIGNS,
  FULL_APP_DESIGNS_LIST,
  ThemeRegistry,
  getFullAppDesign,
};

export type {
  FullAppDesignConfig,
  ThemeMeta,
  ThemePreset,
  FullAppDesignId,
};

export const THEMES_LIST = FULL_APP_DESIGNS_LIST;
export const HARD_ROCK_THEME_ID: FullAppDesignId = 'hard-rock';
export const SUGAR_TIME_JAZZ_THEME_ID: FullAppDesignId = 'sugar-time-jazz';
export const BESPOKE_THEME_ID: FullAppDesignId = 'bespoke';
