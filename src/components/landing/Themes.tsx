import { Code2, Shield, Leaf, HeartPulse, BrainCircuit } from 'lucide-react';

const THEMES = [
  {
    title: 'EdTech Innovation',
    description: 'Build solutions to revolutionize modern education and learning experiences.',
    icon: Code2,
  },
  {
    title: 'Cybersecurity',
    description: 'Develop tools to protect data, privacy, and secure digital infrastructure.',
    icon: Shield,
  },
  {
    title: 'Green Tech & Sustainability',
    description: 'Create technologies that help preserve the environment and promote sustainability.',
    icon: Leaf,
  },
  {
    title: 'Healthcare Tech',
    description: 'Innovate in health monitoring, medical data, and accessibility solutions.',
    icon: HeartPulse,
  },
  {
    title: 'AI & Machine Learning',
    description: 'Leverage artificial intelligence to automate, predict, and solve complex problems.',
    icon: BrainCircuit,
  },
];

export default function Themes() {
  return (
    <section id="themes" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-blue-600">Hackathon Themes</h2>
          <div className="mt-2 w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            Choose a theme that matches your team's passion and build something incredible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {THEMES.map((theme, idx) => {
            const Icon = theme.icon;
            return (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all group">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{theme.title}</h3>
                <p className="text-gray-600">{theme.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
