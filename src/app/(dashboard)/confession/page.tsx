'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, BarChart2, X, Plus } from 'lucide-react';

// ✅ FIX: Trying 2 levels up (Safe for src/app/confession/page.tsx structure)
// Agar yeh bhi fail hua, toh folder structure confirm karna padega.
import { useConfessions } from '@/lib/hooks/useConfessions';
import { usePrivateChat } from '@/lib/hooks/usePrivateChat';
import { ConfessionCard } from '@/components/confession/ConfessionCard'; 
import { PrivateChatModal } from '@/components/confession/privateChatModal';
import { useAuth } from '@/lib/hooks/useAuth';

export default function FeedPage() {
  const { 
    confessions, 
    loading, 
    createConfession, 
    likeConfession, 
    likeReply,
    addReply, 
    deleteConfession,
    deleteReply,
    voteOnPoll, 
    getRepliesTree 
  } = useConfessions();

  const { user } = useAuth();
  
  // ✅ Private Chat Integration with all handlers
  const { 
    activeChat, 
    chats,
    pendingRequests,
    initiateChat, 
    sendMessage, 
    setActiveChat, 
    acceptChatRequest, 
    rejectChatRequest, 
    // addReaction,
    extendChat 
  } = usePrivateChat(user?.id);
  
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  // Poll State
  const [isPollMode, setIsPollMode] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Auto-resize textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [newPost]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setIsPosting(true);

    const validOptions = pollOptions.filter(o => o.trim() !== '');
    if (isPollMode && validOptions.length < 2) {
      alert("Please provide at least 2 options for the poll.");
      setIsPosting(false);
      return;
    }

    await createConfession(newPost, isPollMode ? validOptions : undefined);
    
    setNewPost('');
    setPollOptions(['', '']);
    setIsPollMode(false);
    setIsPosting(false);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateOption = (index: number, val: string) => {
    const newOpts = [...pollOptions];
    newOpts[index] = val;
    setPollOptions(newOpts);
  };

  const addOption = () => {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, '']);
  };

  const removeOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  // ✅ Smart Chat Handler: Opens existing chat or pending request immediately
  const handlePrivateChat = async (targetUserId: string) => {
    if (!user) return;

    // 1. Check existing active chat
    const existingChat = chats.find(c => 
      (c.created_by === user.id && c.participant_2 === targetUserId) ||
      (c.participant_2 === user.id && c.created_by === targetUserId)
    );

    if (existingChat) {
      setActiveChat(existingChat);
      return;
    }

    // 2. Check pending requests (Fix for "Accept box not opening")
    const pendingReq = pendingRequests.find(req => req.created_by === targetUserId);
    if (pendingReq) {
      setActiveChat(pendingReq);
      return;
    }

    // 3. Initiate new
    await initiateChat(targetUserId);
  };

  const getOtherUserName = () => {
    if (!activeChat || !user) return 'Anonymous';
    if (activeChat.created_by === user.id) {
      return activeChat.participant_2_username || 'Anonymous';
    }
    return activeChat.created_by_username || 'Anonymous';
  };

  return (
    <div className="max-w-2xl mx-auto pt-10 pb-52">
      {/* --- FEED LIST --- */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 px-2">
          {confessions.map((confession) => (
            <ConfessionCard
              key={confession.id}
              confession={confession}
              currentUserId={user?.id}
              onLike={() => likeConfession(confession.id, confession.is_liked_by_user)}
              onReply={(text: string, parentId?: string) => addReply(confession.id, text, parentId || null)}
              onReplyLike={(rid: string, isLiked: boolean) => likeReply(rid, confession.id, isLiked)}
              onDelete={() => deleteConfession(confession.id)}
              onReplyDelete={(rid: string) => deleteReply(rid, confession.id)}
              onVote={(pollId, idx) => voteOnPoll(pollId, confession.id, idx)}
              onPrivateChat={handlePrivateChat}
              replyTree={getRepliesTree(confession.replies || [])} 
            />
          ))}
          
          {confessions.length === 0 && (
            <div className="text-center py-20 bg-white/50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
              <div className="text-4xl mb-4">🤫</div>
              <h3 className="text-lg font-bold text-gray-700 dark:text-white">It's quiet here...</h3>
              <p className="text-gray-500">Be the first to share a secret!</p>
            </div>
          )}
        </div>
      )}

      {/* --- PRIVATE CHAT MODAL --- */}
      <AnimatePresence>
        {activeChat && (
          <PrivateChatModal
            chat={activeChat}
            currentUserId={user?.id || ''}
            onClose={() => setActiveChat(null)}
            onSendMessage={(content: string, imageUrl?: string) => sendMessage(activeChat.id, content, imageUrl)}
            // ✅ Passing Handlers Correctly
            onRespond={(chatId: string, status: 'active' | 'rejected') => {
              if (status === 'active') acceptChatRequest(chatId);
              else rejectChatRequest(chatId);
            }}
            // onReact={(msgId: string, emoji: string) => addReaction(msgId, emoji)}
            onExtend={() => extendChat(activeChat.id)}
            otherUserName={getOtherUserName()}
          />
        )}
      </AnimatePresence>

      {/* --- INPUT BOX --- */}
      <div className="fixed bottom-6 left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-[2.5rem] opacity-30 blur-xl group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-white/20 dark:border-zinc-800 rounded-[2rem] p-4 shadow-2xl flex flex-col gap-3">
              
              <div className="flex items-end gap-3">
                <div className="flex-1 min-w-0 pl-1">
                  <textarea
                    ref={textareaRef}
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Type your confession anonymously..."
                    className="w-full bg-transparent max-h-[150px] py-2 px-1 outline-none text-gray-800 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 resize-none font-medium text-base leading-relaxed"
                    rows={1}
                  />
                </div>
                
                <button 
                  onClick={() => setIsPollMode(!isPollMode)}
                  className={`p-2 rounded-xl transition-all ${isPollMode ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                  <BarChart2 className="w-5 h-5" />
                </button>

                <button
                  onClick={handlePost}
                  disabled={isPosting || !newPost.trim()}
                  className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-3 rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30 shrink-0"
                >
                  {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              
              <AnimatePresence>
                {isPollMode && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 pb-2 space-y-3 border-t border-dashed border-gray-200 dark:border-zinc-800 mt-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">Poll Options</p>
                        {pollOptions.map((opt, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <div className="flex-1 min-w-0 relative group">
                              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <span className="text-xs text-gray-400 font-medium font-mono bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {i + 1}
                                </span>
                              </div>
                              <input 
                                value={opt}
                                onChange={(e) => updateOption(i, e.target.value)}
                                placeholder={`Option ${i + 1}`}
                                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                                autoFocus={i === pollOptions.length - 1 && i > 1}
                              />
                            </div>
                            
                            {pollOptions.length > 2 && (
                              <button 
                                onClick={() => removeOption(i)} 
                                className="p-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        {pollOptions.length < 4 && (
                          <button 
                            onClick={addOption} 
                            className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-purple-500 hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all flex items-center justify-center gap-2 group"
                          >
                            <span className="bg-gray-100 dark:bg-zinc-800 rounded-full p-0.5 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                              <Plus className="w-3 h-3" />
                            </span>
                            Add Another Option
                          </button>
                        )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 flex items-center justify-center gap-2">
                 <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  100% Anonymous & Secure
                </span>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}