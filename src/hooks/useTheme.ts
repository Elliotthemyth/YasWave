import { useState, useEffect, useCallback } from 'react';
import { UserPreferences, DEFAULT_PREFERENCES, AppTheme, AccentColor, UIDensity } from '../types/settings';
import { defaultRepository } from '../services/storage/libraryRepository';
import { APP_CONFIG } from '../config/appConfig';

export function useTheme() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    defaultRepository.getPreferences().then((prefs) => {
      setPreferences(prefs);
      setIsLoaded(true);
    });
  }, []);

  // Sync DOM classes and CSS variables whenever preferences change
  useEffect(() => {
    if (!isLoaded) return;

    const root = document.documentElement;
    // Remove previous theme classes
    root.classList.remove('dark', 'theme-light', 'theme-oled');

    if (preferences.theme === 'light') {
      root.classList.add('theme-light');
    } else if (preferences.theme === 'oled') {
      root.classList.add('dark', 'theme-oled');
    } else {
      root.classList.add('dark');
    }

    // Set accent color tokens
    const accent = APP_CONFIG.accentColors[preferences.accentColor] || APP_CONFIG.accentColors.brand;
    root.style.setProperty('--accent-primary', accent.primary);
    root.style.setProperty('--accent-hover', accent.hover);
    root.style.setProperty('--accent-glow', accent.glow);
  }, [preferences.theme, preferences.accentColor, isLoaded]);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      defaultRepository.savePreferences(next).catch(console.error);
      return next;
    });
  }, []);

  const setTheme = useCallback((theme: AppTheme) => updatePreferences({ theme }), [updatePreferences]);
  const setAccentColor = useCallback((accentColor: AccentColor) => updatePreferences({ accentColor }), [updatePreferences]);
  const setDensity = useCallback((density: UIDensity) => updatePreferences({ density }), [updatePreferences]);

  const activeAccent = APP_CONFIG.accentColors[preferences.accentColor] || APP_CONFIG.accentColors.brand;

  return {
    preferences,
    updatePreferences,
    setTheme,
    setAccentColor,
    setDensity,
    activeAccent,
    isLoaded,
  };
}
