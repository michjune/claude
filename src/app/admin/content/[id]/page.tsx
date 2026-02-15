'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Content, ContentType } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Send,
  Save,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

const CHAR_LIMITS: Partial<Record<ContentType, number>> = {
  tweet: 280,
  linkedin_post: 3000,
  instagram_caption: 2200,
  facebook_post: 63206,
  tiktok_caption: 2200,
  youtube_description: 5000,
};

const statusVariant = {
  draft: 'outline' as const,
  pending_review: 'secondary' as const,
  approved: 'default' as const,
  published: 'default' as const,
  rejected: 'destructive' as const,
  archived: 'outline' as const,
};

export default function ContentEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const { data: content, isLoading, error } = useQuery({
    queryKey: ['content', params.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('id', params.id)
        .single();
      if (error) throw error;
      return data as Content;
    },
  });

  useEffect(() => {
    if (content) {
      setBody(content.body);
      setTitle(content.title || '');
      setSlug(content.slug || '');
      setSeoTitle(content.seo_title || '');
      setSeoDescription(content.seo_description || '');
      setIsDirty(false);
    }
  }, [content]);

  const handleFieldChange = useCallback(
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setIsDirty(true);
    },
    []
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { body };
      if (content?.content_type === 'blog_post') {
        payload.title = title;
        payload.slug = slug;
        payload.seo_title = seoTitle;
        payload.seo_description = seoDescription;
      }
      const response = await fetch(`/api/content/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save content');
      return response.json();
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['content', params.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject' | 'publish') => {
      if (action === 'approve') {
        const response = await fetch(`/api/content/${params.id}/approve`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to approve');
        return response.json();
      }
      const newStatus = action === 'reject' ? 'rejected' : 'published';
      const response = await fetch(`/api/content/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error(`Failed to ${action}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', params.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
    },
  });

  const charLimit = content ? CHAR_LIMITS[content.content_type] : undefined;
  const charCount = body.length;
  const isOverLimit = charLimit !== undefined && charCount > charLimit;
  const isBlogPost = content?.content_type === 'blog_post';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">
            {error ? (error as Error).message : 'Content not found.'}
          </p>
          <Link href="/admin/content" className="text-sm underline mt-2 inline-block">
            Back to queue
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/content"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to queue
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Edit Content</h1>
          <Badge variant={statusVariant[content.status]}>
            {content.status.replace('_', ' ')}
          </Badge>
          <Badge variant="secondary">
            {content.content_type.replace('_', ' ')}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          Created {format(new Date(content.created_at), 'MMM d, yyyy h:mm a')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isBlogPost && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={handleFieldChange(setTitle)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Post title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={handleFieldChange(setSlug)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="post-url-slug"
                />
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">Body</label>
              {charLimit !== undefined && (
                <span
                  className={cn(
                    'text-xs',
                    isOverLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'
                  )}
                >
                  {charCount} / {charLimit}
                  {isOverLimit && (
                    <AlertTriangle className="inline h-3 w-3 ml-1" />
                  )}
                </span>
              )}
            </div>
            <textarea
              value={body}
              onChange={handleFieldChange(setBody)}
              rows={isBlogPost ? 20 : 8}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono',
                isOverLimit && 'border-destructive focus-visible:ring-destructive'
              )}
              placeholder="Content body..."
            />
          </div>

          {isBlogPost && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SEO Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">SEO Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={handleFieldChange(setSeoTitle)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="SEO title (50-60 characters recommended)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {seoTitle.length} characters
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">SEO Description</label>
                  <textarea
                    value={seoDescription}
                    onChange={handleFieldChange(setSeoDescription)}
                    rows={3}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="SEO meta description (150-160 characters recommended)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {seoDescription.length} characters
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !isDirty}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>

              {(content.status === 'pending_review' || content.status === 'draft') && (
                <button
                  onClick={() => statusMutation.mutate('approve')}
                  disabled={statusMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>
              )}

              {content.status === 'approved' && (
                <button
                  onClick={() => statusMutation.mutate('publish')}
                  disabled={statusMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Publish
                </button>
              )}

              {content.status !== 'rejected' && content.status !== 'archived' && (
                <button
                  onClick={() => statusMutation.mutate('reject')}
                  disabled={statusMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-destructive text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              )}

              {saveMutation.isError && (
                <p className="text-xs text-destructive">
                  {(saveMutation.error as Error).message}
                </p>
              )}
              {statusMutation.isError && (
                <p className="text-xs text-destructive">
                  {(statusMutation.error as Error).message}
                </p>
              )}
              {saveMutation.isSuccess && (
                <p className="text-xs text-green-600">Saved successfully.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{content.content_type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusVariant[content.status]} className="text-xs">
                  {content.status.replace('_', ' ')}
                </Badge>
              </div>
              {content.paper_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paper ID</span>
                  <span className="text-xs font-mono truncate max-w-[140px]">{content.paper_id}</span>
                </div>
              )}
              {content.published_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <span>{format(new Date(content.published_at), 'MMM d, yyyy')}</span>
                </div>
              )}
              {content.scheduled_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span>{format(new Date(content.scheduled_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(new Date(content.updated_at), 'MMM d, yyyy')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
