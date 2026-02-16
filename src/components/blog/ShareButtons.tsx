'use client';

import { Share2, Twitter, Linkedin, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import { useTrackEvent } from '@/hooks/useTrackEvent';

interface ShareButtonsProps {
  url: string;
  title: string;
  contentId?: string;
}

export function ShareButtons({ url, title, contentId }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const { trackEvent } = useTrackEvent(contentId);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        <Share2 className="h-4 w-4" />
        Share
      </span>

      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-md hover:bg-accent transition-colors"
        title="Share on X/Twitter"
        onClick={() => trackEvent('share', { platform: 'twitter' })}
      >
        <Twitter className="h-4 w-4" />
      </a>

      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-md hover:bg-accent transition-colors"
        title="Share on LinkedIn"
        onClick={() => trackEvent('share', { platform: 'linkedin' })}
      >
        <Linkedin className="h-4 w-4" />
      </a>

      <button
        onClick={() => {
          copyLink();
          trackEvent('share', { platform: 'copy_link' });
        }}
        className="p-2 rounded-md hover:bg-accent transition-colors"
        title="Copy link"
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
