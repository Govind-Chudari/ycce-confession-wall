'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CornerDownRight, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

type ReplyProps = {
  reply: any;
  confessionId: string;
  currentUserId?: string;
  onReply: (text: string, parentId: string) => void;
  onLike: (replyId: string, confessionId: string, isLiked: boolean) => void;
  onDelete: (replyId: string, confessionId: string) => void;
  depth?: number;
};

export function ReplyThread({ 
  reply, 
  confessionId,
  currentUserId, 
  onReply, 
  onLike, 
  onDelete,
  depth = 0 
}: ReplyProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);

  // Interaction Refs
  const lastClickTime = useRef(0);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const isOwner = currentUserId === reply.user_id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply(replyText, reply.id);
    setReplyText('');
    setIsReplying(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click
    const now = Date.now();
    if (now - lastClickTime.current < 300) {
      if (!reply.is_liked_by_user) {
        onLike(reply.id, confessionId, false);
        setShowHeartOverlay(true);
        setTimeout(() => setShowHeartOverlay(false), 800);
      }
    }
    lastClickTime.current = now;
  };

  const checkDeleteEligibility = () => {
    if (!isOwner) return false;
    const minutesOld = (new Date().getTime() - new Date(reply.created_at).getTime()) / (1000 * 60);
    if (minutesOld > 10) {
      toast.error("Can't delete comments older than 10 mins");
      return false;
    }
    return true;
  };

  const triggerDelete = () => {
    if (checkDeleteEligibility()) {
      toast("Delete this comment?", {
        action: { label: "Delete", onClick: () => onDelete(reply.id, confessionId) },
        cancel: { label: "Cancel", onClick: () => {} },
        style: { background: '#fef2f2', color: '#dc2626' }
      });
    }
  };

  // Limit nesting visual depth to prevent squishing
  const visualDepth = Math.min(depth, 5);

  return (
    <div className={`relative mt-3 ${visualDepth > 0 ? 'ml-3 md:ml-6' : ''}`}>
      {/* Connector Line */}
      {visualDepth > 0 && (
        <div className="absolute -left-3 top-0 w-3 h-8 border-l-2 border-b-2 border-gray-200 dark:border-zinc-800 rounded-bl-xl opacity-50" />
      )}

      <motion.div 
        layout
        onClick={handleDoubleClick}
        onContextMenu={(e) => { if (isOwner) { e.preventDefault(); triggerDelete(); } }}
        onTouchStart={() => { if (isOwner) touchTimer.current = setTimeout(triggerDelete, 800); }}
        onTouchEnd={() => { if (touchTimer.current) clearTimeout(touchTimer.current); }}
        className="bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-gray-100 dark:border-zinc-800 relative overflow-hidden select-none"
      >
        <AnimatePresence>
          {showHeartOverlay && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.5, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <Heart className="w-12 h-12 text-pink-500 fill-current opacity-50" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm">
              <span className="text-[10px] text-white font-bold">{reply.anonymous_username?.[0]?.toUpperCase() || 'A'}</span>
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {reply.anonymous_username || 'Anonymous'}
            </span>
            <span className="text-[10px] text-gray-400">
              • {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 ml-1 leading-relaxed">{reply.content}</p>

        <div className="flex items-center gap-4 mt-2 ml-1">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsReplying(!isReplying); }}
            className="text-xs font-medium text-gray-500 hover:text-purple-500 flex items-center gap-1 transition-colors"
          >
            <MessageSquare className="w-3 h-3" /> Reply
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); onLike(reply.id, confessionId, reply.is_liked_by_user); }}
            className={`text-xs font-medium flex items-center gap-1 transition-colors ${
              reply.is_liked_by_user ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'
            }`}
          >
            <Heart className={`w-3 h-3 ${reply.is_liked_by_user ? 'fill-current' : ''}`} /> 
            {reply.likes_count > 0 && reply.likes_count}
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
              onClick={e => e.stopPropagation()}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${reply.anonymous_username}...`}
                  className="flex-1 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 transition-colors"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-purple-500 text-white p-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  <CornerDownRight className="w-4 h-4" />
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recursive Children */}
      {reply.children && reply.children.length > 0 && (
        <div className="space-y-0 relative">
           {/* Vertical Thread Line */}
           <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-zinc-800 -ml-3" />
           {reply.children.map((childReply: any) => (
            <ReplyThread
              key={childReply.id}
              reply={childReply}
              confessionId={confessionId}
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