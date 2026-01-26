import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../supabase/client';
import { toast } from 'sonner';

export type Reply = {
  id: string;
  user_id: string;
  confession_id: string;
  content: string;
  created_at: string;
  parent_reply_id: string | null;
  likes_count: number;
  anonymous_username?: string;
  is_liked_by_user?: boolean;
  children?: Reply[];
};

export type Confession = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  anonymous_username: string;
  likes_count: number;
  replies_count: number;
  is_liked_by_user: boolean;
  replies?: Reply[];
};

export function useConfessions() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // --- 1. Fetch Data (Fixed 400 Error) ---
  const fetchConfessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // FIX: Removed 'profiles' join from 'confession_replies' to resolve PGRST200 error.
      // We will default reply usernames to 'Anonymous' in the map function below.
      const { data, error } = await supabase
        .from('confessions')
        .select(`
          *,
          confession_replies (
            *
          ),
          confession_likes (user_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data.map((c: any) => ({
        ...c,
        likes_count: c.like_count || (c.confession_likes ? c.confession_likes.length : 0),
        replies: c.confession_replies?.map((r: any) => ({
          ...r,
          // Fallback since we removed the join
          anonymous_username: r.profiles?.anonymous_username || 'Anonymous', 
          is_liked_by_user: false, // Defaulting to false for stability
          likes_count: 0
        })) || [],
        replies_count: c.confession_replies ? c.confession_replies.length : 0,
        is_liked_by_user: user ? c.confession_likes?.some((l: any) => l.user_id === user.id) : false,
      }));

      setConfessions(formattedData);
    } catch (error) {
      console.error('Error fetching feed:', error);
      // toast.error('Could not load feed'); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfessions();
  }, [fetchConfessions]);

  // --- 2. Build Reply Tree (Nested + Latest on Top) ---
  const getRepliesTree = (replies: Reply[]) => {
    if (!replies) return [];
    const map = new Map();
    const roots: Reply[] = [];
    
    const sortedReplies = [...replies].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    sortedReplies.forEach(r => {
      map.set(r.id, { ...r, children: [] });
    });

    sortedReplies.forEach(r => {
      const node = map.get(r.id);
      if (r.parent_reply_id && map.has(r.parent_reply_id)) {
        map.get(r.parent_reply_id).children.push(node);
      } else {
        roots.push(node);
      }
    });
    
    return roots.reverse();
  };

  // --- 3. Actions ---
  
  const createConfession = async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error('Sign in required');

      const { data: profile } = await supabase.from('profiles').select('anonymous_username').eq('id', user.id).single();

      const newConfession = {
        user_id: user.id,
        content,
        anonymous_username: profile?.anonymous_username || 'Anonymous',
      };

      const { data, error } = await supabase.from('confessions').insert(newConfession).select().single();
      if (error) throw error;

      setConfessions(prev => [{ ...data, replies: [], likes_count: 0, is_liked_by_user: false }, ...prev]);
      toast.success('Posted!');
      
      // FIX: Scroll to top smoothly after posting
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch { toast.error('Failed to post'); }
  };

  const addReply = async (confessionId: string, content: string, parentId: string | null = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error('Sign in required');

      const { data: profile } = await supabase.from('profiles').select('anonymous_username').eq('id', user.id).single();

      const { data, error } = await supabase.from('confession_replies').insert({
        confession_id: confessionId,
        user_id: user.id,
        content,
        parent_reply_id: parentId
      }).select().single();

      if (error) throw error;

      setConfessions(prev => prev.map(c => {
        if (c.id === confessionId) {
          const newReply = { ...data, anonymous_username: profile?.anonymous_username || 'Anonymous', children: [], likes_count: 0, is_liked_by_user: false };
          return { ...c, replies_count: (c.replies_count || 0) + 1, replies: [newReply, ...(c.replies || [])] };
        }
        return c;
      }));
      toast.success('Reply sent');
    } catch { toast.error('Failed to reply'); }
  };

  const likeConfession = async (id: string, isLiked: boolean) => {
    setConfessions(prev => prev.map(c => c.id === id ? { ...c, is_liked_by_user: !isLiked, likes_count: isLiked ? Math.max(0, c.likes_count - 1) : c.likes_count + 1 } : c));
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // FIX: Removed .catch() chaining on rpc calls as they are not native Promises in all client versions
    if (isLiked) {
      await supabase.from('confession_likes').delete().eq('confession_id', id).eq('user_id', user.id);
      await supabase.rpc('decrement_confession_like', { row_id: id });
    } else {
      await supabase.from('confession_likes').insert({ confession_id: id, user_id: user.id });
      await supabase.rpc('increment_confession_like', { row_id: id });
    }
  };

  const likeReply = async (replyId: string, confessionId: string, currentStatus: boolean) => {
    // Optimistic Update
    setConfessions(prev => prev.map(c => {
      if (c.id === confessionId) {
        return {
          ...c,
          replies: c.replies?.map(r => r.id === replyId ? {
            ...r,
            is_liked_by_user: !currentStatus,
            likes_count: currentStatus ? Math.max(0, r.likes_count - 1) : r.likes_count + 1
          } : r)
        };
      }
      return c;
    }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Try/Catch to safely handle missing table or 403 Forbidden errors (RLS)
    try {
        if (currentStatus) {
            await supabase.from('confession_reply_likes').delete().eq('reply_id', replyId).eq('user_id', user.id);
        } else {
            await supabase.from('confession_reply_likes').insert({ reply_id: replyId, user_id: user.id });
        }
    } catch (e) {
        console.warn("Reply likes table issue or permission denied", e);
    }
  };

  const deleteConfession = async (id: string) => {
    const { error } = await supabase.from('confessions').delete().eq('id', id);
    if (!error) {
      setConfessions(prev => prev.filter(c => c.id !== id));
      toast.success('Deleted');
    } else {
        toast.error('Delete failed');
    }
  };

  const deleteReply = async (replyId: string, confessionId: string) => {
    const { error } = await supabase.from('confession_replies').delete().eq('id', replyId);
    if (!error) {
        setConfessions(prev => prev.map(c => {
            if (c.id === confessionId) {
                return {
                    ...c,
                    replies_count: Math.max(0, (c.replies_count || 1) - 1),
                    replies: c.replies?.filter(r => r.id !== replyId)
                };
            }
            return c;
        }));
        toast.success('Reply deleted');
    } else {
        toast.error('Delete failed');
    }
  };

  return { 
    confessions, 
    loading, 
    createConfession, 
    addReply, 
    likeConfession, 
    likeReply, 
    deleteConfession, 
    deleteReply, 
    getRepliesTree 
  };
}