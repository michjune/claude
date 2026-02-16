'use client';

import Link from 'next/link';

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/c" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded-lg bg-foreground flex items-center justify-center transition-transform group-hover:scale-105">
              <span className="text-[10px] font-bold text-background tracking-tight">SP</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                StemCell Pulse
              </span>
            </div>
          </Link>

          {/* Right */}
          <nav className="flex items-center gap-5">
            <Link
              href="/c/methodology"
              className="text-[13px] text-muted-foreground/70 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md px-1"
            >
              Methodology
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
