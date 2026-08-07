'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    question: 'Who can participate in Hackwell?',
    answer: 'Students currently enrolled in any computing-related branch are eligible to participate. Teams must consist of exactly four members.'
  },
  {
    question: 'Is there a registration fee?',
    answer: 'There is no registration fee to apply for Hackwell. However, teams selected for the final round will be required to pay a participation fee.',
  },
  {
    question: 'Will food and accommodation be provided?',
    answer: 'Yes, meals, snacks, and basic resting areas will be provided during the 24 hour event at the venue.',
  },
  {
    question: 'What if I don\'t have a team?',
    answer: 'You must register as a team of 4. We encourage you to connect with your friends or classmates and form a team before the deadline.',
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-blue-600">Frequently Asked Questions</h2>
          <div className="mt-2 w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <button
                className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none focus:bg-gray-50 hover:bg-gray-50 transition"
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              >
                <span className="font-bold text-gray-900">{faq.question}</span>
                {openIdx === idx ? (
                  <ChevronUp className="text-blue-600 flex-shrink-0" size={20} />
                ) : (
                  <ChevronDown className="text-gray-400 flex-shrink-0" size={20} />
                )}
              </button>
              {openIdx === idx && (
                <div className="px-6 pb-4 pt-2 text-gray-600 bg-gray-50 border-t border-gray-100">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
