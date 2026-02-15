'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Video, VideoStatus } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Video as VideoIcon,
  RefreshCw,
  Play,
  AlertCircle,
  Clock,
  Mic,
  Film,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<VideoStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ElementType;
  color: string;
}> = {
  pending: { label: 'Pending', variant: 'outline', icon: Clock, color: 'text-muted-foreground' },
  generating_audio: { label: 'Generating Audio', variant: 'secondary', icon: Mic, color: 'text-amber-600' },
  rendering: { label: 'Rendering', variant: 'secondary', icon: Film, color: 'text-blue-600' },
  completed: { label: 'Completed', variant: 'default', icon: CheckCircle, color: 'text-green-600' },
  failed: { label: 'Failed', variant: 'destructive', icon: AlertCircle, color: 'text-destructive' },
};

const inProgressStatuses: VideoStatus[] = ['pending', 'generating_audio', 'rendering'];

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

export default function VideosPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: videos, isLoading, error } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Video[];
    },
    refetchInterval: (query) => {
      const data = query.state.data as Video[] | undefined;
      if (!data) return false;
      const hasInProgress = data.some((v) => inProgressStatuses.includes(v.status));
      return hasInProgress ? 5000 : false;
    },
  });

  const reRenderMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const res = await fetch('/api/videos/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });
      if (!res.ok) throw new Error('Failed to re-render video');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Video Queue</h1>
        <p className="text-muted-foreground mt-1">
          Monitor video generation, rendering progress, and playback.
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load videos: {(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {videos && videos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <VideoIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No videos in the queue yet.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {videos?.map((video) => {
          const config = statusConfig[video.status];
          const StatusIcon = config.icon;
          const isInProgress = inProgressStatuses.includes(video.status);

          return (
            <Card key={video.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn('h-4 w-4', config.color)} />
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(video.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <CardTitle className="text-sm font-medium mt-2">
                  {truncate(video.script, 100)}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{video.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        video.status === 'completed' && 'bg-green-500',
                        video.status === 'failed' && 'bg-destructive',
                        isInProgress && 'bg-primary animate-pulse',
                        video.status === 'pending' && 'bg-muted-foreground'
                      )}
                      style={{ width: `${video.progress}%` }}
                    />
                  </div>
                </div>

                {/* Script preview */}
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Script</p>
                  <p className="text-sm whitespace-pre-wrap line-clamp-4">{video.script}</p>
                </div>

                {/* Duration info */}
                {video.duration_seconds && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
                  </p>
                )}

                {/* Audio player */}
                {video.voiceover_url && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Voiceover</p>
                    <audio
                      controls
                      className="w-full h-8"
                      src={video.voiceover_url}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}

                {/* Video player */}
                {video.video_url && video.status === 'completed' && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Video</p>
                    <video
                      controls
                      className="w-full rounded-md"
                      src={video.video_url}
                      poster={video.thumbnail_url || undefined}
                    >
                      Your browser does not support the video element.
                    </video>
                  </div>
                )}

                {/* Error message */}
                {video.status === 'failed' && video.error_message && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{video.error_message}</span>
                  </div>
                )}

                {/* Re-render button for failed videos */}
                {video.status === 'failed' && (
                  <button
                    onClick={() => reRenderMutation.mutate(video.id)}
                    disabled={reRenderMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-input bg-background h-9 px-4 hover:bg-accent disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={cn('h-4 w-4', reRenderMutation.isPending && 'animate-spin')} />
                    Re-render
                  </button>
                )}

                {/* In-progress indicator */}
                {isInProgress && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Auto-refreshing every 5 seconds...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
