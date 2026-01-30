'use client';

import { useEffect, useState, useRef } from 'react';
// Import from next/navigation is standard for Next.js App Router
import { useParams, useRouter } from 'next/navigation';
// Adjusted relative path to account for the directory depth in the project structure
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Send, Clock, ArrowLeft, Lock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type ChatDetails = {
  id: string;
  expires_at: string;
  status: string;
  created_by: string;
  participant_2: string;
  participant_3?: string;
};

export default function PrivateChatPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [chat, setChat] = useState<ChatDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('Checking...');
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initialize & Auth Check
  useEffect(() => {
    const init = async () => {
      if (!id) return;
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast.error("Please sign in");
        router.push('/');
        return;
      }
      setUser(authUser);

      // Fetch Chat Details
      // Using 'as any' to bypass potential inference issues during build
      const { data, error } = await (supabase
        .from('private_chats') as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error("Chat not found or access denied");
        router.push('/');
        return;
      }

      const chatData = data as ChatDetails;

      // Verify Participant
      const isParticipant = 
        chatData.created_by === authUser.id || 
        chatData.participant_2 === authUser.id || 
        chatData.participant_3 === authUser.id;

      if (!isParticipant) {
        toast.error("You are not part of this private chat");
        router.push('/');
        return;
      }

      setChat(chatData);
      setLoading(false);

      // Fetch Initial Messages
      const { data: msgs } = await (supabase
        .from('private_chat_messages') as any)
        .select('*')
        .eq('chat_id', id)
        .order('created_at', { ascending: true });
        
      if (msgs) setMessages(msgs as Message[]);
    };

    init();
  }, [id, router, supabase]);

  // 2. Realtime Subscription for Messages
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_chat_messages',
          filter: `chat_id=eq.${id}`
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some(m => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  // 3. Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Countdown Logic
  useEffect(() => {
    if (!chat) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(chat.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [chat]);

  // 5. Send Message
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || isExpired || !user || !id) return;

    const content = newMessage.trim();
    setNewMessage(''); // Optimistic UI clear

    const { error } = await (supabase.from('private_chat_messages') as any).insert({
      chat_id: id,
      sender_id: user.id,
      content: content
    });

    if (error) {
      toast.error("Failed to send");
      setNewMessage(content); // Restore content on failure
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <p className="text-sm text-gray-500 animate-pulse">Entering secure channel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-black overflow-hidden">
      
      {/* --- HEADER --- */}
      <header className="z-10 flex items-center justify-between border-b border-gray-200 bg-white/80 p-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/')}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <Lock className="h-3 w-3 text-purple-500" />
              Private Chat
            </h1>
            <p className="text-xs text-gray-500">Encrypted • 10m Limit</p>
          </div>
        </div>

        {/* Timer Badge */}
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm border ${
          isExpired 
            ? 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-900/50' 
            : 'bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:border-purple-900/50'
        }`}>
          <Clock className="h-3 w-3" />
          <span>{timeLeft}</span>
        </div>
      </header>

      {/* --- MESSAGES AREA --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-center py-4">
          <div className="rounded-xl bg-purple-50 px-4 py-2 text-xs text-purple-600 dark:bg-purple-900/20 dark:text-purple-300 text-center max-w-xs">
            This chat will self-destruct in 10 minutes. Messages are private between participants.
          </div>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === user?.id;
            const isConsecutive = i > 0 && messages[i - 1].sender_id === msg.sender_id;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm break-words ${
                    isMe
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                  } ${isConsecutive ? 'mt-1' : 'mt-3'}`}
                >
                  {msg.content}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* --- INPUT AREA --- */}
      <div className="border-t border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-black safe-area-bottom">
        {isExpired ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 p-4 text-sm text-gray-500 dark:bg-zinc-900">
            <AlertTriangle className="h-4 w-4" />
            <span>This chat has expired.</span>
          </div>
        ) : (
          <form 
            onSubmit={handleSend}
            className="relative flex items-center gap-2"
          >
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a secure message..."
              className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white transition-all"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="group flex items-center justify-center rounded-xl bg-purple-600 p-3 text-white transition-all hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5 transition-transform group-hover:scale-110 group-active:scale-95" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}