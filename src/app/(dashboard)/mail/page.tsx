'use client';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Bell, Trash2, CheckCheck, Clock, AlertCircle, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

// --- PRODUCTION: UNCOMMENT THIS IMPORT ---
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// --- SUPABASE CLIENT SETUP ---
let supabase: any = null;

const getSupabase = () => {
  if (supabase) return supabase;

  // 1. PRODUCTION MODE
  if (typeof createClient !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
  }
}

const supabaseClient = getSupabase();

// --- TYPES ---
interface Notification {
  id: number | string;
  type: "system" | "notification" | "alert";
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  time?: string; // Calculated field for display
}

export default function MailPage() {
  const [mails, setMails] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  // Helper for "2 mins ago"
  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      // In production, we filter by user_id. In preview, we just get all mock data.
      
      const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id) // Production filter
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedData = data.map((item: any) => ({
            ...item,
            time: timeAgo(item.created_at)
        }));
        setMails(formattedData);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load inbox");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number | string) => {
    // Optimistic Update
    setMails(mails.map(m => m.id === id ? { ...m, read: true } : m));
    toast.success("Marked as read");

    try {
        await supabaseClient.from('notifications').update({ read: true }).eq('id', id);
    } catch (error) {
        console.error("Update failed", error);
    }
  };

  const handleDelete = async (id: number | string) => {
    // Optimistic Update
    setMails(mails.filter(m => m.id !== id));
    toast.success("Message deleted");

    try {
        await supabaseClient.from('notifications').delete().eq('id', id);
    } catch (error) {
        console.error("Delete failed", error);
        toast.error("Failed to delete from server");
    }
  };

  const filteredMails = filter === "all" ? mails : mails.filter(m => !m.read);

  return (
    <div className="relative min-h-screen pb-20 overflow-hidden transition-colors duration-500">
      
      {/* --- ANIMATED BACKGROUND --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <motion.div 
           animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
           transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-900/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"
         />
         <motion.div 
           animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.1, 1] }}
           transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-cyan-500/10 dark:bg-cyan-900/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
         />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">
        
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Inbox
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium ml-1 flex items-center gap-2">
              Your notifications & messages
              {loading && <Loader2 className="w-3 h-3 animate-spin"/>}
            </p>
          </div>
          
          {/* Filter Tabs */}
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md p-1 rounded-xl flex gap-1 border border-white/20 dark:border-white/10">
            {["all", "unread"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${
                  filter === f 
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Mail List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {!loading && filteredMails.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-dashed border-gray-300 dark:border-gray-700"
              >
                <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCheck className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">All caught up!</h3>
                <p className="text-gray-500 text-sm">No new notifications here.</p>
              </motion.div>
            ) : (
              filteredMails.map((mail) => (
                <motion.div
                  layout
                  key={mail.id}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  whileHover={{ scale: 1.01 }}
                  className={`group relative p-5 rounded-2xl border backdrop-blur-xl transition-all ${
                    mail.read 
                      ? "bg-white/40 dark:bg-zinc-900/40 border-gray-200 dark:border-white/5" 
                      : "bg-white/80 dark:bg-zinc-900/80 border-blue-200 dark:border-blue-900/30 shadow-lg shadow-blue-500/5"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      mail.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/20' :
                      mail.type === 'notification' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20' :
                      'bg-blue-100 text-blue-600 dark:bg-blue-900/20'
                    }`}>
                      {mail.type === 'alert' ? <AlertCircle className="w-5 h-5" /> : 
                       mail.type === 'notification' ? <Bell className="w-5 h-5" /> : 
                       <Star className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className={`text-base font-bold ${mail.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                          {mail.title}
                        </h3>
                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap ml-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {mail.time}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 leading-relaxed">
                        {mail.message}
                      </p>
                    </div>
                  </div>

                  {/* Actions (Visible on Hover/Focus) */}
                  <div className="absolute right-4 bottom-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!mail.read && (
                      <button 
                        onClick={() => handleMarkRead(mail.id)}
                        className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Mark as Read"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(mail.id)}
                      className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Unread Dot */}
                  {!mail.read && (
                    <div className="absolute top-6 right-5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}