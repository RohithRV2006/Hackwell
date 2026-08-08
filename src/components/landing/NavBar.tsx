'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Lock } from 'lucide-react';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { clearSessionCookie, getUserRole } from '@/app/actions/session';
import { checkRegistrationTimelineStatus } from '@/app/actions/auth';

export default function NavBar() {
  const [hasSession, setHasSession] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState('/team-dashboard');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean | null>(null);

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
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight * 0.8) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkTimeline = async () => {
      const res = await checkRegistrationTimelineStatus();
      setIsRegistrationOpen(res.allowed);
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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3 border-b border-gray-200/50' : 'bg-transparent py-4 opacity-0 pointer-events-none'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src="/vercel.svg" alt="Logo" className="w-8 h-8 rounded-full" />
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-extrabold text-blue-600">Hackwell 2.0</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {hasSession ? (
              <Link href={dashboardUrl} className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-blue-600 font-bold hover:text-blue-700 transition text-sm px-4 py-2 border-2 border-transparent hover:border-blue-100 rounded-md">
                Login
              </Link>
            )}
            <button onClick={openSideMenu} className="p-2 bg-white/50 rounded-md shadow-sm border border-gray-200 text-gray-700 hover:text-blue-600 transition">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
