'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Journal, CronJob } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { AiToneSetting } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Plus,
  ToggleLeft,
  ToggleRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Server,
  Info,
  Sparkles,
  Save,
  Search,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react';
import { format } from 'date-fns';

const cronStatusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  success: 'default',
  running: 'secondary',
  failed: 'destructive',
};

export default function AdminSettingsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Journal form state
  const [newJournal, setNewJournal] = useState({
    name: '',
    issn: '',
    impact_factor: '',
  });
  const [journalFormOpen, setJournalFormOpen] = useState(false);

  // Tone settings state
  const [toneForm, setToneForm] = useState({
    tone: 'Professional',
    blog_style: '',
    social_style: '',
    video_style: '',
  });

  // Tone settings query
  const { data: toneSettings, isLoading: toneLoading } = useQuery({
    queryKey: ['admin-tone-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_tone_settings')
        .select('*');
      if (error) throw error;
      return data as AiToneSetting[];
    },
  });

  // Sync tone form when data loads
  useEffect(() => {
    if (toneSettings && toneSettings.length > 0) {
      const map: Record<string, string> = {};
      for (const s of toneSettings) map[s.setting_key] = s.value;
      setToneForm({
        tone: map.tone || 'Professional',
        blog_style: map.blog_style || '',
        social_style: map.social_style || '',
        video_style: map.video_style || '',
      });
    }
  }, [toneSettings]);

  // Save tone settings mutation
  const saveToneMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(toneForm);
      for (const [key, value] of entries) {
        const { error } = await supabase
          .from('ai_tone_settings')
          .upsert({ setting_key: key, value, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });
        if (error) throw error;
      }
      // Clear server-side cache
      await fetch('/api/settings/tone', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tone-settings'] });
    },
  });

  // GSC settings
  const [gscSiteUrl, setGscSiteUrl] = useState('');

  const { data: gscStatus, isLoading: gscLoading, refetch: refetchGsc } = useQuery({
    queryKey: ['gsc-status'],
    queryFn: async () => {
      const res = await fetch('/api/settings/search-console');
      if (!res.ok) throw new Error('Failed to fetch GSC status');
      return res.json() as Promise<{
        connected: boolean;
        siteUrl: string | null;
        lastSync: string | null;
        lastStatus: string | null;
        itemsProcessed: number;
        oauthUrl: string;
      }>;
    },
  });

  const saveSiteUrlMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/search-console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: gscSiteUrl }),
      });
      if (!res.ok) throw new Error('Failed to save site URL');
    },
    onSuccess: () => refetchGsc(),
  });

  const disconnectGscMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/search-console', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
    },
    onSuccess: () => {
      setGscSiteUrl('');
      refetchGsc();
    },
  });

  // Sync GSC site URL when data loads
  useEffect(() => {
    if (gscStatus?.siteUrl) setGscSiteUrl(gscStatus.siteUrl);
  }, [gscStatus?.siteUrl]);

  const TONE_PRESETS = ['Professional', 'Casual', 'Enthusiastic', 'Custom'] as const;

  // Journals query
  const { data: journals, isLoading: journalsLoading } = useQuery({
    queryKey: ['admin-journals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Journal[];
    },
  });

  // Cron jobs query
  const { data: cronJobs, isLoading: cronLoading } = useQuery({
    queryKey: ['admin-cron-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_jobs')
        .select('*')
        .order('job_name');
      if (error) throw error;
      return data as CronJob[];
    },
    refetchInterval: 30000,
  });

  // Toggle journal active state
  const toggleJournalMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('journals')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-journals'] });
    },
  });

  // Add journal
  const addJournalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('journals').insert({
        name: newJournal.name,
        issn: newJournal.issn || null,
        impact_factor: newJournal.impact_factor
          ? parseFloat(newJournal.impact_factor)
          : null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-journals'] });
      setNewJournal({ name: '', issn: '', impact_factor: '' });
      setJournalFormOpen(false);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage journals, monitor cron jobs, and view system information.
        </p>
      </div>

      <Tabs defaultValue="journals">
        <TabsList>
          <TabsTrigger value="journals">Journals</TabsTrigger>
          <TabsTrigger value="tone">AI Tone</TabsTrigger>
          <TabsTrigger value="cron">Cron Jobs</TabsTrigger>
          <TabsTrigger value="search-console">Search Console</TabsTrigger>
          <TabsTrigger value="system">System Info</TabsTrigger>
        </TabsList>

        {/* Journals Tab */}
        <TabsContent value="journals" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Monitored Journals</h2>
            <button
              onClick={() => setJournalFormOpen(!journalFormOpen)}
              className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Journal
            </button>
          </div>

          {/* Add Journal Form */}
          {journalFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add New Journal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Name *</label>
                    <input
                      type="text"
                      value={newJournal.name}
                      onChange={(e) =>
                        setNewJournal((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g. Nature Stem Cell Research"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">ISSN</label>
                    <input
                      type="text"
                      value={newJournal.issn}
                      onChange={(e) =>
                        setNewJournal((prev) => ({ ...prev, issn: e.target.value }))
                      }
                      placeholder="e.g. 1234-5678"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Impact Factor</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newJournal.impact_factor}
                      onChange={(e) =>
                        setNewJournal((prev) => ({ ...prev, impact_factor: e.target.value }))
                      }
                      placeholder="e.g. 12.5"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addJournalMutation.mutate()}
                    disabled={!newJournal.name || addJournalMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {addJournalMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Add Journal
                  </button>
                  <button
                    onClick={() => {
                      setJournalFormOpen(false);
                      setNewJournal({ name: '', issn: '', impact_factor: '' });
                    }}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-input bg-background h-9 px-4 hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {addJournalMutation.isError && (
                  <p className="text-sm text-destructive">
                    Failed to add journal: {(addJournalMutation.error as Error).message}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Journals list */}
          {journalsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : journals && journals.length > 0 ? (
            <div className="space-y-2">
              {journals.map((journal) => (
                <Card key={journal.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{journal.name}</span>
                          {journal.is_active ? (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {journal.issn && <span>ISSN: {journal.issn}</span>}
                          {journal.impact_factor && (
                            <span>IF: {journal.impact_factor}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        toggleJournalMutation.mutate({
                          id: journal.id,
                          is_active: !journal.is_active,
                        })
                      }
                      disabled={toggleJournalMutation.isPending}
                      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      title={journal.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {journal.is_active ? (
                        <ToggleRight className="h-6 w-6 text-primary" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No journals configured yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Tone Tab */}
        <TabsContent value="tone" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">AI Tone & Style</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure the writing style used when generating content.
              </p>
            </div>
          </div>

          {toneLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tone Preset */}
              <Card>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <label className="text-sm font-medium">Tone Preset</label>
                  </div>
                  <select
                    value={TONE_PRESETS.includes(toneForm.tone as typeof TONE_PRESETS[number]) ? toneForm.tone : 'Custom'}
                    onChange={(e) =>
                      setToneForm((prev) => ({ ...prev, tone: e.target.value }))
                    }
                    className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {TONE_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              {/* Blog Style */}
              <Card>
                <CardContent className="py-4 space-y-3">
                  <label className="text-sm font-medium">Blog Style Instructions</label>
                  <textarea
                    value={toneForm.blog_style}
                    onChange={(e) =>
                      setToneForm((prev) => ({ ...prev, blog_style: e.target.value }))
                    }
                    rows={3}
                    placeholder="Instructions for blog post writing style..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  />
                </CardContent>
              </Card>

              {/* Social Style */}
              <Card>
                <CardContent className="py-4 space-y-3">
                  <label className="text-sm font-medium">Social Media Style Instructions</label>
                  <textarea
                    value={toneForm.social_style}
                    onChange={(e) =>
                      setToneForm((prev) => ({ ...prev, social_style: e.target.value }))
                    }
                    rows={3}
                    placeholder="Instructions for social media content style..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  />
                </CardContent>
              </Card>

              {/* Video Style */}
              <Card>
                <CardContent className="py-4 space-y-3">
                  <label className="text-sm font-medium">Video Script Style Instructions</label>
                  <textarea
                    value={toneForm.video_style}
                    onChange={(e) =>
                      setToneForm((prev) => ({ ...prev, video_style: e.target.value }))
                    }
                    rows={3}
                    placeholder="Instructions for video script style..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                  />
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => saveToneMutation.mutate()}
                  disabled={saveToneMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saveToneMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Tone Settings
                </button>
                {saveToneMutation.isSuccess && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Saved
                  </span>
                )}
                {saveToneMutation.isError && (
                  <span className="text-sm text-destructive">
                    Failed to save: {(saveToneMutation.error as Error).message}
                  </span>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Cron Jobs Tab */}
        <TabsContent value="cron" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cron Job Status</h2>
            <span className="text-xs text-muted-foreground">Auto-refreshes every 30s</span>
          </div>

          {cronLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : cronJobs && cronJobs.length > 0 ? (
            <div className="space-y-3">
              {cronJobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {job.last_status === 'success' && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {job.last_status === 'failed' && (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          {job.last_status === 'running' && (
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                          )}
                          {!job.last_status && (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium text-sm font-mono">
                            {job.job_name}
                          </span>
                        </div>
                        {job.last_status && (
                          <Badge variant={cronStatusVariant[job.last_status] || 'outline'}>
                            {job.last_status}
                          </Badge>
                        )}
                      </div>

                      <div className="text-right text-xs text-muted-foreground">
                        {job.last_run_at ? (
                          <span>
                            Last run: {format(new Date(job.last_run_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        ) : (
                          <span>Never run</span>
                        )}
                        {job.items_processed > 0 && (
                          <p>{job.items_processed} items processed</p>
                        )}
                      </div>
                    </div>

                    {job.last_error && (
                      <div className="mt-3 flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="font-mono text-xs">{job.last_error}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No cron jobs registered yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Search Console Tab */}
        <TabsContent value="search-console" className="mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Google Search Console</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect Google Search Console to see which Google queries drive traffic to your site.
            </p>
          </div>

          {gscLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connection Status */}
              <Card>
                <CardContent className="py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Connection Status</span>
                    </div>
                    {gscStatus?.connected ? (
                      <Badge variant="default">Connected</Badge>
                    ) : (
                      <Badge variant="outline">Not Connected</Badge>
                    )}
                  </div>

                  {gscStatus?.connected && gscStatus.siteUrl && (
                    <div className="text-sm text-muted-foreground">
                      <p>Site: <span className="font-mono">{gscStatus.siteUrl}</span></p>
                      {gscStatus.lastSync && (
                        <p className="mt-1">
                          Last sync: {format(new Date(gscStatus.lastSync), 'MMM d, yyyy h:mm a')}
                          {gscStatus.lastStatus && (
                            <Badge
                              variant={cronStatusVariant[gscStatus.lastStatus] || 'outline'}
                              className="ml-2"
                            >
                              {gscStatus.lastStatus}
                            </Badge>
                          )}
                          {gscStatus.itemsProcessed > 0 && (
                            <span className="ml-2">({gscStatus.itemsProcessed} queries)</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Site URL */}
              <Card>
                <CardContent className="py-4 space-y-3">
                  <label className="text-sm font-medium">Site URL</label>
                  <p className="text-xs text-muted-foreground">
                    The property URL as it appears in Google Search Console (e.g., https://example.com or sc-domain:example.com).
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gscSiteUrl}
                      onChange={(e) => setGscSiteUrl(e.target.value)}
                      placeholder="https://yoursite.com"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <button
                      onClick={() => saveSiteUrlMutation.mutate()}
                      disabled={!gscSiteUrl || saveSiteUrlMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {saveSiteUrlMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Connect / Disconnect */}
              <div className="flex items-center gap-3">
                {gscStatus?.connected ? (
                  <button
                    onClick={() => disconnectGscMutation.mutate()}
                    disabled={disconnectGscMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-destructive text-destructive h-9 px-4 hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                  >
                    {disconnectGscMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                    Disconnect
                  </button>
                ) : (
                  <a
                    href={gscStatus?.oauthUrl}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 hover:bg-primary/90 transition-colors"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Connect Google Search Console
                  </a>
                )}
                {disconnectGscMutation.isSuccess && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Disconnected
                  </span>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* System Info Tab */}
        <TabsContent value="system" className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold">System Information</h2>

          <Card>
            <CardContent className="py-6 space-y-4">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Environment</CardTitle>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">NODE_ENV</p>
                  <Badge variant="outline" className="font-mono">
                    {process.env.NODE_ENV || 'unknown'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Supabase URL</p>
                  <p className="text-sm font-mono truncate">
                    {process.env.NEXT_PUBLIC_SUPABASE_URL
                      ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/https?:\/\//, '').split('.')[0] + '.supabase.co'
                      : 'Not configured'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Platform</p>
                  <p className="text-sm">Next.js (App Router)</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Database</p>
                  <p className="text-sm">Supabase (PostgreSQL)</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted rounded-md p-3">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  For detailed system logs and monitoring, check your Supabase dashboard
                  and Vercel deployment logs.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
