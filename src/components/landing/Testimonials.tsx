const TESTIMONIALS = [
  {
    name: 'Sarah Johnson',
    role: 'Winning Team Lead, Hackwell \'26',
    quote: 'The 24-hour environment was intense but incredibly rewarding. The mentors were supportive and the vibe was electric. Easily the best hackathon I\'ve attended!',
  },
  {
    name: 'Rahul Patel',
    role: 'Runner Up, Hackwell \'26',
    quote: 'We came in with a rough idea and left with a fully functioning product. Hackwell pushed us beyond our limits and taught us how to build under pressure.',
  },
  {
    name: 'Emily Davis',
    role: 'Participant, Hackwell \'26',
    quote: 'The arrangements, the food, and the internet were flawless. We just focused on coding. Can\'t wait to participate again in Hackwell 2.O!',
  }
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-blue-600">Past Experiences</h2>
          <div className="mt-2 w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            Hear what participants from Hackwell '26 had to say about their journey.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="bg-gray-50 p-8 rounded-2xl border border-gray-100 shadow-sm relative">
              <div className="text-4xl text-blue-200 absolute top-4 left-4 font-serif">"</div>
              <p className="text-gray-600 italic relative z-10 pt-4 mb-6">
                {t.quote}
              </p>
              <div>
                <h4 className="font-bold text-gray-900">{t.name}</h4>
                <p className="text-sm text-blue-600">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
