import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-bold text-lg">
              <span className="text-primary">StemCell</span> Pulse
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              AI-powered stem cell research aggregation and content platform.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Content</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/posts" className="hover:text-foreground">Latest Posts</Link></li>
              <li><Link href="/topics/regenerative-medicine" className="hover:text-foreground">Topics</Link></li>
              <li><Link href="/search" className="hover:text-foreground">Search</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground">About</Link></li>
              <li><Link href="/newsletter" className="hover:text-foreground">Newsletter</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} StemCell Pulse. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
