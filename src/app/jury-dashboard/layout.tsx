'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { verifyJurySession } from './actions';
import LogoutButton from '@/components/LogoutButton';

export default function JuryLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [juryInfo, setJuryInfo] = useState<{
    juryName: string;
    email: string;
    labName: string;
  } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await verifyJurySession();
        if (res.success && res.email && res.juryName) {
          setJuryInfo({
            juryName: res.juryName,
            email: res.email,
            labName: res.labName || 'N/A',
          });
        } else {
          router.replace('/login');
        }
      } catch (err) {
        console.error('Session check failed', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
        <p className="text-sm font-mono text-gray-550">Loading session...</p>
      </div>
    );
  }

  if (!juryInfo) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Simple Header */}
      <header className="w-full bg-white border-b border-gray-250 py-4 px-6 md:px-12 flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-800">
            {juryInfo.juryName} ({juryInfo.email}) [{juryInfo.labName}]
          </h2>
          <span className="text-xs text-gray-500 font-medium">Jury Evaluation Portal</span>
        </div>
        
        {/* Logout Button (with negative margin wrapper due to mt-6 inside the component) */}
        <div className="-mt-6">
          <LogoutButton />
        </div>
      </header>

      {/* Body Area */}
      <main className="flex-grow p-4 md:p-8 max-w-6xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
