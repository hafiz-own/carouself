'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Lock, Shield, PenTool, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, HardDriveDownload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const mockEntries = [
  { date: "Oct 12", title: "A quiet morning in Kyoto", preview: "The matcha was bitter but the air was perfectly crisp. I finally feel like I can breathe again...", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800" },
  { date: "Oct 15", title: "Reflections on turning 30", preview: "I thought I'd have it all figured out by now. Turns out, the confusion just changes flavor...", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800" },
  { date: "Oct 22", title: "Shipped the MVP!", preview: "After three months of late nights, we finally hit deploy. The adrenaline is unreal right now...", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800" },
  { date: "Nov 02", title: "Conversations with Sarah", preview: "She mentioned something about letting go of control. I need to unpack that. Why do I hold on so tight?", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=800" },
  { date: "Nov 08", title: "Winter is coming", preview: "The leaves are gone. Got the heavy coats out. There is a strange comfort in the isolation of snow...", image: "https://images.unsplash.com/photo-1478719059408-592965723cbc?q=80&w=800" },
];

export default function LandingPage() {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic for carousel
  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const maxScroll = carouselRef.current.scrollWidth - carouselRef.current.clientWidth;
        if (carouselRef.current.scrollLeft >= maxScroll - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: 400, behavior: 'smooth' });
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');
    
    const formData = new FormData(e.currentTarget);
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
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center space-y-10 min-h-[80vh] justify-center">
        {/* Subtle Image Background for Hero */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 z-0 overflow-hidden rounded-3xl opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        >
          <img src="https://images.unsplash.com/photo-1455390582262-044cdead27d8?q=80&w=2000" className="w-full h-full object-cover" alt="Hero background" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} // smooth spring-like ease
          className="space-y-6 max-w-3xl relative z-10"
        >
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
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 z-10"
        >
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
        </motion.div>
      </section>

      {/* Interactive Big Carousel Section */}
      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="py-24 relative overflow-hidden bg-neutral-100/50 dark:bg-neutral-900/20 border-y border-neutral-200 dark:border-neutral-800"
      >
        <div className="max-w-7xl mx-auto px-6 mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Your Private Gallery</h2>
            <p className="text-neutral-500">Reflect on your past entries beautifully.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => scrollCarousel('left')} className="p-3 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-sm active:scale-95">
              <ChevronLeft size={24} />
            </button>
            <button onClick={() => scrollCarousel('right')} className="p-3 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-sm active:scale-95">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div 
          ref={carouselRef}
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-8 px-6 md:px-12 pb-12 pt-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {mockEntries.map((entry, idx) => (
            <div 
              key={idx} 
              className="snap-center shrink-0 w-[85vw] md:w-[500px] h-[600px] flex flex-col bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.3)] group cursor-grab active:cursor-grabbing"
            >
              <div className="h-[55%] relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                <img src={entry.image} alt={entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-6 left-6 z-20 bg-black/40 backdrop-blur-md text-white text-xs font-bold font-mono px-3 py-1.5 rounded-full border border-white/20">
                  {entry.date}
                </div>
              </div>
              <div className="h-[45%] p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 group-hover:text-amber-500 transition-colors">{entry.title}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">{entry.preview}</p>
                </div>
                <div className="flex items-center text-amber-500 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                  Read Full Entry <ArrowRight size={16} className="ml-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Bento Grid Feature Section */}
      <section className="py-32 px-6 max-w-6xl mx-auto space-y-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-bold">Uncompromising Security.</h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">We built carouself with paranoid-level encryption, so you can write with absolute peace of mind.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Zero Knowledge (Large) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="md:col-span-2 bg-gradient-to-br from-neutral-100 to-white dark:from-neutral-900 dark:to-black border border-neutral-200 dark:border-neutral-800 p-8 md:p-12 rounded-3xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 opacity-10 dark:opacity-[0.05] group-hover:opacity-20 dark:group-hover:opacity-10 transition-opacity duration-700">
              <img src="https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1200" alt="Code crypto" className="w-full h-full object-cover" />
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 z-10">
              <Shield size={200} className="text-amber-500" />
            </div>
            <div className="relative z-20 max-w-md">
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
          </motion.div>

          {/* Card 2: Military Primitives */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded-3xl flex flex-col justify-between group hover:border-purple-500/30 transition-colors"
          >
            <div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
                <Lock className="text-purple-400" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4">Military Grade Primitives</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Secured exclusively with XChaCha20-Poly1305 and Argon2id password hashing. The exact same primitives trusted by global security infrastructure.
              </p>
            </div>
            <div className="mt-8 font-mono text-xs text-purple-600 dark:text-purple-400 bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
              crypto.secretbox.easy()
            </div>
          </motion.div>

          {/* Card 3: Zen Mode */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded-3xl flex flex-col justify-between group hover:border-pink-500/30 transition-colors"
          >
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
          </motion.div>

          {/* Card 4: Data Export (Large) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="md:col-span-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 md:p-12 rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-colors"
          >
            <div className="absolute inset-0 opacity-10 dark:opacity-[0.03] group-hover:opacity-20 dark:group-hover:opacity-10 transition-opacity duration-700">
              <img src="https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=1200" alt="Server tech" className="w-full h-full object-cover" />
            </div>

            <div className="relative z-20 max-w-md">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                <HardDriveDownload className="text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4">Absolute Ownership</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed mb-6">
                You are not locked into our ecosystem. Because everything is encrypted client-side, we built a one-click export button. Download your entire journal vault as a portable ZIP file instantly, at any time.
              </p>
              <button className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20 opacity-90 cursor-default">
                <HardDriveDownload size={16} /> Export Vault (.zip)
              </button>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Modern Contact Section */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="py-32 px-6 relative"
      >
        <div className="max-w-xl mx-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 md:p-12 rounded-3xl shadow-2xl relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3 text-neutral-900 dark:text-white">Reach Out</h2>
            <p className="text-neutral-600 dark:text-neutral-400">Have a question or just want to say hi? Drop us a message below.</p>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-semibold text-neutral-900 dark:text-white ml-1">Name</label>
              <input 
                type="text" 
                name="name" 
                id="name" 
                required 
                suppressHydrationWarning
                placeholder="John Doe"
                className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-neutral-900 dark:text-white ml-1">Email</label>
              <input 
                type="email" 
                name="email" 
                id="email" 
                required 
                suppressHydrationWarning
                placeholder="john@example.com"
                className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-semibold text-neutral-900 dark:text-white ml-1">Message</label>
              <textarea 
                name="message" 
                id="message" 
                required 
                rows={4}
                placeholder="How can we help you?"
                className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 outline-none transition-all resize-none custom-scrollbar placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
              />
            </div>

            <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />

            <button 
              type="submit" 
              disabled={formStatus === 'submitting' || formStatus === 'success'}
              className="w-full mt-8 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {formStatus === 'submitting' && <span className="animate-pulse">Sending...</span>}
              {formStatus === 'success' && <><CheckCircle2 size={18} /> Sent Successfully</>}
              {formStatus === 'idle' && 'Send Message'}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <footer className="mt-24 relative z-10 text-center text-sm text-neutral-500 pb-8">
          <p>&copy; {new Date().getFullYear()} carouself. All rights reserved.</p>
        </footer>
      </motion.section>

    </div>
  );
}
