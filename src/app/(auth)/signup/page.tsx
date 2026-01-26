'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import Link from 'next/link'; 
import { createClient } from '../../../lib/supabase/client'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle, Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';


// Strong Password Regex: At least 8 chars, 1 uppercase, 1 lowercase, 1 number/special char
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9!@#$%^&*])(?=.{8,})/;

const signUpSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .endsWith('@ycce.in', 'Must be a YCCE email (@ycce.in)'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must have 1 uppercase, 1 lowercase, and 1 number/symbol'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const [step, setStep] = useState<'form' | 'check-email'>('form');
  const [showSad, setShowSad] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  // Check for mobile screen size to adjust animations
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Watch for errors to trigger sad face
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setShowSad(true);
    }
  }, [errors]);

  // Hide sad face when user starts typing again
  useEffect(() => {
    const subscription = watch(() => {
      if (showSad) setShowSad(false);
    });
    return () => subscription.unsubscribe();
  }, [watch, showSad]);

  const onSubmit = async (data: SignUpForm) => {
    setShowSad(false);
    try {
      // 1. Sign Up with Email AND Password
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password, 
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.status === 422) {
           throw new Error('Email already registered. Please sign in.');
        }
        throw error;
      }

      setStep('check-email');
      toast.success('Account created! Verification email sent.');
    } catch (error: any) {
      setShowSad(true);
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account.');
    }
  };

  if (step === 'check-email') {
    return (
      <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 bg-gray-50 dark:bg-zinc-950 transition-colors duration-500">
        
        {/* --- ANIMATED BACKGROUND --- */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-green-500/20 dark:bg-green-900/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"
          />
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl p-6 md:p-8 max-w-md w-full text-center relative z-10"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4">Verify Your Email</h2>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-6">
            We've sent a verification link to your YCCE email. Please click it to activate your account.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-4 mb-6 text-sm text-yellow-800 dark:text-yellow-200 text-left flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Note:</strong> Check your <strong>Spam/Junk</strong> folder if you don't see it in your inbox.
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Wrong email?{' '}
            <button onClick={() => setStep('form')} className="text-purple-600 dark:text-purple-400 hover:underline font-bold">
              Try again
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 bg-gray-50 dark:bg-zinc-950 transition-colors duration-500">
      
      {/* --- ANIMATED BACKGROUND --- */}
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

        {/* --- SAD POP-UP IMAGE --- */}
        <AnimatePresence>
          {showSad && (
            <motion.div
              initial={{ y: 50, opacity: 0, rotate: 0 }}
              animate={{ 
                y: isMobile ? -90 : -110, 
                x: isMobile ? 50 : 60,     
                opacity: 1, 
                rotate: 15,
                scale: 1
              }}
              exit={{ y: 50, opacity: 0, scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 15,
                mass: 1.2
              }}
              className="absolute top-0 right-55 z-0 pointer-events-none"
            >
              <img 
                src="/sad.png" 
                alt="Sad Face" 
                className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl mix-blend-multiply dark:mix-blend-normal rounded-full"
              />
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
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl p-6 md:p-8 relative z-10 overflow-hidden"
        >
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

          <div className="relative text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Create Account</h1>
            <p className="text-xs md:text-base text-gray-500 dark:text-gray-400 font-medium">Join the YCCE confession community</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 md:space-y-4 relative">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                YCCE Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${errors.email ? 'text-red-500' : 'text-gray-400 group-focus-within:text-purple-500'}`} />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="yourname@ycce.in"
                  className={`w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3.5 bg-gray-50/50 dark:bg-black/20 border-2 rounded-xl outline-none transition-all duration-300 font-medium text-sm md:text-base ${
                    errors.email 
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                      : 'border-transparent focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 hover:bg-gray-50 dark:hover:bg-black/30'
                  } placeholder:text-gray-400 dark:text-white`}
                />
              </div>
              {errors.email && (
                 <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="text-red-500 text-[10px] md:text-xs font-medium ml-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.email.message}
                </motion.p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${errors.password ? 'text-red-500' : 'text-gray-400 group-focus-within:text-purple-500'}`} />
                </div>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                  className={`w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3.5 bg-gray-50/50 dark:bg-black/20 border-2 rounded-xl outline-none transition-all duration-300 font-medium text-sm md:text-base ${
                    errors.password 
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                      : 'border-transparent focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 hover:bg-gray-50 dark:hover:bg-black/30'
                  } placeholder:text-gray-400 dark:text-white`}
                />
              </div>
              {errors.password && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="text-red-500 text-[10px] md:text-xs font-medium ml-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.password.message}
                </motion.p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <ShieldCheck className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${errors.confirmPassword ? 'text-red-500' : 'text-gray-400 group-focus-within:text-purple-500'}`} />
                </div>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="Re-enter your password"
                  className={`w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3.5 bg-gray-50/50 dark:bg-black/20 border-2 rounded-xl outline-none transition-all duration-300 font-medium text-sm md:text-base ${
                    errors.confirmPassword 
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                      : 'border-transparent focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 hover:bg-gray-50 dark:hover:bg-black/30'
                  } placeholder:text-gray-400 dark:text-white`}
                />
              </div>
              {errors.confirmPassword && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="text-red-500 text-[10px] md:text-xs font-medium ml-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.confirmPassword.message}
                </motion.p>
              )}
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
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign Up <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center relative z-10">
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/signin" className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 font-bold hover:opacity-80 transition-opacity">
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}