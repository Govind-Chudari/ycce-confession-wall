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
  onDelete?: (replyId: string) => void;
  depth?: number;
};

export function ReplyThread({ reply, currentUserId, onReply, onLike, onDelete, depth = 0 }: ReplyProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  
  const displayName = reply.anonymous_username || 'Anonymous';
  const isOwner = currentUserId && reply.user_id === currentUserId;
  const likesCount = reply.likes_count || 0;
  const hasLiked = !!reply.is_liked_by_user;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply(replyText, reply.id);
    setReplyText('');
    setIsReplying(false);
  };

  const checkDeleteEligibility = () => {
    if (!isOwner) return false;
    
    const created = new Date(reply.created_at).getTime();
    const now = new Date().getTime();
    const diffInMinutes = (now - created) / (1000 * 60);

    if (diffInMinutes > 10) {
      toast.error("Can't delete after 10 minutes!");
      return false;
    }
    return true;
  };

  const handleDelete = () => {
    if (!onDelete) return;

    if (checkDeleteEligibility()) {
        toast("Delete this reply?", {
            action: {
                label: "Delete",
                onClick: () => onDelete(reply.id)
            },
            cancel: { label: "Cancel" },
            style: { background: '#fef2f2', color: '#dc2626' }
        });
    }
  };

  // --- Handlers for Delete Gestures ---

  const handleContextMenu = (e: React.MouseEvent) => {
      // 1. Prevent triggering the parent Confession Card's context menu
      e.stopPropagation();

      // 2. Trigger Reply delete if owner
      if (isOwner && onDelete) {
          e.preventDefault();
          handleDelete();
      }
  };

  const handleTouchStart = () => {
      if (isOwner && onDelete) {
          touchTimer.current = setTimeout(() => {
              handleDelete();
          }, 800);
      }
  };

  const handleTouchEnd = () => {
      if (touchTimer.current) {
          clearTimeout(touchTimer.current);
          touchTimer.current = null;
      }
  };

  // Limit nesting visual depth to prevent squishing on mobile
  const visualDepth = Math.min(depth, 5);

  return (
    <div className={`relative mt-3 ${visualDepth > 0 ? 'ml-3 md:ml-6' : ''}`}>
      {/* Connector Line */}
      {visualDepth > 0 && (
        <div className="absolute -left-3 top-0 w-3 h-8 border-l-2 border-b-2 border-gray-200 dark:border-zinc-800 rounded-bl-xl opacity-50 pointer-events-none" />
      )}

      {/* Main Card Bubble - Events attached here */}
      <div 
        className="group bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-gray-100 dark:border-zinc-800 hover:border-purple-500/20 transition-colors select-none"
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={() => { 
            // Cancel long press if user scrolls
            if (touchTimer.current) {
                clearTimeout(touchTimer.current);
                touchTimer.current = null;
            }
        }}
      >
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

            {/* Owner Actions */}
            {isOwner && onDelete && (
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
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

          <button 
            type="button"
            onClick={(e) => { 
                e.stopPropagation();
                if (!currentUserId) {
                  toast.error("Please log in to like replies");
                  return;
                }
                onLike(reply.id, hasLiked); 
            }}
            className={`text-xs font-medium flex items-center gap-1 transition-colors ${
              hasLiked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'
            }`}
          >
            <Heart className={`w-3 h-3 ${hasLiked ? 'fill-current' : ''}`} /> 
            {likesCount > 0 && likesCount}
          </button>
        </div>

        <AnimatePresence>
          {isReplying && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleSubmit}
              className="mt-3"
              // Prevent context menu/touch events from the form triggering delete
              onContextMenu={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
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

      {/* Recursive Children */}
      {reply.children && reply.children.length > 0 && (
        <div className="space-y-0 relative">
           <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-zinc-800 -ml-3" />
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
        </div>
      )}
    </div>
  );
}