'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const signInSchema = z.object({
  email: z.string().email('Invalid email').endsWith('@ycce.in', 'Must be a YCCE email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showSad, setShowSad] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (Object.keys(errors).length > 0) setShowSad(true);
  }, [errors]);

  useEffect(() => {
    const subscription = watch(() => { if (showSad) setShowSad(false); });
    return () => subscription.unsubscribe();
  }, [watch, showSad]);

  const onSubmit = async (data: SignInForm) => {
    setShowSad(false);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication failed");

      // Check profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completed')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.profile_completed) {
        toast.info('Please complete your profile');
        router.push('/profile-setup');
      } else {
        toast.success('Welcome back!');
        router.push('/home');
      }
      
      router.refresh();

    } catch (error: any) {
      setShowSad(true);
      console.error('Sign in error:', error);
      toast.error(error.message || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 bg-gray-50 dark:bg-zinc-950 transition-colors duration-500">
      
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <motion.div 
           animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
           transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/30 dark:bg-purple-900/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"
         />
         <motion.div 
           animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.1, 1] }}
           transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-pink-500/30 dark:bg-pink-900/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
         />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <AnimatePresence>
          {showSad && (
            <motion.div
              initial={{ y: 50, opacity: 0, rotate: 0 }}
              animate={{ 
                y: isMobile ? -90 : -120,
                x: isMobile ? -110 : -100,
                opacity: 1, 
                rotate: 15,
                scale: 1
              }}
              exit={{ y: 50, opacity: 0, scale: 0.8 }}
              className="absolute top-0 right-0 z-0 pointer-events-none"
            >
              <img src="/sad.png" alt="Sad Face" className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl rounded-full" />
              <motion.div 
                 initial={{ opacity: 0, scale: 0 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 0.2 }}
                 className="absolute -top-4 -right-4 bg-white dark:bg-zinc-800 text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-red-100 dark:border-red-900 text-red-500"
              >
                Errors found!
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl p-6 md:p-8 relative z-10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
          <div className="relative text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Welcome Back</h1>
            <p className="text-xs md:text-base text-gray-500 dark:text-gray-400 font-medium">Sign in to your YCCE account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 md:space-y-4 relative">
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">YCCE Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${errors.email ? 'text-red-500' : 'text-gray-400 group-focus-within:text-purple-500'}`} />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="yourname@ycce.in"
                  className={`w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3.5 bg-gray-50/50 dark:bg-black/20 border-2 rounded-xl outline-none transition-all duration-300 font-medium text-sm md:text-base ${
                    errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-purple-500'
                  } placeholder:text-gray-400 dark:text-white`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${errors.password ? 'text-red-500' : 'text-gray-400 group-focus-within:text-purple-500'}`} />
                </div>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="Enter your password"
                  className={`w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3.5 bg-gray-50/50 dark:bg-black/20 border-2 rounded-xl outline-none transition-all duration-300 font-medium text-sm md:text-base ${
                    errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-purple-500'
                  } placeholder:text-gray-400 dark:text-white`}
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3 md:py-4 rounded-xl font-bold text-white shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden text-sm md:text-base ${
                isSubmitting ? 'bg-purple-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
              }`}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-5 h-5" /></>}
            </motion.button>
          </form>

          <div className="mt-6 text-center relative z-10">
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Don't have an account? <Link href="/signup" className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 font-bold hover:opacity-80 transition-opacity">Sign Up</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}