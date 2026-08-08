'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';
import { checkRegistrationTimelineStatus } from '@/app/actions/auth';

export default function Hero() {
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean | null>(null);
  const [registrationMsg, setRegistrationMsg] = useState<string>('');

  useEffect(() => {
    const checkTimeline = async () => {
      const res = await checkRegistrationTimelineStatus();
      setIsRegistrationOpen(res.allowed);
      setRegistrationMsg(res.message || 'Registration has not been started by administrators yet.');
    };
    checkTimeline();
  }, []);

  return (
    <header className="comic-bg py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center min-h-[85vh] mt-16">
      {/* Action lines behind panel */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
        style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, black 10px, black 12px)' }}
      ></div>
      <div className="max-w-4xl mx-auto w-full relative z-10">
        <div className="comic-panel p-8 sm:p-12 md:p-16 text-center bg-white border-[4px] border-black shadow-[8px_8px_0px_black] transform -skew-x-2">
          <div className="flex flex-col items-center transform skew-x-2">
            {/* Edition Badge */}
            <div className="bg-[#ffd700] border-2 border-black text-black px-4 py-1 text-sm md:text-base font-comic-heading uppercase tracking-wider transform -rotate-2 shadow-[2px_2px_0px_black] mb-6">
              Hackwell 2.O Edition
            </div>
            
            {/* Main Title */}
            <h1 className="font-display-hero text-6xl sm:text-7xl md:text-8xl lg:text-9xl mb-4 leading-none uppercase text-primary drop-shadow-[4px_4px_0px_black]">
              Hackwell <span className="text-black">2.O</span>
            </h1>
            
            {/* Subtitle */}
            <div className="bg-black text-white p-3 border-2 border-white transform rotate-1 mb-8 inline-block shadow-[4px_4px_0px_#bb0013]">
              <p className="font-bold text-xl sm:text-2xl md:text-3xl uppercase tracking-wide font-headline">
                One platform. Countless ideas. Infinite possibilities.
              </p>
            </div>
            
            <p className="font-bold text-lg sm:text-xl md:text-2xl text-gray-800 mb-10 max-w-2xl font-body">
              THE ULTIMATE 24-HOUR INNOVATION HACKATHON. ASSEMBLE YOUR SQUAD!
            </p>
            
            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center w-full max-w-md">
              {isRegistrationOpen === true ? (
                <Link 
                  href="/register" 
                  className="bg-[#518cca] text-white border-3 border-black px-8 py-3 text-xl sm:text-2xl font-comic-heading flex items-center justify-center gap-2 uppercase shadow-[4px_4px_0px_black] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all w-full sm:w-auto"
                >
                  Register Team
                  <ArrowRight size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <div className="w-full sm:w-auto flex flex-col items-center">
                  <button 
                    disabled 
                    className="bg-gray-300 text-gray-500 border-3 border-black px-8 py-3 text-xl sm:text-2xl font-comic-heading flex items-center justify-center gap-2 uppercase shadow-[4px_4px_0px_black] opacity-75 cursor-not-allowed w-full"
                  >
                    <Lock size={20} />
                    Register (Locked)
                  </button>
                  <p className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-md inline-block">
                    🔒 {registrationMsg || 'Registration Not Started'}
                  </p>
                </div>
              )}
              
              <Link 
                href="/login" 
                className="bg-white text-black border-3 border-black px-8 py-3 text-xl sm:text-2xl font-comic-heading flex items-center justify-center uppercase shadow-[4px_4px_0px_black] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all w-full sm:w-auto"
              >
                Login Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
