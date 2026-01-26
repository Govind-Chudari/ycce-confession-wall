'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>;

function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [errorState, setErrorState] = useState<{ title: string; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordForm>({
    resolver: zodResolver(updatePasswordSchema),
  });

  useEffect(() => {
    // Check for errors in the URL (e.g., link expired)
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorCode = searchParams.get('error_code');

    if (error) {
      let title = 'Invalid Link';
      let message = errorDescription?.replace(/\+/g, ' ') || 'The password reset link is invalid.';

      if (errorCode === 'otp_expired') {
        title = 'Link Expired';
        message = 'This password reset link has expired. Please request a new one.';
      }

      setErrorState({ title, message });
    }
  }, [searchParams]);

  const onSubmit = async (data: UpdatePasswordForm) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      router.push('/signin');
    } catch (error: any) {
      console.error('Update password error:', error);
      toast.error(error.message || 'Failed to update password');
    }
  };

  if (errorState) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl border border-red-200 dark:border-red-900/50 rounded-[2rem] shadow-2xl p-6 md:p-8 relative z-10 overflow-hidden text-center max-w-md w-full"
      >
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
          {errorState.title}
        </h1>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium mb-6">
          {errorState.message}
        </p>
        <Link href="/signin">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25 transition-all"
          >
            Back to Sign In
          </motion.button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl p-6 md:p-8 relative z-10 overflow-hidden w-full max-w-md"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
      <div className="relative text-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Set New Password</h1>
        <p className="text-xs md:text-base text-gray-500 dark:text-gray-400 font-medium">Create a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 md:space-y-4 relative">
        <div className="space-y-1">
          <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">New Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${errors.password ? 'text-red-500' : 'text-gray-400 group-focus-within:text-purple-500'}`} />
            </div>
            <input
              {...register('password')}
              type="password"
              placeholder="Enter new password"
              className={`w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3.5 bg-gray-50/50 dark:bg-black/20 border-2 rounded-xl outline-none transition-all duration-300 font-medium text-sm md:text-base ${
                errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-purple-500'
              } placeholder:text-gray-400 dark:text-white`}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Confirm Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${errors.confirmPassword ? 'text-red-500' : 'text-gray-400 group-focus-within:text-purple-500'}`} />
            </div>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="Confirm new password"
              className={`w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3.5 bg-gray-50/50 dark:bg-black/20 border-2 rounded-xl outline-none transition-all duration-300 font-medium text-sm md:text-base ${
                errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-purple-500'
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
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Update Password <ArrowRight className="w-5 h-5" /></>}
        </motion.button>
      </form>
    </motion.div>
  );
}

export default function UpdatePasswordPage() {
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
        <Suspense fallback={<div className="text-white text-center">Loading...</div>}>
          <UpdatePasswordContent />
        </Suspense>
      </div>
    </div>
  );
}