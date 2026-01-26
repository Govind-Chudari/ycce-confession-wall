'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client'; // Real Supabase Client
import { motion } from 'framer-motion';
import { User, Mail, Building, GraduationCap, Loader2, Sparkles, Hash, Phone, Edit3 } from 'lucide-react';
import Link from 'next/link'; // Import Link

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(data);
      } catch (error) {
        console.error("Profile page error:", error);
      } finally {
        setLoading(false);
      }
    };
    getProfile();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-10 overflow-hidden transition-colors duration-500">
      
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
           className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-blue-500/10 dark:bg-blue-900/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
         />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6">
        
        {/* Header Section */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-[3px] shadow-lg shadow-purple-500/20 mx-auto mb-4">
              <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                <User className="w-10 h-10 text-zinc-400" />
              </div>
            </div>
            <div className="absolute bottom-4 right-0 p-1.5 bg-white dark:bg-zinc-800 rounded-full shadow-md border border-gray-200 dark:border-zinc-700">
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </div>
          </div>
          
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {profile?.anonymous_username || 'Anonymous'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Student Profile</p>
        </motion.div>

        {/* Profile Details Card */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-xl"
        >
          <div className="space-y-4">
            <ProfileField icon={Mail} label="Email" value={profile?.email} color="text-blue-500" />
            <ProfileField icon={User} label="Username" value={profile?.anonymous_username} color="text-purple-500" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProfileField icon={Building} label="Branch" value={profile?.branch} color="text-orange-500" />
              <ProfileField icon={GraduationCap} label="Year / Sem" value={profile?.year ? `Year ${profile?.year} • Sem ${profile?.semester}` : 'N/A'} color="text-green-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <ProfileField icon={Hash} label="Enrollment" value={profile?.enrollment_number} color="text-pink-500" />
               <ProfileField icon={Phone} label="Phone" value={profile?.phone_number} color="text-teal-500" />
            </div>
          </div>
        </motion.div>

        {/* Edit Button - NOW LINKS TO PROFILE SETUP */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <Link href="/profile-setup">
            <button className="flex items-center justify-center gap-2 mx-auto text-sm font-bold text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors px-4 py-2 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20">
              <Edit3 className="w-4 h-4" />
              Edit Profile Details
            </button>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}

function ProfileField({ icon: Icon, label, value, color }: any) {
  return (
    <motion.div 
      variants={{
        hidden: { y: 10, opacity: 0 },
        visible: { y: 0, opacity: 1 }
      }}
      className="flex items-center gap-4 p-4 bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl hover:bg-white dark:hover:bg-white/5 transition-colors group"
    >
      <div className={`p-3 bg-white dark:bg-white/10 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-gray-900 dark:text-white font-medium truncate text-base">{value || 'N/A'}</p>
      </div>
    </motion.div>
  );
}