'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../supabase/client'; 
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          setUser(authUser);
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
            
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Error loading auth:", error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
           const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
           setProfile(data);
        } else {
           setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []); 

  return { 
    user, 
    profile, 
    isVerified: profile?.is_verified ?? false, 
    loading 
  };
}