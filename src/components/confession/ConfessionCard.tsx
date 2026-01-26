'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Send, Share2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ReplyThread } from './ReplyThread';

type ConfessionCardProps = {
  confession: any;
  currentUserId?: string;
  onLike: () => void;
  onReply: (text: string, parentId?: string) => void;
  onReplyLike: (replyId: string, isLiked: boolean) => void;
  onDelete: () => void;
  onReplyDelete?: (replyId: string) => void;
  replyTree: any[];
};

export function ConfessionCard({ 
  confession, 
  currentUserId, 
  onLike, 
  onReply, 
  onReplyLike, 
  onDelete, 
  onReplyDelete, 
  replyTree 
}: ConfessionCardProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  
  const isOwner = currentUserId === confession.user_id;
  const displayName = confession.anonymous_username || confession.profiles?.anonymous_username || 'Anonymous';
  
  const lastClickTime = useRef(0);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const replyInputRef = useRef<HTMLFormElement>(null);

  // --- AUTO SCROLL LOGIC ---
  const handleAutoScroll = () => {
    if (!showReplies || !replyInputRef.current) return;

    const rect = replyInputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Check if the input box is hidden below the viewport
    const isBelowFold = rect.bottom > (viewportHeight - 20);

    if (isBelowFold) {
        // Scroll just enough to show the input, preserving context
        const scrollAmount = rect.bottom - viewportHeight + 150; 
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  };

  const checkDeleteEligibility = () => {
    if (!isOwner) return false;
    const minutesSinceCreation = (new Date().getTime() - new Date(confession.created_at).getTime()) / (1000 * 60);
    if (minutesSinceCreation > 10) {
      toast.error("Can't delete after 10 minutes!");
      return false;
    }
    return true;
  };

  const triggerDelete = () => {
    if (checkDeleteEligibility()) {
      toast("Delete this confession?", {
        action: { label: "Delete", onClick: onDelete },
        cancel: { label: "Cancel" },
        style: { background: '#fef2f2', color: '#dc2626' }
      });
    }
  };

  return (
    <motion.div
      layout
      onClick={() => {
        const now = Date.now();
        if (now - lastClickTime.current < 300 && !confession.is_liked_by_user) {
          onLike();
          setShowHeartOverlay(true);
          setTimeout(() => setShowHeartOverlay(false), 800);
        }
        lastClickTime.current = now;
      }}
      // Context menu for delete (Desktop)
      onContextMenu={(e) => { 
        if (isOwner) { 
          e.preventDefault(); 
          triggerDelete(); 
        } 
      }}
      // Long press for delete (Mobile)
      onTouchStart={(e) => { 
        // FIX: Don't trigger Confession delete if touching/scrolling inside the replies area
        if ((e.target as HTMLElement).closest('.replies-section')) {
            return;
        }

        if (isOwner) touchTimer.current = setTimeout(triggerDelete, 800); 
      }}
      onTouchEnd={() => {
        if (touchTimer.current) clearTimeout(touchTimer.current);
      }}
      onTouchMove={() => {
        if (touchTimer.current) {
          clearTimeout(touchTimer.current);
          touchTimer.current = null;
        }
      }}
      className="bg-white dark:bg-zinc-900/90 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative"
    >
      <AnimatePresence>
        {showHeartOverlay && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <Heart className="w-24 h-24 text-pink-500 fill-current drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-[2px] shrink-0">
            <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
              <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                {displayName[0]?.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
              {displayName}
            </h3>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(confession.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        {isOwner && (
            <button 
                onClick={(e) => { e.stopPropagation(); triggerDelete(); }}
                className="text-gray-400 hover:text-red-500 p-2"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        )}
      </div>

      <div className="mb-4 pl-1">
        <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{confession.content}</p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <button 
            onClick={(e) => { e.stopPropagation(); onLike(); }} 
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${confession.is_liked_by_user ? 'text-pink-500' : 'text-gray-500 dark:text-gray-400 hover:text-pink-500'}`}
          >
            <Heart className={`w-5 h-5 ${confession.is_liked_by_user ? 'fill-current' : ''}`} />
            <span>{confession.likes_count}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowReplies(!showReplies); }} 
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-purple-500 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{confession.replies_count}</span>
          </button>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); /* Add share logic */ }} 
          className="text-gray-400 hover:text-gray-600"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showReplies && (
          <motion.div 
            initial={{ height: 0 }} 
            animate={{ height: 'auto' }} 
            exit={{ height: 0 }} 
            // Added 'replies-section' class for targeting
            className="overflow-hidden replies-section" 
            onClick={e => e.stopPropagation()}
            // Keep onContextMenu stopPropagation to prevent parent delete menu
            onContextMenu={e => e.stopPropagation()}
            // REMOVED onTouchStart={e => e.stopPropagation()} to enable gesture scrolling
            onLayoutAnimationComplete={handleAutoScroll} 
          >
            <div className="pt-4 mt-2 space-y-4 border-t border-gray-100 dark:border-zinc-800 border-dashed">
              <form 
                ref={replyInputRef}
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  if(replyText.trim()) { 
                    onReply(replyText); 
                    setReplyText(''); 
                  } 
                }} 
                className="relative"
              >
                <input 
                  value={replyText} 
                  onChange={e => setReplyText(e.target.value)} 
                  placeholder="Add a comment..." 
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-purple-500 transition-colors" 
                />
                <button 
                  type="submit" 
                  disabled={!replyText.trim()} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
              
              <div className="space-y-4 pl-1">
                {replyTree.length > 0 ? replyTree.map(reply => (
                  <ReplyThread 
                    key={reply.id} 
                    reply={reply} 
                    currentUserId={currentUserId} 
                    onReply={(text, parentId) => onReply(text, parentId)}
                    onLike={(replyId, status) => onReplyLike(replyId, status)}
                    onDelete={onReplyDelete}
                  />
                )) : (
                  <p className="text-center text-sm text-gray-400 py-2">No replies yet.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}