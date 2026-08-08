export default function About() {
  return (
    <section id="about" className="bg-[#1a1a1a] border-t-6 border-black py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-16 relative">
          <h2 className="font-comic-heading text-5xl md:text-7xl text-white inline-block relative z-10 uppercase tracking-wider" style={{ WebkitTextStroke: '2px black' }}>
            About Hackwell
            <div className="absolute -bottom-4 left-0 right-0 h-4 bg-[#ffd700] border-2 border-black transform -skew-x-12 z-[-1]"></div>
          </h2>
        </div>
        {/* Vision & Mission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Vision Card */}
          <div className="bg-white border-4 border-black p-8 relative shadow-[6px_6px_0px_#bb0013] hover:-translate-y-1 hover:shadow-[8px_10px_0px_#bb0013] transition-all duration-200">
            {/* Decorative corner */}
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-[#518cca] border-2 border-black"></div>
            <h3 className="font-comic-heading text-4xl mb-4 uppercase tracking-wide text-black flex items-center gap-3">
              <span className="inline-block w-8 h-8 bg-black rounded-full text-white text-center leading-8 text-2xl shadow-[2px_2px_0px_#bb0013]">1</span>
              Our Vision
            </h3>
            <p className="font-sans text-gray-700 text-lg leading-relaxed font-bold border-l-4 border-black pl-4">
              To nurture young minds by fostering creativity, innovation, problem-solving, teamwork, and leadership, enabling them to build impactful solutions for tomorrow.
            </p>
          </div>
          {/* Mission Card */}
          <div className="bg-white border-4 border-black p-8 relative shadow-[6px_6px_0px_#bb0013] hover:-translate-y-1 hover:shadow-[8px_10px_0px_#bb0013] transition-all duration-200">
            {/* Decorative corner */}
            <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-[#ffd700] border-2 border-black"></div>
            <h3 className="font-comic-heading text-4xl mb-4 uppercase tracking-wide text-black flex items-center gap-3">
              <span className="inline-block w-8 h-8 bg-black rounded-full text-white text-center leading-8 text-2xl shadow-[2px_2px_0px_#518cca]">2</span>
              Our Mission
            </h3>
            <p className="font-sans text-gray-700 text-lg leading-relaxed font-bold border-l-4 border-black pl-4">
              To provide a dynamic 24-hour platform where students from diverse computing disciplines collaborate, exchange ideas, and develop innovative solutions, preparing them for real-world technological challenges.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
