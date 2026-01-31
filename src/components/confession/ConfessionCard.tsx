'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Send, Share2, Trash2, CheckCircle2, MessageSquareDashed } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useLenis } from 'lenis/react'; 
import { ReplyThread } from './ReplyThread';
import { ShareStickerModal } from './ShareStickerModal'; 

type ConfessionCardProps = {
  confession: any;
  currentUserId?: string;
  onLike: () => void;
  onReply: (text: string, parentId?: string) => void;
  onReplyLike: (replyId: string, isLiked: boolean) => void; 
  onDelete: () => void;
  onReplyDelete?: (replyId: string) => void;
  onVote?: (pollId: string, optionIndex: number) => void;
  onPrivateChat?: (targetUserId: string) => void;
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
  onVote,
  onPrivateChat,
  replyTree 
}: ConfessionCardProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false); 
  
  const lenis = useLenis();
  const isOwner = currentUserId === confession.user_id;
  const displayName = confession.anonymous_username || confession.profiles?.anonymous_username || 'Anonymous';
  
  const lastClickTime = useRef(0);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null); 
  const replyInputRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (lenis) {
      const timer = setTimeout(() => lenis.resize(), 300);
      return () => clearTimeout(timer);
    }
  }, [showReplies, replyTree, lenis]);

  const handleAutoScroll = () => {
    if (!showReplies || !replyInputRef.current) return;
    setTimeout(() => {
      lenis?.resize();
      if (!replyInputRef.current) return;
      const rect = replyInputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isBelowFold = rect.bottom > (viewportHeight - 20);

      if (isBelowFold) {
          const scrollAmount = rect.bottom - viewportHeight + 150; 
          if (lenis) {
            const targetScroll = window.scrollY + scrollAmount;
            lenis.scrollTo(targetScroll, { duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
          } else {
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          }
      }
    }, 100);
  };

  const checkDeleteEligibility = () => {
    if (!isOwner) return false;
    const minutesSinceCreation = (new Date().getTime() - new Date(confession.created_at).getTime()) / (1000 * 60);
    if (minutesSinceCreation > 10) { toast.error("Can't delete after 10 minutes!"); return false; }
    return true;
  };

  const triggerDelete = () => {
    if (checkDeleteEligibility()) {
      toast("Delete this confession?", { 
        action: { label: "Delete", onClick: onDelete }, 
        cancel: { label: "Cancel", onClick: () => {} }, 
        style: { background: '#fef2f2', color: '#dc2626' } 
      });
    }
  };

  const handleDoubleTapLike = (e: React.MouseEvent) => { e.stopPropagation(); const now = Date.now(); if (now - lastClickTime.current < 300 && !confession.is_liked_by_user) { onLike(); setShowHeartOverlay(true); setTimeout(() => setShowHeartOverlay(false), 800); } lastClickTime.current = now; };
  const handleContextMenu = (e: React.MouseEvent) => { if (isOwner) { e.preventDefault(); e.stopPropagation(); triggerDelete(); } };
  const handleTouchStart = (e: React.TouchEvent) => { touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; if (isOwner) touchTimer.current = setTimeout(triggerDelete, 800); };
  const handleTouchEnd = () => { if (touchTimer.current) clearTimeout(touchTimer.current); touchStartPos.current = null; };
  const handleTouchMove = (e: React.TouchEvent) => { if (touchTimer.current && touchStartPos.current) { const diffX = Math.abs(e.touches[0].clientX - touchStartPos.current.x); const diffY = Math.abs(e.touches[0].clientY - touchStartPos.current.y); if (diffX > 10 || diffY > 10) { clearTimeout(touchTimer.current); touchTimer.current = null; touchStartPos.current = null; } } };

  const hasVoted = confession.poll?.user_vote_index !== null && confession.poll?.user_vote_index !== undefined;
  const totalVotes = confession.poll?.total_votes || 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ touchAction: 'pan-y' }}
        className="group relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-100 dark:border-zinc-800 rounded-[2rem] p-5 shadow-sm hover:shadow-xl transition-all duration-300"
      >
        <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-pink-500/0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <AnimatePresence>
          {showHeartOverlay && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
              <Heart className="w-24 h-24 text-pink-500 fill-current drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className="cursor-pointer relative z-10"
          onClick={handleDoubleTapLike}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-[2px] shrink-0 shadow-lg">
                <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
                  <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                    {displayName[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate tracking-tight">
                  {displayName}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {formatDistanceToNow(new Date(confession.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <div className="flex gap-1">
              {!isOwner && onPrivateChat && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onPrivateChat(confession.user_id); }} 
                  className="text-gray-400 hover:text-purple-500 p-2 transition-colors rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  title="Start 10m Private Chat"
                >
                  <MessageSquareDashed className="w-4 h-4" />
                </button>
              )}
              {isOwner && (
                <button onClick={(e) => { e.stopPropagation(); triggerDelete(); }} className="text-gray-400 hover:text-red-500 p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          </div>

          <div className="mb-4 pl-1">
            <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed text-[15px] font-normal">{confession.content}</p>
          </div>

          {confession.poll && (
            <div className="mb-4 mt-2 space-y-2" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
              {confession.poll.options.map((option: string, idx: number) => {
                const voteCount = confession.poll.votes_by_option[idx] || 0;
                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                const isSelected = confession.poll.user_vote_index === idx;

                return (
                  <div key={idx} className="relative group/poll">
                    {hasVoted && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`absolute inset-y-0 left-0 rounded-lg opacity-20 ${isSelected ? 'bg-purple-500' : 'bg-gray-300 dark:bg-zinc-700'}`}
                      />
                    )}
                    <button
                      disabled={hasVoted}
                      onClick={() => onVote && onVote(confession.poll.id, idx)}
                      className={`
                        relative w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all
                        ${hasVoted 
                          ? 'border-transparent cursor-default' 
                          : 'border-gray-200 dark:border-zinc-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                        <span className={`truncate ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {option}
                        </span>
                      </div>
                      {hasVoted && (
                        <span className="text-xs text-gray-500 font-semibold ml-2 flex-shrink-0">{percentage}%</span>
                      )}
                    </button>
                  </div>
                );
              })}
              <div className="text-xs text-gray-400 pl-1 mt-1 font-medium">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</div>
            </div>
          )}

        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-800 relative z-10">
          <div className="flex items-center gap-4">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onLike(); }} 
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${confession.is_liked_by_user ? 'text-pink-500' : 'text-gray-500 dark:text-gray-400 hover:text-pink-500'}`}
            >
              <Heart className={`w-5 h-5 ${confession.is_liked_by_user ? 'fill-current' : ''}`} />
              <span>{confession.likes_count}</span>
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); setShowReplies(!showReplies); }} 
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-purple-500 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{confession.replies_count}</span>
            </motion.button>
          </div>
          
          {/* SHARE BUTTON */}
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsShareModalOpen(true); 
            }} 
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-all"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence>
          {showReplies && (
            <motion.div 
              initial={{ height: 0, opacity: 0, overflow: "hidden" }} 
              animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: "visible" } }} 
              exit={{ height: 0, opacity: 0, overflow: "hidden" }}
              className="replies-section"
              onLayoutAnimationComplete={() => { setTimeout(() => { lenis?.resize(); handleAutoScroll(); }, 50); }}
              onClick={e => e.stopPropagation()}
              onContextMenu={e => e.stopPropagation()}
            >
              <div className="pt-4 mt-2 space-y-4 border-t border-gray-100 dark:border-zinc-800 border-dashed">
                <form 
                  ref={replyInputRef}
                  onSubmit={(e) => { 
                    e.preventDefault(); 
                    if(replyText.trim()) { onReply(replyText); setReplyText(''); } 
                  }} 
                  className="relative"
                >
                  <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Add a comment..." className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-purple-500 transition-colors" />
                  <button type="submit" disabled={!replyText.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"><Send className="w-3 h-3" /></button>
                </form>
                
                <div className="space-y-4 pl-1">
                  {replyTree.length > 0 ? replyTree.map(reply => (
                    <ReplyThread key={reply.id} reply={reply} currentUserId={currentUserId} onReply={(text, parentId) => onReply(text, parentId)} onLike={onReplyLike} onDelete={onReplyDelete} />
                  )) : (
                    <p className="text-center text-sm text-gray-400 py-2">No replies yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* RENDER THE SHARE MODAL */}
      <ShareStickerModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        confession={confession}
        displayName={displayName}
      />
    </>
  );
}