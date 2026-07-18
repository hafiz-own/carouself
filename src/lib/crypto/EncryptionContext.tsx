'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EncryptionContextType {
  encKey: Uint8Array | null;
  setEncKey: (key: Uint8Array | null) => void;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const [encKey, setEncKey] = useState<Uint8Array | null>(null);

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
