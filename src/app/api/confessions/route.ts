import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(user.id, 'confession');
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { content, image_url } = body;

    // Validate content
    if (!content || content.length < 1 || content.length > 5000) {
      return NextResponse.json({ error: 'Invalid content length' }, { status: 400 });
    }

    // Get user profile for anonymous username
    const { data: profile } = await supabase
      .from('profiles')
      .select('anonymous_username, anonymous_avatar')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Create confession
    const { data: confession, error } = await supabase
      .from('confessions')
      .insert({
        user_id: user.id,
        content,
        image_url,
        anonymous_username: profile.anonymous_username,
        anonymous_avatar: profile.anonymous_avatar,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ confession }, { status: 201 });
  } catch (error) {
    console.error('Create confession error:', error);
    return NextResponse.json({ error: 'Failed to create confession' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: confessions, error } = await supabase
      .from('confessions')
      .select(`
        *,
        confession_likes(count),
        confession_replies(count)
      `)
      .eq('is_deleted', false)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ confessions });
  } catch (error) {
    console.error('Get confessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch confessions' }, { status: 500 });
  }
}
