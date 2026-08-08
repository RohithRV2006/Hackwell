'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function SideMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-side-menu', handleOpen);
    return () => window.removeEventListener('open-side-menu', handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 z-[60] transition-opacity" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Side Pane */}
      <div className="fixed top-0 right-0 h-full w-[75vw] sm:w-[50vw] md:w-[25vw] bg-white z-[70] shadow-2xl transform transition-transform animate-in slide-in-from-right duration-300">
        <div className="p-6 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Menu</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col space-y-6">
          <a href="#problem-statements" className="text-lg font-medium text-gray-700 hover:text-blue-600 transition" onClick={() => setIsOpen(false)}>
            Problem Statements
          </a>
          <a href="#rules-faqs" className="text-lg font-medium text-gray-700 hover:text-blue-600 transition" onClick={() => setIsOpen(false)}>
            Rules & FAQs
          </a>
          <a href="#gallery" className="text-lg font-medium text-gray-700 hover:text-blue-600 transition" onClick={() => setIsOpen(false)}>
            Gallery
          </a>
        </div>
      </div>
    </>
  );
}
