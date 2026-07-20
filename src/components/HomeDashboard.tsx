'use client';

import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { decryptEntry } from '@/lib/crypto/core';
import sodium from 'libsodium-wrappers-sumo';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, PenTool, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface HomeDashboardProps {
  encKey: Uint8Array;
  onSelectEntry: (id: string | null) => void;
  email: string;
  onStartTemplate?: (title: string, content: string) => void;
}

interface DecryptedFullEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  wordCount: number;
  mood?: string;
  weather?: string;
}

export function HomeDashboard({ encKey, onSelectEntry, email, onStartTemplate }: HomeDashboardProps) {
  const { data: statsData } = trpc.entry.getStats.useQuery();
  const { data: metadataList, isLoading: isMetadataLoading } = trpc.entry.getEntriesMetadata.useQuery();
  const { data: recentEntriesData, isLoading: isEntriesLoading } = trpc.entry.getEntries.useQuery({ limit: 5 });
  
  const [isDecrypting, setIsDecrypting] = useState(true);
  
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselItems, setCarouselItems] = useState<DecryptedFullEntry[]>([]);

  useEffect(() => {
    if (!recentEntriesData || !encKey) return;
    
    const processEntries = () => {
      const decrypted = recentEntriesData.items.map(entry => {
        try {
          const ciphertextBytes = sodium.from_hex(entry.ciphertext);
          const nonceBytes = sodium.from_hex(entry.nonce);
          const plaintext = decryptEntry(ciphertextBytes, nonceBytes, encKey);
          
          let title = 'Untitled';
          let content = plaintext;
          let mood = '';
          let weather = '';
          try {
            const p = JSON.parse(plaintext);
            if (p.title) title = p.title;
            if (p.content) content = p.content;
            if (p.mood) mood = p.mood;
            if (p.weather) weather = p.weather;
          } catch(e) {}

          const textOnly = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
          const wordCount = textOnly === '' ? 0 : textOnly.split(/\s+/).length;

          return { id: entry.id, date: entry.date, title, content: textOnly, wordCount, mood, weather };
        } catch (e) {
          return { id: entry.id, date: entry.date, title: 'Corrupted', content: '', wordCount: 0, mood: '', weather: '' };
        }
      });
      
      setCarouselItems(decrypted);
      setIsDecrypting(false);
    };

    processEntries();
  }, [recentEntriesData, encKey]);

  if (isMetadataLoading || isEntriesLoading || isDecrypting) {
    return (
      <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center p-8 animate-pulse space-y-8">
        <div className="w-full h-64 bg-neutral-200 dark:bg-neutral-800 rounded-[2rem]"></div>
        <div className="flex space-x-4 w-full">
          <div className="h-32 flex-1 bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
          <div className="h-32 flex-1 bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
          <div className="h-32 flex-1 bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const totalEntries = metadataList?.length || 0;
  const totalWords = statsData?.totalWords || 0;
  
  let streak = 0;
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const dates = (metadataList || []).map(e => {
    const d = new Date(e.date);
    d.setHours(0,0,0,0);
    return d.getTime();
  });
  
  const uniqueDates = Array.from(new Set(dates)).sort((a,b) => b - a);
  
  if (uniqueDates.length > 0) {
    const currentDate = today.getTime();
    if (uniqueDates[0] === currentDate || uniqueDates[0] === currentDate - 86400000) {
      streak = 1;
      let checkDate = uniqueDates[0];
      for (let i = 1; i < uniqueDates.length; i++) {
        if (uniqueDates[i] === checkDate - 86400000) {
          streak++;
          checkDate = uniqueDates[i];
        } else {
          break;
        }
      }
    }
  }

  const nextCarousel = () => setCarouselIndex((prev) => (prev + 1) % carouselItems.length);
  const prevCarousel = () => setCarouselIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);

  return (
    <div className="w-full max-w-4xl flex flex-col space-y-12 pb-20 pt-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-0 space-y-6 md:space-y-0">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Welcome back.
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Your zero-knowledge vault is unlocked and secure.
          </p>
        </div>
        
        <button 
          onClick={() => onSelectEntry(null)}
          className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
        >
          <PenTool size={20} />
          <span>Start Writing</span>
        </button>
      </div>

      {carouselItems.length > 0 && (
        <div className="relative w-full h-[300px] flex items-center justify-center px-4 md:px-0">
          <button onClick={prevCarousel} className="absolute left-0 md:-left-8 z-10 p-3 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 shadow-xl transition-all hover:scale-110 border border-neutral-200 dark:border-neutral-800 ml-2 md:ml-0">
            <ChevronLeft size={24} />
          </button>

          <div 
            className="w-full h-full relative overflow-hidden rounded-[2rem] shadow-2xl group cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-500" 
            role="button"
            tabIndex={0}
            onClick={() => onSelectEntry(carouselItems[carouselIndex].id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectEntry(carouselItems[carouselIndex].id);
              }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-purple-500/20 dark:from-amber-500/10 dark:to-purple-500/10" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={carouselIndex}
                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute inset-0 p-8 md:p-10 flex flex-col justify-center bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10"
              >
                <div className="flex items-center space-x-3 mb-4 md:mb-6">
                  <div className="px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold uppercase tracking-widest flex items-center space-x-2">
                    <span>Memory</span>
                    {(carouselItems[carouselIndex].mood || carouselItems[carouselIndex].weather) && (
                      <span className="text-base leading-none -mt-0.5">{carouselItems[carouselIndex].mood} {carouselItems[carouselIndex].weather}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    {new Date(carouselItems[carouselIndex].date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-4 line-clamp-1">
                  {carouselItems[carouselIndex].title}
                </h2>
                <p className="text-base md:text-lg text-neutral-700 dark:text-neutral-300 line-clamp-2 md:line-clamp-3 leading-relaxed font-serif italic">
                  &quot;{carouselItems[carouselIndex].content.substring(0, 200)}...&quot;
                </p>
                <div className="absolute bottom-6 right-8 text-neutral-400 group-hover:text-amber-500 transition-colors font-medium text-sm flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                  <span>Open Entry</span> <ChevronRight size={16} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button onClick={nextCarousel} className="absolute right-0 md:-right-8 z-10 p-3 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 shadow-xl transition-all hover:scale-110 border border-neutral-200 dark:border-neutral-800 mr-2 md:mr-0">
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      {carouselItems.length === 0 && (
        <div className="w-full h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-[2rem] px-4 md:px-0">
          <p className="text-neutral-500 dark:text-neutral-400 text-lg">Your carousel is empty.</p>
          <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-2">Write your first entry to see it here!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-0">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-lg flex items-center space-x-4 transition-transform hover:-translate-y-1">
          <div className="p-4 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Calendar size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Total Entries</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{totalEntries}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-lg flex items-center space-x-4 transition-transform hover:-translate-y-1">
          <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <PenTool size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Total Words</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{totalWords.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-lg flex items-center space-x-4 transition-transform hover:-translate-y-1">
          <div className="p-4 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-xl">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Current Streak</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{streak} <span className="text-lg font-medium text-neutral-400">Days</span></p>
          </div>
        </div>
      </div>

      {/* Inspiration & Templates */}
      <div className="space-y-6 px-4 md:px-0 mt-8">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Inspiration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => onStartTemplate?.('Morning Reflection', '<h3>What are three things I am grateful for today?</h3><p></p><h3>What would make today great?</h3><p></p><h3>Daily Affirmation</h3><p></p>')}
            className="text-left bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-lg hover:border-amber-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 transition-all group"
          >
            <div className="text-amber-500 mb-4 bg-amber-100 dark:bg-amber-500/20 w-12 h-12 rounded-xl flex items-center justify-center"><Calendar size={24} /></div>
            <h3 className="font-bold text-lg mb-2 group-hover:text-amber-500 transition-colors">Morning Reflection</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Start your day with intention and gratitude.</p>
          </button>
          
          <button 
            onClick={() => onStartTemplate?.('Evening Review', '<h3>What went well today?</h3><p></p><h3>What could I have done better?</h3><p></p><h3>Thoughts before bed</h3><p></p>')}
            className="text-left bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-lg hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 transition-all group"
          >
            <div className="text-purple-500 mb-4 bg-purple-100 dark:bg-purple-500/20 w-12 h-12 rounded-xl flex items-center justify-center"><Calendar size={24} /></div>
            <h3 className="font-bold text-lg mb-2 group-hover:text-purple-500 transition-colors">Evening Review</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Reflect on the day and clear your mind for sleep.</p>
          </button>

          <button 
            onClick={() => {
              const prompts = [
                "What is a lesson you learned the hard way?",
                "If you could talk to yourself 5 years ago, what would you say?",
                "What is bringing you joy right now?",
                "Describe a memory that makes you feel safe."
              ];
              const prompt = prompts[Math.floor(Math.random() * prompts.length)];
              onStartTemplate?.(prompt, '');
            }}
            className="text-left bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-lg hover:border-blue-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 transition-all group"
          >
            <div className="text-blue-500 mb-4 bg-blue-100 dark:bg-blue-500/20 w-12 h-12 rounded-xl flex items-center justify-center"><PenTool size={24} /></div>
            <h3 className="font-bold text-lg mb-2 group-hover:text-blue-500 transition-colors">Random Prompt</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Let the vault ask you a thought-provoking question.</p>
          </button>
        </div>
      </div>

    </div>
  );
}
