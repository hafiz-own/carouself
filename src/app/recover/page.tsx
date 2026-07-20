'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';
import sodium from 'libsodium-wrappers-sumo';
import { initCrypto, generateSalt, deriveMasterKey, deriveAuthKey, deriveEncKey, encryptDEK, decryptDEK } from '@/lib/crypto/core';

import { useEncryption } from '@/lib/crypto/EncryptionContext';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const recoverSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  recoveryKey: z.string().min(64, 'Recovery Key must be 64 characters long').max(64),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
});

export default function RecoverPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const recoverMutation = trpc.auth.recoverAccount.useMutation();
  const { setEncKey } = useEncryption();

  const [email, setEmail] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; recoveryKey?: string; newPassword?: string; general?: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const parsed = recoverSchema.safeParse({ email, recoveryKey, newPassword });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err: z.ZodIssue) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Initialize crypto
      await initCrypto();

      // 2. Fetch the old salt and recovery encrypted DEK
      const { salt: hexSalt, recoveryEncryptedDek, recoveryDekNonce } = await utils.client.auth.getSalt.query({ email });
      
      if (!recoveryEncryptedDek || !recoveryDekNonce) {
        throw new Error('Recovery data is missing for this account.');
      }

      // Yield to the event loop
      await new Promise(resolve => setTimeout(resolve, 50));

      // 3. Client-side cryptography - Decrypt DEK using old Recovery Key
      const oldRecoveryKeyBytes = sodium.from_hex(recoveryKey);
      let dekBytes;
      try {
        dekBytes = decryptDEK(
          sodium.from_hex(recoveryEncryptedDek),
          sodium.from_hex(recoveryDekNonce),
          oldRecoveryKeyBytes // We used the Recovery Key as the KEK!
        );
      } catch (e) {
        throw new Error('Invalid Recovery Key.');
      }

      // 4. Generate new keys using new Password
      const newSaltBytes = generateSalt();
      const newMasterKey = await deriveMasterKey(newPassword, newSaltBytes);
      const newAuthKeyBytes = deriveAuthKey(newMasterKey);
      const newKek = deriveEncKey(newMasterKey);
      
      // Store DEK securely in memory context
      setEncKey(dekBytes);

      // Re-encrypt existing DEK with new KEK
      const { ciphertext: newEncryptedDekBytes, nonce: newDekNonceBytes } = encryptDEK(dekBytes, newKek);

      // 5. Generate NEW Recovery Key
      const newRecoveryKeyBytes = sodium.randombytes_buf(32);
      const rawNewRecoveryKey = sodium.to_hex(newRecoveryKeyBytes);
      
      const newRecoveryKeyHashBytes = sodium.crypto_hash_sha256(newRecoveryKeyBytes);
      const newRecoveryKeyHashHex = sodium.to_hex(newRecoveryKeyHashBytes);

      // Encrypt DEK with NEW Recovery Key
      const { ciphertext: newRecoveryEncryptedDekBytes, nonce: newRecoveryDekNonceBytes } = encryptDEK(dekBytes, newRecoveryKeyBytes);

      // Hash OLD recovery key for server to verify it
      const oldRecoveryKeyHashBytes = sodium.crypto_hash_sha256(oldRecoveryKeyBytes);
      const oldRecoveryKeyHashHex = sodium.to_hex(oldRecoveryKeyHashBytes);

      // 6. Send recovery request to server
      await recoverMutation.mutateAsync({
        email,
        recoveryKeyHash: oldRecoveryKeyHashHex,
        salt: sodium.to_hex(newSaltBytes),
        authKey: sodium.to_hex(newAuthKeyBytes),
        encryptedDek: sodium.to_hex(newEncryptedDekBytes),
        dekNonce: sodium.to_hex(newDekNonceBytes),
        newRecoveryKeyHash: newRecoveryKeyHashHex,
        recoveryEncryptedDek: sodium.to_hex(newRecoveryEncryptedDekBytes),
        recoveryDekNonce: sodium.to_hex(newRecoveryDekNonceBytes)
      });

      // 7. Show new recovery key
      setNewRecoveryKey(rawNewRecoveryKey);
      toast.success("Account recovered successfully!");

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Recovery failed. Invalid recovery key.';
      setErrors({ general: message });
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcknowledgeRecoveryKey = () => {
    setNewRecoveryKey(null);
    router.push('/journal');
  };

  if (newRecoveryKey) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-950 dark:text-neutral-50 flex flex-col items-center justify-center p-6 selection:bg-amber-500/30">
        <div className="max-w-xl w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-red-400">Save Your NEW Recovery Key</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
              Your account has been recovered and your master password changed.
              This is your <strong>new</strong> recovery key. The old one is no longer valid.
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl font-mono text-center break-all select-all text-amber-300 shadow-inner">
            {newRecoveryKey}
          </div>

          <button
            onClick={handleAcknowledgeRecoveryKey}
            className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-900 dark:text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98]"
          >
            I have saved this NEW key in a safe place
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-950 dark:text-neutral-50 flex flex-col items-center justify-center p-6 selection:bg-amber-500/30">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">
            Recover Account
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm">
            Use your Recovery Key to regain access to your journal and set a new master password.
          </p>
        </div>

        <form suppressHydrationWarning onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-8 space-y-6">
          {errors.general && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2" suppressHydrationWarning>
              <label htmlFor="email" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none transition-all"
              />
              {errors.email && <p className="text-red-400 text-xs ml-1">{errors.email}</p>}
            </div>

            <div className="space-y-2" suppressHydrationWarning>
              <label htmlFor="recoveryKey" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Recovery Key</label>
              <input
                id="recoveryKey"
                type="text"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="Enter your 64-character recovery key"
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none transition-all font-mono text-sm"
              />
              {errors.recoveryKey && <p className="text-red-400 text-xs ml-1">{errors.recoveryKey}</p>}
            </div>

            <div className="space-y-2 relative" suppressHydrationWarning>
              <label htmlFor="newPassword" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">New Master Password</label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a new master password"
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 pr-12 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-1 rounded-md"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.newPassword && <p className="text-red-400 text-xs ml-1">{errors.newPassword}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-neutral-900 dark:text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <span className="animate-pulse">Recovering Account...</span>
            ) : (
              <span>Recover Account</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
