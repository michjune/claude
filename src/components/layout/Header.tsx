'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Sun, Moon, Menu, X, Search, User, LogOut } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'editor';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-primary">StemCell</span>
            <span>Pulse</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/posts" className="text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/topics/regenerative-medicine" className="text-muted-foreground hover:text-foreground transition-colors">
              Topics
            </Link>
            <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors">
              <Search className="h-4 w-4" />
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="hidden md:inline text-sm">{profile?.full_name || 'Account'}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover shadow-lg">
                  <div className="p-1">
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="block px-3 py-2 text-sm rounded-md hover:bg-accent"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <Link
                      href="/bookmarks"
                      className="block px-3 py-2 text-sm rounded-md hover:bg-accent"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Bookmarks
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-3 py-2 text-sm rounded-md hover:bg-accent"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => { signOut(); setUserMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive"
                    >
                      <LogOut className="h-3 w-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-md hover:bg-accent"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t p-4 space-y-3">
          <Link href="/posts" className="block text-sm hover:text-primary" onClick={() => setMobileOpen(false)}>
            Blog
          </Link>
          <Link href="/topics/regenerative-medicine" className="block text-sm hover:text-primary" onClick={() => setMobileOpen(false)}>
            Topics
          </Link>
          <Link href="/search" className="block text-sm hover:text-primary" onClick={() => setMobileOpen(false)}>
            Search
          </Link>
        </div>
      )}
    </header>
  );
}
