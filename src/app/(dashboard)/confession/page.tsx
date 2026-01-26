'use client';

import { useConfessions } from '@/lib/hooks/useConfessions';
import { ConfessionCard } from '@/components/confession/ConfessionCard'; 
import { Loader2, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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
    getRepliesTree 
  } = useConfessions();

  const { user } = useAuth();
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  // Auto-resize textarea logic
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
    await createConfession(newPost);
    setNewPost('');
    setIsPosting(false);
    // Only scroll to top when creating a NEW confession
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReply = async (confessionId: string, text: string, parentId?: string | null) => {
    await addReply(confessionId, text, parentId || null);
    // REMOVED: window.scrollTo call so the screen stays where the user is typing
  };

  return (
    <div className="max-w-2xl mx-auto pt-10 pb-44">
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
              onReply={(text: string, parentId?: string) => handleReply(confession.id, text, parentId)}
              onReplyLike={(rid: any, status: any) => likeReply(rid, confession.id, status)}
              onDelete={() => deleteConfession(confession.id)}
              onReplyDelete={(rid: any) => deleteReply(rid, confession.id)}
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

      {/* --- FIXED BOTTOM INPUT BOX (Premium Glow Design) --- */}
      <div className="fixed bottom-6 left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          
          {/* Main Container with Gradient Glow */}
          <div className="relative group">
            {/* The Animated Glow Layer */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-[2.5rem] opacity-30 blur-xl group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            
            {/* The Content Box */}
            <div className="
              relative
              bg-white/90 dark:bg-black/90               
              backdrop-blur-2xl                           
              border border-white/20 dark:border-zinc-800 
              rounded-[2rem]                           
              p-4                                        
              shadow-2xl
              flex flex-col gap-3
            ">
              
              {/* Input Area */}
              <div className="flex items-end gap-3">
                <div className="flex-1 pl-1">
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
                  onClick={handlePost}
                  disabled={isPosting || !newPost.trim()}
                  className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-3 rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30 shrink-0"
                >
                  {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Divider & Privacy Badge */}
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