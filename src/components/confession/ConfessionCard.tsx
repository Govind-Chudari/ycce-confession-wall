"use client";

import { useState, useRef, memo } from "react";
import {
  Heart,
  Clock,
  MessageCircle,
  CornerDownLeft,
  Send,
  X,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils/helpers";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";

export function ConfessionCard({ 
  confession, 
  onLike, 
  onReply, 
  onLikeReply, 
  onDeleteReply,
  onDeleteConfession // Added prop for deleting main confession
}: any) {
  const [showComments, setShowComments] = useState(false);
  const [rootReplyText, setRootReplyText] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [nestedReplyText, setNestedReplyText] = useState("");
  
  // Default limit 4
  const [visibleReplies, setVisibleReplies] = useState(4);
  const [visibleMap, setVisibleMap] = useState<Record<string, number>>({});

  const ref = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0); // For main card double tap

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [40, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);

  // Helper to check 10-minute window
  const canDelete = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < 10 * 60 * 1000; // 10 minutes in milliseconds
  };

  const replies = confession.confession_replies || [];
  const uniqueReplies = Array.from(
    new Map(replies.map((r: any) => [r.id, r])).values()
  );

  function buildTree(replies: any[]) {
    const map: any = {};
    replies.forEach((r) => (map[r.id] = { ...r, children: [] }));
    replies.forEach((r) => {
      if (r.parent_reply_id && map[r.parent_reply_id]) {
        map[r.parent_reply_id].children.push(map[r.id]);
      }
    });
    // Sort children: Newest first (Recent)
    Object.values(map).forEach((n: any) =>
      n.children.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
    );
    // Sort roots: Newest first (Recent)
    return Object.values(map)
      .filter((r: any) => !r.parent_reply_id)
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
  }

  const replyTree = buildTree(uniqueReplies);

  const ReplyNode = memo(function ReplyNode({ reply, depth = 0 }: any) {
    const isReplying = activeReplyId === reply.id;
    const isLiked = reply.liked_by_me;
    const visible = visibleMap[reply.id] ?? 4;
    
    const replyTap = useRef(0);

    const handleDoubleTap = (e: React.MouseEvent) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - replyTap.current < 300) {
         // Trigger backend like ONLY if not already liked
         // This prevents "unliking" on double tap
         if(!isLiked && onLikeReply) {
             onLikeReply(reply.id);
         }
      }
      replyTap.current = now;
    };

    return (
      <div
        className="flex flex-col relative"
        style={{ marginLeft: depth > 0 ? 16 : 0 }}
      >
        {depth > 0 && (
          <div className="absolute -left-3 top-0 bottom-0 w-px bg-zinc-800" />
        )}

        <div className="mt-3 relative">
          {depth > 0 && (
            <div className="absolute -left-3 top-3 w-2 h-px bg-zinc-800" />
          )}

          <div
            onClick={handleDoubleTap}
            // Logic for thin red border when liked
            className={`relative rounded-lg px-3 py-2 text-xs text-zinc-200 overflow-hidden group select-none transition-all duration-300 ${
              isLiked 
                ? "bg-zinc-800/40 border border-red-500/50 shadow-[0_0_10px_-5px_rgba(239,68,68,0.3)]" 
                : "bg-zinc-800/40 border border-zinc-800/50"
            }`}
          >
             {/* 1. Subtle Red Glow Background for Liked State */}
             <AnimatePresence>
                {isLiked && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.05 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 bg-red-500 rounded-lg"
                  />
                )}
             </AnimatePresence>

            <div className="break-words relative z-10">{reply.content}</div>

            <div className="flex items-center justify-between mt-1.5 relative z-10">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500">
                  {formatTimeAgo(new Date(reply.created_at))}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveReplyId(isReplying ? null : reply.id);
                    setNestedReplyText("");
                  }}
                  className={`flex items-center gap-1 text-[10px] hover:text-blue-400 transition-colors ${isReplying ? 'text-blue-400 font-bold' : 'text-zinc-500'}`}
                >
                  <CornerDownLeft size={10} /> Reply
                </button>
                 
                 {/* Delete Button for Replies - 10 Min Limit */}
                 {reply.is_mine && onDeleteReply && canDelete(reply.created_at) && (
                    <button
                      onClick={(e) => {
                         e.stopPropagation();
                         if(confirm("Delete this reply?")) onDeleteReply(reply.id);
                      }}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete reply"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
              </div>

               <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Keep existing toggle logic for single click
                    if(onLikeReply) onLikeReply(reply.id);
                  }}
                  className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
                    isLiked ? "text-red-500" : "text-zinc-600 hover:text-red-400"
                  }`}
                >
                   {reply.like_count > 0 && <span>{reply.like_count}</span>}
                   <Heart size={10} className={isLiked ? "fill-red-500 text-red-500" : ""} />
                </button>
            </div>
          </div>

          {/* NESTED INPUT BOX */}
          {isReplying && (
            <div className="mt-2 ml-1 overflow-hidden">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={nestedReplyText}
                  onChange={(e) => setNestedReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  onClick={() => {
                    if (!nestedReplyText.trim()) return;
                    onReply(confession.id, nestedReplyText, reply.id);
                    setActiveReplyId(null);
                    setNestedReplyText("");
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-md transition-colors"
                >
                  <Send size={14} />
                </button>
                <button
                  onClick={() => setActiveReplyId(null)}
                  className="text-zinc-500 hover:text-zinc-300 p-2"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RECENT REPLIES LOGIC (Recursion) */}
        {reply.children.slice(0, visible).map((c: any) => (
          <ReplyNode key={c.id} reply={c} depth={depth + 1} />
        ))}

        {reply.children.length > visible && (
          <button
            onClick={() =>
              setVisibleMap((prev) => ({
                ...prev,
                [reply.id]: (prev[reply.id] ?? 4) + 4,
              }))
            }
            className="flex items-center gap-1 text-xs text-blue-400 ml-6 mt-2 hover:underline"
          >
            Show {reply.children.length - visible} more replies <ChevronDown size={10} />
          </button>
        )}
      </div>
    );
  });

  return (
    <motion.div
      ref={ref}
      style={{ y, scale }}
      onClick={(e) => {
        // Prevent collapsing if clicking interactive elements
        if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
        
        // Double tap logic for MAIN CONFESSION
        const now = Date.now();
        if (now - lastTap.current < 300) {
          // Only like if not already liked (Strictly Like Only)
          if (!confession.liked_by_me && onLike) {
            onLike(confession.id);
          }
        }
        lastTap.current = now;
      }}
      className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 space-y-2 relative overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="text-white font-medium">
            {confession.anonymous_username || "Anonymous"}
          </span>
          <Clock size={11} />
          {formatTimeAgo(new Date(confession.created_at))}
        </div>

        {/* Delete Button for Main Confession - 10 Min Limit */}
        {confession.is_mine && onDeleteConfession && canDelete(confession.created_at) && (
          <button
            onClick={(e) => {
               e.stopPropagation();
               if(confirm("Delete this confession?")) onDeleteConfession(confession.id);
            }}
            className="text-zinc-600 hover:text-red-400 transition-colors"
            title="Delete confession"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <p className="text-sm text-zinc-200 leading-relaxed">{confession.content}</p>

      <div className="flex gap-4 text-xs pt-1">
        <button
          onClick={(e) => {
             e.stopPropagation();
             onLike(confession.id);
          }}
          className={`flex items-center gap-1 transition-colors ${
            confession.liked_by_me
              ? "text-red-500"
              : "text-zinc-400 hover:text-red-500"
          }`}
        >
          <Heart
            size={14}
            className={`transition-transform ${
              confession.liked_by_me ? "fill-red-500 text-red-500 scale-110" : ""
            }`}
          />
          {confession.reaction_count || 0}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowComments((v) => !v);
          }}
          className={`flex items-center gap-1 transition-colors ${showComments ? 'text-blue-400' : 'text-zinc-400 hover:text-blue-400'}`}
        >
          <MessageCircle size={14} />
          {confession.reply_count || 0}
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="pt-3 mt-2 border-t border-zinc-800/50">
              <div className="flex gap-2 mb-4">
                <input
                  value={rootReplyText}
                  onChange={(e) => setRootReplyText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700 transition-colors"
                />
                <button
                  onClick={() => {
                    if (!rootReplyText.trim()) return;
                    onReply(confession.id, rootReplyText, null);
                    setRootReplyText("");
                  }}
                  className="bg-white text-black px-3 py-1.5 rounded-md text-xs font-bold hover:bg-zinc-200 transition-colors"
                >
                  Post
                </button>
              </div>

              {replyTree.length > 0 ? (
                replyTree.slice(0, visibleReplies).map((r: any) => (
                  <ReplyNode key={r.id} reply={r} />
                ))
              ) : (
                <div className="text-center py-4 text-xs text-zinc-600">No comments yet.</div>
              )}

              {replyTree.length > visibleReplies && (
                <button
                  onClick={() => setVisibleReplies((v) => v + 4)}
                  className="w-full py-2 flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors mt-2"
                >
                  Show {replyTree.length - visibleReplies} more replies <ChevronDown size={12} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}