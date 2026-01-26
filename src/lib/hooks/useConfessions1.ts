import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export type Reply = {
  id: string;
  user_id: string;
  confession_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  likes_count: number;
  anonymous_username?: string;
  is_liked_by_user?: boolean;
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

export function useConfessions(initialFilter = "") {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // --- 1. FETCH CONFESSIONS ---
  useEffect(() => {
    const fetchConfessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // FIXED: Correct table names 'confession_replies' & 'confession_likes'
        const { data, error } = await supabase
          .from('confessions')
          .select(`
            *,
            replies:confession_replies(*),
            likes:confession_likes(user_id)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedData = data.map((c: any) => ({
          ...c,
          likes_count: c.likes ? c.likes.length : (c.likes_count || 0), 
          replies: c.replies || [],
          replies_count: c.replies ? c.replies.length : 0,
          is_liked_by_user: user ? c.likes?.some((l: any) => l.user_id === user.id) : false,
        }));

        setConfessions(formattedData);
      } catch (error) {
        console.error('Error fetching confessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfessions();
  }, []);

  // --- 2. CREATE CONFESSION ---
  const createConfession = async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to post');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('anonymous_username')
        .eq('id', user.id)
        .single();

      if (!profile?.anonymous_username) {
        toast.error('Profile incomplete. Please set a username.');
        return;
      }

      // FIXED: Removed 'likes_count' to prevent PGRST204 error
      const newConfession = {
        user_id: user.id,
        content: content,
        anonymous_username: profile.anonymous_username,
      };

      const { data, error } = await supabase
        .from('confessions')
        .insert(newConfession)
        .select()
        .single();

      if (error) throw error;

      const formattedConfession = {
        ...data,
        replies: [],
        likes: [],
        likes_count: 0,
        replies_count: 0,
        is_liked_by_user: false
      };

      setConfessions(prev => [formattedConfession, ...prev]);
      toast.success('Confession posted anonymously! 🎭');
      
    } catch (error: any) {
      console.error('Error creating confession:', error);
      toast.error(error.message || 'Failed to post confession');
    }
  };

  // --- 3. ADD REPLY ---
  const addReply = async (confessionId: string, text: string, parentId: string | null = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to reply');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('anonymous_username')
        .eq('id', user.id)
        .single();

      const newReply = {
        confession_id: confessionId,
        user_id: user.id,
        content: text,
        parent_id: parentId,
        anonymous_username: profile?.anonymous_username || 'Anonymous',
      };

      // FIXED: Correct table name 'confession_replies'
      const { data, error } = await supabase
        .from('confession_replies')
        .insert(newReply)
        .select()
        .single();

      if (error) throw error;

      setConfessions(prev => prev.map(c => {
        if (c.id === confessionId) {
          const replyWithDefaults = {
            ...data,
            likes_count: 0,
            is_liked_by_user: false,
            parent_id: parentId
          };
          
          return {
            ...c,
            replies_count: (c.replies_count || 0) + 1,
            replies: [...(c.replies || []), replyWithDefaults]
          };
        }
        return c;
      }));

      toast.success('Reply posted!');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to post reply');
    }
  };

  // --- 4. LIKE LOGIC ---
  const addReaction = async (confessionId: string) => {
    try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;

       setConfessions(prev => prev.map(c => {
         if (c.id === confessionId) {
           const isLiked = !c.is_liked_by_user;
           return {
             ...c,
             is_liked_by_user: isLiked,
             likes_count: isLiked ? c.likes_count + 1 : c.likes_count - 1
           };
         }
         return c;
       }));

       // FIXED: Correct table name 'confession_likes'
       const { data: existingLike } = await supabase
         .from('confession_likes')
         .select('id')
         .eq('confession_id', confessionId)
         .eq('user_id', user.id)
         .single();

       if (existingLike) {
         await supabase.from('confession_likes').delete().eq('id', existingLike.id);
       } else {
         await supabase.from('confession_likes').insert({ confession_id: confessionId, user_id: user.id });
       }

    } catch (error) {
      console.error("Like error:", error);
    }
  };
  
  const likeReply = async (id: string) => {
    // Add reply like logic if needed
  };

  const deleteReply = async (id: string) => {
    try {
        // FIXED: Correct table name
        await supabase.from('confession_replies').delete().eq('id', id);
        toast.success("Reply deleted");
        
        // Update local state to remove the deleted reply
        setConfessions(prev => prev.map(c => ({
          ...c,
          replies: c.replies?.filter(r => r.id !== id) || [],
          replies_count: Math.max(0, (c.replies_count || 0) - 1)
        })));

    } catch (e) {
        toast.error("Failed to delete reply");
    }
  };

  const deleteConfession = async (id: string) => {
     try {
       await supabase.from('confessions').delete().eq('id', id);
       setConfessions(prev => prev.filter(c => c.id !== id));
       toast.success("Confession deleted");
     } catch (e) {
       toast.error("Failed to delete");
     }
  };

  return {
    confessions,
    loading,
    createConfession,
    addReaction,
    addReply,
    likeReply,
    deleteReply,
    deleteConfession,
  };
}