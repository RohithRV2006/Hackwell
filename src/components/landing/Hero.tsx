'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';
import { checkRegistrationTimelineStatus } from '@/app/actions/auth';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { clearSessionCookie, getUserRole } from '@/app/actions/session';
import { useRouter } from 'next/navigation';

export default function Hero() {
  const router = useRouter();
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean | null>(null);
  const [registrationMsg, setRegistrationMsg] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [dashboardUrl, setDashboardUrl] = useState('/team-dashboard');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await clearSessionCookie();
      router.refresh();
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  useEffect(() => {
    const checkTimeline = async () => {
      const res = await checkRegistrationTimelineStatus();
      setIsRegistrationOpen(res.allowed);
      setRegistrationMsg(res.message || 'Registration has not been started by administrators yet.');
    };
    checkTimeline();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u?.email) {
        try {
          const userRole = await getUserRole(u.email);
          switch(userRole) {
            case 'admin': setDashboardUrl('/admin'); break;
            case 'jury': setDashboardUrl('/jury-dashboard'); break;
            case 'student-coord': 
            case 'faculty-coord':
            case 'coordinator': setDashboardUrl('/coord-dashboard'); break;
            default: setDashboardUrl('/team-dashboard'); break;
          }
        } catch (error) {
          console.error("Failed to fetch role", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <section className="min-h-[85vh] relative flex items-center justify-center bg-gradient-to-b from-blue-50/50 via-white to-gray-50 pt-20 pb-12">
      {/* Top Right Auth Buttons */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-40 hidden md:block">
        {user ? (
          <div className="flex items-center space-x-3">
            <Link href={dashboardUrl} className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition">
              Dashboard
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 text-sm rounded-md border border-red-500 text-red-500 font-bold hover:bg-red-50 transition">
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Link href="/login" className="text-blue-600 font-bold hover:text-blue-700 transition text-sm px-3 py-2 border-2 border-transparent hover:border-blue-100 rounded-md">
              Login
            </Link>
            {isRegistrationOpen === true && (
              <Link href="/register" className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition">
                Register
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
          Hackwell 2.O Edition
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-gray-900 tracking-tight mb-6">
          <span className="text-blue-600">Hackwell</span> 2.O
        </h1>
        
        <p className="mt-4 max-w-2xl text-lg sm:text-xl text-gray-600 mx-auto font-medium leading-relaxed">
          One platform. Countless ideas. Infinite possibilities.
          <br className="hidden sm:inline" />
          The ultimate 24-hour innovation hackathon.
        </p>
      </div>
    </section>
  );
}
