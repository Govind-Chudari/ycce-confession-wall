import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, id } = body; 

    if (!type || !id) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (type === 'confession') {
      const { data: existing } = await supabase
        .from('confession_likes')
        .select('id')
        .eq('confession_id', id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('confession_likes')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return NextResponse.json({ action: 'unliked' });
      } else {
        const { error } = await supabase
          .from('confession_likes')
          .insert({ confession_id: id, user_id: user.id });

        if (error) throw error;
        return NextResponse.json({ action: 'liked' });
      }
    } else if (type === 'reply') {
      const { data: existing } = await supabase
        .from('reply_likes')
        .select('id')
        .eq('reply_id', id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('reply_likes')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return NextResponse.json({ action: 'unliked' });
      } else {
        const { error } = await supabase
          .from('reply_likes')
          .insert({ reply_id: id, user_id: user.id });

        if (error) throw error;
        return NextResponse.json({ action: 'liked' });
      }
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Like/unlike error:', error);
    return NextResponse.json({ error: 'Failed to process like' }, { status: 500 });
  }
}