import { AlertTriangle, Info } from 'lucide-react';

const RULES = [
  "Each team must consist of exactly 4 members. Only students from CSE, AI&DS, AIML, IT, and CSBS are eligible. Inter-department teams are allowed.",
  "Complete team registration and problem statement selection before the registration deadline. The selected problem statement cannot be changed after registration.",
  "Major project development must take place during the 24-hour hackathon. Pre-built, previously submitted, or substantially completed projects are strictly prohibited.",
  "Open-source libraries, APIs, frameworks, AI models, and public datasets may be used. However, the core idea, implementation, and integration must be your team's own work.",
  "Submit all required deliverables (such as the PPT and Consent Letter) before the announced deadline. Late submissions will result in disqualification.",
  "Teams must present a live demonstration of their solution during the evaluation.",
  "Carry your valid college ID card throughout the event.",
  "Maintain professionalism, mutual respect, and ethical conduct throughout the event.",
  "Participants must not leave the venue during the hackathon without prior permission from the organizing committee.",
  "Plagiarism, cheating, misconduct, or any violation of the event rules will result in immediate disqualification.",
  "The decision of the judging panel is final and binding."
];

const GUIDELINES = [
  "No registration fee. A participation fee of ₹200 per participant is applicable only to teams shortlisted for the final round.",
  "All official announcements and updates will be shared through the Hackwell website and official WhatsApp groups.",
  "Bring your own laptop, charger, and any hardware or accessories required for your project.",
  "Internet connectivity will be provided. Teams are encouraged to keep a backup mobile hotspot.",
  "Back up your project regularly using GitHub or cloud storage.",
  "Food and refreshments will be provided to all participants.",
  "Follow the event schedule and the instructions of the organizing committee.",
  "Teams are responsible for the safety of their personal belongings and equipment.",
  "The organizing committee reserves the right to modify the event schedule or these rules if required due to unforeseen circumstances."
];

export default function Rules() {
  return (
    <section id="rules" className="py-24 halftone-bg border-t-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 relative">
          <h2 className="font-comic-heading text-5xl md:text-7xl text-white inline-block relative z-10 uppercase tracking-wider" style={{ WebkitTextStroke: '2px black' }}>
            Rules &amp; Guidelines
            <div className="absolute -bottom-4 left-0 right-0 h-4 bg-[#ffd700] border-2 border-black transform -skew-x-12 z-[-1]"></div>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mt-10">
          {/* Strict Rules Panel (Urgent Warning) */}
          <article className="bg-[#ffe6e6] border-4 border-black p-6 lg:p-8 relative shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform pt-12 md:pt-14">
            <div className="absolute -top-6 -left-4 bg-[#fee12b] text-black border-4 border-black px-4 py-2 font-comic-heading text-2xl rotate-[-10deg] shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              WARNING!
            </div>
            <h3 className="text-4xl font-comic-heading mb-6 flex items-center text-primary uppercase">
              <AlertTriangle className="w-8 h-8 mr-3 text-primary stroke-[3px]" />
              Strict Rules
            </h3>
            <ul className="space-y-4 font-bold font-body text-black text-base list-none">
              {RULES.map((rule, idx) => (
                <li key={idx} className="relative pl-7 before:content-['💥'] before:absolute before:left-0 before:-top-0.5">
                  {rule}
                </li>
              ))}
            </ul>
          </article>

          {/* General Guidelines Panel (Handbook) */}
          <article className="bg-[#e6f2ff] border-4 border-black p-6 lg:p-8 relative shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform pt-12 md:pt-14">
            <div className="absolute -top-6 -right-4 bg-secondary text-white border-4 border-black px-4 py-2 font-comic-heading text-xl rotate-[5deg] shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              S.H.I.E.L.D. ISSUE
            </div>
            <h3 className="text-4xl font-comic-heading mb-6 flex items-center text-secondary uppercase">
              <Info className="w-8 h-8 mr-3 text-secondary stroke-[3px]" />
              General Guidelines
            </h3>
            <ul className="space-y-4 font-bold font-body text-black text-base list-none">
              {GUIDELINES.map((guide, idx) => (
                <li key={idx} className="relative pl-7 before:content-['⭐'] before:absolute before:left-0 before:top-0">
                  {guide}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
