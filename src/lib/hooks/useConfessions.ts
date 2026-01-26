import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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
  confession_reply_likes?: any[]; // Added to fix build error in Realtime DELETE
};

export type Poll = {
  id: string;
  options: string[];
  total_votes: number;
  user_vote_index: number | null; 
  votes_by_option: number[]; 
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
  poll?: Poll;
  confession_likes?: any[]; // Added to fix build error in Realtime DELETE
};

export function useConfessions() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  // --- 1. Fetch Data ---
  const fetchConfessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('confessions')
        .select(`
          *,
          confession_replies (
            *,
            confession_reply_likes (user_id)
          ),
          confession_likes (user_id),
          polls (
            id,
            options,
            poll_votes (user_id, option_index)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIdsToFetch = new Set<string>();
      data.forEach((c: any) => {
        c.confession_replies?.forEach((r: any) => {
          if (r.user_id) userIdsToFetch.add(r.user_id);
        });
      });

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

      const formattedData = data.map((c: any) => {
        let pollData: Poll | undefined = undefined;
        if (c.polls && c.polls.length > 0) {
          const rawPoll = c.polls[0];
          const votes = rawPoll.poll_votes || [];
          const userVote = user ? votes.find((v: any) => v.user_id === user.id) : undefined;
          const counts = new Array(rawPoll.options.length).fill(0);
          votes.forEach((v: any) => {
            if (v.option_index >= 0 && v.option_index < counts.length) {
              counts[v.option_index]++;
            }
          });
          pollData = {
            id: rawPoll.id,
            options: rawPoll.options,
            total_votes: votes.length,
            user_vote_index: userVote !== undefined ? userVote.option_index : null,
            votes_by_option: counts
          };
        }

        return {
          ...c,
          likes_count: c.like_count || (c.confession_likes ? c.confession_likes.length : 0),
          replies: c.confession_replies?.map((r: any) => ({
            ...r,
            anonymous_username: profilesMap.get(r.user_id) || 'Anonymous', 
            likes_count: r.confession_reply_likes ? r.confession_reply_likes.length : 0,
            is_liked_by_user: user ? r.confession_reply_likes?.some((l: any) => l.user_id === user.id) : false
          })) || [],
          replies_count: c.confession_replies ? c.confession_replies.length : 0,
          is_liked_by_user: user ? c.confession_likes?.some((l: any) => l.user_id === user.id) : false,
          poll: pollData
        } as Confession;
      });

      setConfessions(formattedData);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchConfessions();
  }, [fetchConfessions]);

  // --- 2. Realtime Subscriptions ---
  useEffect(() => {
    const fetchNewConfession = async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('confessions')
            .select('*, confession_likes(user_id), polls(id, options, poll_votes(user_id, option_index))')
            .eq('id', id)
            .single();

        if (error || !data) return;
        const newData = data as any;
        let anonymous_username = 'Anonymous';
        if (newData.user_id) {
            const { data: p } = await supabase.from('profiles').select('anonymous_username').eq('id', newData.user_id).single();
            if (p) anonymous_username = (p as any).anonymous_username;
        }

        const formatted: Confession = {
            ...newData,
            likes_count: 0,
            replies: [],
            replies_count: 0,
            is_liked_by_user: false,
            anonymous_username,
            poll: newData.polls?.[0] ? {
                id: newData.polls[0].id,
                options: newData.polls[0].options,
                total_votes: 0,
                user_vote_index: null,
                votes_by_option: new Array(newData.polls[0].options.length).fill(0)
            } : undefined
        };

        setConfessions(prev => prev.find(c => c.id === id) ? prev : [formatted, ...prev]);
    };

    const handleNewReply = async (payload: any) => {
        const r = payload.new;
        const { data: p } = await supabase.from('profiles').select('anonymous_username').eq('id', r.user_id).single();
        const newReply: Reply = { ...r, anonymous_username: (p as any)?.anonymous_username || 'Anonymous', likes_count: 0, is_liked_by_user: false, children: [] };
        
        setConfessions(prev => prev.map(c => c.id === r.confession_id ? { ...c, replies_count: c.replies_count + 1, replies: [newReply, ...(c.replies || [])] } : c));
    };

    const channel = supabase.channel('feed_full_realtime')
      // Confessions
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' }, payload => fetchNewConfession(payload.new.id))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'confessions' }, payload => setConfessions(prev => prev.filter(c => c.id !== payload.old.id)))
      
      // Likes
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confession_likes' }, payload => {
          setConfessions(prev => prev.map(c => c.id === payload.new.confession_id ? { ...c, likes_count: c.likes_count + 1 } : c));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'confession_likes' }, payload => {
          setConfessions(prev => prev.map(c => {
              // Note: payload.old may only have 'id'. We check state for the owner.
              const isMatch = c.confession_likes?.some((l: any) => l.id === payload.old.id);
              return isMatch || (payload.old as any).confession_id === c.id ? { ...c, likes_count: Math.max(0, c.likes_count - 1) } : c;
          }));
      })

      // Replies
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confession_replies' }, handleNewReply)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'confession_replies' }, payload => {
          setConfessions(prev => prev.map(c => {
              if (c.replies?.some(r => r.id === payload.old.id)) {
                  return { ...c, replies_count: Math.max(0, c.replies_count - 1), replies: c.replies.filter(r => r.id !== payload.old.id) };
              }
              return c;
          }));
      })

      // Poll Votes
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, payload => {
          const { poll_id, option_index } = payload.new;
          setConfessions(prev => prev.map(c => {
              // FIX: Constant capture to narrow type and prevent 'possibly undefined' error
              const currentPoll = c.poll;
              if (currentPoll && currentPoll.id === poll_id) {
                  const newVotes = [...currentPoll.votes_by_option];
                  if (option_index < newVotes.length) {
                    newVotes[option_index]++;
                  }
                  return { 
                    ...c, 
                    poll: { 
                      ...currentPoll, 
                      total_votes: currentPoll.total_votes + 1, 
                      votes_by_option: newVotes 
                    } 
                  } as Confession;
              }
              return c;
          }));
      })

      // Reply Likes
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confession_reply_likes' }, payload => {
          setConfessions(prev => prev.map(c => ({
              ...c,
              replies: c.replies?.map(r => r.id === payload.new.reply_id ? { ...r, likes_count: r.likes_count + 1 } : r)
          })));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'confession_reply_likes' }, payload => {
          setConfessions(prev => prev.map(c => ({
              ...c,
              replies: c.replies?.map(r => r.confession_reply_likes?.some((l: any) => l.id === payload.old.id) ? { ...r, likes_count: Math.max(0, r.likes_count - 1) } : r)
          })));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // --- 3. Build Reply Tree ---
  const getRepliesTree = (replies: Reply[]) => {
    if (!replies) return [];
    const map = new Map();
    const roots: Reply[] = [];
    const sortedReplies = [...replies].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    sortedReplies.forEach(r => { map.set(r.id, { ...r, children: [] }); });
    sortedReplies.forEach(r => {
      const node = map.get(r.id);
      if (r.parent_reply_id && map.has(r.parent_reply_id)) {
        map.get(r.parent_reply_id).children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  // --- 4. Actions ---
  const createConfession = async (content: string, pollOptions?: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error('Sign in required');
      const { data: profile } = await supabase.from('profiles').select('anonymous_username').eq('id', user.id).single();
      if (!(profile as any)?.anonymous_username) return toast.error('Set a username first.');

      const { data: confessionData, error: confError } = await supabase.from('confessions').insert({ user_id: user.id, content, anonymous_username: (profile as any).anonymous_username } as any).select().single();
      if (confError) throw confError;

      let newPoll: Poll | undefined = undefined;
      if (pollOptions && pollOptions.length >= 2) {
        const { data: pollData } = await supabase.from('polls').insert({ confession_id: (confessionData as any).id, options: pollOptions } as any).select().single();
        if (pollData) {
          const pd = pollData as any;
          newPoll = { id: pd.id, options: pd.options, total_votes: 0, user_vote_index: null, votes_by_option: new Array(pd.options.length).fill(0) };
        }
      }
      setConfessions(prev => [{ ...(confessionData as any), replies: [], likes_count: 0, is_liked_by_user: false, poll: newPoll }, ...prev]);
      toast.success('Posted!');
    } catch { toast.error('Failed to post'); }
  };

  const startPrivateChat = async (targetUserId: string, confessionId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === targetUserId) return toast.error("Invalid action");
    try {
      const { data: existingChat } = await supabase.from('private_chats').select('id').or(`and(created_by.eq.${user.id},participant_2.eq.${targetUserId}),and(created_by.eq.${targetUserId},participant_2.eq.${user.id})`).eq('status', 'active').gt('expires_at', new Date().toISOString()).single();
      if (existingChat) { router.push(`/chat/${(existingChat as any).id}`); return; }
      const { data, error } = await supabase.from('private_chats').insert({ created_by: user.id, participant_2: targetUserId, confession_id: confessionId } as any).select().single();
      if (error) throw error;
      toast.success('Private chat started (10 mins)');
      router.push(`/chat/${(data as any).id}`);
    } catch { toast.error('Failed to start chat'); }
  };

  const likeReply = async (replyId: string, confessionId: string, currentStatus: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setConfessions(prev => prev.map(c => c.id === confessionId ? { ...c, replies: c.replies?.map(r => r.id === replyId ? { ...r, is_liked_by_user: !currentStatus, likes_count: currentStatus ? Math.max(0, r.likes_count - 1) : r.likes_count + 1 } : r) } : c));
    try {
        if (currentStatus) await supabase.from('confession_reply_likes').delete().eq('reply_id', replyId).eq('user_id', user.id);
        else await supabase.from('confession_reply_likes').insert({ reply_id: replyId, user_id: user.id } as any);
    } catch (e) { console.warn(e); }
  };

  const addReply = async (confessionId: string, content: string, parentId: string | null = null) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error('Sign in required');
      const { data: profile } = await supabase.from('profiles').select('anonymous_username').eq('id', user.id).single();
      const { data, error } = await supabase.from('confession_replies').insert({ confession_id: confessionId, user_id: user.id, content, parent_reply_id: parentId } as any).select().single();
      if (error) throw error;
      const newReply = { ...(data as any), anonymous_username: (profile as any).anonymous_username, children: [], likes_count: 0, is_liked_by_user: false };
      setConfessions(prev => prev.map(c => c.id === confessionId ? { ...c, replies_count: c.replies_count + 1, replies: [newReply, ...(c.replies || [])] } : c));
      toast.success('Reply sent');
  };

  const likeConfession = async (id: string, isLiked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setConfessions(prev => prev.map(c => c.id === id ? { ...c, is_liked_by_user: !isLiked, likes_count: isLiked ? Math.max(0, c.likes_count - 1) : c.likes_count + 1 } : c));
    if (isLiked) { await supabase.from('confession_likes').delete().eq('confession_id', id).eq('user_id', user.id); await supabase.rpc('decrement_confession_like', { row_id: id } as any); } 
    else { await supabase.from('confession_likes').insert({ confession_id: id, user_id: user.id } as any); await supabase.rpc('increment_confession_like', { row_id: id } as any); }
  };

  const voteOnPoll = async (pollId: string, confessionId: string, optionIndex: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Sign in to vote");
    setConfessions(prev => prev.map(c => { 
        // FIX: Constant capture to narrow type for voteOnPoll action
        const currentPoll = c.poll;
        if (c.id === confessionId && currentPoll) { 
            const newVotes = [...currentPoll.votes_by_option]; 
            newVotes[optionIndex]++; 
            return { 
                ...c, 
                poll: { 
                    ...currentPoll, 
                    user_vote_index: optionIndex, 
                    total_votes: currentPoll.total_votes + 1, 
                    votes_by_option: newVotes 
                } 
            } as Confession; 
        } 
        return c; 
    }));
    await supabase.from('poll_votes').insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex } as any);
  };

  const deleteConfession = async (id: string) => { await supabase.from('confessions').delete().eq('id', id); setConfessions(prev => prev.filter(c => c.id !== id)); };
  const deleteReply = async (replyId: string, confessionId: string) => { await supabase.from('confession_replies').delete().eq('id', replyId); setConfessions(prev => prev.map(c => c.id === confessionId ? { ...c, replies_count: Math.max(0, c.replies_count - 1), replies: c.replies?.filter(r => r.id !== replyId) } : c)); };

  return { confessions, loading, createConfession, addReply, likeConfession, likeReply, voteOnPoll, deleteConfession, deleteReply, startPrivateChat, getRepliesTree };
}