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
  anonymous_username: string;
  is_liked_by_user: boolean;
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

  // --- 1. Fetch Data ---
  const fetchConfessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // FIX 1: Removed complex 'profiles:user_id' join that was breaking the query.
      // Now we just fetch confessions, their replies, and the likes for both.
      const { data: confessionsData, error: confessionsError } = await supabase
        .from('confessions')
        .select(`
          *,
          confession_likes (user_id),
          confession_replies (
            *,
            confession_reply_likes (user_id)
          )
        `)
        .order('created_at', { ascending: false });

      if (confessionsError) throw confessionsError;

      // FIX 2: Manually collect User IDs from all replies to fetch their usernames
      // This bypasses the need for a strict Foreign Key relationship in the schema
      const userIdsToFetch = new Set<string>();
      confessionsData.forEach((c: any) => {
        c.confession_replies?.forEach((r: any) => {
          if (r.user_id) userIdsToFetch.add(r.user_id);
        });
      });

      // FIX 3: Fetch profiles for those IDs
      let profilesMap = new Map<string, string>();
      if (userIdsToFetch.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, anonymous_username')
          .in('id', Array.from(userIdsToFetch));
        
        profilesData?.forEach((p: any) => {
          profilesMap.set(p.id, p.anonymous_username);
        });
      }

      // 4. Merge Data
      const formattedData = confessionsData.map((c: any) => {
        // Format Replies
        const rawReplies = c.confession_replies || [];
        const sortedReplies = rawReplies.sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const mappedReplies = sortedReplies.map((r: any) => ({
            ...r,
            // Hydrate username from our manual map
            anonymous_username: profilesMap.get(r.user_id) || 'Anonymous', 
            // Calculate likes
            likes_count: r.confession_reply_likes ? r.confession_reply_likes.length : 0,
            is_liked_by_user: user ? r.confession_reply_likes?.some((l: any) => l.user_id === user.id) : false
        }));

        return {
            ...c,
            likes_count: c.like_count || (c.confession_likes ? c.confession_likes.length : 0),
            replies: mappedReplies,
            replies_count: mappedReplies.length,
            is_liked_by_user: user ? c.confession_likes?.some((l: any) => l.user_id === user.id) : false,
        };
      });

      setConfessions(formattedData);
    } catch (error) {
      console.error('Error fetching feed:', error);
      toast.error('Could not load confessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfessions();
  }, [fetchConfessions]);

  // --- 2. Build Reply Tree ---
  const getRepliesTree = (replies: Reply[]) => {
    if (!replies) return [];
    
    // Deep clone to prevent mutating state
    const repliesCopy = JSON.parse(JSON.stringify(replies));
    const map = new Map();
    const roots: Reply[] = [];
    
    // Initialize map
    repliesCopy.forEach((r: any) => {
      r.children = [];
      map.set(r.id, r);
    });

    // Build hierarchy
    repliesCopy.forEach((r: any) => {
      if (r.parent_reply_id && map.has(r.parent_reply_id)) {
        map.get(r.parent_reply_id).children.push(r);
      } else {
        roots.push(r);
      }
    });
    
    return roots; // Roots are already sorted by date from the fetch step
  };

  // --- 3. Actions ---
  
  const createConfession = async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error('Sign in required');

      const { data: profile } = await supabase.from('profiles').select('anonymous_username').eq('id', user.id).single();

      if (!(profile as any)?.anonymous_username) {
        toast.error('Profile incomplete. Please set a username.');
        return;
      }

      const newConfession = {
        user_id: user.id,
        content,
        anonymous_username: (profile as any).anonymous_username,
      };

      const { data, error } = await supabase.from('confessions').insert(newConfession as any).select().single();
      if (error) throw error;

      setConfessions(prev => [{ ...(data as any), replies: [], likes_count: 0, is_liked_by_user: false }, ...prev]);
      toast.success('Posted!');
      
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch { toast.error('Failed to post'); }
  };

  const addReply = async (confessionId: string, content: string, parentId: string | null = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error('Sign in required');

      const { data: profile } = await supabase.from('profiles').select('anonymous_username').eq('id', user.id).single();

      if (!(profile as any)?.anonymous_username) {
        toast.error('Profile incomplete. Please set a username.');
        return;
      }

      const { data, error } = await supabase.from('confession_replies').insert({
        confession_id: confessionId,
        user_id: user.id,
        content,
        parent_reply_id: parentId
      } as any).select().single();

      if (error) throw error;

      setConfessions(prev => prev.map(c => {
        if (c.id === confessionId) {
          const newReply: Reply = { 
            ...(data as any), 
            anonymous_username: (profile as any).anonymous_username, 
            children: [], 
            likes_count: 0, 
            is_liked_by_user: false 
          };
          
          return { 
            ...c, 
            replies_count: (c.replies_count || 0) + 1, 
            replies: [...(c.replies || []), newReply] // Add to end
          };
        }
        return c;
      }));
      toast.success('Reply sent');
    } catch { toast.error('Failed to reply'); }
  };

  const likeConfession = async (id: string, isLiked: boolean) => {
    // Optimistic
    setConfessions(prev => prev.map(c => c.id === id ? { ...c, is_liked_by_user: !isLiked, likes_count: isLiked ? Math.max(0, c.likes_count - 1) : c.likes_count + 1 } : c));
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isLiked) {
      await supabase.from('confession_likes').delete().eq('confession_id', id).eq('user_id', user.id);
      await supabase.rpc('decrement_confession_like', { row_id: id } as any);
    } else {
      await supabase.from('confession_likes').insert({ confession_id: id, user_id: user.id } as any);
      await supabase.rpc('increment_confession_like', { row_id: id } as any);
    }
  };

  const likeReply = async (replyId: string, confessionId: string, currentStatus: boolean) => {
    // Optimistic Update
    setConfessions(prev => prev.map(c => {
      if (c.id === confessionId) {
        return {
          ...c,
          // We update the flat list; getRepliesTree will handle the nesting on render
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

    try {
        if (currentStatus) {
            await supabase.from('confession_reply_likes').delete().eq('reply_id', replyId).eq('user_id', user.id);
        } else {
            await supabase.from('confession_reply_likes').insert({ reply_id: replyId, user_id: user.id } as any);
        }
    } catch (e) {
        console.warn("Reply likes table issue", e);
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