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
    const { doodle_data, position_x, position_y } = body;

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('anonymous_username')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Save doodle
    const { data: doodle, error } = await supabase
      .from('doodles')
      .insert({
        user_id: user.id,
        doodle_data,
        anonymous_username: profile.anonymous_username,
        position_x: position_x || 0,
        position_y: position_y || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ doodle }, { status: 201 });
  } catch (error) {
    console.error('Save doodle error:', error);
    return NextResponse.json({ error: 'Failed to save doodle' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data: doodles, error } = await supabase
      .from('doodles')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ doodles });
  } catch (error) {
    console.error('Get doodles error:', error);
    return NextResponse.json({ error: 'Failed to fetch doodles' }, { status: 500 });
  }
}
