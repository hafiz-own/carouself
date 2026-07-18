import Link from 'next/link';
import { Lock, Shield, PenTool } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-8 selection:bg-amber-500/30">
      <div className="max-w-3xl w-full text-center space-y-8 relative z-10">
        
        {/* Logo / Header */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-amber-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              carouself
            </span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 font-medium max-w-xl mx-auto leading-relaxed">
            A brutally secure, zero-knowledge digital journal. Your thoughts, encrypted directly on your device.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 pt-12 pb-16 text-left">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
            <Shield className="text-amber-400 mb-4" size={28} />
            <h3 className="text-lg font-bold mb-2">Zero Knowledge</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">
              We literally cannot read your entries. Everything is encrypted on your device before it ever touches the network.
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
            <Lock className="text-purple-400 mb-4" size={28} />
            <h3 className="text-lg font-bold mb-2">Military Grade</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">
              Secured with XChaCha20-Poly1305 and Argon2id. The same cryptographic primitives trusted by the world's most secure systems.
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl">
            <PenTool className="text-pink-400 mb-4" size={28} />
            <h3 className="text-lg font-bold mb-2">Distraction Free</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">
              A deeply focused, beautiful rich-text editor designed to get out of your way and let your thoughts flow seamlessly.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Link 
            href="/signup" 
            className="w-full sm:w-auto px-8 py-4 bg-amber-600 hover:bg-amber-500 text-neutral-900 dark:text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5"
          >
            Create Secure Vault
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold rounded-xl transition-all"
          >
            Unlock Existing
          </Link>
        </div>

      </div>

      {/* Decorative Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
    </div>
  );
}
