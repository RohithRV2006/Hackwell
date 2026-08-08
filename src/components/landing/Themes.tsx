import { Bot, BrainCircuit, Truck, Briefcase, HeartHandshake } from 'lucide-react';
import { THEME_NAMES, THEME_DESCRIPTIONS } from '@/lib/data/themes';

const THEME_ICONS: Record<string, any> = {
  "Autonomous Agentic AI": Bot,
  "Adaptive Intelligent Systems": BrainCircuit,
  "Predictive Logistics using Industrial AI": Truck,
  "AI for Smart Business Solution": Briefcase,
  "Human Centered AI": HeartHandshake,
};

export default function Themes() {
  return (
    <section id="themes" className="py-24 halftone-bg border-t-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 relative">
          <h2 className="font-display-hero text-6xl md:text-7xl text-secondary uppercase tracking-wide inline-block relative z-10">
            Mission <span className="text-primary">Tracks</span>
          </h2>
          <div className="absolute w-48 h-2 bg-secondary bottom-0 left-1/2 transform -translate-x-1/2 -mb-2 border-2 border-black z-0"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
          {THEME_NAMES.map((themeName, idx) => {
            const Icon = THEME_ICONS[themeName] || BrainCircuit;
            const description = THEME_DESCRIPTIONS[themeName];
            return (
              <div 
                key={idx} 
                className="comic-panel bg-white p-8 border-3 border-black shadow-[8px_8px_0px_#1c1b1b] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_#1c1b1b] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 bg-secondary text-white border-2 border-black flex items-center justify-center mb-6 shadow-[2px_2px_0px_black]">
                    <Icon size={28} />
                  </div>
                  <div className="inline-block bg-[#ffd700] border-2 border-black text-black px-3 py-0.5 text-xs font-bold font-label shadow-[2px_2px_0px_black] uppercase tracking-wider mb-4">
                    Track 0{idx + 1}
                  </div>
                  <h3 className="font-headline text-2xl text-black mb-3 leading-tight">{themeName}</h3>
                  <p className="font-body text-gray-700 text-sm leading-relaxed">{description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
