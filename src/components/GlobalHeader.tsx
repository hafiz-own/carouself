'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import Link from 'next/link';

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
          <Link href="/" className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-400 via-purple-400 to-pink-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            carouself
          </Link>
        )}
      </div>
      <div className="pointer-events-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
