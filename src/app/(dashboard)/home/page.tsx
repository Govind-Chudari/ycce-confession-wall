'use client';

import { motion } from 'framer-motion';
import { MessageSquare, PenTool, ArrowRight, HeartHandshake, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth'; 

export default function HomePage() {
  const { profile } = useAuth(); 

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const, 
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const popUpImageVariants = {
    initial: { 
      y: 120, 
      scale: 0.5, 
      opacity: 0, 
      rotate: 10 
    },
    hover: { 
      y: 0, 
      scale: 1, 
      opacity: 1, 
      rotate: -12, 
      transition: { 
        type: "spring" as const, 
        stiffness: 180, 
        damping: 12,
        mass: 0.8
      }
    },
  };

  return (
    <div className="min-h-[80vh] flex pt-10 flex-col items-center justify-center">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl mx-auto space-y-5"
      >
        {/* --- WELCOME HEADER --- */}
        <motion.div variants={itemVariants} className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Hello,{" "}
            <motion.span 
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="inline-block text-transparent bg-clip-text bg-[size:200%] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 dark:from-purple-300 dark:via-pink-300 dark:to-orange-200"
            >
              {profile?.anonymous_username || 'Student'}
            </motion.span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Your space to share, create, and connect anonymously.
          </p>
        </motion.div>

        {/* --- CARDS GRID --- */}
        <div className="grid md:grid-cols-2 gap-6 px-2 pb-20">
          
          {/* 1. CONFESSIONS CARD */}
          <Link href="/confession">
            <motion.div
              variants={itemVariants}
              whileHover="hover"
              initial="initial"
              className="group h-[250px] bg-white dark:bg-zinc-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/30 dark:hover:border-purple-500/50 transition-all duration-500 relative overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-purple-500/10"
            >
              {/* Background Gradient Blob */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/20 transition-colors duration-500" />
              
              {/* THE POP-UP IMAGE (Confessions -> Message Box) */}
              <div className="absolute bottom-[-20px] right-[-20px] w-48 h-48 pointer-events-none z-0">
                 <motion.img 
                   variants={popUpImageVariants}
                   src="/messagebox.png" 
                   alt="Message Box"
                   className="w-full h-full object-contain dark:mix-blend-screen mix-blend-multiply opacity-80" 
                 />
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Confessions</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium max-w-[80%]">
                    Classic wall. Secrets & campus buzz.
                  </p>
                </div>
                <div className="flex items-center text-purple-600 dark:text-purple-400 font-bold group-hover:translate-x-2 transition-transform">
                  Go to Feed <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* 2. DOODLES CARD */}
          <Link href="/doodles">
            <motion.div
              variants={itemVariants}
              whileHover="hover"
              initial="initial"
              className="group h-[250px] bg-white dark:bg-zinc-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-zinc-200 dark:border-zinc-800 hover:border-pink-500/30 dark:hover:border-pink-500/50 transition-all duration-500 relative overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-500/10"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-pink-500/20 transition-colors duration-500" />
              
              {/* THE POP-UP IMAGE (Doodles -> Pentool) */}
              <div className="absolute bottom-[-10px] right-[-20px] w-48 h-48 pointer-events-none z-0">
                 <motion.img 
                   variants={popUpImageVariants}
                   src="/pentool.png" 
                   alt="Pentool"
                   className="w-full h-full object-contain dark:mix-blend-screen mix-blend-multiply opacity-80" 
                 />
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center mb-6 text-pink-600 dark:text-pink-400">
                    <PenTool className="w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Doodles</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium max-w-[80%]">
                    Express visually. Draw on the canvas.
                  </p>
                </div>
                <div className="flex items-center text-pink-600 dark:text-pink-400 font-bold group-hover:translate-x-2 transition-transform">
                  Start Drawing <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* 3. VENT ZONE CARD */}
          <Link href="/vent">
            <motion.div
              variants={itemVariants}
              whileHover="hover"
              initial="initial"
              className="group h-[250px] bg-white dark:bg-zinc-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/30 dark:hover:border-emerald-500/50 transition-all duration-500 relative overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-colors duration-500" />
              
              {/* THE POP-UP IMAGE (Vent -> Heart) */}
              <div className="absolute bottom-[-10px] right-[-20px] w-48 h-48 pointer-events-none z-0">
                 <motion.img 
                   variants={popUpImageVariants}
                   src="/heart.png" 
                   alt="Heart"
                   className="w-full h-full object-contain dark:mix-blend-screen mix-blend-multiply opacity-80" 
                 />
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                    <HeartHandshake className="w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Vent Zone</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium max-w-[80%]">
                    Safe space. No judgement, just support.
                  </p>
                </div>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-2 transition-transform">
                  Enter Safe Space <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* 4. TRENDS CARD */}
          <Link href="/trend">
            <motion.div
              variants={itemVariants}
              whileHover="hover"
              initial="initial"
              className="group h-[250px] bg-white dark:bg-zinc-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/30 dark:hover:border-blue-500/50 transition-all duration-500 relative overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-blue-500/10"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors duration-500" />
              
              {/* THE POP-UP IMAGE (Trends -> Arrow) */}
              <div className="absolute bottom-[-10px] right-[-20px] w-48 h-48 pointer-events-none z-0">
                 <motion.img 
                   variants={popUpImageVariants}
                   src="/arrow.png" 
                   alt="Trending Arrow"
                   className="w-full h-full object-contain dark:mix-blend-screen mix-blend-multiply opacity-80" 
                 />
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Trends</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium max-w-[80%]">
                    See what's buzzing. Analytics and topics.
                  </p>
                </div>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-2 transition-transform">
                  View Analytics <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </div>
            </motion.div>
          </Link>
          {/* Floating Footer */}
      <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <footer className="w-fit px-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-lg transition-colors duration-300 py-2 text-center pointer-events-auto relative group/footer">
           <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-lg opacity-0 group-hover/footer:opacity-100 transition-opacity duration-500 pointer-events-none" />
           
          <p className="text-zinc-500 dark:text-zinc-600 text-xs font-medium whitespace-nowrap relative z-10">
            Made with <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="inline-block">❤️</motion.span> for YCCE
          </p>
        </footer>
      </div>

        </div>
      </motion.div>
    </div>
  );
}