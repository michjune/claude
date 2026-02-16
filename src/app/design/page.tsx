'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  function toggle() {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
  }

  return (
    <button
      onClick={toggle}
      className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-caption shadow-elevated transition-all hover:shadow-feature"
    >
      <span className="text-lg">{dark ? '☀️' : '🌙'}</span>
      <span className="font-mono text-caption">{dark ? 'Light' : 'Dark'}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-overline mb-4">{children}</div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-16 border-b border-border-subtle last:border-0">
      {children}
    </section>
  );
}

// --- Color Swatch ---
function Swatch({ name, variable, className }: { name: string; variable: string; className?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`h-16 w-full rounded-lg border border-border-subtle ${className ?? ''}`}
        style={{ backgroundColor: `hsl(var(--${variable}))` }}
      />
      <span className="font-mono text-caption text-muted-foreground">{name}</span>
      <span className="font-mono text-overline-size text-muted-foreground/60">--{variable}</span>
    </div>
  );
}

// --- Type Scale Row ---
function TypeRow({ label, className, children }: { label: string; className: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-6 py-3 border-b border-border-subtle last:border-0">
      <span className="w-32 shrink-0 font-mono text-caption text-muted-foreground">{label}</span>
      <span className={className}>{children}</span>
    </div>
  );
}

// --- Spacing Bar ---
function SpacingBar({ px, tw }: { px: number; tw: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-16 shrink-0 font-mono text-caption text-muted-foreground text-right">{px}px</span>
      <div
        className="h-3 rounded-sm bg-primary/20"
        style={{ width: `${px}px` }}
      />
      <span className="font-mono text-caption text-muted-foreground">{tw}</span>
    </div>
  );
}

