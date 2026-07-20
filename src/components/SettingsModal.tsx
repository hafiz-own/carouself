'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, Moon, Sun, Monitor, Lock, Type, Clock, ShieldAlert, User, Palette, Database } from 'lucide-react';
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

type Tab = 'appearance' | 'privacy' | 'account' | 'data';

export function SettingsModal({ isOpen, onClose, encKey }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('appearance');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('system');
  const [font, setFont] = useState('editor-font-sans');
  const [autoLock, setAutoLock] = useState('never');

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
    if (localTheme) setTheme(localTheme);

    const localFont = window.localStorage.getItem('editorFont') || 'editor-font-sans';
    setFont(localFont);

    const localLock = window.localStorage.getItem('autoLock') || 'never';
    setAutoLock(localLock);
  }, [isOpen]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('theme', 'light');
    } else {
      window.localStorage.removeItem('theme');
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  const updateSetting = (key: string, value: string) => {
    window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event('settings_updated'));
    if (key === 'editorFont') setFont(value);
    if (key === 'autoLock') setAutoLock(value);
  };

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!encKey) {
      toast.error("Encryption key not found. Please log in again.");
      return;
    }

    setIsExporting(true);
    try {
      const entries = await trpcUtils.entry.getAllEntries.fetch();

      if (entries.length === 0) {
        toast.error("No entries to export.");
        setIsExporting(false);
        return;
      }

      const zip = new JSZip();

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

          const textContent = convert(htmlContent, { wordwrap: 130 });
          const cleanTitle = title.trim().replace(/[^a-z0-9_-]/gi, '_') || 'Untitled';
          const filename = `${entry.date}_${cleanTitle}.txt`;

          zip.file(filename, textContent);
        } catch (e) {
          console.warn("Failed to decrypt an entry for export", e);
        }
      });

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
      const { salt: hexSalt, encryptedDek, dekNonce } = await trpcUtils.client.auth.getSalt.query({ email: me.email });
      const oldSaltBytes = sodium.from_hex(hexSalt);
      const oldMasterKey = await deriveMasterKey(oldPassword, oldSaltBytes);
      const oldKek = deriveEncKey(oldMasterKey);

      try {
        decryptDEK(sodium.from_hex(encryptedDek), sodium.from_hex(dekNonce), oldKek);
      } catch (err) {
        throw new Error("Incorrect current password");
      }

      const newSaltBytes = generateSalt();
      const newMasterKey = await deriveMasterKey(newPassword, newSaltBytes);
      const newAuthKeyBytes = deriveAuthKey(newMasterKey);
      const newKek = deriveEncKey(newMasterKey);

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

  const handleImmediateLock = () => {
    window.location.reload();
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: ShieldAlert },
    { id: 'account', label: 'Account', icon: User },
    { id: 'data', label: 'Data', icon: Database },
  ];

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

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity"
        onClick={onClose}
      >
        {/* Centered Modal */}
        <div
          className="w-full max-w-4xl bg-white dark:bg-[#12121e] border border-black/5 dark:border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[600px] animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >

          {/* Mobile Header (Only visible on small screens) */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#12121e]/50 backdrop-blur-md">
            <h2 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">Settings</h2>
            <button onClick={onClose} className="p-2 rounded-full text-neutral-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-64 bg-black/[0.02] dark:bg-white/[0.02] border-b md:border-b-0 md:border-r border-black/5 dark:border-white/5 flex flex-col">
            <div className="hidden md:flex items-center justify-between p-6 pb-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">Settings</h2>
                <p className="text-[10px] font-mono text-neutral-500 mt-1 truncate max-w-[180px]" title={me?.email}>{me?.email}</p>
              </div>
            </div>

            <nav className="p-4 md:p-3 space-x-2 md:space-x-0 md:space-y-1 flex md:flex-col overflow-x-auto md:overflow-x-visible hide-scrollbar mt-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-3 px-4 md:px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                    ? 'bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/5 md:border-none md:shadow-none'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                >
                  <tab.icon size={16} className={activeTab === tab.id ? 'text-amber-500' : ''} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="hidden md:flex mt-auto p-4 pb-6">
              <button
                onClick={handleImmediateLock}
                className="w-full flex items-center justify-center space-x-2 p-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white/10 dark:hover:bg-white/20 text-white rounded-lg font-medium text-xs transition-colors"
              >
                <Lock size={14} />
                <span>Lock Vault Now</span>
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative bg-white dark:bg-[#12121e]">

            {/* Desktop Close Button */}
            <div className="hidden md:block absolute top-4 right-4 z-10">
              <button onClick={onClose} className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-10 max-w-2xl w-full">

              {/* APPEARANCE TAB */}
              {activeTab === 'appearance' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-widest mb-4">Theme</h3>
                    <div className="flex bg-black/[0.03] dark:bg-white/5 p-1 rounded-xl border border-black/[0.04] dark:border-white/5 max-w-sm">
                      <button
                        onClick={() => setTheme('system')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg transition-all ${theme === 'system' ? 'bg-white dark:bg-[#1f1f2e] text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/5' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
                      >
                        <Monitor size={16} /> <span className="text-xs font-medium">System</span>
                      </button>
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white dark:bg-[#1f1f2e] text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/5' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
                      >
                        <Sun size={16} /> <span className="text-xs font-medium">Light</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-white dark:bg-[#1f1f2e] text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/5' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
                      >
                        <Moon size={16} /> <span className="text-xs font-medium">Dark</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-widest mb-4">Editor Typography</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'editor-font-sans', label: 'Sans-Serif', style: 'font-sans' },
                        { id: 'editor-font-serif', label: 'Serif', style: 'font-serif' },
                        { id: 'editor-font-mono', label: 'Monospace', style: 'font-mono' },
                        { id: 'editor-font-comic', label: 'Comic Sans', style: 'font-comic' },
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => updateSetting('editorFont', f.id)}
                          className={`flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${font === f.id ? 'bg-black/[0.03] dark:bg-white/5 border-neutral-300 dark:border-neutral-600' : 'bg-transparent border-black/[0.04] dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'}`}
                        >
                          <span className={`text-base font-medium text-neutral-800 dark:text-neutral-200 ${f.style}`}>{f.label}</span>
                          {font === f.id && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PRIVACY TAB */}
              {activeTab === 'privacy' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-widest mb-4">Auto-Lock Vault</h3>
                    <div className="space-y-3">
                      <select
                        value={autoLock}
                        onChange={(e) => updateSetting('autoLock', e.target.value)}
                        className="w-full max-w-sm bg-white dark:bg-[#1a1a24] border border-black/10 dark:border-white/10 rounded-lg px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors cursor-pointer"
                      >
                        <option value="never">Never (Stay Unlocked)</option>
                        <option value="5">After 5 Minutes of Inactivity</option>
                        <option value="15">After 15 Minutes of Inactivity</option>
                        <option value="30">After 30 Minutes of Inactivity</option>
                      </select>
                      <p className="text-sm text-neutral-500">Automatically clears your encryption key from volatile memory if you step away. You will need your master password to unlock the vault again.</p>
                    </div>
                  </div>

                  <div className="md:hidden">
                    <h3 className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-widest mb-4">Manual Lock</h3>
                    <button
                      onClick={handleImmediateLock}
                      className="w-full flex items-center justify-center space-x-2 p-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl font-medium text-sm transition-colors"
                    >
                      <Lock size={16} />
                      <span>Lock Vault Now</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ACCOUNT TAB */}
              {activeTab === 'account' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-widest mb-4">Change Master Password</h3>

                    <form onSubmit={handleChangePassword} className="p-6 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/5 rounded-2xl space-y-4 max-w-md">
                      {passwordError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium">
                          {passwordError}
                        </div>
                      )}

                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Current Password"
                          value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)}
                          className="w-full bg-white dark:bg-[#1a1a24] border border-black/10 dark:border-white/10 focus:border-neutral-400 dark:focus:border-neutral-500 rounded-lg px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors"
                        />
                        <div className="pt-2">
                          <input
                            type="password"
                            placeholder="New Password (min 12 chars)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full bg-white dark:bg-[#1a1a24] border border-black/10 dark:border-white/10 focus:border-neutral-400 dark:focus:border-neutral-500 rounded-lg px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors"
                          />
                        </div>
                        <input
                          type="password"
                          placeholder="Confirm New Password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full bg-white dark:bg-[#1a1a24] border border-black/10 dark:border-white/10 focus:border-neutral-400 dark:focus:border-neutral-500 rounded-lg px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="w-full mt-2 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium py-3 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        {isChangingPassword ? "Updating..." : "Update Password"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* DATA TAB */}
              {activeTab === 'data' && (
                <div className="space-y-10 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-widest mb-4">Export</h3>
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="w-full max-w-md flex items-center justify-between p-4 bg-white dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 rounded-2xl transition-all text-left group disabled:opacity-50"
                    >
                      <div>
                        <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100">Export Journal Data</div>
                        <div className="text-xs text-neutral-500 mt-1 font-mono">Decrypt &amp; Download (.zip)</div>
                      </div>
                      <div className="p-2 bg-black/[0.03] dark:bg-white/5 rounded-lg group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                        <Download size={16} className="text-neutral-700 dark:text-neutral-300" />
                      </div>
                    </button>
                  </div>

                  <div className="pt-8 border-t border-red-900/10 dark:border-red-900/30 max-w-md">
                    <h3 className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest mb-4">Danger Zone</h3>

                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-2xl transition-all text-left group disabled:opacity-50"
                    >
                      <div>
                        <div className="font-medium text-sm text-red-700 dark:text-red-400">Delete Account</div>
                        <div className="text-xs text-red-600/70 dark:text-red-500/70 mt-1 font-mono">Destroy all data permanently.</div>
                      </div>
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                        <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                      </div>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
