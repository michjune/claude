'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function usePapers(limit = 100) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['papers', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}
