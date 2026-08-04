'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Lock } from 'lucide-react';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { clearSessionCookie, getUserRole } from '@/app/actions/session';
import { checkRegistrationTimelineStatus } from '@/app/actions/auth';

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [dashboardUrl, setDashboardUrl] = useState('/team-dashboard');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean | null>(null);
  const [registrationMsg, setRegistrationMsg] = useState<string>('');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await clearSessionCookie();
      window.location.reload();
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
      setRegistrationMsg(res.message || 'Registration is currently not started.');
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
            case 'student-coord': setDashboardUrl('/student-coord-dashboard'); break;
            case 'faculty-coord': setDashboardUrl('/faculty-coord-dashboard'); break;
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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2 border-b border-gray-100' : 'bg-transparent py-4 opacity-0 pointer-events-none'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-extrabold text-blue-600">Hackwell 2.O</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#about" className="text-gray-700 hover:text-blue-600 font-medium transition">About</a>
            <a href="#themes" className="text-gray-700 hover:text-blue-600 font-medium transition">Themes</a>
            <a href="#timeline" className="text-gray-700 hover:text-blue-600 font-medium transition">Timeline</a>
            <a href="#rules" className="text-gray-700 hover:text-blue-600 font-medium transition">Rules</a>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href={dashboardUrl} className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="px-5 py-2 rounded-lg border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 transition">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-blue-600 font-bold hover:text-blue-700 transition">Login</Link>
                
                {isRegistrationOpen ? (
                  <Link href="/register" className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition">
                    Register
                  </Link>
                ) : (
                  <div className="relative group">
                    <button 
                      disabled
                      aria-disabled="true"
                      tabIndex={-1}
                      className="px-5 py-2 rounded-lg bg-gray-300 text-gray-500 font-bold blur-[0.5px] opacity-70 cursor-not-allowed select-none pointer-events-none flex items-center gap-1.5 border border-gray-300"
                    >
                      <Lock size={15} />
                      Register
                    </button>
                    <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded p-2 text-center shadow-lg z-50">
                      {registrationMsg || 'Registration Not Started By Admin'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center md:hidden">
            <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="text-gray-600 hover:text-blue-600 focus:outline-none p-2">
              {isMobileOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-xl absolute w-full">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <a href="#about" onClick={() => setIsMobileOpen(false)} className="block px-3 py-3 text-gray-800 font-medium hover:bg-blue-50 hover:text-blue-600 rounded-lg">About</a>
            <a href="#themes" onClick={() => setIsMobileOpen(false)} className="block px-3 py-3 text-gray-800 font-medium hover:bg-blue-50 hover:text-blue-600 rounded-lg">Themes</a>
            <a href="#timeline" onClick={() => setIsMobileOpen(false)} className="block px-3 py-3 text-gray-800 font-medium hover:bg-blue-50 hover:text-blue-600 rounded-lg">Timeline</a>
            <a href="#rules" onClick={() => setIsMobileOpen(false)} className="block px-3 py-3 text-gray-800 font-medium hover:bg-blue-50 hover:text-blue-600 rounded-lg">Rules</a>
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
              {user ? (
                <>
                  <Link href={dashboardUrl} className="block text-center px-4 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition">Dashboard</Link>
                  <button onClick={handleLogout} className="block w-full text-center px-4 py-3 rounded-lg border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 transition">Logout</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block text-center px-4 py-3 rounded-lg border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 transition">Login</Link>
                  
                  {isRegistrationOpen ? (
                    <Link href="/register" className="block text-center px-4 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition">Register</Link>
                  ) : (
                    <button
                      disabled
                      aria-disabled="true"
                      tabIndex={-1}
                      className="block w-full text-center px-4 py-3 rounded-lg bg-gray-300 text-gray-500 font-bold blur-[0.5px] opacity-70 cursor-not-allowed select-none pointer-events-none"
                    >
                      🔒 Register (Closed)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

