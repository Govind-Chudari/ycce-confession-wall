import { useState, useEffect, useCallback, useRef } from 'react';
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
};

interface ProfileData {
  anonymous_username: string;
}

export function useConfessions() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  
  const pendingOperations = useRef<Set<string>>(new Set());

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
        if (c.user_id) userIdsToFetch.add(c.user_id);
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

      const formattedData: Confession[] = data.map((c: any) => {
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
          anonymous_username: profilesMap.get(c.user_id) || c.anonymous_username || 'Anonymous',
          likes_count: c.confession_likes ? c.confession_likes.length : 0,
          replies: c.confession_replies?.map((r: any) => ({
            ...r,
            anonymous_username: profilesMap.get(r.user_id) || 'Anonymous', 
            likes_count: r.confession_reply_likes ? r.confession_reply_likes.length : 0,
            is_liked_by_user: user ? r.confession_reply_likes?.some((l: any) => l.user_id === user.id) : false
          })) || [],
          replies_count: c.confession_replies ? c.confession_replies.length : 0,
          is_liked_by_user: user ? c.confession_likes?.some((l: any) => l.user_id === user.id) : false,
          poll: pollData
        };
      });

      setConfessions(formattedData);
    } catch (error) {
      console.error('Error fetching feed:', error);
      toast.error('Failed to load confessions');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchConfessions();
  }, [fetchConfessions]);

  useEffect(() => {
    const fetchAndAppendConfession = async (id: string) => {
        const { data, error } = await supabase
            .from('confessions')
            .select(`*, confession_likes(user_id), polls(id, options, poll_votes(user_id, option_index))`)
            .eq('id', id)
            .single();

        if (error || !data) return;

        const newData = data as any;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('anonymous_username')
          .eq('id', newData.user_id)
          .single() as { data: ProfileData | null };
          
        const anonymous_username = profile?.anonymous_username || 'Anonymous';

        let pollData: Poll | undefined = undefined;
        if (newData.polls?.[0]) {
            const rawPoll = newData.polls[0];
            pollData = {
                id: rawPoll.id,
                options: rawPoll.options,
                total_votes: 0,
                user_vote_index: null,
                votes_by_option: new Array(rawPoll.options.length).fill(0)
            };
        }

        const formatted: Confession = {
            ...newData,
            likes_count: 0,
            replies: [],
            replies_count: 0,
            is_liked_by_user: false,
            poll: pollData,
            anonymous_username
        };

        setConfessions(prev => prev.some(c => c.id === formatted.id) ? prev : [formatted, ...prev]);
    };

    const handleReplyInsert = async (payload: any) => {
        const newReply = payload.new;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('anonymous_username')
          .eq('id', newReply.user_id)
          .single() as { data: ProfileData | null };

        const formattedReply: Reply = {
            ...newReply,
            anonymous_username: profile?.anonymous_username || 'Anonymous',
            likes_count: 0,
            is_liked_by_user: false,
            children: []
        };

        setConfessions(prev => prev.map(c => {
            if (c.id === newReply.confession_id) {
                if (c.replies?.some(r => r.id === newReply.id)) return c;
                return {
                    ...c,
                    replies_count: (c.replies_count || 0) + 1,
                    replies: [formattedReply, ...(c.replies || [])]
                };
            }
            return c;
        }));
    };

    const handleReplyDelete = (payload: any) => {
      const deletedReplyId = payload.old.id;
      
      setConfessions(prev => prev.map(c => {
        const filterReplies = (replies: Reply[]): Reply[] => {
          return replies
            .filter(r => r.id !== deletedReplyId && r.parent_reply_id !== deletedReplyId)
            .map(r => ({
              ...r,
              children: r.children ? filterReplies(r.children) : []
            }));
        };
        
        const originalCount = c.replies?.length || 0;
        const newReplies = c.replies ? filterReplies(c.replies) : [];
        const removedCount = originalCount - newReplies.length;
        
        return {
          ...c,
          replies: newReplies,
          replies_count: Math.max(0, c.replies_count - removedCount)
        };
      }));
    };

    const channel = supabase.channel('feed_realtime_updates', {
      config: {
        broadcast: { self: false }
      }
    })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' }, (p) => fetchAndAppendConfession(p.new.id))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'confessions' }, (p) => setConfessions(prev => prev.filter(c => c.id !== p.old.id)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confession_replies' }, handleReplyInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'confession_replies' }, handleReplyDelete)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confession_likes' }, (p) => {
          const opKey = `like-${p.new.confession_id}`;
          if (!pendingOperations.current.has(opKey)) {
            setConfessions(prev => prev.map(c => c.id === p.new.confession_id ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c));
          }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'confession_likes' }, (p) => {
          const cid = (p.old as any).confession_id;
          const opKey = `unlike-${cid}`;
          if (cid && !pendingOperations.current.has(opKey)) {
            setConfessions(prev => prev.map(c => c.id === cid ? { ...c, likes_count: Math.max(0, (c.likes_count || 0) - 1) } : c));
          }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confession_reply_likes' }, (p) => {
          const opKey = `reply-like-${p.new.reply_id}`;
          if (!pendingOperations.current.has(opKey)) {
            setConfessions(prev => prev.map(c => ({
                ...c,
                replies: c.replies?.map(r => r.id === p.new.reply_id ? { ...r, likes_count: (r.likes_count || 0) + 1 } : r)
            })));
          }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'confession_reply_likes' }, (p) => {
          const rid = (p.old as any).reply_id;
          const opKey = `reply-unlike-${rid}`;
          if (rid && !pendingOperations.current.has(opKey)) {
            setConfessions(prev => prev.map(c => ({
                ...c,
                replies: c.replies?.map(r => r.id === rid ? { ...r, likes_count: Math.max(0, (r.likes_count || 0) - 1) } : r)
            })));
          }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, (p) => {
          const { poll_id, option_index } = p.new;
          const opKey = `vote-${poll_id}-${option_index}`;
          if (!pendingOperations.current.has(opKey)) {
            setConfessions(prev => prev.map(c => {
                if(c.poll && c.poll.id === poll_id) {
                    const newVotes = [...c.poll.votes_by_option];
                    if(option_index < newVotes.length) newVotes[option_index]++;
                    return { ...c, poll: { ...c.poll, total_votes: (c.poll.total_votes || 0) + 1, votes_by_option: newVotes } };
                }
                return c;
            }));
          }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error');
          toast.error('Connection issue. Please refresh.');
        }
      });

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [supabase]);

  const getRepliesTree = useCallback((replies: Reply[]) => {
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
    
    return roots;
  }, []);

  const createConfession = async (content: string, pollOptions?: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error('Sign in required');
      const { data: profile } = await supabase.from('profiles').select('anonymous_username').eq('id', user.id).single() as { data: ProfileData | null };
      if (!profile?.anonymous_username) return toast.error('Set a username first');

      const { data: confessionData, error: confError } = await supabase.from('confessions').insert({
        user_id: user.id,
        content,
        anonymous_username: profile.anonymous_username,
      } as any).select().single();
      
      if (confError) throw confError;

      if (pollOptions && pollOptions.length >= 2) {
        await supabase.from('polls').insert({ confession_id: (confessionData as any).id, options: pollOptions } as any);
      }
      toast.success('Posted!');
    } catch (err) { 
      console.error('Post error:', err);
      toast.error('Failed to post'); 
    }
  };

  const addReply = async (confessionId: string, content: string, parentId: string | null = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return toast.error('Sign in required');
      await supabase.from('confession_replies').insert({ confession_id: confessionId, user_id: user.id, content, parent_reply_id: parentId } as any);
      toast.success('Reply sent');
    } catch (err) { 
      console.error('Reply error:', err);
      toast.error('Failed to reply'); 
    }
  };

  const likeConfession = async (id: string, isLiked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error('Sign in to like');
    
    try {
      const opKey = isLiked ? `unlike-${id}` : `like-${id}`;
      pendingOperations.current.add(opKey);
      
      setConfessions(prev => prev.map(c => 
        c.id === id ? { 
          ...c, 
          is_liked_by_user: !isLiked,
          likes_count: isLiked ? Math.max(0, c.likes_count - 1) : c.likes_count + 1
        } : c
      ));

      if (isLiked) {
        await supabase.from('confession_likes').delete().eq('confession_id', id).eq('user_id', user.id);
      } else {
        await supabase.from('confession_likes').insert({ confession_id: id, user_id: user.id } as any);
      }
      
      setTimeout(() => pendingOperations.current.delete(opKey), 500);
    } catch (err) {
      console.error('Like error:', err);
      fetchConfessions();
    }
  };

  const likeReply = async (replyId: string, confessionId: string, isLiked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error('Sign in to like');
    
    try {
      const opKey = isLiked ? `reply-unlike-${replyId}` : `reply-like-${replyId}`;
      pendingOperations.current.add(opKey);
      
      const updateReplyLikes = (replies: Reply[]): Reply[] => {
        return replies.map(r => {
          if (r.id === replyId) {
            return {
              ...r,
              is_liked_by_user: !isLiked,
              likes_count: isLiked ? Math.max(0, r.likes_count - 1) : r.likes_count + 1
            };
          }
          if (r.children && r.children.length > 0) {
            return {
              ...r,
              children: updateReplyLikes(r.children)
            };
          }
          return r;
        });
      };

      setConfessions(prev => prev.map(c => {
        if (c.id === confessionId) {
          return {
            ...c,
            replies: updateReplyLikes(c.replies || [])
          };
        }
        return c;
      }));

      if (isLiked) {
        await supabase
          .from('confession_reply_likes')
          .delete()
          .eq('reply_id', replyId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('confession_reply_likes')
          .insert({ reply_id: replyId, user_id: user.id } as any);
      }
      
      setTimeout(() => pendingOperations.current.delete(opKey), 500);
    } catch (err) {
      console.error('Reply like error:', err);
      fetchConfessions();
    }
  };

  const voteOnPoll = async (pollId: string, confessionId: string, optionIndex: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Sign in to vote");
    
    try {
      const opKey = `vote-${pollId}-${optionIndex}`;
      pendingOperations.current.add(opKey);
      
      setConfessions(prev => prev.map(c => {
        if (c.id === confessionId && c.poll) {
          const newVotes = [...c.poll.votes_by_option];
          newVotes[optionIndex]++;
          return {
            ...c,
            poll: {
              ...c.poll,
              user_vote_index: optionIndex,
              total_votes: c.poll.total_votes + 1,
              votes_by_option: newVotes
            }
          };
        }
        return c;
      }));

      await supabase.from('poll_votes').insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex } as any);
      
      setTimeout(() => pendingOperations.current.delete(opKey), 500);
    } catch (err) {
      console.error('Vote error:', err);
      toast.error('Failed to vote');
      fetchConfessions();
    }
  };

  const deleteConfession = async (id: string) => { 
    try {
      setConfessions(prev => prev.filter(c => c.id !== id));
      await supabase.from('confessions').delete().eq('id', id);
      toast.success('Confession deleted');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete');
      fetchConfessions();
    }
  };

  const deleteReply = async (replyId: string, confessionId: string) => { 
    try {
      setConfessions(prev => prev.map(c => {
        if (c.id === confessionId) {
          return {
            ...c,
            replies: c.replies?.filter(r => r.id !== replyId),
            replies_count: Math.max(0, c.replies_count - 1)
          };
        }
        return c;
      }));

      await supabase.from('confession_replies').delete().eq('id', replyId);
      toast.success('Reply deleted');
    } catch (err) {
      console.error('Delete reply error:', err);
      toast.error('Failed to delete');
      fetchConfessions();
    }
  };

  return { 
    confessions, 
    loading, 
    createConfession, 
    addReply, 
    likeConfession,
    likeReply,
    voteOnPoll, 
    deleteConfession, 
    deleteReply,
    getRepliesTree 
  };
}