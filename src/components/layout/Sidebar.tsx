import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const topics = [
  'Regenerative Medicine',
  'iPSC Research',
  'Gene Therapy',
  'Tissue Engineering',
  'Clinical Trials',
  'Hematopoietic Stem Cells',
  'Neural Stem Cells',
  'Cancer Stem Cells',
];

export async function Sidebar() {
  const supabase = createServerSupabaseClient();

  const { data: recentPosts } = await supabase
    .from('content')
    .select('id, title, slug, published_at')
    .eq('content_type', 'blog_post')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(5);

  return (
    <aside className="w-full lg:w-80 space-y-8">
      <div>
        <h3 className="font-semibold mb-4">Recent Posts</h3>
        <ul className="space-y-3">
          {recentPosts?.map((post) => (
            <li key={post.id}>
              <Link
                href={`/posts/${post.slug}`}
                className="text-sm text-muted-foreground hover:text-foreground line-clamp-2"
              >
                {post.title}
              </Link>
            </li>
          )) ?? (
            <li className="text-sm text-muted-foreground">No posts yet.</li>
          )}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Topics</h3>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <Link
              key={topic}
              href={`/topics/${topic.toLowerCase().replace(/\s+/g, '-')}`}
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {topic}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-2">Newsletter</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Get the latest stem cell research delivered to your inbox.
        </p>
        <form action="/api/newsletter/subscribe" method="POST" className="space-y-2">
          <input
            type="email"
            name="email"
            placeholder="your@email.com"
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 hover:bg-primary/90 transition-colors"
          >
            Subscribe
          </button>
        </form>
      </div>
    </aside>
  );
}
