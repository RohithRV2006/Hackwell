import { CheckCircle2, AlertTriangle } from 'lucide-react';

const RULES = [
  'Each team must consist of 3 to 4 members from the same or different departments.',
  'Participants must carry their valid college ID cards during the event.',
  'All code must be written during the hackathon. Pre-existing projects will lead to disqualification.',
  'Teams must select a problem statement during registration and cannot change it later.',
  'Use of open-source libraries is allowed, but the core logic must be your own.',
];

const GUIDELINES = [
  'Bring your own laptops, chargers, and any required hardware components.',
  'Food and refreshments will be provided during the 24-hour hackathon.',
  'Maintain professional behavior and respect fellow participants and jury members.',
  'Plagiarism of any form is strictly prohibited and monitored.',
];

export default function Rules() {
  return (
    <section id="rules" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-blue-600">Rules & Guidelines</h2>
          <div className="mt-2 w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="text-blue-600" size={28} />
              <h3 className="text-2xl font-bold text-gray-900">Strict Rules</h3>
            </div>
            <ul className="space-y-4">
              {RULES.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-700">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="text-blue-600" size={28} />
              <h3 className="text-2xl font-bold text-gray-900">General Guidelines</h3>
            </div>
            <ul className="space-y-4">
              {GUIDELINES.map((guide, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-700">{guide}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