export default function DesignPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ThemeToggle />

      <div className="mx-auto max-w-5xl px-6">

        {/* --- Hero --- */}
        <Section id="hero">
          <SectionLabel>Design System</SectionLabel>
          <h1 className="font-serif text-display-lg tracking-tight text-foreground">
            Linear meets Nature
          </h1>
          <p className="mt-4 text-editorial text-display-sm text-muted-foreground">
            Precise minimalism with editorial authority
          </p>
          <p className="mt-6 max-w-2xl text-body-lg text-muted-foreground">
            A foundational design system combining Linear&apos;s keyboard-first precision with
            Nature journal&apos;s typographic gravitas. Built on Inter, Newsreader, and JetBrains Mono.
          </p>
        </Section>

        {/* --- Colors --- */}
        <Section id="colors">
          <SectionLabel>Color Palette</SectionLabel>
          <h2 className="font-serif text-display-sm mb-8">Tokens</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <Swatch name="Background" variable="background" />
            <Swatch name="Foreground" variable="foreground" className="border-2" />
            <Swatch name="Card" variable="card" />
            <Swatch name="Surface" variable="surface" />
            <Swatch name="Primary" variable="primary" />
            <Swatch name="Secondary" variable="secondary" />
            <Swatch name="Muted" variable="muted" />
            <Swatch name="Accent" variable="accent" />
            <Swatch name="Destructive" variable="destructive" />
            <Swatch name="Border" variable="border" />
            <Swatch name="Border Subtle" variable="border-subtle" />
            <Swatch name="Ring" variable="ring" />
          </div>
        </Section>

        {/* --- Typography Scale --- */}
        <Section id="typography">
          <SectionLabel>Type Scale</SectionLabel>
          <h2 className="font-serif text-display-sm mb-8">Typography</h2>
          <div className="space-y-0">
            <TypeRow label="display-lg" className="font-serif text-display-lg">The Future of Research</TypeRow>
            <TypeRow label="display" className="font-serif text-display">The Future of Research</TypeRow>
            <TypeRow label="display-sm" className="font-serif text-display-sm">The Future of Research</TypeRow>
            <TypeRow label="heading" className="font-sans text-heading font-semibold">Section Heading</TypeRow>
            <TypeRow label="subheading" className="font-sans text-subheading font-medium">Subheading Text</TypeRow>
            <TypeRow label="body-lg" className="font-sans text-body-lg">Body large for lead paragraphs and key content.</TypeRow>
            <TypeRow label="body" className="font-sans text-body">Body text for general reading and interface copy.</TypeRow>
            <TypeRow label="caption" className="font-sans text-caption text-muted-foreground">Caption for metadata and secondary info</TypeRow>
            <TypeRow label="overline" className="text-overline">Overline Label</TypeRow>
          </div>
        </Section>

        {/* --- Font Specimens --- */}
        <Section id="fonts">
          <SectionLabel>Font Specimens</SectionLabel>
          <h2 className="font-serif text-display-sm mb-8">Families</h2>

          <div className="space-y-10">
            {/* Newsreader */}
            <div>
              <h3 className="font-mono text-caption text-muted-foreground mb-3">Newsreader (Serif)</h3>
              <p className="font-serif text-heading">
                The quick brown fox jumps over the lazy dog
              </p>
              <p className="font-serif text-heading italic mt-1">
                The quick brown fox jumps over the lazy dog
              </p>
            </div>

            {/* Inter */}
            <div>
              <h3 className="font-mono text-caption text-muted-foreground mb-3">Inter (Sans)</h3>
              <div className="space-y-1">
                <p className="font-sans text-heading font-normal">Regular 400 — The quick brown fox</p>
                <p className="font-sans text-heading font-medium">Medium 500 — The quick brown fox</p>
                <p className="font-sans text-heading font-semibold">Semibold 600 — The quick brown fox</p>
                <p className="font-sans text-heading font-bold">Bold 700 — The quick brown fox</p>
              </div>
            </div>

            {/* JetBrains Mono */}
            <div>
              <h3 className="font-mono text-caption text-muted-foreground mb-3">JetBrains Mono (Monospace)</h3>
              <p className="font-mono text-heading">
                0123456789 ABCDEF
              </p>
              <p className="font-mono text-body text-muted-foreground mt-1">
                DOI: 10.1038/s41586-024-07891-2
              </p>
            </div>
          </div>
        </Section>

        {/* --- Spacing --- */}
        <Section id="spacing">
          <SectionLabel>Spacing</SectionLabel>
          <h2 className="font-serif text-display-sm mb-8">Scale</h2>
          <div className="space-y-3">
            <SpacingBar px={4} tw="p-1" />
            <SpacingBar px={8} tw="p-2" />
            <SpacingBar px={12} tw="p-3" />
            <SpacingBar px={16} tw="p-4" />
            <SpacingBar px={20} tw="p-5" />
            <SpacingBar px={24} tw="p-6" />
            <SpacingBar px={32} tw="p-8" />
            <SpacingBar px={40} tw="p-10" />
            <SpacingBar px={48} tw="p-12" />
            <SpacingBar px={64} tw="p-16" />
          </div>
        </Section>

        {/* --- Shadows --- */}
        <Section id="shadows">
          <SectionLabel>Elevation</SectionLabel>
          <h2 className="font-serif text-display-sm mb-8">Shadows</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { name: 'xs', cls: 'shadow-xs' },
              { name: 'subtle', cls: 'shadow-subtle' },
              { name: 'elevated', cls: 'shadow-elevated' },
              { name: 'feature', cls: 'shadow-feature' },
              { name: 'glow-primary', cls: 'shadow-glow-primary' },
            ].map(({ name, cls }) => (
              <div key={name} className="flex flex-col items-center gap-3">
                <div className={`h-24 w-full rounded-lg bg-card border border-border-subtle ${cls}`} />
                <span className="font-mono text-caption text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* --- Card Variants --- */}
        <Section id="cards">
          <SectionLabel>Components</SectionLabel>
          <h2 className="font-serif text-display-sm mb-8">Card Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(
              [
                { variant: 'default' as const, title: 'Default', desc: 'Standard card with subtle shadow' },
                { variant: 'elevated' as const, title: 'Elevated', desc: 'Raised card for dashboards and panels' },
                { variant: 'interactive' as const, title: 'Interactive', desc: 'Hover to see the lift effect' },
                { variant: 'feature' as const, title: 'Feature', desc: 'Primary ring glow for featured content' },
                { variant: 'ghost' as const, title: 'Ghost', desc: 'No border or shadow for inline grouping' },
                { variant: 'glass' as const, title: 'Glass', desc: 'Backdrop-blur translucent surface' },
              ]
            ).map(({ variant, title, desc }) => (
              <Card key={variant} variant={variant}>
                <CardHeader>
                  <CardTitle className="text-subheading">{title}</CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-body text-muted-foreground">
                    variant=&quot;{variant}&quot;
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        {/* --- Buttons + Badges --- */}
        <Section id="buttons">
          <SectionLabel>Interactive</SectionLabel>
          <h2 className="font-serif text-display-sm mb-8">Buttons &amp; Badges</h2>

          <div className="space-y-8">
            <div>
              <h3 className="font-mono text-caption text-muted-foreground mb-4">Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            <div>
              <h3 className="font-mono text-caption text-muted-foreground mb-4">Badges</h3>
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>
          </div>
        </Section>

        {/* --- Composition --- */}
        <Section id="composition">
          <SectionLabel>Composition</SectionLabel>
          <h2 className="font-serif text-display-sm mb-8">Research Paper Card</h2>

          <Card variant="interactive" className="max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Nature</Badge>
                <Badge variant="outline">Stem Cells</Badge>
              </div>
              <CardTitle className="font-serif text-heading">
                Single-cell atlas reveals distinct immune landscapes in transplant and primary tumors
              </CardTitle>
              <CardDescription className="text-editorial text-body text-muted-foreground mt-2">
                A comprehensive single-cell analysis uncovers divergent immunological niches that shape therapeutic response.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body text-muted-foreground mb-4">
                Using single-cell RNA sequencing of 47 patient samples, we identified 12 distinct
                immune cell populations with differential abundance between transplant and primary
                tumor microenvironments. These findings have direct implications for immunotherapy
                stratification.
              </p>
              <div className="flex items-center gap-4 pt-2 border-t border-border-subtle">
                <span className="text-technical text-caption text-muted-foreground">
                  DOI: 10.1038/s41586-024-07891-2
                </span>
                <span className="text-caption text-muted-foreground/60">•</span>
                <span className="text-caption text-muted-foreground">
                  Impact Factor: 64.8
                </span>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm">Read Summary</Button>
              <Button size="sm" variant="ghost">Bookmark</Button>
            </CardFooter>
          </Card>
        </Section>

        {/* Footer */}
        <div className="py-12 text-center">
          <p className="text-caption text-muted-foreground">
            StemCell Pulse Design System
          </p>
        </div>
      </div>
    </div>
  );
}
