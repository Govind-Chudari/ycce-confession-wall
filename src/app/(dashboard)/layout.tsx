'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { LogOut, AlertCircle, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ReactLenis } from 'lenis/react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isDark, setIsDark] = useState(true); 
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!mounted) return;

        if (!user) {
          router.push('/signin');
          return;
        }
        setUser(user);

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Profile check error:", error);
        }

        // If profile exists but incomplete, redirect
        // Fix: Cast profileData to any to avoid TS error 'property does not exist on type never'
        if (profileData && !(profileData as any).profile_completed) {
          router.push('/profile-setup');
          return;
        }

        setProfile(profileData);
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkUser();
    
    // Theme Logic
    const savedTheme = localStorage.getItem('theme');
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : true;
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  if (loading) {
    return (
      <div className="h-[100dvh] bg-gray-50 dark:bg-zinc-950 flex items-center justify-center transition-colors duration-300">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-white selection:bg-purple-500/30 transition-colors duration-300 flex flex-col relative">
        
        {/* Background Gradients */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/20 dark:bg-purple-900/20 rounded-full blur-[100px] opacity-70 mix-blend-multiply dark:mix-blend-screen"
          />
          <motion.div 
            animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-indigo-500/20 dark:bg-indigo-900/20 rounded-full blur-[120px] opacity-70 mix-blend-multiply dark:mix-blend-screen"
          />
        </div>

        {/* Floating Header */}
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
          <header className="w-full max-w-6xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl pointer-events-auto transition-colors duration-300 relative group/header">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-lg opacity-0 group-hover/header:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="px-5 py-2 flex items-center justify-between relative z-10">
              <Link href="/home" className="group relative z-50">
                <motion.div initial={{ scale: 1 }} whileHover={{ scale: 2 , x:30}} whileTap={{ scale: 0.95 , x:30 }} className="relative">
                  <img src="/logo.png" alt="LOGO" className='h-20 w-20' />
                </motion.div>
              </Link>

              <div className="flex items-center gap-3">
                <Link href="/report">
                  <motion.button whileHover={{ scale: 1.2, rotate: 5 }} whileTap={{ scale: 0.9 }} className="w-9 h-9 flex items-center justify-center rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white shadow-sm transition-all duration-300">
                    <AlertCircle className="w-5 h-5" />
                  </motion.button>
                </Link>
                {/* <Link href="/mail">
                  <motion.button whileHover={{ scale: 1.2, rotate: -5 }} whileTap={{ scale: 0.9 }} className="w-9 h-9 flex items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500 hover:text-white shadow-sm transition-all duration-300">
                    <Mail className="w-5 h-5" />
                  </motion.button>
                </Link> */}

                <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1 transition-colors duration-300" />

                <Link href="/profile">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 p-[2px]">
                      <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                         {profile?.avatar_url ? (
                           <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" />
                         ) : (
                           <User className="w-4 h-4 text-zinc-600 dark:text-white" />
                         )}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors hidden sm:block max-w-[80px] truncate">
                      {profile?.anonymous_username || 'User'}
                    </span>
                  </motion.div>
                </Link>

                <motion.button onClick={handleLogout} whileHover={{ scale: 1.2, rotate: 10 }} whileTap={{ scale: 0.9 }} className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white shadow-sm transition-all duration-300">
                  <LogOut className="w-4 h-4 ml-0.5" />
                </motion.button>
              </div>
            </div>
          </header>
        </div>

        <main className="container mx-auto px-4 pt-28 pb-15 relative z-10">
          {children}
        </main>
      </div>
    </ReactLenis>
  );
}