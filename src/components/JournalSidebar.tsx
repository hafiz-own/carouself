'use client';

import React, { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Calendar, PlusCircle, Search, X, Settings, MoreVertical, Edit2, Trash2, PanelLeftClose, Plus } from 'lucide-react';
import { useEncryption } from '@/lib/crypto/EncryptionContext';
import { decryptEntry, encryptEntry } from '@/lib/crypto/core';
import sodium from 'libsodium-wrappers-sumo';
import { SettingsModal } from './SettingsModal';
import { ConfirmDialog, PromptDialog, AlertDialog } from './ui/Dialogs';

interface JournalSidebarProps {
  onSelectEntry: (id: string | null) => void;
  selectedEntryId: string | null;
  encKey: Uint8Array | null;
  isOpen: boolean;
  onClose: () => void;
}

interface DecryptedEntry {
  id: string;
  date: string;
  createdAt: string | Date;
  title: string;
  snippet: string;
}

export function JournalSidebar({ onSelectEntry, selectedEntryId, encKey, isOpen, onClose }: JournalSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DecryptedEntry[] | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [decryptedEntries, setDecryptedEntries] = useState<DecryptedEntry[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [entryToRename, setEntryToRename] = useState<DecryptedEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null);

  const trpcUtils = trpc.useUtils();
  const saveMutation = trpc.entry.saveEntry.useMutation();
  const deleteMutation = trpc.entry.deleteEntry.useMutation();

  const { data: rawEntries, isLoading, error } = trpc.entry.getAllEntries.useQuery();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const initiateRename = (entry: DecryptedEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    setEntryToRename(entry);
  };

  const executeRename = async (newTitle: string) => {
    const entry = entryToRename;
    if (!entry || !newTitle || newTitle === entry.title) return;

    const rawEntry = rawEntries?.find(e => e.id === entry.id);
    if (!rawEntry || !encKey) return;

    try {
      const ciphertextBytes = sodium.from_hex(rawEntry.ciphertext);
      const nonceBytes = sodium.from_hex(rawEntry.nonce);
      const plaintext = decryptEntry(ciphertextBytes, nonceBytes, encKey);
      
      let content = plaintext;
      try {
         const p = JSON.parse(plaintext);
         if (p.content !== undefined) content = p.content;
      } catch (e) {}

      const payload = JSON.stringify({ title: newTitle, content });
      const { ciphertext: newCiphertext, nonce: newNonce } = encryptEntry(payload, encKey);
      
      await saveMutation.mutateAsync({
        id: entry.id,
        ciphertext: sodium.to_hex(newCiphertext),
        nonce: sodium.to_hex(newNonce),
        date: entry.date
      });
      trpcUtils.entry.getAllEntries.invalidate();
    } catch (error) {
      console.error('Rename failed', error);
      setAlertMessage({ title: 'Error', message: 'Failed to rename entry. Did your key change?' });
    }
  };

  const initiateDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    setEntryToDelete(id);
  };

  const executeDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: entryToDelete });
      trpcUtils.entry.getAllEntries.invalidate();
      if (selectedEntryId === entryToDelete) {
        onSelectEntry(null);
      }
    } catch (error) {
      console.error('Delete failed', error);
      setAlertMessage({ title: 'Error', message: 'Failed to delete entry' });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Decrypt all entries for sidebar titles
  useEffect(() => {
    if (!encKey || !rawEntries) return;

    const decryptAll = () => {
      const decrypted = rawEntries.map(entry => {
        try {
          const ciphertextBytes = sodium.from_hex(entry.ciphertext);
          const nonceBytes = sodium.from_hex(entry.nonce);
          const plaintext = decryptEntry(ciphertextBytes, nonceBytes, encKey);
          
          let title = 'Untitled';
          let contentStr = plaintext;
          try {
            const p = JSON.parse(plaintext);
            if (p.title) title = p.title;
            if (p.content) contentStr = p.content;
          } catch(e) {
            // legacy format
          }

          const snippet = contentStr.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').substring(0, 80);
          return { id: entry.id, date: entry.date, createdAt: entry.createdAt, title, snippet };
        } catch (err) {
          return { id: entry.id, date: entry.date, createdAt: entry.createdAt, title: 'Corrupted Entry', snippet: '' };
        }
      });
      // Sort by createdAt desc
      decrypted.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDecryptedEntries(decrypted);
    };

    decryptAll();
  }, [rawEntries, encKey]);

  // Handle Search Debounce
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      if (!encKey || decryptedEntries.length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const query = searchQuery.toLowerCase();
      const results = decryptedEntries.filter(entry => 
        entry.title.toLowerCase().includes(query) || entry.snippet.toLowerCase().includes(query)
      );
      
      setSearchResults(results);
      setIsSearching(false);
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery, decryptedEntries, encKey]);

  if (isLoading) {
    return (
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex flex-col p-4 animate-pulse space-y-4">
        <div className="h-10 bg-white dark:bg-neutral-900 rounded-xl w-full"></div>
        <div className="h-20 bg-white dark:bg-neutral-900 rounded-xl w-full"></div>
        <div className="h-20 bg-white dark:bg-neutral-900 rounded-xl w-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex flex-col p-4 text-red-400 text-sm">
        Failed to load history
      </div>
    );
  }

  return (
    <>
      <div className={`fixed inset-y-0 left-0 z-50 md:relative transition-all duration-300 ease-in-out border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex flex-col h-screen overflow-hidden ${isOpen ? 'w-[85vw] max-w-[320px] md:w-80 opacity-100 translate-x-0' : 'w-[85vw] max-w-[320px] md:w-0 opacity-0 md:border-r-0 -translate-x-full md:translate-x-0'}`}>
        <div className="w-80 min-w-[320px] flex flex-col h-screen overflow-y-auto">
        <div className="p-4 pb-2 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Entries</h2>
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => onSelectEntry(null)} 
                className="p-1.5 text-neutral-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors" 
                title="New Entry"
              >
                <Plus size={16} />
              </button>
              <button 
                onClick={onClose} 
                className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors" 
                title="Close Sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-500 group-focus-within:text-amber-400 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-xl leading-5 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all sm:text-sm shadow-inner"
            placeholder="Search journal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-700 dark:text-neutral-300 dark:hover:text-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 overflow-y-auto space-y-1 pb-24 custom-scrollbar">
        {searchQuery ? (
          <>
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 px-2 flex justify-between">
              <span>Search Results</span>
              {isSearching && <span className="animate-pulse">Searching...</span>}
            </h3>
            
            {!isSearching && searchResults?.length === 0 && (
              <div className="px-2 text-sm text-neutral-600">No entries matched your search.</div>
            )}
            
            {searchResults?.map((result) => (
              <div
                key={result.id}
                onClick={() => onSelectEntry(result.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all flex flex-col space-y-1 cursor-pointer relative group ${
                  selectedEntryId === result.id
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-amber-300 shadow-inner'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-200'
                } ${openDropdownId === result.id ? 'z-50' : 'z-10'}`}
              >
                <span className={`text-sm font-semibold truncate pr-6 ${selectedEntryId === result.id ? 'text-amber-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                  {result.title}
                </span>
                <span className="text-xs text-neutral-500 line-clamp-2 leading-relaxed pr-2">
                  {result.snippet}
                </span>

                <button 
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    e.nativeEvent.stopImmediatePropagation();
                    setOpenDropdownId(openDropdownId === result.id ? null : result.id); 
                  }}
                  className="absolute top-2.5 right-2 p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <MoreVertical size={16} />
                </button>

                {openDropdownId === result.id && (
                  <div className="absolute right-8 top-2 w-32 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl overflow-hidden flex flex-col" onClick={e => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}>
                    <button 
                      onClick={(e) => initiateRename(result, e)}
                      className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center space-x-3 transition-colors"
                    >
                      <Edit2 size={14} />
                      <span>Rename</span>
                    </button>
                    <button 
                      onClick={(e) => initiateDelete(result.id, e)}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <>

            {decryptedEntries.length === 0 ? (
              <div className="px-2 text-sm text-neutral-600">No entries yet.</div>
            ) : (
              decryptedEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all flex flex-col space-y-1 cursor-pointer relative group ${
                    selectedEntryId === entry.id
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-amber-300 shadow-inner'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-200'
                  } ${openDropdownId === entry.id ? 'z-50' : 'z-10'}`}
                >
                  <span className={`font-semibold text-sm truncate pr-6 ${selectedEntryId === entry.id ? 'text-amber-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                    {entry.title}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-neutral-500 pr-2">
                    <span>{new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span>&bull;</span>
                    <span>{new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>

                  <button 
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      e.nativeEvent.stopImmediatePropagation();
                      setOpenDropdownId(openDropdownId === entry.id ? null : entry.id); 
                    }}
                    className="absolute top-2.5 right-2 p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {openDropdownId === entry.id && (
                    <div className="absolute right-8 top-2 w-32 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl overflow-hidden flex flex-col" onClick={e => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}>
                      <button 
                        onClick={(e) => initiateRename(entry, e)}
                        className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center space-x-3 transition-colors"
                      >
                        <Edit2 size={14} />
                        <span>Rename</span>
                      </button>
                      <button 
                        onClick={(e) => initiateDelete(entry.id, e)}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Settings Button (Bottom Pinned) */}
      <div className="p-3 mt-auto border-t border-neutral-200 dark:border-neutral-800 shrink-0">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
        >
          <Settings size={18} />
          <span className="font-medium text-sm">Settings</span>
        </button>
      </div>
      </div>
      </div>

      <PromptDialog
        isOpen={!!entryToRename}
        title="Rename Entry"
        label="New Title"
        defaultValue={entryToRename?.title || ''}
        confirmText="Rename"
        onConfirm={executeRename}
        onClose={() => setEntryToRename(null)}
      />
      
      <ConfirmDialog
        isOpen={!!entryToDelete}
        title="Delete Entry"
        message="Are you sure you want to delete this entry? This action is IRREVERSIBLE and cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={executeDelete}
        onClose={() => setEntryToDelete(null)}
      />

      <AlertDialog
        isOpen={!!alertMessage}
        title={alertMessage?.title || 'Alert'}
        message={alertMessage?.message || ''}
        onConfirm={() => setAlertMessage(null)}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        encKey={encKey} 
      />
    </>
  );
}
