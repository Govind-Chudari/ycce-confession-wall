'use client';

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Send, Paperclip, ShieldAlert, ChevronDown, Check, Loader2, CloudOff } from "lucide-react";
import { toast } from "sonner";

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GENERAL_REPORT_ID = '00000000-0000-0000-0000-000000000000'; 

let supabase: any = null;

const getSupabase = () => {
  if (supabase) return supabase;

  if (typeof createClient !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return supabase;
  } 
}

const supabaseClient = getSupabase();

const ISSUE_TYPES = [
  { id: "bug", label: "🐛 Bug / Technical Issue" },
  { id: "harassment", label: "🚫 Harassment / Bullying" },
  { id: "spam", label: "⚠️ Spam / Inappropriate Content" },
  { id: "feature", label: "💡 Feature Request" },
  { id: "other", label: "📝 Other" },
];

export default function ReportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(ISSUE_TYPES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    
    setIsSubmitting(true);

    try {
        let { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) {
            const { data, error } = await supabaseClient.auth.signInAnonymously();
            if (error) {
                console.error("Auth failed:", error);
                setIsOfflineMode(true);
            } else {
                user = data.user;
                await supabaseClient.from('profiles').upsert(
                    { 
                        id: user.id, 
                        anonymous_username: `Reporter-${user.id.slice(0, 4)}` 
                    }, 
                    { onConflict: 'id' }
                );
            }
        }

        const payload = {
            reporter_id: user?.id,
            content_type: category.id,
            content_id: GENERAL_REPORT_ID, 
            reason: category.label,
            details: description,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        const { error } = await supabaseClient.from('reports').insert(payload);

        if (error) throw error;

        toast.success("Report submitted successfully! We'll look into it.");
        setDescription(""); 
        setCategory(ISSUE_TYPES[0]);

    } catch (error: any) {
        console.error("Submission error:", error);
        if (error.code === '23503') {
             toast.error("Account setup issue. Please reload and try again.");
        } else {
             toast.error("Failed to submit report. Please try again.");
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden transition-colors duration-500">
      
      {/* --- ANIMATED BACKGROUND --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <motion.div 
           animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
           transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-500/10 dark:bg-orange-900/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"
         />
         <motion.div 
           animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.1, 1] }}
           transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-red-500/10 dark:bg-red-900/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
         />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-8">
        
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-3 shadow-lg shadow-orange-500/10">
            <ShieldAlert className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Report an Issue</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium max-w-md mx-auto">
            Help us keep YCCE Confessions safe.
          </p>
          {isOfflineMode && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                <CloudOff className="w-3 h-3" /> Offline Mode
            </div>
          )}
        </motion.div>

        {/* Report Form Card (Compact) */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-xl relative"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Custom Dropdown */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                Issue Type
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full flex items-center justify-between bg-gray-50/50 dark:bg-black/20 border-2 ${isDropdownOpen ? 'border-orange-500/50 ring-4 ring-orange-500/10' : 'border-gray-200 dark:border-white/10'} rounded-xl px-4 py-3 text-left outline-none transition-all text-gray-900 dark:text-white font-medium`}
                >
                  <span className="truncate">{category.label}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                      <div className="max-h-60 overflow-y-auto p-1 scrollbar-hide">
                        {ISSUE_TYPES.map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => {
                              setCategory(type);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors ${
                              category.id === type.id 
                                ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-bold" 
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                            }`}
                          >
                            <span className="truncate">{type.label}</span>
                            {category.id === type.id && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                Description
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue in detail..."
                className="w-full h-28 bg-gray-50/50 dark:bg-black/20 border-2 border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 resize-none text-gray-900 dark:text-white font-medium placeholder:text-gray-400 transition-all text-sm"
              />
            </div>

            {/* Attachment (Mock) */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors border border-transparent dark:border-white/5"
                onClick={() => toast.info("Screenshot attachment coming soon!")}
              >
                <Paperclip className="w-3.5 h-3.5" /> Attach Screenshot
              </button>
              <span className="text-[10px] text-gray-400 italic">Optional (Max 5MB)</span>
            </div>

            <div className="h-px bg-gray-100 dark:bg-white/5 my-2" />

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
                isSubmitting || !description.trim()
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-orange-500/20"
              }`}
            >
              {isSubmitting ? (
                <>Submitting... <Loader2 className="w-4 h-4 animate-spin"/></>
              ) : (
                <>
                  Submit Report <Send className="w-4 h-4" />
                </>
              )}
            </motion.button>

          </form>
        </motion.div>

        {/* Footer Note */}
        <p className="text-center text-[10px] text-gray-400 mt-6 ">
          Emergency? Contact campus security: <span className="font-bold text-gray-500">123-456-7890</span>
        </p>

      </div>
    </div>
  );
}