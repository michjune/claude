'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { PlatformSetting, Platform, PublishMode } from '@/lib/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  Music2,
  Save,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  Clock,
} from 'lucide-react';

const platformIcons: Record<Platform, React.ElementType> = {
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music2,
};

const platformLabels: Record<Platform, string> = {
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

const DEFAULT_BEST_TIMES: Record<Platform, string[]> = {
  twitter: ['13:00', '17:00'],
  linkedin: ['12:00', '15:00'],
  instagram: ['14:00', '19:00'],
  facebook: ['13:00', '16:00'],
  tiktok: ['19:00', '21:00'],
  youtube: ['15:00', '18:00'],
};

const ALL_PLATFORMS: Platform[] = ['twitter', 'instagram', 'linkedin', 'facebook', 'youtube', 'tiktok'];

interface LocalSetting {
  id?: string;
  platform: Platform;
  is_active: boolean;
  publish_mode: PublishMode;
  max_posts_per_day: number;
  best_times: string[];
  has_custom_times: boolean;
}

export default function SchedulingPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<Platform, LocalSetting>>({} as Record<Platform, LocalSetting>);
  const [saveStatus, setSaveStatus] = useState<Record<Platform, 'idle' | 'saving' | 'saved' | 'error'>>({} as Record<Platform, 'idle' | 'saving' | 'saved' | 'error'>);
  const [addingTime, setAddingTime] = useState<Record<Platform, boolean>>({} as Record<Platform, boolean>);
  const [newTimeValue, setNewTimeValue] = useState<Record<Platform, string>>({} as Record<Platform, string>);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('platform');
      if (error) throw error;
      return data as PlatformSetting[];
    },
  });

  useEffect(() => {
    if (settings) {
      const mapped: Record<string, LocalSetting> = {};
      const statusMap: Record<string, 'idle'> = {};

      ALL_PLATFORMS.forEach((platform) => {
        const existing = settings.find((s) => s.platform === platform);
        const hasCustom = existing?.best_times && existing.best_times.length > 0;
        mapped[platform] = {
          id: existing?.id,
          platform,
          is_active: existing?.is_active ?? false,
          publish_mode: existing?.publish_mode ?? 'approval_required',
          max_posts_per_day: existing?.max_posts_per_day ?? 3,
          best_times: hasCustom ? existing!.best_times : DEFAULT_BEST_TIMES[platform],
          has_custom_times: !!hasCustom,
        };
        statusMap[platform] = 'idle';
      });

      setLocalSettings(mapped as Record<Platform, LocalSetting>);
      setSaveStatus(statusMap as Record<Platform, 'idle'>);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (platform: Platform) => {
      const setting = localSettings[platform];
      if (!setting) throw new Error('Setting not found');

      setSaveStatus((prev) => ({ ...prev, [platform]: 'saving' }));

      const payload = {
        platform: setting.platform,
        is_active: setting.is_active,
        publish_mode: setting.publish_mode,
        max_posts_per_day: setting.max_posts_per_day,
        best_times: setting.has_custom_times ? setting.best_times : [],
      };

      if (setting.id) {
        const { error } = await supabase
          .from('platform_settings')
          .update(payload)
          .eq('id', setting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_data, platform) => {
      setSaveStatus((prev) => ({ ...prev, [platform]: 'saved' }));
      queryClient.invalidateQueries({ queryKey: ['admin-platform-settings'] });
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [platform]: 'idle' }));
      }, 2000);
    },
    onError: (_error, platform) => {
      setSaveStatus((prev) => ({ ...prev, [platform]: 'error' }));
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [platform]: 'idle' }));
      }, 3000);
    },
  });

  const updateSetting = (platform: Platform, updates: Partial<LocalSetting>) => {
    setLocalSettings((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], ...updates },
    }));
  };

  const addTime = (platform: Platform, time: string) => {
    const setting = localSettings[platform];
    if (!setting || setting.best_times.includes(time)) return;
    const sorted = [...setting.best_times, time].sort();
    updateSetting(platform, { best_times: sorted, has_custom_times: true });
    setAddingTime((prev) => ({ ...prev, [platform]: false }));
    setNewTimeValue((prev) => ({ ...prev, [platform]: '' }));
  };

  const removeTime = (platform: Platform, time: string) => {
    const setting = localSettings[platform];
    if (!setting) return;
    const filtered = setting.best_times.filter((t) => t !== time);
    updateSetting(platform, {
      best_times: filtered.length > 0 ? filtered : DEFAULT_BEST_TIMES[platform],
      has_custom_times: filtered.length > 0,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure publishing behavior for each social media platform.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ALL_PLATFORMS.map((platform) => {
            const setting = localSettings[platform];
            if (!setting) return null;

            const Icon = platformIcons[platform];
            const status = saveStatus[platform] || 'idle';
            const isAdding = addingTime[platform] || false;

            return (
              <Card key={platform} className={cn(!setting.is_active && 'opacity-70')}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-base">{platformLabels[platform]}</CardTitle>
                    </div>
                    <button
                      onClick={() => updateSetting(platform, { is_active: !setting.is_active })}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        setting.is_active ? 'bg-primary' : 'bg-muted'
                      )}
                      role="switch"
                      aria-checked={setting.is_active}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                          setting.is_active ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                  <CardDescription>
                    {setting.is_active ? 'Active' : 'Inactive'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Publish Mode</label>
                    <select
                      value={setting.publish_mode}
                      onChange={(e) =>
                        updateSetting(platform, { publish_mode: e.target.value as PublishMode })
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="auto">Auto Publish</option>
                      <option value="approval_required">Requires Approval</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Posts Per Day</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={setting.max_posts_per_day}
                      onChange={(e) =>
                        updateSetting(platform, {
                          max_posts_per_day: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Publish Windows (UTC)
                      </label>
                      {!setting.has_custom_times && (
                        <span className="text-xs text-muted-foreground">(defaults)</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {setting.best_times.map((time) => (
                        <button
                          key={time}
                          onClick={() => removeTime(platform, time)}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-destructive/10 hover:text-destructive transition-colors group"
                          title="Click to remove"
                        >
                          {time}
                          <X className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                      {isAdding ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="time"
                            value={newTimeValue[platform] || ''}
                            onChange={(e) =>
                              setNewTimeValue((prev) => ({ ...prev, [platform]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newTimeValue[platform]) {
                                addTime(platform, newTimeValue[platform]);
                              }
                              if (e.key === 'Escape') {
                                setAddingTime((prev) => ({ ...prev, [platform]: false }));
                              }
                            }}
                            className="h-6 w-24 rounded border border-input bg-background px-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              if (newTimeValue[platform]) addTime(platform, newTimeValue[platform]);
                            }}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setAddingTime((prev) => ({ ...prev, [platform]: false }))}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 text-xs"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingTime((prev) => ({ ...prev, [platform]: true }))}
                          className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-muted-foreground/30 px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <button
                    onClick={() => saveMutation.mutate(platform)}
                    disabled={status === 'saving'}
                    className={cn(
                      'inline-flex items-center gap-2 w-full justify-center rounded-md text-sm font-medium h-9 px-4 transition-colors disabled:opacity-50',
                      status === 'saved'
                        ? 'bg-green-600 text-white'
                        : status === 'error'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                  >
                    {status === 'saving' && <Save className="h-4 w-4 animate-pulse" />}
                    {status === 'saved' && <CheckCircle className="h-4 w-4" />}
                    {status === 'error' && <AlertCircle className="h-4 w-4" />}
                    {status === 'idle' && <Save className="h-4 w-4" />}
                    {status === 'saving'
                      ? 'Saving...'
                      : status === 'saved'
                        ? 'Saved!'
                        : status === 'error'
                          ? 'Error - Retry'
                          : 'Save'}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
