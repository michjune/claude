'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Content, ContentType, ContentStatus, Paper } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

type ContentWithPaper = Content & { papers?: Pick<Paper, 'title'> | null };

const CONTENT_TYPES: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Blog Post', value: 'blog_post' },
  { label: 'Tweet', value: 'tweet' },
  { label: 'LinkedIn', value: 'linkedin_post' },
  { label: 'Instagram', value: 'instagram_caption' },
  { label: 'Facebook', value: 'facebook_post' },
  { label: 'TikTok', value: 'tiktok_caption' },
  { label: 'YouTube', value: 'youtube_description' },
  { label: 'Video Script', value: 'video_script' },
];

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Review', value: 'pending_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Published', value: 'published' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Archived', value: 'archived' },
];

const statusVariant: Record<ContentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  pending_review: 'secondary',
  approved: 'default',
  published: 'default',
  rejected: 'destructive',
  archived: 'outline',
};

const typeLabel: Record<ContentType, string> = {
  blog_post: 'Blog Post',
  tweet: 'Tweet',
  linkedin_post: 'LinkedIn',
  instagram_caption: 'Instagram',
  facebook_post: 'Facebook',
  tiktok_caption: 'TikTok',
  youtube_description: 'YouTube',
  video_script: 'Video Script',
};

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

export default function AdminContentQueuePage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: contentItems, isLoading, error } = useQuery({
    queryKey: ['admin-content', typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/content?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load content');
      return res.json() as Promise<ContentWithPaper[]>;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/content/${id}/approve`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to approve content');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-content'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!response.ok) throw new Error('Failed to reject content');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-content'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Queue</h1>
          <p className="text-muted-foreground">Review, approve, and manage generated content.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs defaultValue="all" onValueChange={setTypeFilter}>
          <TabsList className="flex-wrap h-auto">
            {CONTENT_TYPES.map((type) => (
              <TabsTrigger key={type.value} value={type.value}>
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status.value}
            onClick={() => setStatusFilter(status.value)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              statusFilter === status.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-accent border-border'
            )}
          >
            {status.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load content: {(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {contentItems && contentItems.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No content items match the current filters.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {contentItems?.map((item) => {
          const isExpanded = expandedId === item.id;

          return (
            <Card key={item.id} className="transition-shadow hover:shadow-md">
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{typeLabel[item.content_type]}</Badge>
                    <Badge variant={statusVariant[item.status]}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                    {item.metadata?.ab_preset_name ? (
                      <Badge variant="outline" className="text-xs">
                        {item.metadata.ab_preset_name as string}
                      </Badge>
                    ) : null}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
                <CardTitle className="text-base">
                  {item.title || truncate(item.body, 80)}
                </CardTitle>
                {item.papers?.title && (
                  <CardDescription className="text-xs">
                    Paper: {item.papers.title}
                  </CardDescription>
                )}
              </CardHeader>

              {!isExpanded && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{truncate(item.body, 200)}</p>
                </CardContent>
              )}

              {isExpanded && (
                <CardContent className="space-y-4">
                  <div className="rounded-md bg-muted p-4">
                    <pre className="whitespace-pre-wrap text-sm">{item.body}</pre>
                  </div>

                  <div className="flex items-center gap-3">
                    {(item.status === 'pending_review' || item.status === 'draft' || item.status === 'rejected') && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            approveMutation.mutate(item.id);
                          }}
                          disabled={approveMutation.isPending}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {item.status === 'rejected' ? 'Re-approve' : 'Approve'}
                        </button>
                        {item.status !== 'rejected' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            rejectMutation.mutate(item.id);
                          }}
                          disabled={rejectMutation.isPending}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                        )}
                      </>
                    )}
                    <Link
                      href={`/admin/content/${item.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-accent text-sm font-medium transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit
                    </Link>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
