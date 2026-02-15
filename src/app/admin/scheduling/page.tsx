'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { PlatformSetting, Platform, PublishMode } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
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

const ALL_PLATFORMS: Platform[] = ['twitter', 'instagram', 'linkedin', 'facebook', 'youtube', 'tiktok'];

interface LocalSetting {
  id?: string;
  platform: Platform;
  is_active: boolean;
  publish_mode: PublishMode;
  max_posts_per_day: number;
}

export default function SchedulingPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<Platform, LocalSetting>>({} as Record<Platform, LocalSetting>);
  const [saveStatus, setSaveStatus] = useState<Record<Platform, 'idle' | 'saving' | 'saved' | 'error'>>({} as Record<Platform, 'idle' | 'saving' | 'saved' | 'error'>);

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
        mapped[platform] = {
          id: existing?.id,
          platform,
          is_active: existing?.is_active ?? false,
          publish_mode: existing?.publish_mode ?? 'approval_required',
          max_posts_per_day: existing?.max_posts_per_day ?? 3,
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
