export default function About() {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-blue-600">About Hackwell</h2>
          <div className="mt-2 w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
            <p className="text-gray-600 leading-relaxed">
              To foster a culture of innovation and problem-solving by providing a platform for brilliant minds to collaborate, create, and build technological solutions that address real-world challenges.
            </p>
          </div>
          <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
            <p className="text-gray-600 leading-relaxed">
              We aim to empower the next generation of developers, designers, and thinkers through a 24-hour intense hackathon experience that bridges the gap between theoretical knowledge and practical execution.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
