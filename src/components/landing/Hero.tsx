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
    <section className="min-h-[85vh] flex items-center justify-center bg-gradient-to-b from-blue-50/50 via-white to-gray-50 pt-20 pb-12">
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

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          {isRegistrationOpen === true ? (
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-base group"
            >
              Register Team
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <div className="w-full sm:w-auto flex flex-col items-center">
              <button
                disabled
                aria-disabled="true"
                tabIndex={-1}
                className="w-full sm:w-auto px-8 py-3.5 bg-gray-300 text-gray-500 font-extrabold rounded-xl shadow-none blur-[0.5px] opacity-70 cursor-not-allowed select-none pointer-events-none flex items-center justify-center gap-2 text-base border border-gray-300"
              >
                <Lock size={18} />
                Register Team (Disabled)
              </button>
              <p className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-md inline-block">
                🔒 {registrationMsg || 'Registration Not Started By Admin'}
              </p>
            </div>
          )}

          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-gray-100 text-blue-600 border-2 border-blue-600 font-extrabold rounded-xl transition-all text-base shadow-sm"
          >
            Login Portal
          </Link>
        </div>
      </div>
    </section>
  );
}
