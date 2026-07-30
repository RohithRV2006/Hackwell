'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function NavBar({ session }: { session: any }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
            
            {session ? (
              <Link href="/team-dashboard" className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition">
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-blue-600 font-bold hover:text-blue-700 transition">Login</Link>
                <Link href="/register" className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition">Register</Link>
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
              {session ? (
                <Link href="/team-dashboard" className="block text-center px-4 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition">Dashboard</Link>
              ) : (
                <>
                  <Link href="/login" className="block text-center px-4 py-3 rounded-lg border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 transition">Login</Link>
                  <Link href="/register" className="block text-center px-4 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition">Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
