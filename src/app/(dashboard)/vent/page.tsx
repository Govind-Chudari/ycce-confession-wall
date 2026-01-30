'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartHandshake, Shield, AlertTriangle, X, Send, Heart, Loader2, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabase: any = null;

if (typeof createClient !== 'undefined') {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}


interface Vent {
  id: number | string; 
  text: string;
  support_count: number;
  created_at: string;
  is_local?: boolean;
  user_id?: string;
  timestamp?: Date; 
}

export default function VentPage() {
  const [vents, setVents] = useState<Vent[]>([]);
  const [newVent, setNewVent] = useState("");
  const [showResources, setShowResources] = useState(false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, ventId: string | number | null }>({
    visible: false,
    x: 0,
    y: 0,
    ventId: null
  });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const [supportedVents, setSupportedVents] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        fetchVents();
    }
    init();
    
    const storedSupports = localStorage.getItem('user_supported_vents');
    if (storedSupports) {
        setSupportedVents(new Set(JSON.parse(storedSupports)));
    }

    const channel = supabase
      .channel('public:vents')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vents' }, (payload: any) => {
        setVents((prev) => {
            if (prev.some(v => v.id === payload.new.id)) return prev;
            return [formatVentFromDB(payload.new), ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vents' }, (payload: any) => {
        setVents((prev) => 
          prev.map((v) => v.id === payload.new.id 
            ? { ...v, support_count: payload.new.support_count } 
            : v
          )
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'vents' }, (payload: any) => {
        setVents((prev) => prev.filter((v) => v.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVents = async () => {
    try {
      const { data, error } = await supabase
        .from('vents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        setVents(data.map(formatVentFromDB));
      }
    } catch (error) {
      console.error('Error fetching vents:', error);
      toast.error('Could not load vents. Check connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatVentFromDB = (dbRecord: any): Vent => {
    return {
      id: dbRecord.id,
      text: dbRecord.content,
      support_count: dbRecord.support_count || 0,
      created_at: timeAgo(new Date(dbRecord.created_at)),
      user_id: dbRecord.user_id,
      timestamp: new Date(dbRecord.created_at)
    };
  };

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return "Just now";
  };


  const handleTouchStart = (e: React.TouchEvent, ventId: string | number) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
        setContextMenu({
            visible: true,
            x: touch.clientX,
            y: touch.clientY,
            ventId: ventId
        });
    }, 500); 
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, ventId: string | number) => {
    e.preventDefault();
    setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        ventId: ventId
    });
  };

  const handleDelete = async () => {
    const ventToDelete = vents.find(v => v.id === contextMenu.ventId);
    setContextMenu({ ...contextMenu, visible: false });

    if (!ventToDelete) return;

    if (currentUser?.id !== ventToDelete.user_id && ventToDelete.user_id !== 'guest-user') {
        toast.error("You can only delete your own vents.");
        return;
    }

    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (ventToDelete.timestamp && ventToDelete.timestamp < tenMinsAgo) {
        toast.error("Time limit exceeded. You can only delete within 10 mins.");
        return;
    }

    try {
        const { error } = await supabase.from('vents').delete().eq('id', ventToDelete.id);
        if (error) throw error;
        setVents(prev => prev.filter(v => v.id !== ventToDelete.id));
        toast.success("Vent deleted.");
    } catch (error) {
        console.error("Delete failed:", error);
        toast.error("Failed to delete. Try again.");
    }
  };

  const triggerHeart = () => {
    setShowHeartOverlay(true);
    setTimeout(() => setShowHeartOverlay(false), 1500);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVent.trim()) return;
    
    if (newVent.toLowerCase().includes("kill") || newVent.toLowerCase().includes("die") || newVent.toLowerCase().includes("suicide")) {
      setShowResources(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.from('vents').insert({
        content: newVent,
        user_id: user?.id || null,
        support_count: 0
      }).select();

      if (error) throw error;

      if (data && data.length > 0) {
          const newVentObject = formatVentFromDB(data[0]);
          setVents(prev => [newVentObject, ...prev]);
      } 

      setNewVent("");
      toast.success("Vent posted to the safe space.");

    } catch (error: any) {
      console.error("Post error:", error);
      toast.error("Failed to post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupport = async (id: number | string) => {
    if (supportedVents.has(id)) {
        toast.info("You've already supported this vent ❤️");
        return;
    }

    const newSupported = new Set(supportedVents);
    newSupported.add(id);
    setSupportedVents(newSupported);
    localStorage.setItem('user_supported_vents', JSON.stringify(Array.from(newSupported)));

    setVents(vents.map(v => v.id === id ? { ...v, support_count: v.support_count + 1 } : v));
    triggerHeart();
    toast.success("Sending support... ❤️");

    try {
        const { data: currentVent } = await supabase.from('vents').select('support_count').eq('id', id).single();
        if (currentVent) {
            await supabase.from('vents').update({ support_count: currentVent.support_count + 1 }).eq('id', id);
        }
    } catch (error) {
        console.error("Support failed:", error);
        setVents(prev => prev.map(v => v.id === id ? { ...v, support_count: v.support_count - 1 } : v));
        newSupported.delete(id);
        setSupportedVents(newSupported);
        localStorage.setItem('user_supported_vents', JSON.stringify(Array.from(newSupported)));
        toast.error("Failed to send support.");
    }
  };

  return (
    <div 
        className="relative min-h-full pb-20"
        onClick={() => setContextMenu({ ...contextMenu, visible: false })}
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        html, body, main { scroll-behavior: smooth; -webkit-overflow-scrolling: touch; }
      `}</style>
      
      {/* --- ANIMATED BACKGROUND --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <motion.div 
           animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
           transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-900/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"
         />
         <motion.div 
           animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.1, 1] }}
           transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-emerald-500/10 dark:bg-emerald-900/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
         />
      </div>

      <div className="max-w-2xl mx-auto relative z-10 pt-6">
        
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8 text-center space-y-3"
        >
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="inline-flex items-center justify-center p-4 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-3xl shadow-lg mb-2"
          >
            <HeartHandshake className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">The Vent Zone</h1>
          <p className="text-gray-600 dark:text-gray-300 font-medium">A judgment-free zone. No likes, only support.</p>
          <button 
            onClick={() => setShowResources(true)}
            className="text-xs font-bold text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full hover:bg-red-200 transition-colors"
          >
            Need urgent help?
          </button>
        </motion.div>

        {/* Input Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-xl mb-10 group focus-within:ring-2 ring-emerald-500/50 transition-all"
        >
          <form onSubmit={handlePost}>
            <textarea
              value={newVent}
              onChange={(e) => setNewVent(e.target.value)}
              placeholder="What's weighing on your mind?"
              disabled={isSubmitting}
              className="w-full bg-transparent resize-none outline-none text-lg text-gray-900 dark:text-white min-h-[100px] placeholder:text-gray-400 font-medium disabled:opacity-50"
            />
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-semibold">
                <Shield className="w-3.5 h-3.5 text-emerald-500" /> Anonymous & Protected
              </span>
              <motion.button
                type="submit"
                disabled={!newVent.trim() || isSubmitting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition-all"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <>Vent Safely <Send className="w-4 h-4" /></>}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Vents List */}
        <div className="space-y-4">
          {isLoading && (
             <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
             </div>
          )}
          
          <AnimatePresence mode='popLayout'>
            {vents.map((vent) => {
              const isSupported = supportedVents.has(vent.id);
              const isOwner = currentUser?.id === vent.user_id || vent.user_id === 'guest-user';
              
              return (
                <motion.div
                  layout
                  key={vent.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-white/40 dark:border-white/5 hover:border-emerald-500/30 transition-colors relative select-none"
                  onContextMenu={(e) => handleContextMenu(e, vent.id)}
                  onTouchStart={(e) => handleTouchStart(e, vent.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  <p className="text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap text-base leading-relaxed font-medium">{vent.text}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 font-medium text-xs">{vent.created_at}</span>
                    <motion.button 
                      whileHover={!isSupported ? { scale: 1.05 } : {}}
                      whileTap={!isSupported ? { scale: 0.9 } : {}}
                      onClick={() => handleSupport(vent.id)}
                      disabled={isSupported}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-bold group ${
                        isSupported 
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 cursor-default" 
                          : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                      }`}
                    >
                      <Heart className={`w-4 h-4 transition-colors ${isSupported ? "fill-current" : "group-hover:fill-current"}`} />
                      <span>{vent.support_count}</span>
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {!isLoading && vents.length === 0 && (
             <div className="text-center text-gray-400 py-10">
                No vents yet. Be the first to share.
             </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu.visible && (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }}
                className="z-50 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-xl p-1 min-w-[120px]"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                    <Trash2 className="w-4 h-4" /> Delete
                </button>
                <button 
                    onClick={() => setContextMenu({ ...contextMenu, visible: false })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors mt-1"
                >
                    <X className="w-4 h-4" /> Cancel
                </button>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Resource Modal */}
      <AnimatePresence>
        {showResources && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-md w-full border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
              <button onClick={() => setShowResources(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Help Resources</h3>
              </div>
              
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium text-base mb-2">You are not alone. Please reach out:</p>
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5 flex justify-between items-center">
                  <span>National Helpline</span>
                  <strong className="text-lg text-gray-900 dark:text-white">14416</strong>
                </div>
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5 flex justify-between items-center">
                  <span>YCCE Counselor</span>
                  <strong className="text-gray-900 dark:text-white">98765 43210</strong>
                </div>
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5 flex justify-between items-center">
                  <span>Student Mentor</span>
                  <strong className="text-gray-900 dark:text-white">Block A, 102</strong>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heart Overlay Animation */}
      <AnimatePresence>
        {showHeartOverlay && (
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.2 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className="fixed inset-0 flex items-center justify-center pointer-events-none z-[70]"
            >
                <Heart className="w-32 h-32 text-emerald-500 fill-current drop-shadow-2xl" />
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}