const TIMELINE_EVENTS = [
  {
    date: 'August 3, 2026',
    title: 'Registration Opens',
    description: 'Form your teams of 3-4 members and register for Hackwell 2.O online.',
  },
  {
    date: 'August 15, 2026',
    title: 'Registration Closes',
    description: 'Last day to submit your team details and select a problem statement.',
  },
  {
    date: 'August 20, 2026',
    title: 'Idea Pitching (Prelims)',
    description: 'Shortlisted teams will present their core idea and approach to the internal jury.',
  },
  {
    date: 'August 25, 2026',
    title: 'Finalists Announcement',
    description: 'Top teams move on to the 24-hour grand finale. Get ready to code!',
  },
  {
    date: 'September 5, 2026',
    title: 'Hackwell 2.O Finale',
    description: 'The 24-hour offline hackathon begins at Saranathan College of Engineering.',
  },
];

export default function Timeline() {
  return (
    <section id="timeline" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-blue-600">Event Timeline</h2>
          <div className="mt-2 w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
        </div>

        <div className="relative border-l-4 border-blue-100 ml-3 md:ml-6 space-y-12">
          {TIMELINE_EVENTS.map((event, idx) => (
            <div key={idx} className="relative pl-8 md:pl-12">
              <div className="absolute -left-3.5 md:-left-4 top-1 w-6 h-6 md:w-7 md:h-7 bg-white border-4 border-blue-600 rounded-full shadow-sm"></div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">{event.date}</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-2 mb-2">{event.title}</h3>
                <p className="text-gray-600">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
