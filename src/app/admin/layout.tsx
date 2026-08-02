'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { clearSessionCookie } from '@/app/actions/session';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState<string>('Loading...');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setAdminEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await clearSessionCookie();
      window.location.replace('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const tabs = [
    { name: 'Overview', href: '/admin', exact: true },
    { name: 'Event Management', href: '/admin/event-management', exact: false },
    { name: 'Team Details', href: '/admin/teams', exact: false },
    { name: 'Prelims Scores', href: '/admin/prelims-scores', exact: false },
    { name: 'Finale Scores', href: '/admin/finale-scores', exact: false },
    { name: 'Game Scores', href: '/admin/game-scores', exact: false },
    { name: 'Users Creator', href: '/admin/users-creator', exact: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-500 selection:text-white">
      {/* Common Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 flex items-center justify-center font-black text-xl text-white shadow-md rounded-sm">
              H
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-blue-600">
                Hackwell Admin Dashboard
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">
                Logged in as <span className="text-blue-600 font-mono font-medium">{adminEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-blue-600 border border-gray-300 rounded-sm text-xs font-bold transition duration-200 cursor-pointer shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`
                    whitespace-nowrap py-3 px-1 border-b-2 font-bold text-sm transition-colors
                    ${isActive 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
