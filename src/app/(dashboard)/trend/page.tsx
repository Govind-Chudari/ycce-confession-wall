'use client';

import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { BarChart, Users, MessageSquare, AlertTriangle, ArrowUp, ArrowDown, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabase: any = null;

const getSupabase = () => {
  if (supabase) return supabase;

  
  if (typeof createClient !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
  }
}

const supabaseClient = getSupabase();

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { title: 'Total Confessions', value: '0', change: '0%', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/20' },
    { title: 'Active Users', value: '0', change: '0%', icon: Users, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    { title: 'Reports', value: '0', change: '0%', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/20' },
    { title: 'Engagement', value: '0', change: '0%', icon: BarChart, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
  ]);

  const [peakTimes, setPeakTimes] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [topics, setTopics] = useState([
    { label: 'Exams & Studies', val: 0, color: 'bg-blue-500', from: 'from-blue-500', to: 'to-cyan-400' },
    { label: 'Canteen Food', val: 0, color: 'bg-orange-500', from: 'from-orange-500', to: 'to-amber-400' },
    { label: 'Crushes & Dating', val: 0, color: 'bg-pink-500', from: 'from-pink-500', to: 'to-rose-400' },
    { label: 'Faculty & Admin', val: 0, color: 'bg-indigo-500', from: 'from-indigo-500', to: 'to-violet-400' },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    if (!supabaseClient) return;
    setLoading(true);

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const getChange = async (table: string) => {
        const { count: current } = await supabaseClient.from(table).select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo);
        const { count: previous } = await supabaseClient.from(table).select('*', { count: 'exact', head: true }).gte('created_at', fourteenDaysAgo).lte('created_at', sevenDaysAgo);
        
        const currVal = current || 0;
        const prevVal = previous || 0;
        
        if (prevVal === 0) return currVal > 0 ? '+100%' : '0%';
        const diff = ((currVal - prevVal) / prevVal) * 100;
        return `${diff > 0 ? '+' : ''}${diff.toFixed(0)}%`;
      };

      const [
        { count: totalConfessions },
        confessionChange,
        { count: totalUsers },
        usersChange,
        { count: totalReports },
        reportChange,
        { data: allConfessions }, 
        { data: allDoodles }      
      ] = await Promise.all([
        supabaseClient.from('confessions').select('*', { count: 'exact', head: true }),
        getChange('confessions'),
        supabaseClient.from('profiles').select('*', { count: 'exact', head: true }),
        getChange('profiles'),
        supabaseClient.from('reports').select('*', { count: 'exact', head: true }),
        getChange('reports'),
        supabaseClient.from('confessions').select('created_at, content, like_count').order('created_at', { ascending: false }).limit(200),
        supabaseClient.from('doodles').select('like_count')
      ]);

      const confessionLikes = allConfessions?.reduce((sum: number, c: any) => sum + (c.like_count || 0), 0) || 0;
      const doodleLikes = allDoodles?.reduce((sum: number, d: any) => sum + (d.like_count || 0), 0) || 0;
      const totalEngagement = confessionLikes + doodleLikes;

      setStats([
        { title: 'Total Confessions', value: (totalConfessions || 0).toLocaleString(), change: confessionChange, icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/20' },
        { title: 'Active Users', value: (totalUsers || 0).toLocaleString(), change: usersChange, icon: Users, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
        { title: 'Reports', value: (totalReports || 0).toLocaleString(), change: reportChange, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/20' },
        { title: 'Engagement', value: totalEngagement.toLocaleString(), change: '+5%', icon: BarChart, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20' }, 
      ]);

      const buckets = new Array(8).fill(0);
      allConfessions?.forEach((c: any) => {
        const hour = new Date(c.created_at).getHours();
        const bucketIndex = Math.floor(hour / 3);
        if (buckets[bucketIndex] !== undefined) buckets[bucketIndex]++;
      });
      const maxVal = Math.max(...buckets, 1); 
      setPeakTimes(buckets.map(v => Math.round((v / maxVal) * 100)));

      const textBlob = allConfessions?.map((c: any) => c.content.toLowerCase()).join(' ') || "";
      
      const countKeywords = (words: string[]) => {
        return words.reduce((acc, word) => acc + (textBlob.split(word).length - 1), 0);
      };

      const topicCounts = [
        { label: 'Exams & Studies', count: countKeywords(['exam', 'study', 'grade', 'fail', 'pass', 'assignment', 'submission', 'lab']) },
        { label: 'Canteen Food', count: countKeywords(['food', 'canteen', 'mess', 'eat', 'lunch', 'dinner', 'breakfast']) },
        { label: 'Crushes & Dating', count: countKeywords(['crush', 'love', 'date', 'cute', 'relationship', 'single']) },
        { label: 'Faculty & Admin', count: countKeywords(['faculty', 'admin', 'teacher', 'sir', 'mam', 'professor', 'principal']) },
      ];

      const totalTopicMentions = topicCounts.reduce((sum, t) => sum + t.count, 0) || 1;
      
      setTopics(prev => prev.map((t, i) => ({
        ...t,
        val: Math.min(100, Math.round((topicCounts[i].count / totalTopicMentions) * 100))
      })));

    } catch (error) {
      console.error("Dashboard fetch failed:", error);
      toast.error("Failed to refresh dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="relative min-h-full pt-5">
      
      {/* --- ANIMATED BACKGROUND (Global Theme) --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <motion.div 
           animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
           transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-900/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"
         />
         <motion.div 
           animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.1, 1] }}
           transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-indigo-500/10 dark:bg-indigo-900/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
         />
      </div>

      <div className="max-w-5xl mx-auto space-y-8 relative z-10 pt-6">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="p-3 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm">
            <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Trend Analysis</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
              Overview of campus activity & buzz
              {loading && <Loader2 className="w-3 h-3 animate-spin"/>}
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl hover:shadow-2xl hover:shadow-blue-500/5 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  stat.change.startsWith('+') 
                    ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                    : stat.change === '0%' 
                        ? 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                }`}>
                  {stat.change !== '0%' && (stat.change.startsWith('+') ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  {stat.change.replace(/[+-]/, '')}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Section */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 gap-6"
        >
          
          {/* Peak Posting Times Chart */}
          <motion.div 
            variants={itemVariants}
            className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
              <span className="w-2 h-6 bg-purple-500 rounded-full"/> Peak Posting Times
            </h3>
            <div className="h-64 flex items-end justify-between gap-3 px-2">
              {peakTimes.map((h, i) => (
                <div key={i} className="w-full h-full flex items-end relative group">
                  {/* Bar */}
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(h, 5)}%` }} 
                    transition={{ duration: 1, delay: i * 0.1, type: "spring" }}
                    className="w-full bg-gradient-to-t from-purple-600 to-purple-400 dark:from-purple-600 dark:to-purple-400 rounded-t-xl opacity-80 group-hover:opacity-100 transition-opacity relative z-10"
                  />
                  {/* Background Track */}
                  <div className="absolute bottom-0 w-full h-full bg-gray-100 dark:bg-white/5 rounded-t-xl z-0" />
                  
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    {h}% Activity
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
            </div>
          </motion.div>

          {/* Popular Topics List */}
          <motion.div 
            variants={itemVariants}
            className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full"/> Popular Topics
            </h3>
            <div className="space-y-6">
              {topics.map((topic, i) => (
                <div key={topic.label} className="group">
                  <div className="flex justify-between text-sm mb-2 font-medium">
                    <span className="text-gray-700 dark:text-gray-300">{topic.label}</span>
                    <span className="text-gray-900 dark:text-white font-bold">{topic.val}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-[2px]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${topic.val}%` }}
                      transition={{ duration: 1.5, delay: 0.5 + (i * 0.1), ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${topic.from} ${topic.to} shadow-[0_0_10px_rgba(0,0,0,0.1)] relative`}
                    >
                      <div className="absolute inset-0 bg-white/20 group-hover:bg-transparent transition-colors" />
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}