'use client';

import React, { useState, useEffect } from 'react';
import { useEncryption } from '@/lib/crypto/EncryptionContext';
import { trpc } from '@/lib/trpc/client';
import { JournalEditor } from '@/components/JournalEditor';
import { HomeDashboard } from '@/components/HomeDashboard';
import { UnlockScreen } from '@/components/UnlockScreen';
import { JournalSidebar } from '@/components/JournalSidebar';
import { decryptEntry } from '@/lib/crypto/core';
import sodium from 'libsodium-wrappers-sumo';
import { toast } from 'react-hot-toast';

export default function JournalPage() {
  const { encKey } = useEncryption();
  const { data, isLoading, error } = trpc.auth.me.useQuery();
  
  const [viewState, setViewState] = useState<'dashboard' | 'editor'>('dashboard');
  const [selectedEntryId, setSelectedEntryId] = useState<string | undefined>(undefined);
  const [activeContent, setActiveContent] = useState<string>('');
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [activeMood, setActiveMood] = useState<string>('');
  const [activeWeather, setActiveWeather] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editorResetKey, setEditorResetKey] = useState<number>(0);

  // Auto-close sidebar on mobile load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const utils = trpc.useUtils();

  const handleSelectEntry = async (id: string | null) => {
    setEditorResetKey(prev => prev + 1);

    if (id === null) {
      // Create new entry
      setViewState('editor');
      setSelectedEntryId(undefined);
      setActiveContent('');
      setActiveTitle('');
      setActiveMood('');
      setActiveWeather('');
      if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false);
      return;
    }

    if (id === 'dashboard') {
      setViewState('dashboard');
      setSelectedEntryId(undefined);
      if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false);
      return;
    }

    setViewState('editor');
    setSelectedEntryId(id);

    if (!encKey) return;

    // Fetch and decrypt
    setIsDecrypting(true);
    try {
      const entryData = await utils.client.entry.getEntryById.query({ id });
      
      const ciphertextBytes = sodium.from_hex(entryData.ciphertext);
      const nonceBytes = sodium.from_hex(entryData.nonce);
      
      const plaintext = decryptEntry(ciphertextBytes, nonceBytes, encKey);
      
      let parsedContent = plaintext;
      let parsedTitle = '';
      let parsedMood = '';
      let parsedWeather = '';
      try {
        const payload = JSON.parse(plaintext);
        if (typeof payload === 'object' && payload !== null) {
          parsedContent = payload.content || '';
          parsedTitle = payload.title || '';
          parsedMood = payload.mood || '';
          parsedWeather = payload.weather || '';
        }
      } catch (e) {
        // Fallback to legacy plain-html entries
      }
      
      setActiveContent(parsedContent);
      setActiveTitle(parsedTitle);
      setActiveMood(parsedMood);
      setActiveWeather(parsedWeather);
    } catch (err) {
      console.error("Failed to decrypt entry", err);
      setActiveContent('<p class="text-red-400">Failed to decrypt entry. It may be corrupted or encrypted with a different key.</p>');
      setActiveTitle('');
      toast.error("Failed to decrypt entry. Did you change your master password?");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleStartTemplate = (title: string, content: string) => {
    setEditorResetKey(prev => prev + 1);
    setViewState('editor');
    setSelectedEntryId(undefined);
    setActiveTitle(title);
    setActiveContent(content);
    setActiveMood('');
    setActiveWeather('');
    if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-500 mt-4 text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-red-400">Session Expired</h2>
        <p className="text-neutral-600 dark:text-neutral-400">Please log in again.</p>
        <a href="/login" className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
          Go to Login
        </a>
      </div>
    );
  }

  // If we don't have the encryption key in memory, prompt for unlock
  if (!encKey) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center pt-20 p-6 selection:bg-amber-500/30">
        <UnlockScreen email={data.email} />
      </div>
    );
  }

  // Ready to write!
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex overflow-hidden relative">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <JournalSidebar 
        onSelectEntry={handleSelectEntry} 
        selectedEntryId={selectedEntryId} 
        encKey={encKey} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto p-4 md:p-8 relative transition-all duration-300 w-full">
        {/* Floating Sidebar Toggle */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 md:top-8 md:left-8 p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors z-10"
            title="Open Sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
          </button>
        )}

        <div className="w-full max-w-4xl mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div className="flex items-center space-x-4 pl-10 md:pl-0">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent">
              carouself
            </h1>
            {isDecrypting && <span className="text-xs text-amber-400 animate-pulse bg-amber-500/10 px-2 py-1 rounded">Decrypting...</span>}
          </div>
          <div className="text-sm text-neutral-500 bg-white dark:bg-neutral-900 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800">
            {data.email}
          </div>
        </div>
        
        <div className={`w-full transition-opacity duration-300 ${isDecrypting ? 'opacity-50 pointer-events-none' : 'opacity-100'} flex justify-center`}>
          {viewState === 'dashboard' ? (
            <HomeDashboard encKey={encKey} onSelectEntry={handleSelectEntry} email={data.email} onStartTemplate={handleStartTemplate} />
          ) : (
            <JournalEditor 
              key={`editor-${editorResetKey}`}
              encKey={encKey} 
              initialTitle={activeTitle}
              initialContent={activeContent} 
              initialMood={activeMood}
              initialWeather={activeWeather}
              entryId={selectedEntryId} 
              onDelete={() => {
                handleSelectEntry('dashboard');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
