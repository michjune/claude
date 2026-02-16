'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Sun, Moon, Menu, X, Search, User, LogOut, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'editor';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b shadow-sm'
          : 'bg-background/60 backdrop-blur-md'
      }`}
    >
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-1.5 font-semibold text-lg tracking-tight">
            <span className="text-primary">StemCell</span>
            <span className="text-foreground/80">Pulse</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/posts" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-all duration-200">
              Blog
            </Link>
            <Link href="/topics/regenerative-medicine" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-all duration-200">
              Topics
            </Link>
            <Link href="/search" className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-all duration-200">
              <Search className="h-4 w-4" />
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
              >
                <User className="h-4 w-4" />
                <span className="hidden md:inline">{profile?.full_name || 'Account'}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-popover/95 backdrop-blur-xl shadow-lg shadow-black/5 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="block px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    href="/bookmarks"
                    className="block px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Bookmarks
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <div className="my-1 border-t" />
                  <button
                    onClick={() => { signOut(); setUserMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full text-sm font-medium bg-primary text-primary-foreground h-9 px-5 hover:bg-primary/90 transition-all duration-200 shadow-sm"
            >
              Sign In
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-xl">
          <nav className="container py-4 space-y-1">
            <Link href="/posts" className="block px-3 py-2.5 text-sm rounded-lg hover:bg-accent transition-colors" onClick={() => setMobileOpen(false)}>
              Blog
            </Link>
            <Link href="/topics/regenerative-medicine" className="block px-3 py-2.5 text-sm rounded-lg hover:bg-accent transition-colors" onClick={() => setMobileOpen(false)}>
              Topics
            </Link>
            <Link href="/search" className="block px-3 py-2.5 text-sm rounded-lg hover:bg-accent transition-colors" onClick={() => setMobileOpen(false)}>
              Search
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
