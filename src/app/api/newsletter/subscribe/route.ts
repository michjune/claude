import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type');
  let email: string;

  if (contentType?.includes('application/json')) {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    email = parsed.data.email;
  } else {
    // Handle form submission
    const formData = await request.formData();
    const rawEmail = formData.get('email') as string;
    const parsed = subscribeSchema.safeParse({ email: rawEmail });
    if (!parsed.success) {
      return NextResponse.redirect(new URL('/newsletter?error=invalid', request.url));
    }
    email = parsed.data.email;
  }

  const supabase = createAdminClient();

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id, is_confirmed, unsubscribed_at')
    .eq('email', email)
    .single();

  if (existing) {
    if (existing.is_confirmed && !existing.unsubscribed_at) {
      if (contentType?.includes('application/json')) {
        return NextResponse.json({ message: 'Already subscribed' });
      }
      return NextResponse.redirect(new URL('/newsletter?status=already', request.url));
    }

    // Re-subscribe
    await supabase
      .from('newsletter_subscribers')
      .update({ unsubscribed_at: null, is_confirmed: false })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('newsletter_subscribers')
      .insert({ email });
  }

  // In production, send confirmation email here
  // For now, auto-confirm
  await supabase
    .from('newsletter_subscribers')
    .update({ is_confirmed: true })
    .eq('email', email);

  if (contentType?.includes('application/json')) {
    return NextResponse.json({ message: 'Subscribed successfully' });
  }
  return NextResponse.redirect(new URL('/newsletter?status=success', request.url));
}
