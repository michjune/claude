import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content_id, event_type, event_data, session_id } = body;

    if (!event_type) {
      return new NextResponse(null, { status: 400 });
    }

    const admin = createAdminClient();
    await admin.from('analytics_events').insert({
      content_id: content_id || null,
      event_type,
      event_data: event_data || {},
      session_id: session_id || null,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
