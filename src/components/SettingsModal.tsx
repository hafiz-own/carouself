'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, Moon, Sun, Monitor } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { decryptEntry, generateSalt, deriveMasterKey, deriveAuthKey, deriveEncKey, encryptDEK, decryptDEK } from '@/lib/crypto/core';
import sodium from 'libsodium-wrappers-sumo';
import { toast } from 'react-hot-toast';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ConfirmDialog } from './ui/Dialogs';
import { convert } from 'html-to-text';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  encKey: Uint8Array | null;
}

export function SettingsModal({ isOpen, onClose, encKey }: SettingsModalProps) {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('system');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: isOpen });
  const trpcUtils = trpc.useUtils();
  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation();
  const changePasswordMutation = trpc.auth.changePassword.useMutation();

  useEffect(() => {
    const localTheme = window.localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (localTheme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(localTheme);
    }
  }, []);

  useEffect(() => {
    // Basic theme toggle logic
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('theme', 'light');
    } else {
      // System
      window.localStorage.removeItem('theme');
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!encKey) {
      toast.error("Encryption key not found. Please log in again.");
      return;
    }

    setIsExporting(true);
    try {
      // Fetch all encrypted entries
      const entries = await trpcUtils.entry.getAllEntries.fetch();

      if (entries.length === 0) {
        toast.error("No entries to export.");
        setIsExporting(false);
        return;
      }

      const zip = new JSZip();

      // Decrypt all entries and add to zip
      entries.forEach(entry => {
        try {
          const ciphertextBytes = sodium.from_hex(entry.ciphertext);
          const nonceBytes = sodium.from_hex(entry.nonce);
          const plaintext = decryptEntry(ciphertextBytes, nonceBytes, encKey);

          let title = 'Untitled_Entry';
          let htmlContent = plaintext;

          try {
            const payload = JSON.parse(plaintext);
            if (payload.title) title = payload.title;
            if (payload.content) htmlContent = payload.content;
          } catch (e) {
            // legacy plain HTML
          }

          // Convert HTML to clean plain text
          const textContent = convert(htmlContent, { wordwrap: 130 });

          // Generate a clean file name
          const cleanTitle = title.trim().replace(/[^a-z0-9_-]/gi, '_') || 'Untitled';
          const filename = `${entry.date}_${cleanTitle}.txt`;

          zip.file(filename, textContent);
        } catch (e) {
          console.warn("Failed to decrypt an entry for export", e);
        }
      });

      // Generate the zip and trigger download
      const content = await zip.generateAsync({ type: 'blob' });
      const zipFilename = `Carouself_Export_${new Date().toISOString().split('T')[0]}.zip`;
      saveAs(content, zipFilename);

      toast.success("Journal securely exported as ZIP!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccountMutation.mutateAsync();
      toast.success("Account permanently deleted.");
      // Hard reload to clear memory context completely
      window.location.href = '/signup';
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete account.");
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError("New password must be at least 12 characters");
      return;
    }
    if (!me?.email || !encKey) {
      setPasswordError("Session state is incomplete. Please reload.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);

    try {
      // Fetch current salt & encrypted DEK to verify old password
      const { salt: hexSalt, encryptedDek, dekNonce } = await trpcUtils.client.auth.getSalt.query({ email: me.email });
      const oldSaltBytes = sodium.from_hex(hexSalt);

      const oldMasterKey = await deriveMasterKey(oldPassword, oldSaltBytes);
      const oldKek = deriveEncKey(oldMasterKey);

      // Verify old password by trying to decrypt the DEK
      try {
        decryptDEK(sodium.from_hex(encryptedDek), sodium.from_hex(dekNonce), oldKek);
      } catch (err) {
        throw new Error("Incorrect current password");
      }

      // Generate new cryptography
      const newSaltBytes = generateSalt();
      const newMasterKey = await deriveMasterKey(newPassword, newSaltBytes);
      const newAuthKeyBytes = deriveAuthKey(newMasterKey);
      const newKek = deriveEncKey(newMasterKey);

      // Encrypt the current DEK (encKey) with the NEW KEK
      const { ciphertext: newEncryptedDekBytes, nonce: newDekNonceBytes } = encryptDEK(encKey, newKek);

      const oldAuthKeyBytes = deriveAuthKey(oldMasterKey);

      await changePasswordMutation.mutateAsync({
        oldAuthKey: sodium.to_hex(oldAuthKeyBytes),
        newAuthKey: sodium.to_hex(newAuthKeyBytes),
        newSalt: sodium.to_hex(newSaltBytes),
        newEncryptedDek: sodium.to_hex(newEncryptedDekBytes),
        newDekNonce: sodium.to_hex(newDekNonceBytes)
      });

      toast.success("Password changed successfully!");
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      setPasswordError(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete Account"
        message="DANGER: Are you absolutely sure you want to delete your account? All your encrypted entries will be permanently destroyed. This cannot be undone."
        confirmText="Yes, Delete My Account"
        isDanger={true}
        onConfirm={confirmDeleteAccount}
        onClose={() => setIsDeleteConfirmOpen(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-[95vw] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">

        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">

          {/* Theme Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Appearance</h3>
            <div className="flex bg-neutral-50 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setTheme('system')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm rounded-lg transition-colors ${theme === 'system' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white shadow' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-300 dark:hover:text-neutral-100'}`}
              >
                <Monitor size={16} /> <span>System</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm rounded-lg transition-colors ${theme === 'light' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white shadow' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-300 dark:hover:text-neutral-100'}`}
              >
                <Sun size={16} /> <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm rounded-lg transition-colors ${theme === 'dark' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white shadow' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-300 dark:hover:text-neutral-100'}`}
              >
                <Moon size={16} /> <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Account & Security Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Account & Security</h3>
            
            <form onSubmit={handleChangePassword} className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4">
              <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Change Password</h4>
              
              {passwordError && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
                  {passwordError}
                </div>
              )}

              <input
                type="password"
                placeholder="Current Password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none"
              />
              <input
                type="password"
                placeholder="New Password (min 12 chars)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none"
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none"
              />
              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {isChangingPassword ? "Changing..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Data Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Data & Privacy</h3>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 hover:border-amber-500/50 hover:bg-amber-900/10 rounded-xl transition-all text-left group disabled:opacity-50"
            >
              <div>
                <div className="font-medium text-neutral-800 dark:text-neutral-200 group-hover:text-amber-400 transition-colors">Export Journal Data</div>
                <div className="text-xs text-neutral-500 mt-1">Decrypt and download all entries as a ZIP of .txt files.</div>
              </div>
              <Download size={20} className="text-neutral-500 group-hover:text-amber-400 transition-colors" />
            </button>

          </div>

          {/* Danger Zone */}
          <div className="space-y-3 pt-4 border-t border-red-900/30">
            <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider">Danger Zone</h3>

            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="w-full flex items-center justify-between p-4 bg-red-950/20 border border-red-900/30 hover:bg-red-900/40 rounded-xl transition-all text-left group disabled:opacity-50"
            >
              <div>
                <div className="font-medium text-red-400">Delete Account</div>
                <div className="text-xs text-red-500/70 mt-1">Permanently destroy all your data.</div>
              </div>
              <Trash2 size={20} className="text-red-500/50 group-hover:text-red-400 transition-colors" />
            </button>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}
