'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface EncryptionContextType {
  encKey: Uint8Array | null;
  setEncKey: (key: Uint8Array | null) => void;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const [encKey, setEncKey] = useState<Uint8Array | null>(null);

  // Auto-Lock Logic
  useEffect(() => {
    if (!encKey) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      const lockSetting = window.localStorage.getItem('autoLock') || 'never';
      if (lockSetting !== 'never') {
        const minutes = parseInt(lockSetting, 10);
        if (!isNaN(minutes)) {
          timeoutId = setTimeout(() => {
            setEncKey(null);
            console.log('Vault auto-locked due to inactivity');
          }, minutes * 60 * 1000);
        }
      }
    };

    const handleActivity = () => resetTimer();
    const handleSettingsChange = () => resetTimer();

    // Initial setup
    resetTimer();

    // Listeners
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('settings_updated', handleSettingsChange);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('settings_updated', handleSettingsChange);
    };
  }, [encKey]);

  return (
    <EncryptionContext.Provider value={{ encKey, setEncKey }}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryption() {
  const context = useContext(EncryptionContext);
  if (context === undefined) {
    throw new Error('useEncryption must be used within an EncryptionProvider');
  }
  return context;
}
