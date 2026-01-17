'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return profileData;
  }, []);

  const updateProfile = useCallback(async (updates: Partial<any>) => {
    if (!user) return;
    
    // Optimistically update the local state immediately
    setProfile((prev: any) => ({ ...prev, ...updates }));
    
    // Then persist to database
    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  }, [user, fetchProfile]);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const profileData = await fetchProfile(user.id);
        setProfile(profileData);

        if (!profileData && window.location.pathname !== '/profile-setup') {
          router.push('/profile-setup');
        }
      } else if (window.location.pathname !== '/' && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        router.push('/login');
      }
      setLoading(false);
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN') {
        getUser();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, fetchProfile]);

  return { user, profile, loading, updateProfile, refreshProfile };
}
