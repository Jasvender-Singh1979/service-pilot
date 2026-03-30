'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function handleRouting() {
      // Wait for auth to load first
      if (authLoading) {
        return;
      }

      // If user is authenticated, check their role and redirect to their dashboard
      if (user) {
        try {
          const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/by-email?email=${encodeURIComponent(user.email)}`);
          const userData = await userResponse.json();
          
          if (userData.role === 'super_admin') {
            router.push('/super-admin');
          } else if (userData.role === 'manager') {
            router.push('/manager');
          } else if (userData.role === 'engineer') {
            router.push('/engineer');
          } else {
            // Fallback if no role found
            router.push('/login');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          router.push('/login');
        }
        return;
      }

      // User is not authenticated, check if business exists
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business`);
        
        if (!response.ok) {
          console.error('Error checking business: API returned status', response.status);
          router.push('/business-setup');
          setChecking(false);
          return;
        }
        
        const data = await response.json();

        if (!data.exists && data.id === undefined) {
          // No business exists, redirect to setup
          router.push('/business-setup');
        } else {
          // Business exists, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking business:', error instanceof Error ? error.message : String(error));
        router.push('/business-setup');
      } finally {
        setChecking(false);
      }
    }

    handleRouting();
  }, [user, authLoading, router]);

  return (
    <div className="bg-[#F8F9FB] min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-slate-900 rounded-[20px] flex items-center justify-center shadow-xl shadow-slate-900/10 animate-pulse">
          <i className="ph-fill ph-wrench text-white text-[32px]"></i>
        </div>
        <p className="text-sm font-bold text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
