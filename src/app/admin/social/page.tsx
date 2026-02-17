'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { SocialAccount, SocialPost, Platform } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  Music2,
  Link2,
  Unplug,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const platformIcons: Record<Platform, React.ElementType> = {
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music2,
};

const platformColors: Record<Platform, string> = {
  twitter: 'bg-sky-500/10 text-sky-600',
  instagram: 'bg-pink-500/10 text-pink-600',
  linkedin: 'bg-blue-600/10 text-blue-700',
  facebook: 'bg-blue-500/10 text-blue-600',
  youtube: 'bg-red-500/10 text-red-600',
  tiktok: 'bg-neutral-800/10 text-neutral-800 dark:bg-neutral-200/10 dark:text-neutral-200',
};

const postStatusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  published: 'default',
  pending: 'secondary',
  failed: 'destructive',
};

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

export default function SocialPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['admin-social-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SocialAccount[];
    },
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['admin-social-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*, content(title)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as (SocialPost & { content: { title: string | null } | null })[];
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      setDisconnecting(accountId);
      const { error } = await supabase
        .from('social_accounts')
        .update({ is_active: false })
        .eq('id', accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-social-accounts'] });
    },
    onSettled: () => {
      setDisconnecting(null);
    },
  });

  const isTokenExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Social Accounts & Queue</h1>
        <p className="text-muted-foreground mt-1">
          Manage connected social media accounts and view the post queue.
        </p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="queue">Post Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connected Accounts</h2>
            <div className="flex items-center gap-2">
              <a
                href="/api/social/oauth/connect?platform=twitter"
                className="inline-flex items-center gap-2 rounded-md text-sm font-medium h-9 px-4 transition-colors bg-sky-500/10 text-sky-600 hover:bg-sky-500/20"
              >
                <Twitter className="h-4 w-4" />
                Connect Twitter
              </a>
              <a
                href="/api/social/oauth/connect?platform=instagram"
                className="inline-flex items-center gap-2 rounded-md text-sm font-medium h-9 px-4 transition-colors bg-pink-500/10 text-pink-600 hover:bg-pink-500/20"
              >
                <Instagram className="h-4 w-4" />
                Connect Instagram
              </a>
              <a
                href="/api/social/oauth/connect?platform=youtube"
                className="inline-flex items-center gap-2 rounded-md text-sm font-medium h-9 px-4 transition-colors bg-red-500/10 text-red-600 hover:bg-red-500/20"
              >
                <Youtube className="h-4 w-4" />
                Connect YouTube
              </a>
            </div>
          </div>

          {accountsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : accounts && accounts.length > 0 ? (
            <div className="space-y-3">
              {accounts.map((account) => {
                const Icon = platformIcons[account.platform];
                const expired = isTokenExpired(account.token_expires_at);

                return (
                  <Card key={account.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className={cn('p-2.5 rounded-lg', platformColors[account.platform])}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{account.platform}</span>
                            {account.platform_username && (
                              <span className="text-sm text-muted-foreground">
                                @{account.platform_username}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {account.is_active ? (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Disconnected</Badge>
                            )}
                            {account.token_expires_at && (
                              <span className={cn(expired && 'text-destructive')}>
                                Token {expired ? 'expired' : 'expires'}{' '}
                                {format(new Date(account.token_expires_at), 'MMM d, yyyy')}
                              </span>
                            )}
                            {expired && (
                              <span className="inline-flex items-center gap-1 text-destructive">
                                <AlertCircle className="h-3 w-3" />
                                Needs reauthorization
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {account.is_active && (
                        <button
                          onClick={() => disconnectMutation.mutate(account.id)}
                          disabled={disconnecting === account.id}
                          className="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-destructive text-destructive h-9 px-4 hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50 transition-colors"
                        >
                          <Unplug className="h-4 w-4" />
                          Disconnect
                        </button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No social accounts connected yet.</p>
                <p className="text-sm mt-1">Click &quot;Connect Account&quot; to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold">Post Queue</h2>

          {postsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map((post) => {
                const Icon = platformIcons[post.platform];

                return (
                  <Card key={post.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('p-1.5 rounded', platformColors[post.platform])}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <Badge variant={postStatusVariant[post.status] || 'outline'}>
                            {post.status}
                          </Badge>
                          {post.content?.title && (
                            <span className="text-sm text-muted-foreground">
                              {truncate(post.content.title, 60)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>

                      {post.status === 'published' && post.post_url && (
                        <a
                          href={post.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          View post <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      {post.status === 'published' && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {post.likes_count > 0 && <span>{post.likes_count} likes</span>}
                          {post.shares_count > 0 && <span>{post.shares_count} shares</span>}
                          {post.comments_count > 0 && <span>{post.comments_count} comments</span>}
                          {post.views_count > 0 && <span>{post.views_count} views</span>}
                          {post.published_at && (
                            <span>
                              Published {format(new Date(post.published_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          )}
                        </div>
                      )}

                      {post.status === 'failed' && post.error_message && (
                        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{post.error_message}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No posts in the queue.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
