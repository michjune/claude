import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Layers, Share2, Video } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();

  const [papersRes, contentRes, socialRes, videosRes, cronRes] = await Promise.all([
    supabase.from('papers').select('id', { count: 'exact', head: true }),
    supabase.from('content').select('id, status', { count: 'exact' }),
    supabase.from('social_posts').select('id', { count: 'exact', head: true }),
    supabase.from('videos').select('id', { count: 'exact', head: true }),
    supabase.from('cron_jobs').select('*').order('last_run_at', { ascending: false }),
  ]);

  const totalPapers = papersRes.count || 0;
  const contentItems = contentRes.data || [];
  const pendingReview = contentItems.filter((c) => c.status === 'pending_review').length;
  const published = contentItems.filter((c) => c.status === 'published').length;
  const totalSocialPosts = socialRes.count || 0;
  const totalVideos = videosRes.count || 0;

  const stats = [
    { label: 'Total Papers', value: totalPapers, icon: FileText },
    { label: 'Pending Review', value: pendingReview, icon: Layers },
    { label: 'Published', value: published, icon: Layers },
    { label: 'Social Posts', value: totalSocialPosts, icon: Share2 },
    { label: 'Videos', value: totalVideos, icon: Video },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your StemCell Pulse platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Cron Job Status</h2>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Job</th>
                <th className="p-3 text-left font-medium">Last Run</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Items</th>
              </tr>
            </thead>
            <tbody>
              {cronRes.data?.map((job) => (
                <tr key={job.id} className="border-b">
                  <td className="p-3 font-mono text-xs">{job.job_name}</td>
                  <td className="p-3 text-muted-foreground">
                    {job.last_run_at
                      ? new Date(job.last_run_at).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        job.last_status === 'success'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : job.last_status === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : job.last_status === 'running'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {job.last_status || 'idle'}
                    </span>
                  </td>
                  <td className="p-3">{job.items_processed}</td>
                </tr>
              )) ?? (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-muted-foreground">
                    No cron jobs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
