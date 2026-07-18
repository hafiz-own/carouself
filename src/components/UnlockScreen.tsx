'use client';

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useEncryption } from '@/lib/crypto/EncryptionContext';
import { initCrypto, deriveMasterKey, deriveEncKey, decryptDEK } from '@/lib/crypto/core';
import sodium from 'libsodium-wrappers-sumo';

interface UnlockScreenProps {
  email: string;
}

export function UnlockScreen({ email }: UnlockScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const utils = trpc.useUtils();
  const { setEncKey } = useEncryption();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Password is required");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await initCrypto();
      
      // Fetch salt and encrypted DEK from the server.
      const { salt: hexSalt, encryptedDek, dekNonce } = await utils.client.auth.getSalt.query({ email });
      const saltBytes = sodium.from_hex(hexSalt);

      const masterKey = await deriveMasterKey(password, saltBytes);
      const kek = deriveEncKey(masterKey);

      // Decrypt DEK
      const dekBytes = decryptDEK(
        sodium.from_hex(encryptedDek),
        sodium.from_hex(dekNonce),
        kek
      );

      setEncKey(dekBytes);

    } catch (err: any) {
      setError(err.message || "Failed to unlock journal");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-20 p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-neutral-950 dark:text-neutral-50">Locked Session</h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
          Your browser memory was cleared. Enter your master password to unlock your journal for {email}.
        </p>
      </div>

      <form onSubmit={handleUnlock} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Master Password"
            className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-neutral-900 dark:text-white font-medium py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)]"
        >
          {isProcessing ? "Unlocking..." : "Unlock"}
        </button>
      </form>
    </div>
  );
}
