'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import Link from 'next/link';
import Image from 'next/image';

export function GlobalHeader() {
  const pathname = usePathname();

  // Hide entirely in the journal (Zen Mode)
  if (pathname === '/journal') {
    return null;
  }

  return (
    <div className="fixed top-0 inset-x-0 p-6 flex justify-between items-center pointer-events-none z-50">
      <div className="pointer-events-auto">
        {pathname !== '/' && (
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/images/carouself_icon.png" alt="carouself icon" width={32} height={32} className="w-8 h-8 rounded-lg" />
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              carouself
            </span>
          </Link>
        )}
      </div>
      <div className="pointer-events-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
