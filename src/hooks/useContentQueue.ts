'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ContentStatus, ContentType } from '@/lib/supabase/types';

interface UseContentQueueOptions {
  status?: ContentStatus;
  contentType?: ContentType;
  limit?: number;
}

export function useContentQueue(options: UseContentQueueOptions = {}) {
  const { status, contentType, limit = 50 } = options;
  const supabase = createClient();

  return useQuery({
    queryKey: ['content-queue', status, contentType, limit],
    queryFn: async () => {
      let query = supabase
        .from('content')
        .select('*, papers(title, journal_name)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) query = query.eq('status', status);
      if (contentType) query = query.eq('content_type', contentType);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
