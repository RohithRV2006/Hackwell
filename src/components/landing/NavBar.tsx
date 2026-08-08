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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white border-b-4 border-black py-2 shadow-[0px_4px_0px_rgba(0,0,0,0.1)]' : 'bg-transparent py-4 opacity-0 pointer-events-none'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl md:text-2xl font-display-hero text-primary border-3 border-black px-3 py-0.5 shadow-[3px_3px_0px_black] bg-[#fee12b] uppercase tracking-wider">
                Hackwell 2.O
              </span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#about" className="text-black hover:text-primary font-bold transition font-label uppercase">About</a>
            <a href="#themes" className="text-black hover:text-primary font-bold transition font-label uppercase">Tracks</a>
            <a href="#timeline" className="text-black hover:text-primary font-bold transition font-label uppercase">Timeline</a>
            <a href="#rules" className="text-black hover:text-primary font-bold transition font-label uppercase">Rules</a>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href={dashboardUrl} className="px-5 py-2 border-3 border-black bg-secondary text-white font-bold font-label uppercase hover:bg-primary shadow-[3px_3px_0px_black] hover:translate-y-[2px] hover:shadow-none transition-all">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="px-5 py-2 border-3 border-black bg-white text-primary font-bold font-label uppercase hover:bg-red-50 shadow-[3px_3px_0px_black] hover:translate-y-[2px] hover:shadow-none transition-all">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-black font-bold font-label uppercase hover:text-primary transition mr-2">Login</Link>
                
                {isRegistrationOpen ? (
                  <Link href="/register" className="px-5 py-2 border-3 border-black bg-secondary text-white font-bold font-label uppercase hover:bg-primary shadow-[3px_3px_0px_black] hover:translate-y-[2px] hover:shadow-none transition-all">
                    Register
                  </Link>
                ) : (
                  <div className="relative group">
                    <button 
                      disabled
                      aria-disabled="true"
                      tabIndex={-1}
                      className="px-5 py-2 border-3 border-gray-400 bg-gray-300 text-gray-500 font-bold font-label uppercase cursor-not-allowed select-none pointer-events-none flex items-center gap-1.5 opacity-70"
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
            <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="text-black hover:text-primary focus:outline-none p-2">
              {isMobileOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileOpen && (
        <div className="md:hidden bg-white border-t-4 border-black shadow-xl absolute w-full left-0">
          <div className="px-4 pt-2 pb-6 space-y-2 font-label uppercase">
            <a href="#about" onClick={() => setIsMobileOpen(false)} className="block px-3 py-3 text-black font-bold hover:bg-gray-100 hover:text-primary">About</a>
            <a href="#themes" onClick={() => setIsMobileOpen(false)} className="block px-3 py-3 text-black font-bold hover:bg-gray-100 hover:text-primary">Tracks</a>
            <a href="#timeline" onClick={() => setIsMobileOpen(false)} className="block px-3 py-3 text-black font-bold hover:bg-gray-100 hover:text-primary">Timeline</a>
            <a href="#rules" onClick={() => setIsMobileOpen(false)} className="block px-3 py-3 text-black font-bold hover:bg-gray-100 hover:text-primary">Rules</a>
            <div className="mt-4 pt-4 border-t-2 border-black flex flex-col gap-3">
              {user ? (
                <>
                  <Link href={dashboardUrl} onClick={() => setIsMobileOpen(false)} className="block text-center py-3 border-3 border-black bg-secondary text-white font-bold shadow-[3px_3px_0px_black] hover:bg-primary transition-all">Dashboard</Link>
                  <button onClick={() => { handleLogout(); setIsMobileOpen(false); }} className="block w-full text-center py-3 border-3 border-black bg-white text-primary font-bold shadow-[3px_3px_0px_black] hover:bg-red-50 transition-all">Logout</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsMobileOpen(false)} className="block text-center py-3 border-3 border-black bg-white text-black font-bold shadow-[3px_3px_0px_black] hover:bg-gray-100 transition-all">Login</Link>
                  
                  {isRegistrationOpen ? (
                    <Link href="/register" onClick={() => setIsMobileOpen(false)} className="block text-center py-3 border-3 border-black bg-secondary text-white font-bold shadow-[3px_3px_0px_black] hover:bg-primary transition-all">Register</Link>
                  ) : (
                    <button
                      disabled
                      aria-disabled="true"
                      tabIndex={-1}
                      className="block w-full text-center py-3 border-3 border-gray-400 bg-gray-300 text-gray-500 font-bold cursor-not-allowed select-none pointer-events-none opacity-70"
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

