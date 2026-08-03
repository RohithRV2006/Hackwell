import { CheckCircle2, AlertTriangle } from 'lucide-react';

const RULES = [
  <>Each team must consist of <strong>exactly 4 members</strong>. Only students from <strong>CSE, AI&DS, AIML, IT, and CSBS</strong> are eligible. Inter-department teams are allowed.</>,
  <>Complete team registration and problem statement selection before the registration deadline. The selected problem statement cannot be changed after registration.</>,
  <>Major project development must take place during the 24-hour hackathon. Pre-built, previously submitted, or substantially completed projects are strictly prohibited.</>,
  <>Open-source libraries, APIs, frameworks, AI models, and public datasets may be used. However, the core idea, implementation, and integration must be your team's own work.</>,
  <>Submit all required deliverables (such as the <strong>PPT</strong> and <strong>Consent Letter</strong>) before the announced deadline. Late submissions will result in disqualification.</>,
  <>Teams must present a live demonstration of their solution during the evaluation.</>,
  <>Carry your valid college ID card throughout the event.</>,
  <>Maintain professionalism, mutual respect, and ethical conduct throughout the event.</>,
  <>Participants must not leave the venue during the hackathon without prior permission from the organizing committee.</>,
  <>Plagiarism, cheating, misconduct, or any violation of the event rules will result in immediate disqualification.</>,
  <>The decision of the judging panel is final and binding.</>
];

const GUIDELINES = [
  <><strong>No registration fee.</strong> A participation fee of <strong>₹200 per participant</strong> is applicable only to teams shortlisted for the final round.</>,
  <>All official announcements and updates will be shared through the <strong>Hackwell website</strong> and <strong>official WhatsApp groups</strong>.</>,
  <>Bring your own laptop, charger, and any hardware or accessories required for your project.</>,
  <>Internet connectivity will be provided. Teams are encouraged to keep a backup mobile hotspot.</>,
  <>Back up your project regularly using GitHub or cloud storage.</>,
  <>Food and refreshments will be provided to all participants.</>,
  <>Follow the event schedule and the instructions of the organizing committee.</>,
  <>Teams are responsible for the safety of their personal belongings and equipment.</>,
  <>The organizing committee reserves the right to modify the event schedule or these rules if required due to unforeseen circumstances.</>
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
