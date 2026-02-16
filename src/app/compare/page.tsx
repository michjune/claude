'use client';

import Link from 'next/link';

export default function ComparePage() {
  const uis = [
    {
      key: 'a',
      label: 'A: Institutional Feed',
      subtitle: 'NYT + FT editorial. Tight list layout, serif titles, mono metadata. Text-forward, no cards.',
      path: '/a',
      pages: [
        { label: 'Home Feed', href: '/a' },
        { label: 'Article Detail', href: '/a/item/1' },
        { label: 'Methodology', href: '/a/methodology' },
      ],
    },
    {
      key: 'b',
      label: 'B: Beautiful Feed',
      subtitle: 'Linear + Notion aesthetic. Bento grid overview, card-based feed, modern product UI.',
      path: '/b',
      pages: [
        { label: 'Home Feed', href: '/b' },
        { label: 'Article Detail', href: '/b/item/1' },
        { label: 'Methodology', href: '/b/methodology' },
      ],
    },
    {
      key: 'c',
      label: 'C: Hybrid',
      subtitle: '70% editorial authority (serif titles, citation density) + 20% modern tech (bento, cards, glass nav) + 10% glass accents. The blend.',
      path: '/c',
      pages: [
        { label: 'Home Feed', href: '/c' },
        { label: 'Article Detail', href: '/c/item/1' },
        { label: 'Methodology', href: '/c/methodology' },
      ],
    },
    {
      key: 'd',
      label: 'D: Dark Premium',
      subtitle: 'Nfinite + Apple aesthetic. Dark background, glass cards, ambient glow orbs, gradient accents, animated hero. Maximum sleekness.',
      path: '/d',
      pages: [
        { label: 'Home Feed', href: '/d' },
        { label: 'Article Detail', href: '/d/item/1' },
        { label: 'Methodology', href: '/d/methodology' },
      ],
    },
    {
      key: 'e',
      label: 'E: Light Premium',
      subtitle: 'D\'s polish on B\'s bones. Warm white bg, animated hero, gradient accents, glow-on-focus search, ambient blobs, glass nav. The best of both.',
      path: '/e',
      pages: [
        { label: 'Home Feed', href: '/e' },
        { label: 'Article Detail', href: '/e/item/1' },
        { label: 'Methodology', href: '/e/methodology' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="mb-12 text-center">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground/60 mb-3">
            UI Comparison
          </p>
          <h1 className="font-serif text-display-sm tracking-tight text-foreground">
            Pick a direction
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Five feed UIs built from the same data. Open each in separate tabs to compare.
          </p>
        </div>

        <div className="space-y-4">
          {uis.map((ui) => (
            <div
              key={ui.key}
              className="rounded-lg border border-border-subtle bg-card p-6 transition-shadow hover:shadow-elevated"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-[17px] font-semibold text-foreground">{ui.label}</h2>
                  <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                    {ui.subtitle}
                  </p>
                </div>
                <Link
                  href={ui.path}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Open
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border-subtle">
                {ui.pages.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-md bg-surface px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-[12px] text-muted-foreground/40 font-mono">
            Tip: Open each in a separate tab to compare side by side
          </p>
        </div>
      </div>
    </div>
  );
}
