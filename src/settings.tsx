// Default value mirrors `DEFAULT_SETTINGS` so consumers always get a
// usable object — no "settings haven't loaded yet" branch needed. Real
// values land once App's Firestore snapshot resolves.

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type UserSettings } from './types';

const SettingsContext = createContext<UserSettings>(DEFAULT_SETTINGS);

export function SettingsProvider({
  value,
  children,
}: {
  value: UserSettings;
  children: ReactNode;
}) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): UserSettings {
  return useContext(SettingsContext);
}

export function weightUnitLabel(unit: UserSettings['weightUnit']): string {
  return unit;
}
