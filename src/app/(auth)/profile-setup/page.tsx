'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { User, GraduationCap, Hash, CheckCircle, Loader2, ChevronDown, Sparkles, School } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const useRouter = () => ({
  push: (path: string) => {
    console.log('Navigating to:', path);
    window.location.href = path;
  },
  refresh: () => {
    console.log('Refreshing page...');
    window.location.reload();
  }
});

function generateAnonymousUsername() {
  const adjectives = ['Silent', 'Hidden', 'Misty', 'Shadow', 'Secret', 'Quiet', 'Cosmic', 'Nebula', 'Echo', 'Ghost'];
  const nouns = ['Writer', 'Student', 'Observer', 'Voice', 'Echo', 'Traveler', 'Dreamer', 'Thinker', 'Specter', 'Soul'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 10000);
  return `${adj}${noun}${num}`;
}

// ❗ Only Anonymous ID is compulsory
const profileSchema = z.object({
  branch: z.string().optional(),
  year: z.coerce.number().min(1).max(4).optional(),
  semester: z.coerce.number().min(1).max(8).optional(),
  enrollment_number: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  anonymous_username: z.string().min(3, 'Anonymous ID is required').max(30),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfileSetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
    getValues,
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      anonymous_username: '',
      branch: '',
      enrollment_number: '',
      year: undefined,
      semester: undefined,
      gender: undefined,
    },
  });

  const formValues = watch();

    // ✔ completion based on all boxes (only Anonymous ID is compulsory)
  useEffect(() => {
    const watchedFields = ['branch','year','semester','enrollment_number','gender','anonymous_username'] as const;
    const filled = watchedFields.filter((k) => {
      const v = formValues[k];
      return v !== undefined && v !== null && v.toString().trim() !== '';
    }).length;

    const total = watchedFields.length;
    setCompletion(Math.round((filled / total) * 100));
  }, [formValues]);


  useEffect(() => {
    let mounted = true;

    const checkUserAndFetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;

        if (user) {
          const { data: profile } = await (supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single() as any);

          if (profile) {
            setIsEditing(true);
            reset({
              branch: profile.branch || '',
              year: profile.year ?? undefined,
              semester: profile.semester ?? undefined,
              enrollment_number: profile.enrollment_number || '',
              gender: profile.gender ?? undefined,
              anonymous_username: profile.anonymous_username || '',
            });
          } else {
            const currentName = getValues('anonymous_username');
            if (!currentName) setValue('anonymous_username', generateAnonymousUsername());
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkUserAndFetchData();
    return () => { mounted = false; };
  }, [reset, setValue, getValues, supabase]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const userId = user?.id;
      const userEmail = user?.email;

      if (!userId || !userEmail) {
        throw new Error('User authentication required');
      }

      const profileData = {
        id: userId,
        email: userEmail,
        branch: data.branch || null,
        year: data.year || null,
        semester: data.semester || null,
        enrollment_number: data.enrollment_number || null,
        gender: data.gender || null,
        anonymous_username: data.anonymous_username,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase.from('profiles') as any).upsert(profileData);

      if (error) throw error;

      toast.success(isEditing ? 'Profile updated successfully!' : 'Profile completed!');

      setTimeout(() => {
        window.location.href = '/profile';
      }, 800);

    } catch (error: any) {
      console.error('Profile error:', error);
      toast.error(error.message || 'Failed to save profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center transition-colors duration-500">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const inputClass = `w-full pl-11 pr-4 py-3.5 bg-gray-50/50 dark:bg-black/20 border-2 rounded-xl outline-none transition-all duration-300 font-medium text-sm md:text-base border-transparent focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 hover:bg-gray-50 dark:hover:bg-black/30 placeholder:text-gray-400 dark:text-white`;
  const selectClass = `${inputClass} appearance-none cursor-pointer`;
  const optionClass = 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-200 px-4 py-2';

  const getIconClass = (fieldName: keyof ProfileForm) => {
    const value = formValues?.[fieldName];
    const isFilled = value !== undefined && value !== null && value.toString().trim().length > 0;
    if (isFilled) return 'h-4 w-4 md:h-5 md:w-5 text-green-500 transition-colors';
    return 'h-4 w-4 md:h-5 md:w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors';
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 bg-gray-50 dark:bg-zinc-950 transition-colors duration-500">

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-500/30 dark:bg-purple-900/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-pink-500/30 dark:bg-pink-900/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl p-6 md:p-8 relative overflow-hidden"
        >

          <div className="relative">
            <div className="mb-6 md:mb-8 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2 justify-center md:justify-start">
                  {isEditing ? 'Edit Profile' : 'Setup Profile'}
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-yellow-500 hidden md:block" />
                </h1>
                <p className="text-xs md:text-base text-gray-500 dark:text-gray-400 font-medium">
                  {isEditing ? 'Update your details below' : 'Only Anonymous ID is compulsory'}
                </p>
              </div>

              <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5 rounded-full self-center md:self-auto border border-purple-200 dark:border-purple-800">
                <div className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider">Completed</div>
                <div className="text-xs font-black text-purple-700 dark:text-white">{completion}%</div>
              </div>
            </div>

            <div className="mb-8 w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 h-full rounded-full transition-all duration-500"
              />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">

                {/* Optional fields remain same UI */}

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Branch</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <School className={getIconClass('branch')} />
                    </div>
                    <select {...register('branch')} className={selectClass}>
                      <option value="" className={optionClass}>Select Branch</option>
                      <option value="Computer Science" className={optionClass}>Computer Science</option>
                      <option value="AIML" className={optionClass}>AIML</option>
                      <option value="AIDS" className={optionClass}>AIDS</option>
                      <option value="IOT" className={optionClass}>IOT</option>
                      <option value="Information Technology" className={optionClass}>Information Technology</option>
                      <option value="Electronics And Telecommunication" className={optionClass}>Electronics And Telecommunication</option>
                      <option value="VLSI" className={optionClass}>VLSI</option>
                      <option value="Electrical" className={optionClass}>Electrical</option>
                      <option value="Mechanical" className={optionClass}>Mechanical</option>
                      <option value="Civil" className={optionClass}>Civil</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Year</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <GraduationCap className={getIconClass('year')} />
                    </div>
                    <select {...register('year')} className={selectClass}>
                      <option value="" className={optionClass}>Select Year</option>
                      <option value="1" className={optionClass}>First Year</option>
                      <option value="2" className={optionClass}>Second Year</option>
                      <option value="3" className={optionClass}>Third Year</option>
                      <option value="4" className={optionClass}>Fourth Year</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Semester</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <GraduationCap className={getIconClass('semester')} />
                    </div>
                    <select {...register('semester')} className={selectClass}>
                      <option value="" className={optionClass}>Select Semester</option>
                      {[1,2,3,4,5,6,7,8].map(sem => (
                        <option key={sem} value={sem} className={optionClass}>Semester {sem}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Enrollment No</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Hash className={getIconClass('enrollment_number')} />
                    </div>
                    <input {...register('enrollment_number')} className={inputClass} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Gender</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className={getIconClass('gender')} />
                    </div>
                    <select {...register('gender')} className={selectClass}>
                      <option value="" className={optionClass}>Select Gender</option>
                      <option value="male" className={optionClass}>Male</option>
                      <option value="female" className={optionClass}>Female</option>
                      <option value="other" className={optionClass}>Other</option>
                      <option value="prefer_not_to_say" className={optionClass}>Prefer not to say</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Only compulsory field */}
                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Anonymous ID *</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className={getIconClass('anonymous_username')} />
                    </div>
                    <input
                      {...register('anonymous_username')}
                      placeholder="Required"
                      className={inputClass}
                    />
                  </div>
                  {errors.anonymous_username && (
                    <p className="text-red-500 text-[10px] ml-1">{errors.anonymous_username.message}</p>
                  )}
                </div>

              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting || !formValues.anonymous_username?.trim()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-3.5 md:py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all duration-300 mt-6 ${
                  (isSubmitting || completion < 100)
                    ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-70'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isEditing ? 'Save Changes' : 'Complete & Enter'}
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
