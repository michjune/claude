'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function PapersPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: papers, isLoading } = useQuery({
    queryKey: ['admin-papers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const fetchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/cron/fetch-papers', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET_CLIENT || 'manual'}` },
      });
      if (!res.ok) throw new Error('Failed to fetch papers');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-papers'] }),
  });

  const generateContent = async (paperId: string) => {
    setGenerating(paperId);
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId }),
      });
      if (!res.ok) throw new Error('Failed to generate content');
      queryClient.invalidateQueries({ queryKey: ['admin-papers'] });
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Papers</h1>
          <p className="text-muted-foreground mt-1">
            Research papers fetched from PubMed, CrossRef, and OpenAlex.
          </p>
        </div>
        <button
          onClick={() => fetchMutation.mutate()}
          disabled={fetchMutation.isPending}
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${fetchMutation.isPending ? 'animate-spin' : ''}`} />
          Fetch Papers
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {papers?.map((paper) => (
            <div key={paper.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold line-clamp-2">{paper.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {paper.authors.slice(0, 3).join(', ')}
                    {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {paper.content_generated ? (
                    <Badge variant="secondary">Content Generated</Badge>
                  ) : (
                    <button
                      onClick={() => generateContent(paper.id)}
                      disabled={generating === paper.id}
                      className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium border border-input bg-background h-8 px-3 hover:bg-accent disabled:opacity-50"
                    >
                      <Sparkles className={`h-3 w-3 ${generating === paper.id ? 'animate-pulse' : ''}`} />
                      Generate
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {paper.journal_name && <span>{paper.journal_name}</span>}
                {paper.published_date && (
                  <span>{new Date(paper.published_date).toLocaleDateString()}</span>
                )}
                {paper.citation_count > 0 && (
                  <span>{paper.citation_count} citations</span>
                )}
                {paper.doi && (
                  <a
                    href={`https://doi.org/${paper.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    DOI <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {paper.abstract && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {paper.abstract}
                </p>
              )}

              {paper.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {paper.keywords.slice(0, 5).map((kw: string) => (
                    <Badge key={kw} variant="outline" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}

          {papers?.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No papers fetched yet. Click &quot;Fetch Papers&quot; to start.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
