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
    { name: 'Team Details', href: '/admin', exact: true },
    { name: 'Users Creator', href: '/admin/users-creator', exact: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Common Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-blue-600">Hackwell Admin</h1>
              <span className="bg-green-100 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-full font-bold">
                Admin Area
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Logged in as <span className="text-blue-600 font-mono font-medium">{adminEmail}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-bold transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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

      <main className="py-6">
        {children}
      </main>
    </div>
  );
}
