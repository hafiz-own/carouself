'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';
import sodium from 'libsodium-wrappers-sumo';
import { initCrypto, deriveMasterKey, deriveAuthKey, deriveEncKey, decryptDEK } from '@/lib/crypto/core';

import { useEncryption } from '@/lib/crypto/EncryptionContext';
import { toast } from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export default function LoginPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();
  const { setEncKey } = useEncryption();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const parsed = loginSchema.safeParse({ email, password });
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

      // 2. Fetch the salt and encrypted DEK
      const { salt: hexSalt, encryptedDek, dekNonce } = await utils.client.auth.getSalt.query({ email });
      const saltBytes = sodium.from_hex(hexSalt);

      // 3. Client-side cryptography
      const masterKey = await deriveMasterKey(password, saltBytes);
      const authKeyBytes = deriveAuthKey(masterKey);
      const kek = deriveEncKey(masterKey);
      
      const dekBytes = decryptDEK(
        sodium.from_hex(encryptedDek),
        sodium.from_hex(dekNonce),
        kek
      );

      // Store DEK securely in memory context
      setEncKey(dekBytes);

      // 4. Send auth key to server to login
      await loginMutation.mutateAsync({
        email,
        authKey: sodium.to_hex(authKeyBytes)
      });

      toast.success("Logged in successfully!");
      // 5. Navigate to journal
      router.push('/journal');

    } catch (err: any) {
      // Show generic error for invalid credentials or specific error for rate limit
      const message = err.message || 'Invalid credentials';
      setErrors({ general: message });
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-950 dark:text-neutral-50 flex flex-col items-center justify-center p-6 selection:bg-amber-500/30">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">
            Welcome back
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm">
            Unlock your private journal
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
                placeholder="Enter your master password"
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
              <span className="animate-pulse">Unlocking journal...</span>
            ) : (
              <span>Unlock Journal</span>
            )}
          </button>
        </form>
        
        <p className="text-center text-xs text-neutral-500">
          Your entries are decrypted entirely on your device.
        </p>
      </div>
    </div>
  );
}
