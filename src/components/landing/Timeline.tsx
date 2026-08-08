const TIMELINE_EVENTS = [
  {
    date: 'AUGUST 3, 2026',
    title: 'Registration Opens',
    description: 'Form your teams of 3-4 members and register for Hackwell 2.O online.',
  },
  {
    date: 'AUGUST 15, 2026',
    title: 'Registration Closes',
    description: 'Last day to submit your team details and select a problem statement.',
  },
  {
    date: 'AUGUST 20, 2026',
    title: 'Idea Pitching (Prelims)',
    description: 'Shortlisted teams will present their core idea and approach to the internal jury.',
  },
  {
    date: 'AUGUST 25, 2026',
    title: 'Finalists Announcement',
    description: 'Top teams move on to the 24-hour grand finale. Get ready to code!',
  },
  {
    date: 'SEPTEMBER 5, 2026',
    title: 'Hackwell 2.O Finale',
    description: 'The 24-hour offline hackathon begins at Saranathan College of Engineering. ASSEMBLE!',
  },
];

export default function Timeline() {
  return (
    <section id="timeline" className="py-24 halftone-bg border-t-4 border-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-16 relative">
          <h2 className="font-display-hero text-6xl md:text-7xl text-secondary uppercase tracking-wide inline-block relative z-10">
            Event <span className="text-primary">Timeline</span>
          </h2>
          <div className="absolute w-48 h-2 bg-secondary bottom-0 left-1/2 transform -translate-x-1/2 -mb-2 border-2 border-black z-0"></div>
        </div>

        <div className="relative pl-4 md:pl-0">
          {/* Vertical Line */}
          <div className="absolute left-[39px] md:left-[59px] top-[20px] bottom-[20px] w-1 bg-secondary/50 z-0"></div>
          
          {TIMELINE_EVENTS.map((event, idx) => {
            const isFinale = idx === TIMELINE_EVENTS.length - 1;
            
            if (isFinale) {
              return (
                <div key={idx} className="flex items-start relative z-10 group mt-16">
                  {/* Node */}
                  <div className="w-20 md:w-32 flex-shrink-0 flex justify-center mt-8 relative z-20">
                    <div className="w-10 h-10 rounded-full border-4 border-primary bg-primary shadow-[2px_2px_0px_#1c1b1b] group-hover:bg-[#fee12b] group-hover:border-black transition-colors flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </div>
                  {/* Panel */}
                  <div className="flex-grow relative mt-2 w-full">
                    {/* Date Badge */}
                    <div className="absolute -top-6 -left-6 bg-[#fee12b] text-black font-headline text-xl px-5 py-2 border-4 border-black shadow-[4px_4px_0px_#1c1b1b] transform -skew-x-12 -rotate-2 z-30">
                      {event.date}
                    </div>
                    <div className="bg-yellow-50 border-4 border-black shadow-comic-lg p-8 pt-10 transform skew-x-4 -rotate-1 group-hover:-skew-x-1 group-hover:rotate-0 transition-all duration-300 w-full">
                      <h3 className="font-display-hero text-4xl md:text-5xl mb-3 text-primary uppercase transform -skew-x-4 rotate-1 group-hover:skew-x-1 group-hover:-rotate-0 transition-all duration-300">{event.title}</h3>
                      <p className="font-body text-black font-bold text-lg md:text-xl transform -skew-x-4 rotate-1 group-hover:skew-x-1 group-hover:-rotate-0 transition-all duration-300">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="flex items-start mb-12 relative z-10 group">
                {/* Node */}
                <div className="w-20 md:w-32 flex-shrink-0 flex justify-center mt-6 relative z-20">
                  <div className="w-8 h-8 rounded-full border-4 border-secondary bg-white shadow-[2px_2px_0px_#1c1b1b] group-hover:bg-[#fee12b] transition-colors"></div>
                </div>
                {/* Panel */}
                <div className="flex-grow relative mt-2 w-full">
                  {/* Date Badge */}
                  <div className="absolute -top-5 -left-4 bg-[#fee12b] text-black font-headline px-4 py-1 border-4 border-black shadow-[3px_3px_0px_#1c1b1b] transform -skew-x-12 z-30">
                    {event.date}
                  </div>
                  <div className={`bg-white border-4 border-black shadow-comic p-6 pt-8 w-full transition-transform duration-300 ${idx % 2 === 0 ? 'transform skew-x-3 group-hover:-skew-x-1' : 'transform -skew-x-3 group-hover:skew-x-1'}`}>
                    <h3 className={`font-headline text-3xl mb-2 text-black transition-transform duration-300 ${idx % 2 === 0 ? 'transform -skew-x-3 group-hover:skew-x-1' : 'transform skew-x-3 group-hover:-skew-x-1'}`}>
                      {event.title}
                    </h3>
                    <p className={`font-body text-gray-700 font-medium text-lg transition-transform duration-300 ${idx % 2 === 0 ? 'transform -skew-x-3 group-hover:skew-x-1' : 'transform skew-x-3 group-hover:-skew-x-1'}`}>
                      {event.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
