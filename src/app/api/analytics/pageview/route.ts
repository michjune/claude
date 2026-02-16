import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content_id, path, referrer, utm_source, utm_medium, utm_campaign, device_type, session_id } = body;

    if (!path) {
      return new NextResponse(null, { status: 400 });
    }

    const admin = createAdminClient();
    await admin.from('page_views').insert({
      content_id: content_id || null,
      path,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      device_type: device_type || null,
      session_id: session_id || null,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
