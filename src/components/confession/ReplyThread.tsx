'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CornerDownRight, Heart, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

type ReplyProps = {
  reply: any;
  currentUserId?: string;
  onReply: (text: string, parentId: string) => void;
  onLike: (replyId: string, isLiked: boolean) => void;
  // UPDATE: Added optional confessionId to the type definition
  onDelete?: (replyId: string, confessionId?: string) => void;
  depth?: number;
};

export function ReplyThread({ reply, currentUserId, onReply, onLike, onDelete, depth = 0 }: ReplyProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  
  const lastTapTime = useRef(0);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);

  const profileData = 
    (Array.isArray(reply.profiles) ? reply.profiles[0] : reply.profiles) || 
    reply.profile || 
    reply.user ||
    reply.author;

  const displayName = 
    reply.anonymous_username || 
    profileData?.anonymous_username || 
    'Anonymous';
  
  const isOwner = currentUserId && reply.user_id 
    ? String(currentUserId) === String(reply.user_id) 
    : false;

  const likesCount = 
    typeof reply.likes_count === 'number' ? reply.likes_count :
    reply.confession_reply_likes?.length ?? 
    reply.reply_likes?.length ?? 
    (Array.isArray(reply.likes) ? reply.likes.length : 0);

  const hasLiked = 
    typeof reply.is_liked_by_user === 'boolean' ? reply.is_liked_by_user : 
    reply.confession_reply_likes?.some((l: any) => String(l.user_id) === String(currentUserId)) ??
    reply.reply_likes?.some((l: any) => String(l.user_id) === String(currentUserId)) ??
    false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply(replyText, reply.id);
    setReplyText('');
    setIsReplying(false);
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
        e.stopPropagation(); 
        if (!currentUserId) {
            toast.error("Sign in to like");
            return;
        }
        
        if (!hasLiked) {
             onLike(reply.id, hasLiked);
        }
        
        setShowHeartOverlay(true);
        setTimeout(() => setShowHeartOverlay(false), 800);
    }
    lastTapTime.current = now;
  };

  const checkDeleteEligibility = () => {
    if (!isOwner) return false;
    const minutesSinceCreation = (new Date().getTime() - new Date(reply.created_at).getTime()) / (1000 * 60);
    if (minutesSinceCreation > 10) {
      toast.error("Can't delete after 10 minutes!");
      return false;
    }
    return true;
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (checkDeleteEligibility()) {
        toast("Delete this reply?", {
            // FIX: Passing reply.confession_id so the parent knows which confession to update
            action: { label: "Delete", onClick: () => onDelete(reply.id, reply.confession_id) },
            cancel: { label: "Cancel", onClick: () => {} }, // Added empty onClick to satisfy types
            style: { background: '#fef2f2', color: '#dc2626' }
        });
    }
  };

  // --- Handlers for Delete Gestures (Right Click & Hold) ---

  const handleContextMenu = (e: React.MouseEvent) => {
      // 1. Always stop propagation so we don't trigger the parent Confession's delete menu
      e.stopPropagation();

      // 2. If owner, trigger local delete
      if (isOwner && onDelete) {
          e.preventDefault(); // Prevent browser context menu
          handleDelete();
      }
  };

  const handleTouchStart = () => {
      if (isOwner && onDelete) {
          touchTimer.current = setTimeout(() => {
              handleDelete();
          }, 800); // 800ms hold to delete
      }
  };

  const handleTouchEnd = () => {
      if (touchTimer.current) {
          clearTimeout(touchTimer.current);
          touchTimer.current = null;
      }
  };

  const handleTouchMove = () => {
      // Cancel delete if user scrolls while holding
      if (touchTimer.current) {
          clearTimeout(touchTimer.current);
          touchTimer.current = null;
      }
  };

  const visualDepth = Math.min(depth, 5);

  return (
    <motion.div 
        layout // <--- Yeh magic prop hai jo baaki elements ko smooth slide karega
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }} // <--- Fade out aur shrink animation
        transition={{ duration: 0.3 }}
        className={`relative mt-3 ${visualDepth > 0 ? 'ml-3 md:ml-6' : ''}`}
    >
      {visualDepth > 0 && (
        <div className="absolute -left-3 top-0 w-3 h-8 border-l-2 border-b-2 border-gray-200 dark:border-zinc-800 rounded-bl-xl opacity-50 pointer-events-none" />
      )}

      {/* Main Card Bubble */}
      <div 
        className="group relative bg-white/50 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-3 border border-gray-100 dark:border-zinc-800 hover:border-purple-500/20 transition-all hover:shadow-sm select-none"
        onClick={handleDoubleTap}
        onContextMenu={handleContextMenu} // Re-enabled with logic
        onTouchStart={handleTouchStart}   // Added for Android hold
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <AnimatePresence>
            {showHeartOverlay && (
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }} 
                    animate={{ scale: 1.2, opacity: 1 }} 
                    exit={{ scale: 0, opacity: 0 }} 
                    className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                >
                    <Heart className="w-12 h-12 text-pink-500 fill-current drop-shadow-xl" />
                </motion.div>
            )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-[10px] text-white font-bold">
                {displayName[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
              {displayName}
            </span>
            <span className="text-[10px] text-gray-400 shrink-0">
              • {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
            </span>
          </div>

            {/* DELETE BUTTON: Visible for owner */}
            {isOwner && onDelete && (
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 opacity-60 hover:opacity-100"
                    title="Delete reply"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 ml-1 leading-relaxed break-words">
            {reply.content}
        </p>

        <div className="flex items-center gap-4 mt-2 ml-1">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsReplying(!isReplying); }}
            className="text-xs font-medium text-gray-500 hover:text-purple-500 flex items-center gap-1 transition-colors"
          >
            <MessageSquare className="w-3 h-3" /> Reply
          </button>

          <motion.button 
            type="button"
            whileTap={{ scale: 0.8 }}
            onClick={(e) => { 
                e.stopPropagation();
                if (!currentUserId) {
                  toast.error("Please log in to like replies");
                  return;
                }
                onLike(reply.id, hasLiked); 
            }}
            className={`text-xs font-medium flex items-center gap-1 transition-colors group/heart ${
              hasLiked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'
            }`}
          >
            <motion.div
                key={`${likesCount}-${hasLiked}`} 
                initial={{ scale: 1 }}
                animate={hasLiked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.2 }}
            >
                <Heart className={`w-3 h-3 ${hasLiked ? 'fill-current' : ''}`} /> 
            </motion.div>
            
            <span>{likesCount > 0 && likesCount}</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {isReplying && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleSubmit}
              className="mt-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${displayName}...`}
                  className="flex-1 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 transition-colors w-full"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 shrink-0"
                >
                  <CornerDownRight className="w-4 h-4" />
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Recursive Children with AnimatePresence for smooth delete */}
      {reply.children && reply.children.length > 0 && (
        <div className="space-y-0 relative">
           <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-zinc-800 -ml-3" />
           <AnimatePresence mode='popLayout'>
             {reply.children.map((childReply: any) => (
              <ReplyThread
                key={childReply.id}
                reply={childReply}
                currentUserId={currentUserId}
                onReply={onReply}
                onLike={onLike}
                onDelete={onDelete} 
                depth={depth + 1}
              />
            ))}
           </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}