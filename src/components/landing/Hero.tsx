'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { checkRegistrationTimelineStatus } from '@/app/actions/auth';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { clearSessionCookie, getUserRole } from '@/app/actions/session';
import { useRouter } from 'next/navigation';

export default function Hero({ countdownEndTime }: { countdownEndTime?: string }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    if (!countdownEndTime) return;
    
    const end = new Date(countdownEndTime).getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = end - now;
      
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [countdownEndTime]);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean | null>(null);
  const [registrationMsg, setRegistrationMsg] = useState<string>('');
  const [hasSession, setHasSession] = useState(false);
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
    const match = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
    if (match) {
      setHasSession(true);
      const role = match[2];
      switch(role) {
        case 'admin': setDashboardUrl('/admin'); break;
        case 'jury': setDashboardUrl('/jury-dashboard'); break;
        case 'coordinator': setDashboardUrl('/coord-dashboard'); break;
        default: setDashboardUrl('/team-dashboard'); break;
      }
    } else {
      setHasSession(false);
    }
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

        {timeLeft && (
          <div className="flex justify-center gap-2 sm:gap-4 mb-8">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-gray-900 bg-white shadow-sm border border-gray-100 rounded-lg w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">{timeLeft.days}</div>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wider">Days</span>
            </div>
            <div className="text-2xl font-bold text-gray-300 mt-3">:</div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-gray-900 bg-white shadow-sm border border-gray-100 rounded-lg w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">{String(timeLeft.hours).padStart(2, '0')}</div>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wider">Hours</span>
            </div>
            <div className="text-2xl font-bold text-gray-300 mt-3">:</div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-gray-900 bg-white shadow-sm border border-gray-100 rounded-lg w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">{String(timeLeft.minutes).padStart(2, '0')}</div>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wider">Mins</span>
            </div>
            <div className="text-2xl font-bold text-gray-300 mt-3">:</div>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-black text-blue-600 bg-white shadow-sm border border-blue-100 rounded-lg w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">{String(timeLeft.seconds).padStart(2, '0')}</div>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wider">Secs</span>
            </div>
          </div>
        )}

        {hasSession ? (
          <Link 
            href={dashboardUrl} 
            className="inline-block px-8 py-3 text-lg font-bold text-blue-600 border-2 border-blue-600 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
          >
            Headquarters &rarr;
          </Link>
        ) : (
          <Link 
            href="/login" 
            className="inline-block px-8 py-3 text-lg font-bold text-blue-600 border-2 border-blue-600 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
          >
            Assemble!
          </Link>
        )}
      </div>
    </section>
  );
}
