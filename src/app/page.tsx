'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Shield, Zap, ArrowRight, Sparkles, Lock } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  
  // Animation Variants for Staggered Entry
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 100, damping: 20 }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-zinc-950 transition-colors duration-500 flex flex-col justify-center">
      
      {/* --- ANIMATED BACKGROUND (Unified Theme) --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <motion.div 
           animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
           transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/20 dark:bg-purple-900/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"
         />
         <motion.div 
           animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.1, 1] }}
           transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-indigo-500/20 dark:bg-indigo-900/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"
         />
         <motion.div 
           animate={{ 
             opacity: [0.3, 0.5, 0.3],
             scale: [1, 1.4, 1],
             rotate: [0, 90, 0]
           }}
           transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[30%] left-[40%] w-[500px] h-[500px] bg-pink-500/10 dark:bg-pink-900/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
         />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20">
        
        {/* --- HERO SECTION --- */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto space-y-8"
        >
          {/* Logo Badge */}
          <motion.div variants={itemVariants} className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
              </span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">YCCE Confidential</span>
            </div>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            YCCE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 dark:from-purple-400 dark:via-pink-400 dark:to-orange-300">Confession</span> Wall
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Share your thoughts anonymously with fellow YCCE students. 
            A safe space for honest conversations.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/30 flex items-center justify-center gap-2"
              >
                Join Now <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <Link href="/signin">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 bg-white/80 dark:bg-white/10 backdrop-blur-md text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-2xl font-bold text-lg hover:bg-white dark:hover:bg-white/20 transition-colors shadow-lg"
              >
                Sign In
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* --- FEATURES GRID --- */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-3 gap-6 mt-24 max-w-6xl mx-auto"
        >
          <FeatureCard
            icon={MessageSquare}
            title="Anonymous Confessions"
            description="Share your deepest thoughts, secrets, and campus buzz without revealing your identity."
            color="bg-purple-500"
            delay={0.4}
          />
          <FeatureCard
            icon={Shield}
            title="Verified Students Only"
            description="A secure community exclusively for YCCE students with verified @ycce.in emails."
            color="bg-blue-500"
            delay={0.5}
          />
          <FeatureCard
            icon={Zap}
            title="Real-time Interactions"
            description="Like, reply, and engage with confessions instantly as they happen on campus."
            color="bg-orange-500"
            delay={0.6}
          />
        </motion.div>

        {/* --- FOOTER --- */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-20 text-sm text-gray-400 dark:text-gray-500"
        >
          Made with <span className="animate-pulse">❤️</span> for YCCE Students
        </motion.div>

      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color, delay }: any) {
  return (
    <motion.div
      variants={{
        hidden: { y: 50, opacity: 0 },
        visible: { 
          y: 0, 
          opacity: 1,
          transition: { type: "spring", stiffness: 100, damping: 20, delay }
        }
      }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[2rem] p-8 text-center shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all group"
    >
      <div className={`w-16 h-16 ${color}/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{description}</p>
    </motion.div>
  );
}