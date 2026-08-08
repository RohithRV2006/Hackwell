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
    <section id="testimonials" className="py-24 halftone-bg border-t-4 border-black relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display-hero text-5xl md:text-6xl text-primary tracking-wide uppercase transform -skew-x-6">
            Agent Testimonials
          </h2>
          <div className="w-24 h-2 bg-[#ffd700] mx-auto mt-4 border-2 border-black"></div>
          <p className="mt-6 text-xl font-bold bg-white inline-block px-4 py-2 border-2 border-black shadow-comic transform -skew-y-2">
            Hear what participants from Hackwell &apos;26 had to say about their journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
          {/* Card 1 */}
          <article className="bg-white border-4 border-black p-6 shadow-comic-lg relative overflow-hidden transform transition hover:-translate-y-2 hover:rotate-1">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary transform translate-x-8 -translate-y-8 rotate-45 border-4 border-black"></div>
            <div className="relative z-10 pt-4">
              <span className="text-5xl text-secondary font-serif opacity-50 block -mb-4">&ldquo;</span>
              <p className="italic text-lg mb-6 leading-relaxed font-semibold text-black">
                &ldquo;{TESTIMONIALS[0].quote}&rdquo;
              </p>
              <div className="border-t-2 border-black pt-4">
                <p className="font-display-hero text-xl text-secondary uppercase">{TESTIMONIALS[0].name}</p>
                <p className="text-primary font-bold text-sm bg-[#ffd700] inline-block px-2 border border-black mt-1">{TESTIMONIALS[0].role}</p>
              </div>
            </div>
          </article>

          {/* Card 2 */}
          <article className="bg-secondary text-white border-4 border-black p-6 shadow-comic-lg relative overflow-hidden transform transition hover:-translate-y-2 hover:-rotate-1">
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-[#ffd700] transform translate-x-10 translate-y-10 rotate-45 border-4 border-black"></div>
            <div className="relative z-10 pt-4">
              <span className="text-5xl text-primary font-serif opacity-50 block -mb-4">&ldquo;</span>
              <p className="italic text-lg mb-6 leading-relaxed font-semibold text-white">
                &ldquo;{TESTIMONIALS[1].quote}&rdquo;
              </p>
              <div className="border-t-2 border-[#e5e2e1] pt-4">
                <p className="font-display-hero text-xl text-white uppercase">{TESTIMONIALS[1].name}</p>
                <p className="text-secondary font-bold text-sm bg-[#a5c5fd] inline-block px-2 border border-black mt-1">{TESTIMONIALS[1].role}</p>
              </div>
            </div>
          </article>

          {/* Card 3 */}
          <article className="bg-white border-4 border-black p-6 shadow-comic-lg relative overflow-hidden transform transition hover:-translate-y-2 hover:rotate-1">
            <div className="absolute top-0 left-0 w-16 h-16 bg-secondary transform -translate-x-8 -translate-y-8 rotate-45 border-4 border-black"></div>
            <div className="relative z-10 pt-4">
              <span className="text-5xl text-[#ffd700] font-serif opacity-50 block -mb-4">&ldquo;</span>
              <p className="italic text-lg mb-6 leading-relaxed font-semibold text-black">
                &ldquo;{TESTIMONIALS[2].quote}&rdquo;
              </p>
              <div className="border-t-2 border-black pt-4">
                <p className="font-display-hero text-xl text-secondary uppercase">{TESTIMONIALS[2].name}</p>
                <p className="text-primary font-bold text-sm bg-[#e5e2e1] inline-block px-2 border border-black mt-1">{TESTIMONIALS[2].role}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
