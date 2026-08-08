import { Mail, Phone, MapPin, Globe } from 'lucide-react';

export default function Contact() {
  return (
    <footer id="contact" className="bg-[#1c1b1b] text-white py-16 border-t-6 border-primary relative overflow-hidden">
      {/* Halftone texture overlay on footer */}
      <div 
        className="absolute inset-0 z-0 opacity-5 pointer-events-none" 
        style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 12px)' }}
      ></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-3 gap-12 border-b-4 border-black pb-12">
          
          <div>
            <div className="inline-block bg-primary text-white px-4 py-1 font-display-hero text-3xl border-3 border-black shadow-[4px_4px_0px_#ffd700] uppercase mb-6">
              Hackwell 2.O
            </div>
            <p className="text-gray-400 mb-6 font-bold leading-relaxed">
              The ultimate 24-hour innovation hackathon. Join us to build, innovate, and conquer!
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-12 h-12 border-3 border-black bg-white flex items-center justify-center text-black hover:bg-[#fee12b] shadow-[3px_3px_0px_black] hover:translate-y-[2px] transition-all">
                <Globe size={24} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display-hero text-2xl uppercase tracking-wider text-[#fee12b] mb-6">Contact Us (SPOC)</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-[#313030]/50 p-4 border-3 border-black shadow-[4px_4px_0px_black] transform -skew-x-2">
                <Phone className="text-primary mt-1 stroke-[3px]" size={20} />
                <div className="transform skew-x-2">
                  <p className="text-white font-bold text-lg uppercase font-headline">Student Coordinator</p>
                  <p className="text-[#fee12b] font-bold">+91 98765 43210</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[#313030]/50 p-4 border-3 border-black shadow-[4px_4px_0px_black] transform skew-x-2">
                <Mail className="text-primary mt-1 stroke-[3px]" size={20} />
                <div className="transform -skew-x-2">
                  <p className="text-white font-bold text-lg uppercase font-headline">Email Support</p>
                  <p className="text-[#fee12b] font-bold">support@hackwell.example.com</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-display-hero text-2xl uppercase tracking-wider text-[#fee12b] mb-6">Venue</h4>
            <div className="flex items-start gap-4 bg-[#313030]/50 p-6 border-3 border-black shadow-[4px_4px_0px_black] transform -skew-x-1">
              <MapPin className="text-primary mt-1 flex-shrink-0 stroke-[3px]" size={24} />
              <p className="text-gray-300 font-bold leading-relaxed text-base transform skew-x-1">
                Saranathan College of Engineering<br />
                Venkateswara Nagar, Panjappur<br />
                Tiruchirappalli, Tamil Nadu 620012
              </p>
            </div>
          </div>

        </div>

        <div className="mt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 font-bold text-sm">
          <p>&copy; {new Date().getFullYear()} Hackwell. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0 font-headline uppercase tracking-wider">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
