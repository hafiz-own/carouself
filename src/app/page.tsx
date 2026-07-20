'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Lock, Shield, PenTool, ArrowRight, CheckCircle2,
  ChevronLeft, ChevronRight, HardDriveDownload,
  ChevronDown, Sparkles, ExternalLink,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';

// ─── Data ────────────────────────────────────────────────────────────────────

const mockEntries = [
  { date: 'Oct 12', title: 'A quiet morning in Kyoto', preview: 'The matcha was bitter but the air was perfectly crisp. I finally feel like I can breathe again…', image: '/images/entry_kyoto.png' },
  { date: 'Oct 15', title: 'Reflections on turning 30', preview: 'I thought I\'d have it all figured out by now. Turns out, the confusion just changes flavor…', image: '/images/entry_30.png' },
  { date: 'Oct 22', title: 'Shipped the MVP!', preview: 'After three months of late nights, we finally hit deploy. The adrenaline is unreal right now…', image: '/images/entry_mvp.png' },
  { date: 'Nov 02', title: 'Conversations with Sarah', preview: 'She mentioned something about letting go of control. I need to unpack that. Why do I hold on so tight?', image: '/images/entry_conversation.png' },
  { date: 'Nov 08', title: 'Winter is coming', preview: 'The leaves are gone. Got the heavy coats out. There is a strange comfort in the isolation of snow…', image: '/images/entry_winter.png' },
];

const features = [
  {
    size: 'large',
    icon: Shield,
    color: 'amber',
    title: 'Zero-Knowledge Architecture',
    description: 'Unlike traditional cloud journals, we literally do not possess the keys to read your data. Your Master Password mathematically derives an encryption key that locks your entries before they ever leave your device.',
    bullets: ['No server-side decryption', 'Passwords never transmitted', 'Complete data ownership'],
  },
  {
    size: 'small',
    icon: Lock,
    color: 'violet',
    title: 'Military Grade Primitives',
    description: 'Secured exclusively with XChaCha20-Poly1305 and Argon2id password hashing. The exact same primitives trusted by global security infrastructure.',
    codeSnippet: 'crypto.secretbox.easy()',
  },
  {
    size: 'small',
    icon: PenTool,
    color: 'rose',
    title: 'Zen Writing Mode',
    description: 'A beautiful, distraction-free rich-text editor designed to fade into the background and let your thoughts flow seamlessly.',
  },
  {
    size: 'large',
    icon: HardDriveDownload,
    color: 'blue',
    title: 'Absolute Ownership',
    description: 'You are not locked into our ecosystem. Because everything is encrypted client-side, we built a one-click export button. Download your entire journal vault as a portable ZIP file instantly, at any time.',
    ctaLabel: 'Export Vault (.zip)',
  },
];

const steps = [
  { n: '01', icon: PenTool, color: 'amber', title: 'You Write', desc: 'You compose your thoughts in your browser. At this stage, everything is strictly local and never leaves your device.' },
  { n: '02', icon: Lock, color: 'violet', title: 'Local Encryption', desc: 'Before leaving your device, your text is encrypted using XChaCha20-Poly1305 and your Master Password.' },
  { n: '03', icon: Shield, color: 'blue', title: 'Cloud Sync', desc: 'We only ever receive and store mathematical gibberish (ciphertext). Even if our databases are breached, your journals remain completely locked.' },
];

// ─── Color maps ───────────────────────────────────────────────────────────────
const colorMap: Record<string, { border: string; glow: string; icon: string; bg: string; text: string }> = {
  amber: {
    border: 'hover:border-amber-500/40',
    glow: 'hover:shadow-[0_0_40px_rgba(245,158,11,0.15)]',
    icon: 'text-amber-400',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
  },
  violet: {
    border: 'hover:border-violet-500/40',
    glow: 'hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]',
    icon: 'text-violet-400',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
  },
  rose: {
    border: 'hover:border-rose-500/40',
    glow: 'hover:shadow-[0_0_40px_rgba(244,63,94,0.15)]',
    icon: 'text-rose-400',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
  },
  blue: {
    border: 'hover:border-blue-500/40',
    glow: 'hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]',
    icon: 'text-blue-400',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
  },
};

