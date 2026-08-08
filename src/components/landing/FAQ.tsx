'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    question: 'Who can participate in Hackwell?',
    answer: 'Any student currently enrolled in a degree program is eligible to participate. You must form a team of 3 to 4 members.',
  },
  {
    question: 'Is there a registration fee?',
    answer: 'No, Hackwell is completely free for all participants.',
  },
  {
    question: 'Will food and accommodation be provided?',
    answer: 'Yes, meals, snacks, and basic resting areas will be provided during the 24-hour event at the venue.',
  },
  {
    question: 'What if I don\'t have a team?',
    answer: 'You must register as a team of 3-4 members. We encourage you to connect with your classmates and form a team before the deadline.',
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 halftone-bg-dark border-t-4 border-black relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-12">
          <h2 className="font-display-hero text-5xl md:text-6xl text-white tracking-wide uppercase drop-shadow-md">
            <span className="text-[#fee12b]">Intel</span> Briefings
          </h2>
          <div className="w-32 h-2 bg-primary mx-auto mt-4 border-2 border-black"></div>
        </div>

        <div className="space-y-6 mt-10">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx} 
                className="bg-white border-4 border-black shadow-comic transform -skew-x-2 overflow-hidden transition-all duration-200"
              >
                <button
                  className={`w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none transition-colors duration-200 ${isOpen ? 'bg-[#fee12b] text-black border-b-4 border-black' : 'bg-white text-black hover:bg-[#fee12b]'}`}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                >
                  <span className="font-display-hero text-xl uppercase tracking-wider">{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="text-black flex-shrink-0 stroke-[3px]" size={24} />
                  ) : (
                    <ChevronDown className="text-gray-500 flex-shrink-0 stroke-[3px]" size={24} />
                  )}
                </button>
                {isOpen && (
                  <div className="p-6 bg-white transform skew-x-2 text-lg font-bold text-gray-800">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
