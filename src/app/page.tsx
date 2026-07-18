'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, Shield, PenTool, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const mockEntries = [
  { date: "Oct 12", title: "A quiet morning in Kyoto", preview: "The matcha was bitter but the air was perfectly crisp. I finally feel like..." },
  { date: "Oct 15", title: "Reflections on turning 30", preview: "I thought I'd have it all figured out by now. Turns out, the confusion just..." },
  { date: "Oct 22", title: "Shipped the MVP!", preview: "After three months of late nights, we finally hit deploy. The adrenaline..." },
  { date: "Nov 02", title: "Conversations with Sarah", preview: "She mentioned something about letting go of control. I need to unpack that..." },
  { date: "Nov 08", title: "Winter is coming", preview: "The leaves are gone. Got the heavy coats out. There is a strange comfort in..." },
];

export default function LandingPage() {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');
    
    const formData = new FormData(e.currentTarget);
    // User will add their Web3Forms Access Key in the .env.local file
    formData.append("access_key", process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "YOUR_ACCESS_KEY_HERE");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      
      if (data.success) {
        setFormStatus('success');
        toast.success("Message sent successfully!");
        (e.target as HTMLFormElement).reset();
        setTimeout(() => setFormStatus('idle'), 3000);
      } else {
        toast.error("Failed to send message. Please try again.");
        setFormStatus('idle');
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      setFormStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 selection:bg-amber-500/30 overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-amber-500/10 dark:bg-amber-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center space-y-10">
        <div className="space-y-6 max-w-3xl relative z-10">
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-amber-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              carouself
            </span>
          </h1>
          <p className="text-2xl md:text-3xl text-neutral-800 dark:text-neutral-200 font-bold leading-relaxed">
            A carousel of your past selves. An act of self-care.
          </p>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed max-w-2xl mx-auto">
            A brutally secure, zero-knowledge digital journal. Your thoughts, encrypted directly on your device before they ever touch the network.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 z-10">
          <Link 
            href="/signup" 
            className="w-full sm:w-auto px-8 py-4 bg-amber-600 hover:bg-amber-500 text-neutral-900 dark:text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            Create Secure Vault <ArrowRight size={20} />
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold rounded-xl transition-all"
          >
            Unlock Existing
          </Link>
        </div>
      </section>

      {/* Infinite Marquee Section */}
      <section className="py-20 relative overflow-hidden border-y border-neutral-200 dark:border-neutral-800/50 bg-white/30 dark:bg-black/20 backdrop-blur-sm">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-neutral-50 dark:from-neutral-950 to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-neutral-50 dark:from-neutral-950 to-transparent z-10" />
        
        <div className="flex overflow-hidden">
          {/* We duplicate the mockEntries array twice to create a seamless infinite loop */}
          <div className="animate-marquee flex items-center gap-6 px-3">
            {[...mockEntries, ...mockEntries].map((entry, idx) => (
              <div 
                key={idx} 
                className="w-80 h-48 flex-shrink-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-amber-500/50 group cursor-default"
              >
                <div className="text-xs font-mono text-amber-600 dark:text-amber-500 mb-3">{entry.date}</div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-amber-500 transition-colors">{entry.title}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{entry.preview}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Feature Section */}
      <section className="py-32 px-6 max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold">Uncompromising Security.</h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">We built carouself with paranoid-level encryption, so you can write with absolute peace of mind.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Large Feature */}
          <div className="md:col-span-2 bg-gradient-to-br from-neutral-100 to-white dark:from-neutral-900 dark:to-black border border-neutral-200 dark:border-neutral-800 p-8 md:p-12 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
              <Shield size={200} className="text-amber-500" />
            </div>
            <div className="relative z-10 max-w-md">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6">
                <Shield className="text-amber-500" size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Zero-Knowledge Architecture</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                Unlike traditional cloud journals, we literally do not possess the keys to read your data. Your Master Password mathematically derives an encryption key that locks your entries before they ever leave your device.
              </p>
              <ul className="space-y-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> No server-side decryption</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Passwords never transmitted</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Complete data ownership</li>
              </ul>
            </div>
          </div>

          {/* Medium Features */}
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded-3xl flex flex-col justify-between group hover:border-purple-500/30 transition-colors">
            <div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
                <Lock className="text-purple-400" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4">Military Grade Primitives</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Secured exclusively with XChaCha20-Poly1305 and Argon2id password hashing. The same modern cryptographic primitives trusted by global security infrastructure.
              </p>
            </div>
            <div className="mt-8 font-mono text-xs text-purple-600 dark:text-purple-400 bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
              crypto.secretbox.easy()
            </div>
          </div>

          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded-3xl flex flex-col justify-between group hover:border-pink-500/30 transition-colors">
            <div>
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-6">
                <PenTool className="text-pink-400" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4">Zen Writing Mode</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                A beautiful, distraction-free rich-text editor designed to fade into the background and let your thoughts flow seamlessly.
              </p>
            </div>
            <div className="mt-8 bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-inner">
              <div className="w-24 h-2 bg-neutral-200 dark:bg-neutral-800 rounded mb-2"></div>
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded mb-2"></div>
              <div className="w-3/4 h-2 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
            </div>
          </div>

        </div>
      </section>

      {/* Reach Out / Contact Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-xl mx-auto bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-8 md:p-12 rounded-[2rem] shadow-2xl relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Reach Out</h2>
            <p className="text-neutral-600 dark:text-neutral-400">Have a question or just want to say hi? Drop us a message below.</p>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-6">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium ml-1">Name</label>
              <input 
                type="text" 
                name="name" 
                id="name" 
                required 
                placeholder="John Doe"
                className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium ml-1">Email</label>
              <input 
                type="email" 
                name="email" 
                id="email" 
                required 
                placeholder="john@example.com"
                className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="message" className="text-sm font-medium ml-1">Message</label>
              <textarea 
                name="message" 
                id="message" 
                required 
                rows={4}
                placeholder="How can we help you?"
                className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 outline-none transition-all resize-none custom-scrollbar"
              />
            </div>

            {/* Hidden honeypot for Web3Forms anti-spam */}
            <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />

            <button 
              type="submit" 
              disabled={formStatus === 'submitting' || formStatus === 'success'}
              className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 font-semibold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {formStatus === 'submitting' && <span className="animate-pulse">Sending...</span>}
              {formStatus === 'success' && <><CheckCircle2 size={20} /> Sent Successfully</>}
              {formStatus === 'idle' && 'Send Message'}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <footer className="mt-24 text-center text-sm text-neutral-500 dark:text-neutral-500 pb-8">
          <p>&copy; {new Date().getFullYear()} carouself. All rights reserved.</p>
        </footer>
      </section>

    </div>
  );
}