const stepColorMap: Record<string, { badge: string; line: string; glow: string; border: string; icon: string; bg: string }> = {
  amber: { badge: 'bg-amber-500', line: 'bg-amber-500/30', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]', border: 'hover:border-amber-500/40', icon: 'text-amber-400', bg: 'bg-amber-500/10' },
  violet: { badge: 'bg-violet-500', line: 'bg-violet-500/30', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.4)]', border: 'hover:border-violet-500/40', icon: 'text-violet-400', bg: 'bg-violet-500/10' },
  blue: { badge: 'bg-blue-500', line: 'bg-blue-500/30', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]', border: 'hover:border-blue-500/40', icon: 'text-blue-400', bg: 'bg-blue-500/10' },
};

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] } }),
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [isMounted, setIsMounted] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll carousel
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

  const scrollCarousel = (dir: 'left' | 'right') => {
    carouselRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');
    const formData = new FormData(e.currentTarget);
    formData.append('access_key', process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || 'YOUR_ACCESS_KEY_HERE');
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setFormStatus('success');
        toast.success('Message sent successfully!');
        (e.target as HTMLFormElement).reset();
        setTimeout(() => setFormStatus('idle'), 3000);
      } else {
        toast.error('Failed to send. Please try again.');
        setFormStatus('idle');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
      setFormStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-[#0a0a12] text-neutral-900 dark:text-[#f0efe8] selection:bg-amber-500/30 overflow-x-hidden">

      {/* ── Floating Navbar ──────────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          navScrolled
            ? 'py-3 bg-white/80 dark:bg-[#0a0a12]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 shadow-lg shadow-black/5'
            : 'py-5 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="carouself home">
            <div className="relative">
              <Image
                src="/images/carouself_icon.png"
                alt="carouself icon"
                width={34}
                height={34}
                className="rounded-xl group-hover:scale-105 transition-transform"
              />
            </div>
            <span className="font-extrabold text-xl tracking-tight gradient-text">
              carouself
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How it Works', href: '#how-it-works' },
              { label: 'Contact', href: '#contact' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="#self-host"
              className="hidden lg:inline-flex items-center px-4 py-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Self Host
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-900 font-bold text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:-translate-y-0.5"
            >
              Start Free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        id="hero"
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Background image with parallax */}
        <motion.div
          style={{ scale: heroScale, opacity: heroOpacity }}
          className="absolute inset-0 z-0"
        >
          <Image
            src="/images/hero_bg.png"
            fill
            sizes="100vw"
            className="object-cover"
            alt="Hero background"
            priority
          />
          {/* Dark overlay — heavier in light mode, lighter in dark */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#f8f7f4]/80 via-[#f8f7f4]/50 to-[#f8f7f4] dark:from-[#0a0a12]/30 dark:via-[#0a0a12]/20 dark:to-[#0a0a12]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f8f7f4]/70 dark:from-[#0a0a12]/40 to-transparent" />
        </motion.div>

        {/* Animated orbs */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="orb w-[600px] h-[600px] bg-amber-400/20 mix-blend-multiply dark:mix-blend-normal dark:bg-amber-500/10 top-[-10%] left-[-15%] animate-float" />
          <div className="orb w-[500px] h-[500px] bg-violet-400/20 mix-blend-multiply dark:mix-blend-normal dark:bg-violet-500/10 bottom-[-5%] right-[-10%] animate-float-delayed" />
          <div className="orb w-[300px] h-[300px] bg-rose-400/15 mix-blend-multiply dark:mix-blend-normal dark:bg-rose-500/8 top-[30%] right-[20%] animate-pulse-glow" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-6 max-w-6xl mx-auto w-full pt-28">
          <div className="max-w-3xl">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white/60 dark:bg-transparent border border-black/5 dark:border-neutral-800 shadow-sm dark:shadow-none mb-8 backdrop-blur-sm"
            >
              <Lock size={12} className="text-neutral-500 dark:text-neutral-400" />
              <span className="text-[10px] font-mono font-medium text-neutral-600 dark:text-neutral-400 tracking-widest uppercase">
                Zero-Knowledge Encrypted
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6"
            >
              A carousel of{' '}
              <span className="gradient-text">your past</span>{' '}
              <span className="italic font-black">selves.</span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 leading-relaxed mb-10 max-w-xl"
            >
              A brutally private digital journal. Your thoughts are encrypted on your device before they ever touch the network. We can&apos;t read them. No one can.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <Link
                href="/signup"
                id="hero-cta-signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-900 font-bold text-base transition-all shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:shadow-[0_0_60px_rgba(245,158,11,0.7)] hover:-translate-y-1 group"
              >
                Create Your Vault
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                id="hero-cta-login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-black/[0.04] dark:border-white/10 backdrop-blur-sm text-neutral-800 dark:text-neutral-200 font-semibold text-base transition-all hover:-translate-y-1 shadow-[0_8px_20px_rgba(0,0,0,0.03)] dark:shadow-none"
              >
                Unlock Existing
              </Link>
              <Link
                href="#self-host"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/40 dark:bg-transparent hover:bg-white/60 dark:hover:bg-white/5 border border-black/[0.04] dark:border-white/10 text-neutral-800 dark:text-neutral-200 font-semibold text-base transition-all hover:-translate-y-1 shadow-[0_8px_20px_rgba(0,0,0,0.02)] dark:shadow-none"
              >
                Self Host
              </Link>
            </motion.div>

            {/* Trust bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="mt-14 flex flex-wrap items-center gap-x-3 gap-y-3"
            >
              <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mr-2">
                <Shield size={13} />
                <span>Secured By</span>
              </div>
              {['XChaCha20-Poly1305', 'Argon2id', 'Open Source', 'Self-hostable'].map((tag, idx) => (
                <React.Fragment key={tag}>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {tag}
                  </span>
                  {idx < 3 && <span className="text-neutral-300 dark:text-neutral-700 font-mono">/</span>}
                </React.Fragment>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-neutral-400 dark:text-neutral-600"
        >
          <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
          <ChevronDown size={18} className="animate-scroll-bounce" />
        </motion.div>
      </section>

      {/* ── Journal Carousel Section ──────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden bg-neutral-100/60 dark:bg-[#0d0d1a]/60 border-y border-black/5 dark:border-white/5">
        {/* Section header */}
        <div className="max-w-7xl mx-auto px-6 mb-10 flex items-end justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-semibold text-amber-500 tracking-[0.2em] uppercase mb-2">Your Private Gallery</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Revisit who you{' '}
              <span className="italic gradient-text-amber">were.</span>
            </h2>
          </motion.div>
          <div className="flex gap-2 shrink-0">
            <button
              id="carousel-prev"
              onClick={() => scrollCarousel('left')}
              aria-label="Previous slide"
              className="p-3 rounded-full bg-white dark:bg-white/5 border border-black/8 dark:border-white/10 hover:border-amber-500/40 hover:text-amber-500 transition-all hover:-translate-y-0.5 shadow-sm active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              id="carousel-next"
              onClick={() => scrollCarousel('right')}
              aria-label="Next slide"
              className="p-3 rounded-full bg-white dark:bg-white/5 border border-black/8 dark:border-white/10 hover:border-amber-500/40 hover:text-amber-500 transition-all hover:-translate-y-0.5 shadow-sm active:scale-95"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div
          ref={carouselRef}
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 px-6 md:px-12 pb-6 pt-2"
        >
          {mockEntries.map((entry, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="snap-center shrink-0 w-[82vw] md:w-[420px] h-[540px] flex flex-col bg-white dark:bg-[#12121e] border border-black/[0.03] dark:border-white/7 rounded-[2rem] overflow-hidden shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] dark:hover:shadow-2xl hover:border-amber-500/30 group cursor-grab active:cursor-grabbing"
            >
              {/* Image */}
              <div className="h-[55%] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
                <Image
                  src={entry.image}
                  alt={entry.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 420px"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                {/* Date badge */}
                <div className="absolute top-5 left-5 z-20 glass-card text-white text-xs font-bold font-mono px-3 py-1.5 rounded-full">
                  {entry.date}
                </div>
              </div>
              {/* Content */}
              <div className="h-[45%] p-7 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-3 group-hover:text-amber-500 transition-colors">
                    {entry.title}
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-sm line-clamp-3">
                    {entry.preview}
                  </p>
                </div>
                <div className="flex items-center text-amber-500 font-semibold text-xs opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  Read Full Entry <ArrowRight size={13} className="ml-1.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features Bento Grid ───────────────────────────────────────── */}
      <section id="features" className="py-32 px-6 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <p className="text-xs font-semibold text-violet-500 tracking-[0.2em] uppercase">Security</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Uncompromising{' '}
            <span className="gradient-text">Protection.</span>
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto text-lg">
            We built carouself with paranoid-level encryption so you can write with absolute peace of mind.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Zero-Knowledge (large) */}
          {(() => {
            const f = features[0];
            const c = colorMap[f.color];
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                custom={0}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                className={`md:col-span-2 relative bg-white dark:bg-[#12121e] border border-black/[0.04] dark:border-white/6 rounded-3xl p-8 md:p-12 overflow-hidden shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-none group transition-all duration-500 ${c.border} ${c.glow}`}
              >
                {/* BG icon */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none">
                  <Shield size={220} className="text-amber-500" />
                </div>
                <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mb-6`}>
                  <Icon className={c.icon} size={22} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed mb-8 max-w-md">{f.description}</p>
                <ul className="space-y-3">
                  {f.bullets?.map((b) => (
                    <li key={b} className="flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })()}

          {/* Card 2: Military grade (small) */}
          {(() => {
            const f = features[1];
            const c = colorMap[f.color];
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                custom={1}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                className={`bg-white dark:bg-[#12121e] border border-black/[0.04] dark:border-white/6 rounded-3xl p-8 flex flex-col justify-between shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-none group transition-all duration-500 ${c.border} ${c.glow}`}
              >
                <div>
                  <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mb-6`}>
                    <Icon className={c.icon} size={22} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">{f.description}</p>
                </div>
                <div className={`mt-8 font-mono text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-4 py-3 rounded-xl border border-violet-100 dark:border-violet-500/15`}>
                  {f.codeSnippet}
                </div>
              </motion.div>
            );
          })()}

          {/* Card 3: Zen Writing (small) */}
          {(() => {
            const f = features[2];
            const c = colorMap[f.color];
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                custom={2}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                className={`bg-white dark:bg-[#12121e] border border-black/[0.04] dark:border-white/6 rounded-3xl p-8 flex flex-col justify-between shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-none group transition-all duration-500 ${c.border} ${c.glow}`}
              >
                <div>
                  <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mb-6`}>
                    <Icon className={c.icon} size={22} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">{f.description}</p>
                </div>
                {/* Mini editor mockup */}
                <div className="mt-8 bg-white dark:bg-black/40 p-4 rounded-xl border border-black/[0.03] dark:border-white/5 shadow-sm dark:shadow-none">
                  <div className="flex gap-1.5 mb-3">
                    {['bg-red-400', 'bg-amber-400', 'bg-green-400'].map((cl) => (
                      <div key={cl} className={`w-2.5 h-2.5 ${cl} rounded-full opacity-60`} />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="w-1/3 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded" />
                    <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded" />
                    <div className="w-4/5 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded" />
                    <div className="w-3/5 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded" />
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* Card 4: Absolute Ownership (large) */}
          {(() => {
            const f = features[3];
            const c = colorMap[f.color];
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                custom={3}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                className={`md:col-span-2 bg-white dark:bg-[#12121e] border border-black/[0.04] dark:border-white/6 rounded-3xl p-8 md:p-12 flex flex-col justify-between shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-none group transition-all duration-500 ${c.border} ${c.glow} relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none">
                  <HardDriveDownload size={220} className="text-blue-500" />
                </div>
                <div className="relative z-10">
                  <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mb-6`}>
                    <Icon className={c.icon} size={22} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed max-w-md mb-8">{f.description}</p>
                  <button
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 cursor-default opacity-90"
                  >
                    <HardDriveDownload size={15} />
                    {f.ctaLabel}
                  </button>
                </div>
              </motion.div>
            );
          })()}
        </div>
      </section>

      {/* ── How it Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-32 px-6 bg-neutral-100/50 dark:bg-[#0d0d1a]/50 border-y border-black/5 dark:border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20 space-y-4"
          >
            <p className="text-xs font-semibold text-blue-500 tracking-[0.2em] uppercase">Transparency</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">How it Works</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-md mx-auto">
              Your data is locked before it ever touches the internet. Here&apos;s exactly how it flows.
            </p>
          </motion.div>

          <div className="relative">
            {steps.map((step, idx) => {
              const c = stepColorMap[step.color];
              const Icon = step.icon;
              const isLast = idx === steps.length - 1;
              return (
                <motion.div
                  key={step.n}
                  custom={idx}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="relative flex gap-8 md:gap-12"
                >
                  {/* Left: number + line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-12 h-12 ${c.badge} ${c.glow} rounded-2xl flex items-center justify-center text-white font-bold font-mono text-sm z-10 relative shrink-0`}>
                      {step.n}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 mt-4 mb-0 min-h-[80px] ${c.line} rounded-full`} />
                    )}
                  </div>
                  {/* Right: card */}
                  <div className={`mb-${isLast ? '0' : '8'} pb-${isLast ? '0' : '4'} flex-1`}>
                    <div
                      className={`bg-white dark:bg-[#12121e] border border-black/[0.04] dark:border-white/6 rounded-2xl p-7 mb-8 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-none group transition-all duration-300 ${c.border} hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                          <Icon className={c.icon} size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                          <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* GitHub CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex justify-center mt-16"
          >
            <a
              href="https://github.com/hafiz-own/carouself"
              target="_blank"
              rel="noopener noreferrer"
              id="github-link"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold transition-all hover:scale-105 shadow-2xl border border-white/10 dark:border-black/10 hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              <span>Verify on GitHub — 100% Open Source</span>
              <ExternalLink size={14} className="opacity-60" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Self Hosting Guide ────────────────────────────────────────── */}
      <section id="self-host" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="bg-white dark:bg-[#12121e] border border-black/6 dark:border-white/6 rounded-3xl p-8 md:p-12 shadow-xl dark:shadow-[0_8px_60px_rgba(0,0,0,0.5)]"
          >
            <div className="flex flex-col md:flex-row gap-12">
              <div className="flex-1 space-y-6">
                <p className="text-xs font-semibold text-amber-500 tracking-[0.2em] uppercase">Open Source</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Host it <span className="gradient-text italic">yourself.</span>
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  carouself is 100% open source. You can run it entirely on your own infrastructure for ultimate control over your encrypted data.
                </p>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Prerequisites</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={12} className="text-violet-500" />
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        <strong>PostgreSQL Database:</strong> You can spin up a local instance using Docker (<code className="bg-neutral-100 dark:bg-black/40 px-1.5 py-0.5 rounded text-xs">docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres</code>), or use a remote provider like NeonDB.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={12} className="text-violet-500" />
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        <strong>Node.js:</strong> Ensure you have Node 18+ installed.
                      </p>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex-1 bg-neutral-50 dark:bg-black/30 rounded-2xl p-6 border border-black/5 dark:border-white/5 space-y-4">
                <h3 className="font-semibold text-sm">Quick Start</h3>
                <div className="space-y-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                  <div className="p-3 bg-white dark:bg-[#0a0a12] rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                    <p className="text-neutral-400 mb-1"># 1. Clone the repository</p>
                    <p>git clone https://github.com/hafiz-own/carouself.git</p>
                    <p>cd carouself</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#0a0a12] rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                    <p className="text-neutral-400 mb-1"># 2. Configure Environment</p>
                    <p>cp .env.example .env.local</p>
                    <p className="text-amber-500 mt-1"># Edit .env.local and set your DATABASE_URL to your PostgreSQL connection string.</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#0a0a12] rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                    <p className="text-neutral-400 mb-1"># 3. Install & Run</p>
                    <p>npm install</p>
                    <p>npx drizzle-kit push</p>
                    <p>npm run dev</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Contact Section ───────────────────────────────────────────── */}
      <section id="contact" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left: Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7 }}
              className="space-y-6"
            >
              <p className="text-xs font-semibold text-rose-500 tracking-[0.2em] uppercase">Contact</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Say{' '}
                <span className="gradient-text italic">hello.</span>
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-lg">
                Have a question, a feature idea, or just want to chat? We read every message.
              </p>
              <div className="space-y-4 pt-4">
                {[
                  { label: 'Security Reports', sub: 'We take security seriously.' },
                  { label: 'Feature Requests', sub: 'Help shape the product.' },
                  { label: 'Just Saying Hi', sub: 'We love hearing from users.' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={15} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-xs text-neutral-500">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="bg-white dark:bg-[#12121e] border border-black/6 dark:border-white/6 rounded-3xl p-8 shadow-xl dark:shadow-[0_8px_60px_rgba(0,0,0,0.5)] hover:border-amber-500/30 hover:shadow-[0_0_40px_rgba(245,158,11,0.1)] transition-all duration-500"
            >
              {isMounted ? (
                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'name', label: 'Name', type: 'text', placeholder: 'John Doe' },
                      { id: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
                    ].map((f) => (
                      <div key={f.id} className="space-y-1.5">
                        <label htmlFor={f.id} className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          {f.label}
                        </label>
                        <input
                          type={f.type}
                          name={f.id}
                          id={f.id}
                          required
                          placeholder={f.placeholder}
                          className="w-full bg-white dark:bg-black/30 border border-black/5 dark:border-white/8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none text-neutral-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="message" className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Message
                    </label>
                    <textarea
                      name="message"
                      id="message"
                      required
                      rows={5}
                      placeholder="How can we help you?"
                      className="w-full bg-white dark:bg-black/30 border border-black/5 dark:border-white/8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none text-neutral-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 outline-none transition-all resize-none custom-scrollbar placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-sm"
                    />
                  </div>
                  <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />
                  <button
                    id="contact-submit"
                    type="submit"
                    disabled={formStatus === 'submitting' || formStatus === 'success'}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-900 font-bold text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {formStatus === 'submitting' && <span className="animate-pulse">Sending…</span>}
                    {formStatus === 'success' && <><CheckCircle2 size={16} /> Sent Successfully</>}
                    {formStatus === 'idle' && 'Send Message'}
                  </button>
                </form>
              ) : (
                <div className="animate-pulse space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                    <div className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                  </div>
                  <div className="h-36 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                  <div className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-black/5 dark:border-white/5 bg-neutral-100/50 dark:bg-[#0a0a12]">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <Image src="/images/carouself_icon.png" alt="carouself" width={28} height={28} className="rounded-lg opacity-80" />
            <span className="font-bold gradient-text text-lg">carouself</span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How it Works', href: '#how-it-works' },
              { label: 'GitHub', href: 'https://github.com/hafiz-own/carouself', external: true },
              { label: 'Sign Up', href: '/signup' },
            ].map((link) => (
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              )
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} carouself. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
