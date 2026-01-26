import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { confession_id, content, parent_reply_id } = body;

    // Validate
    if (!confession_id || !content || content.length < 1 || content.length > 2000) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('anonymous_username, anonymous_avatar')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Create reply
    const { data: reply, error } = await supabase
      .from('confession_replies')
      .insert({
        confession_id,
        user_id: user.id,
        content,
        parent_reply_id,
        anonymous_username: profile.anonymous_username,
        anonymous_avatar: profile.anonymous_avatar,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error('Create reply error:', error);
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const confession_id = searchParams.get('confession_id');

    if (!confession_id) {
      return NextResponse.json({ error: 'confession_id required' }, { status: 400 });
    }

    const { data: replies, error } = await supabase
      .from('confession_replies')
      .select(`
        *,
        reply_likes(count)
      `)
      .eq('confession_id', confession_id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ replies });
  } catch (error) {
    console.error('Get replies error:', error);
    return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
  }
}
