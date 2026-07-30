import { Mail, Phone, MapPin, Globe } from 'lucide-react';

export default function Contact() {
  return (
    <footer id="contact" className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-12 border-b border-gray-800 pb-12">
          
          <div>
            <h3 className="text-2xl font-extrabold text-blue-500 mb-6">Hackwell 2.O</h3>
            <p className="text-gray-400 mb-6">
              The ultimate 24-hour hackathon experience. Join us to build, innovate, and conquer!
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition">
                <Globe size={20} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6 text-gray-100">Contact Us (SPOC)</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="text-blue-500 mt-1" size={18} />
                <div>
                  <p className="text-gray-300 font-medium">Student Coordinator</p>
                  <p className="text-gray-500">+91 98765 43210</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="text-blue-500 mt-1" size={18} />
                <div>
                  <p className="text-gray-300 font-medium">Email Support</p>
                  <p className="text-gray-500">support@hackwell.example.com</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6 text-gray-100">Venue</h4>
            <div className="flex items-start gap-3">
              <MapPin className="text-blue-500 mt-1 flex-shrink-0" size={18} />
              <p className="text-gray-400 leading-relaxed">
                Saranathan College of Engineering<br />
                Venkateswara Nagar, Panjappur<br />
                Tiruchirappalli, Tamil Nadu 620012
              </p>
            </div>
          </div>

        </div>

        <div className="mt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Hackwell. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-blue-400 transition">Privacy Policy</a>
            <a href="#" className="hover:text-blue-400 transition">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
