'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
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
      window.location.href = '/login';
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

  const openSideMenu = () => {
    window.dispatchEvent(new Event('open-side-menu'));
  };

  return (
    <section className="min-h-screen relative flex items-center justify-center bg-gradient-to-b from-blue-50/50 via-white to-gray-50 pt-20 pb-12">
      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-40">
        <img src="/vercel.svg" alt="Logo" className="w-12 h-12 rounded-full" />
      </div>
      {/* Top Right Hamburger Menu */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-40">
        <button onClick={openSideMenu} className="p-2 bg-white rounded-md shadow-sm border border-gray-200 text-gray-700 hover:text-blue-600 transition">
          <Menu size={24} />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-gray-900 tracking-tight mb-6">
          <span className="text-blue-600">Hackwell</span> 2.O
        </h1>
        
        <p className="mt-4 max-w-2xl text-lg sm:text-xl text-gray-600 mx-auto font-medium leading-relaxed mb-10">
          One platform. Countless ideas. Infinite possibilities.
          <br className="hidden sm:inline" />
          <span className="text-gray-600 font-medium text-lg mt-6 block">
            By the Computing Departments, <br className="sm:hidden" />
            Saranathan College of Engineering
          </span>
        </p>

        {user ? (
          <Link 
            href={dashboardUrl} 
            className="inline-block px-8 py-3 text-lg font-bold text-blue-600 border-2 border-blue-600 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link 
            href="/login" 
            className="inline-block px-8 py-3 text-lg font-bold text-blue-600 border-2 border-blue-600 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
          >
            Register Now!
          </Link>
        )}
      </div>
    </section>
  );
}
