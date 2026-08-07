import Link from 'next/link';
import { Bot, BrainCircuit, Truck, ShieldCheck, HeartHandshake } from 'lucide-react';
import { THEME_NAMES, THEME_DESCRIPTIONS } from '@/lib/data/themes';

const THEME_ICONS: Record<string, any> = {
  "Autonomous Agentic AI": Bot,
  "Adaptive Intelligence System": BrainCircuit,
  "Predictive Logistics using Industrial AI": Truck,
  "Cybersecurity & Digital Trust": ShieldCheck,
  "Human Centered AI": HeartHandshake,
};

export default function Themes() {
  return (
    <section id="themes" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-blue-600">Hackathon Themes</h2>
          <div className="mt-2 w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto font-medium">
            Choose from 5 cutting-edge AI tracks to build your next breakthrough solution.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
          {THEME_NAMES.map((themeName, idx) => {
            const Icon = THEME_ICONS[themeName] || BrainCircuit;
            const description = THEME_DESCRIPTIONS[themeName];
            return (
              <Link 
                href={`/problem-statement?theme=${encodeURIComponent(themeName)}`}
                key={idx} 
                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all group flex flex-col justify-between cursor-pointer block"
              >
                <div>
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Icon size={28} />
                  </div>
                  <div className="text-xs font-extrabold text-blue-600 uppercase tracking-wider mb-1">Track 0{idx + 1}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{themeName}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
