import { createServerClient } from '@/lib/supabase/server';

const RATE_LIMITS = {
  confession: { max: 5, hours: 1 },
  reply: { max: 20, hours: 1 },
  like: { max: 100, hours: 1 },
  doodle: { max: 10, hours: 1 },
};

export async function checkRateLimit(
  userId: string,
  actionType: 'confession' | 'reply' | 'like' | 'doodle'
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const supabase = createServerClient();
  const limit = RATE_LIMITS[actionType];
  const hoursAgo = new Date(Date.now() - limit.hours * 60 * 60 * 1000).toISOString();

  try {
    // Count recent actions
    const { count, error } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .gte('performed_at', hoursAgo);

    if (error) throw error;

    if (count >= limit.max) {
      // Get the oldest action in the window
      const { data: oldestAction } = await supabase
        .from('rate_limits')
        .select('performed_at')
        .eq('user_id', userId)
        .eq('action_type', actionType)
        .gte('performed_at', hoursAgo)
        .order('performed_at', { ascending: true })
        .limit(1)
        .single();

      if (oldestAction) {
        const oldestTime = new Date(oldestAction.performed_at).getTime();
        const expiresAt = oldestTime + limit.hours * 60 * 60 * 1000;
        const retryAfter = Math.ceil((expiresAt - Date.now()) / 1000);
        return { allowed: false, retryAfter };
      }

      return { allowed: false, retryAfter: limit.hours * 60 * 60 };
    }

    // Record this action
    await supabase.from('rate_limits').insert({
      user_id: userId,
      action_type: actionType,
      performed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + limit.hours * 60 * 60 * 1000).toISOString(),
    });

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Allow action if rate limit check fails (fail open)
    return { allowed: true };
  }
}

// Clean up expired rate limits (call this periodically)
export async function cleanupExpiredRateLimits() {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  await supabase
    .from('rate_limits')
    .delete()
    .lt('expires_at', now);
}
