'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { User, Building, GraduationCap, Phone, Hash, CheckCircle, Loader2, ChevronDown, Sparkles, School } from 'lucide-react';
// Using a relative path to resolve the module resolution issue found during build
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

const profileSchema = z.object({
  branch: z.string().min(1, 'Branch is required'),
  department: z.string().min(1, 'Department is required'),
  year: z.coerce.number().min(1).max(4),
  semester: z.coerce.number().min(1).max(8),
  enrollment_number: z.string().min(1, 'Enrollment number is required'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  phone_number: z.string().regex(/^[0-9]{10}$/, 'Must be 10 digits'),
  anonymous_username: z.string().min(3).max(30).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfileSetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      department: '',
      enrollment_number: '',
      phone_number: '',
      year: '' as any, 
      semester: '' as any,
    },
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formValues = watch();
  useEffect(() => {
    const watchedFields = ['branch', 'department', 'year', 'semester', 'enrollment_number', 'gender', 'phone_number'] as const;
    const filledFields = watchedFields.filter(key => {
        const val = formValues[key];
        return val !== undefined && val !== '' && val !== null;
    }).length;
    
    const totalFields = 7; 
    setCompletion(Math.min(100, Math.round((filledFields / totalFields) * 100)));
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
                  department: profile.department || '',
                  year: profile.year,
                  semester: profile.semester,
                  enrollment_number: profile.enrollment_number || '',
                  gender: profile.gender || '',
                  phone_number: profile.phone_number || '',
                  anonymous_username: profile.anonymous_username || '',
              });
            } else {
              const currentName = getValues('anonymous_username');
              if (!currentName) setValue('anonymous_username', generateAnonymousUsername());
            }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
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
        throw new Error("User authentication required");
      }
  
      const profileData = {
        id: userId,
        email: userEmail, 
        branch: data.branch,
        department: data.department,
        year: data.year,
        semester: data.semester,
        enrollment_number: data.enrollment_number,
        gender: data.gender,
        phone_number: data.phone_number,
        anonymous_username: data.anonymous_username || generateAnonymousUsername(),
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };
  
      // Cast the from clause to 'any' to bypass strict schema validation errors during build
      const { error } = await (supabase.from("profiles") as any).upsert(profileData);
  
      if (error) throw error;
  
      toast.success(isEditing ? "Profile updated successfully!" : "Profile completed!");
      
      setTimeout(() => { window.location.href = "/profile"; }, 800);
      
    } catch (error: any) {
      console.error("Profile error:", error);
      toast.error(error.message || "Failed to save profile");
    }
  };
        
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center transition-colors duration-500">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const inputClass = `w-full pl-11 pr-4 py-3.5 bg-gray-50/50 dark:bg-black/20 border-2 rounded-xl outline-none transition-all duration-300 font-medium text-sm md:text-base border-transparent focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 hover:bg-gray-50 dark:hover:bg-black/30 placeholder:text-gray-400 dark:text-white`;
  const selectClass = `${inputClass} appearance-none cursor-pointer`;
  
  const optionClass = "bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-200 px-4 py-2";

  const getIconClass = (fieldName: keyof ProfileForm) => {
    const value = formValues?.[fieldName];
    const isFilled = value !== undefined && value !== null && value.toString().trim().length > 0;
    if (isFilled) return "h-4 w-4 md:h-5 md:w-5 text-green-500 transition-colors";
    return "h-4 w-4 md:h-5 md:w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors";
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 bg-gray-50 dark:bg-zinc-950 transition-colors duration-500">
       
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

      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl p-6 md:p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
          
          <div className="relative">
            <div className="mb-6 md:mb-8 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2 justify-center md:justify-start">
                  {isEditing ? 'Edit Profile' : 'Setup Profile'}
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-yellow-500 hidden md:block" />
                </h1>
                <p className="text-xs md:text-base text-gray-500 dark:text-gray-400 font-medium">
                  {isEditing ? 'Update your details below' : 'Let\'s get you ready for campus life'}
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
                className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
              />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Branch</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <School className={getIconClass('branch')} />
                    </div>
                    <select
                      {...register('branch')}
                      className={selectClass}
                    >
                      <option value="" className={optionClass}>Select Branch</option>
                      <option value="Computer Science" className={optionClass}>Computer Science</option>
                      <option value="AIML" className={optionClass}>AIML</option>
                      <option value="AIDS" className={optionClass}>AIDS</option>
                      <option value="IOT" className={optionClass}>IOT</option>
                      <option value="Information Technology" className={optionClass}>Information Technology</option>
                      <option value="Electronics" className={optionClass}>Electronics</option>
                      <option value="Electrical" className={optionClass}>Electrical</option>
                      <option value="Mechanical" className={optionClass}>Mechanical</option>
                      <option value="Civil" className={optionClass}>Civil</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  {errors.branch && <p className="text-red-500 text-[10px] ml-1">{errors.branch.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Department</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Building className={getIconClass('department')} />
                    </div>
                    <input
                      {...register('department')}
                      placeholder="e.g. Engineering"
                      className={inputClass}
                    />
                  </div>
                  {errors.department && <p className="text-red-500 text-[10px] ml-1">{errors.department.message}</p>}
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
                  {errors.year && <p className="text-red-500 text-[10px] ml-1">{errors.year.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Semester</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <GraduationCap className={getIconClass('semester')} />
                    </div>
                    <select {...register('semester')} className={selectClass}>
                      <option value="" className={optionClass}>Select Semester</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <option key={sem} value={sem} className={optionClass}>Semester {sem}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  {errors.semester && <p className="text-red-500 text-[10px] ml-1">{errors.semester.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Enrollment No</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Hash className={getIconClass('enrollment_number')} />
                    </div>
                    <input
                      {...register('enrollment_number')}
                      placeholder="e.g. 20CS001"
                      className={inputClass}
                    />
                  </div>
                  {errors.enrollment_number && <p className="text-red-500 text-[10px] ml-1">{errors.enrollment_number.message}</p>}
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
                  {errors.gender && <p className="text-red-500 text-[10px] ml-1">{errors.gender.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Phone Number</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className={getIconClass('phone_number')} />
                    </div>
                    <input
                      {...register('phone_number')}
                      placeholder="10-digit number"
                      className={inputClass}
                    />
                  </div>
                  {errors.phone_number && <p className="text-red-500 text-[10px] ml-1">{errors.phone_number.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Anonymous ID</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className={getIconClass('anonymous_username')} />
                    </div>
                    <input
                      {...register('anonymous_username')}
                      placeholder="Auto-generated if empty"
                      className={inputClass}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 dark:text-gray-500 mt-1 ml-1">Visible on confessions.</p>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting || completion < 100}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-3.5 md:py-4 rounded-xl font-bold text-white shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden text-sm md:text-base mt-6 ${
                  (isSubmitting || completion < 100)
                    ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-70' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" /> 
                ) : (
                  <>
                    {isEditing ? 'Save Changes' : (completion < 100 ? `Complete all fields (${completion}%)` : 'Complete & Enter')} 
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