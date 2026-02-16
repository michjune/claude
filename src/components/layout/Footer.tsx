import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              <span className="text-primary">StemCell</span>{' '}
              <span className="text-foreground/80">Pulse</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              AI-powered stem cell research aggregation and content platform.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-4">Content</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/posts" className="hover:text-foreground transition-colors">Latest Posts</Link></li>
              <li><Link href="/topics/regenerative-medicine" className="hover:text-foreground transition-colors">Topics</Link></li>
              <li><Link href="/search" className="hover:text-foreground transition-colors">Search</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-4">Resources</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/methodology" className="hover:text-foreground transition-colors">Methodology</Link></li>
              <li><Link href="/newsletter" className="hover:text-foreground transition-colors">Newsletter</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-4">Legal</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t text-center">
          <p className="text-[13px] text-[#6B7280]">
            &copy; {new Date().getFullYear()} StemCell Pulse &middot; Independent research intelligence platform
          </p>
        </div>
      </div>
    </footer>
  );
}
