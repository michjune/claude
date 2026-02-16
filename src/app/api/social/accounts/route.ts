import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getAuthenticatedAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: 'Unauthorized' };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { user: null, error: 'Forbidden: admin role required' };
  }

  return { user, error: null };
}

export async function GET() {
  const { user, error: authError } = await getAuthenticatedAdmin();
  if (!user) {
    const status = authError === 'Unauthorized' ? 401 : 403;
    return NextResponse.json({ error: authError }, { status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('social_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedAdmin();
  if (!user) {
    const status = authError === 'Unauthorized' ? 401 : 403;
    return NextResponse.json({ error: authError }, { status });
  }

  const body = await request.json();
  const {
    platform,
    platform_user_id,
    platform_username,
    access_token,
    refresh_token,
    token_expires_at,
  } = body;

  if (!platform || !platform_user_id || !access_token) {
    return NextResponse.json(
      { error: 'Missing required fields: platform, platform_user_id, access_token' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Check if account already exists for this platform + platform_user_id
  const { data: existing } = await admin
    .from('social_accounts')
    .select('id')
    .eq('platform', platform)
    .eq('platform_user_id', platform_user_id)
    .single();

  if (existing) {
    // Update existing account
    const { data, error } = await admin
      .from('social_accounts')
      .update({
        platform_username,
        access_token,
        refresh_token: refresh_token || null,
        token_expires_at: token_expires_at || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from('activity_log').insert({
      user_id: user.id,
      action: 'update_social_account',
      entity_type: 'social_account',
      entity_id: data.id,
      details: { platform },
    });

    return NextResponse.json(data);
  }

  // Create new account
  const { data, error } = await admin
    .from('social_accounts')
    .insert({
      user_id: user.id,
      platform,
      platform_user_id,
      platform_username: platform_username || null,
      access_token,
      refresh_token: refresh_token || null,
      token_expires_at: token_expires_at || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from('activity_log').insert({
    user_id: user.id,
    action: 'create_social_account',
    entity_type: 'social_account',
    entity_id: data.id,
    details: { platform },
  });

  return NextResponse.json(data, { status: 201 });
}
