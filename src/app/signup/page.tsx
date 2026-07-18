'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';
import sodium from 'libsodium-wrappers-sumo';
import { initCrypto, generateSalt, deriveMasterKey, deriveAuthKey, deriveEncKey, generateDEK, encryptDEK } from '@/lib/crypto/core';

import { useEncryption } from '@/lib/crypto/EncryptionContext';
import { toast } from 'react-hot-toast';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters long')
});

export default function SignupPage() {
  const router = useRouter();
  const signupMutation = trpc.auth.signup.useMutation();
  const { setEncKey } = useEncryption();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Recovery key UI state
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: any = {};
      parsed.error.issues.forEach((err: any) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Initialize crypto
      await initCrypto();

      // 2. Client-side cryptography
      const saltBytes = generateSalt();
      const masterKey = await deriveMasterKey(password, saltBytes);
      const authKeyBytes = deriveAuthKey(masterKey);
      
      const kek = deriveEncKey(masterKey); // Use this as Key Encryption Key

      // Generate Data Encryption Key
      const dekBytes = generateDEK();
      
      // Store DEK in memory context (this is the key used for entries now!)
      setEncKey(dekBytes);

      // Encrypt DEK for storage
      const { ciphertext: encryptedDekBytes, nonce: dekNonceBytes } = encryptDEK(dekBytes, kek);

      // 3. Generate Recovery Key
      const recoveryKeyBytes = sodium.randombytes_buf(32);
      const rawRecoveryKey = sodium.to_hex(recoveryKeyBytes);
      
      // Hash the recovery key for the server
      const recoveryKeyHashBytes = sodium.crypto_hash_sha256(recoveryKeyBytes);
      const recoveryKeyHashHex = sodium.to_hex(recoveryKeyHashBytes);

      // 4. Send to server
      await signupMutation.mutateAsync({
        email,
        authKey: sodium.to_hex(authKeyBytes),
        salt: sodium.to_hex(saltBytes),
        encryptedDek: sodium.to_hex(encryptedDekBytes),
        dekNonce: sodium.to_hex(dekNonceBytes),
        recoveryKeyHash: recoveryKeyHashHex
      });

      // Show recovery key
      setRecoveryKey(rawRecoveryKey);
      toast.success("Account created securely!");

    } catch (err: any) {
      const msg = err.message || "Failed to create account. Email may be taken.";
      setErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcknowledgeRecoveryKey = () => {
    // Clear state and navigate to journal
    setRecoveryKey(null);
    router.push('/journal');
  };

  if (recoveryKey) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-950 dark:text-neutral-50 flex flex-col items-center justify-center p-6 selection:bg-amber-500/30">
        <div className="max-w-xl w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-red-400">Save Your Recovery Key</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
              This is the <strong>only</strong> time you will see this key. If you forget your master password, 
              this is the only way to recover your journal. We cannot recover it for you.
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-6 rounded-xl font-mono text-center break-all select-all text-amber-300 shadow-inner">
            {recoveryKey}
          </div>

          <button
            onClick={handleAcknowledgeRecoveryKey}
            className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-900 dark:text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98]"
          >
            I have saved this key in a safe place
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-950 dark:text-neutral-50 flex flex-col items-center justify-center p-6 selection:bg-amber-500/30">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">
            Join carouself
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm">
            Start your journey of self-care. End-to-end encrypted.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-8 space-y-6">
          {errors.general && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none transition-all"
              />
              {errors.email && <p className="text-red-400 text-xs ml-1">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 ml-1">Master Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 12 characters"
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none transition-all"
              />
              {errors.password && <p className="text-red-400 text-xs ml-1">{errors.password}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-neutral-900 dark:text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <span className="animate-pulse">Deriving keys securely...</span>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>
        
        <p className="text-center text-xs text-neutral-500">
          Your master password never leaves your device. We cannot recover it if you lose it.
        </p>

        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
          <Link href="/login" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-amber-600 dark:hover:text-amber-500 transition-colors">
            Already have a vault? <span className="font-semibold underline underline-offset-4 decoration-amber-500/50">Open it</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
