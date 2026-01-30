import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '../supabase/client';
import { toast } from 'sonner';

export type ChatMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  image_url?: string;
};

export type PrivateChat = {
  id: string;
  confession_id: string | null;
  created_by: string;
  participant_2: string;
  status: 'pending' | 'active' | 'rejected' | 'expired' | 'ended';
  created_at: string;
  expires_at: string;
  messages?: ChatMessage[];
  created_by_username?: string;
  participant_2_username?: string;
};

interface PrivateChatUpdate {
  status?: string;
  expires_at?: string;
  confession_id?: string | null;
  created_by?: string;
  participant_2?: string;
}

export function usePrivateChat(userId?: string) {
  const [chats, setChats] = useState<PrivateChat[]>([]);
  const [activeChat, setActiveChat] = useState<PrivateChat | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PrivateChat[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  
  const lastMessageIdRef = useRef<string | null>(null);

  const fetchChats = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data: activeChatsData, error: activeError } = await (supabase
        .from('private_chats') as any)
        .select(`*, private_chat_messages (*)`)
        .or(`created_by.eq.${userId},participant_2.eq.${userId}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;

      const { data: pendingData, error: pendingError } = await (supabase
        .from('private_chats') as any)
        .select('*')
        .eq('participant_2', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      const allUserIds = new Set<string>();
      [...(activeChatsData || []), ...(pendingData || [])].forEach((chat: any) => {
        if (chat.created_by) allUserIds.add(chat.created_by);
        if (chat.participant_2) allUserIds.add(chat.participant_2);
      });

      let usernamesMap = new Map<string, string>();
      if (allUserIds.size > 0) {
        const { data: profiles } = await (supabase
          .from('profiles') as any)
          .select('id, anonymous_username')
          .in('id', Array.from(allUserIds));
        profiles?.forEach((p: any) => usernamesMap.set(p.id, p.anonymous_username));
      }

      const formattedChats = (activeChatsData || []).map((chat: any) => ({
        ...chat,
        messages: (chat.private_chat_messages || []).sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
        created_by_username: usernamesMap.get(chat.created_by) || 'Anonymous',
        participant_2_username: usernamesMap.get(chat.participant_2) || 'Anonymous'
      }));

      const formattedPending = (pendingData || []).map((chat: any) => ({
        ...chat,
        messages: [],
        created_by_username: usernamesMap.get(chat.created_by) || 'Anonymous',
        participant_2_username: usernamesMap.get(chat.participant_2) || 'Anonymous'
      }));

      setChats(formattedChats);
      setPendingRequests(formattedPending);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const extendChat = async (chatId: string) => {
    if (!activeChat) return;
    try {
      const currentExpiry = new Date(activeChat.expires_at).getTime();
      const newExpiry = new Date(currentExpiry + 10 * 60 * 1000).toISOString();
      
      const { error } = await (supabase
        .from('private_chats') as any)
        .update({ expires_at: newExpiry })
        .eq('id', chatId);
        
      if (error) throw error;
      setActiveChat(prev => prev ? { ...prev, expires_at: newExpiry } : null);
      toast.success('Chat extended +10 mins');
    } catch { toast.error('Failed to extend'); }
  };

  const deleteChat = async (chatId: string, showToast = true) => {
    try {
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChat?.id === chatId) setActiveChat(null);
      await (supabase.from('private_chats') as any).delete().eq('id', chatId);
      if (showToast) toast.info('Chat ended');
    } catch (err) { console.error(err); }
  };

  const initiateChat = async (targetUserId: string, confessionId?: string) => {
    if (!userId) return toast.error('Sign in required');
    if (userId === targetUserId) return toast.error("Can't chat with yourself");

    try {
      const { data: existingRequest } = await (supabase
        .from('private_chats') as any)
        .select('*')
        .or(`and(created_by.eq.${userId},participant_2.eq.${targetUserId}),and(created_by.eq.${targetUserId},participant_2.eq.${userId})`)
        .in('status', ['pending', 'active'])
        .maybeSingle();

      if (existingRequest) {
        if (existingRequest.status === 'active') {
          const { data: messages } = await (supabase.from('private_chat_messages') as any).select('*').eq('chat_id', existingRequest.id).order('created_at', { ascending: true });
          setActiveChat({ ...existingRequest, messages: messages || [] });
          return existingRequest;
        } else if (existingRequest.status === 'pending') {
          existingRequest.created_by === userId ? toast.error('Wait for approval') : toast.info('Check requests!');
          return null;
        }
      }

      const { data: newRequest, error } = await (supabase.from('private_chats') as any).insert({
        created_by: userId, 
        participant_2: targetUserId, 
        confession_id: confessionId || null, 
        status: 'pending', 
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }).select().single();

      if (error) throw error;
      toast.success('Request sent!');
      setActiveChat({ ...newRequest, messages: [] });
      return newRequest;
    } catch { toast.error('Error starting chat'); return null; }
  };

  const acceptChatRequest = async (chatId: string) => {
    try {
      const { data, error } = await (supabase
        .from('private_chats') as any)
        .update({ 
            status: 'active', 
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() 
        })
        .eq('id', chatId)
        .select()
        .single();

      if (error) throw error;
      setPendingRequests(prev => prev.filter(r => r.id !== chatId));
      const { data: profile } = await (supabase.from('profiles') as any).select('anonymous_username').eq('id', data.created_by).single();
      const chatObj = { ...data, messages: [], created_by_username: profile?.anonymous_username || 'Anonymous' };
      setChats(prev => [chatObj, ...prev]);
      setActiveChat(chatObj);
      toast.success('Accepted!');
    } catch { toast.error('Failed to accept'); }
  };

  const rejectChatRequest = async (chatId: string) => {
    await deleteChat(chatId, false);
    setPendingRequests(prev => prev.filter(r => r.id !== chatId));
    toast.success('Declined');
  };

  const sendMessage = async (chatId: string, content: string, imageUrl?: string) => {
    if (!userId || (!content.trim() && !imageUrl)) return;
    try {
      const { data, error } = await (supabase.from('private_chat_messages') as any).insert({
        chat_id: chatId, sender_id: userId, content: content.trim(), image_url: imageUrl || null
      }).select().single();
      if (error) throw error;
      if (activeChat?.id === chatId) setActiveChat(prev => prev ? { ...prev, messages: [...(prev.messages || []), data] } : null);
    } catch { toast.error('Failed to send'); }
  };

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('private_chats_global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_chat_messages' }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        if (lastMessageIdRef.current === newMsg.id) return;
        lastMessageIdRef.current = newMsg.id;
        if (activeChat?.id === newMsg.chat_id) {
             setActiveChat(prev => {
                if(!prev || prev.messages?.some(m => m.id === newMsg.id)) return prev;
                return { ...prev, messages: [...(prev.messages || []), newMsg] };
             });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_chat_messages' }, (payload) => {
         const updated = payload.new as ChatMessage;
         if (activeChat?.id === updated.chat_id) setActiveChat(prev => prev ? { ...prev, messages: prev.messages?.map(m => m.id === updated.id ? updated : m) } : null);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_chats' }, (payload) => {
          const updatedChat = payload.new;
          if (activeChat?.id === updatedChat.id) {
              setActiveChat(prev => prev ? { ...prev, expires_at: updatedChat.expires_at, status: updatedChat.status } : null);
              if (updatedChat.status === 'active' && activeChat?.status === 'pending') {
                  toast.success('Request Accepted!');
              }
          }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'private_chats' }, (payload) => {
          if (activeChat?.id === payload.old.id) { setActiveChat(null); toast.info('Chat ended'); }
          setChats(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_chats', filter: `participant_2=eq.${userId}` }, async (payload) => {
          const newReq = payload.new;
          if (newReq.status === 'pending') {
              const { data: profile } = await (supabase.from('profiles') as any).select('anonymous_username').eq('id', newReq.created_by).single();
              const chatWithDetails: PrivateChat = { 
                  ...(newReq as PrivateChat), 
                  created_by_username: profile?.anonymous_username || 'Anonymous',
                  messages: [] 
              };
              setPendingRequests(prev => [chatWithDetails, ...prev]);
              setActiveChat(prev => prev ? prev : chatWithDetails);
              toast.info(`New Request from ${chatWithDetails.created_by_username}`);
          }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, activeChat?.id, activeChat?.status, supabase]);

  useEffect(() => {
    if (!activeChat) return;
    const checkExpiration = () => {
      if (new Date(activeChat.expires_at).getTime() <= Date.now()) deleteChat(activeChat.id);
    };
    const interval = setInterval(checkExpiration, 1000);
    return () => clearInterval(interval);
  }, [activeChat?.id, activeChat?.expires_at]);

  return { chats, activeChat, pendingRequests, loading, initiateChat, acceptChatRequest, rejectChatRequest, sendMessage, setActiveChat, extendChat, deleteChat };
}