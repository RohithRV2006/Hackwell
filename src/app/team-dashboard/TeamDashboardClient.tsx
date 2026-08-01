'use client';

import { useState } from 'react';
import { clearSessionCookie } from '@/app/actions/session';
import { submitPPT } from '@/app/actions/auth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { KeyRound, LogOut, CheckCircle2, Clock, UploadCloud, MapPin } from 'lucide-react';

export default function TeamDashboardClient({ team }: { team: any }) {
  const [activeTab, setActiveTab] = useState('details');
  const [resetMessage, setResetMessage] = useState('');
  
  // PPT Submission State
  const [pptLink, setPptLink] = useState(team.pptLink || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pptMessage, setPptMessage] = useState('');

  const leadData = team.leadData || {};
  const membersData = team.membersData || [];

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, team.leadEmail);
      setResetMessage('Password reset email sent! Check your inbox.');
      setTimeout(() => setResetMessage(''), 5000);
    } catch (error: any) {
      setResetMessage(error.message || 'Failed to send reset email.');
      setTimeout(() => setResetMessage(''), 5000);
    }
  };

  const handleLogout = async () => {
    await clearSessionCookie();
    window.location.replace('/login');
  };

  const handlePPTSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pptLink.trim()) return;
    
    setIsSubmitting(true);
    const res = await submitPPT(team.id, pptLink);
    setIsSubmitting(false);
    
    if (res.success) {
      setPptMessage('PPT Link submitted successfully!');
    } else {
      setPptMessage(res.error || 'Failed to submit PPT.');
    }
    setTimeout(() => setPptMessage(''), 5000);
  };

  const isDeadlinePassed = new Date() > new Date('2026-08-20T23:59:59');

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-blue-100 text-blue-800 text-sm font-bold py-1 px-3 rounded-lg border border-blue-200">
              {team.id}
            </span>
            <h1 className="text-3xl font-extrabold text-blue-900">{team.teamName}</h1>
          </div>
          <p className="text-gray-500 mt-2">
            Theme: <span className="font-semibold text-gray-700">{team.theme || 'N/A'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleResetPassword}
            className="flex items-center justify-center gap-2 flex-1 md:flex-none bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold py-2.5 px-4 rounded-xl transition"
          >
            <KeyRound size={18} />
            Reset Password
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 flex-1 md:flex-none bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-2.5 px-4 rounded-xl transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>
      
      {resetMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl shadow-sm font-semibold">
          {resetMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Team Details
        </button>
        <button
          onClick={() => setActiveTab('ppt')}
          className={`px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'ppt' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          PPT Submission
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'status' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Prelims & Status
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-xl font-bold text-blue-900 mb-2">Problem Statement</h3>
              <p className="text-gray-700 font-medium">
                <span className="text-blue-600 font-bold">{team.psId}:</span> {team.problemStatement}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Lead Info */}
              <section className="bg-white p-8 rounded-2xl shadow-sm border-t-4 border-blue-500">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 text-sm py-1 px-3 rounded-full">Lead</span>
                  {leadData.name}
                </h2>
                <div className="space-y-3 text-gray-600">
                  <p><strong className="text-gray-900">Email:</strong> {team.leadEmail}</p>
                  <p><strong className="text-gray-900">Contact:</strong> {leadData.contactNumber}</p>
                  <p><strong className="text-gray-900">Batch:</strong> {leadData.batchNumber}</p>
                  <p><strong className="text-gray-900">Department:</strong> {leadData.department}</p>
                  <p><strong className="text-gray-900">Year / Section:</strong> {leadData.year} / {leadData.section}</p>
                </div>
              </section>

              {/* Members Info */}
              <section className="bg-white p-8 rounded-2xl shadow-sm">
                <h2 className="text-2xl font-bold mb-6">Team Members</h2>
                <div className="space-y-6">
                  {membersData.map((member: any, index: number) => (
                    <div key={index} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <h3 className="text-lg font-semibold text-gray-800">{member.name}</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                        <p><strong className="text-gray-900">Batch:</strong> {member.batchNumber}</p>
                        <p><strong className="text-gray-900">Dept:</strong> {member.department}</p>
                        <p><strong className="text-gray-900">Year:</strong> {member.year}</p>
                        <p><strong className="text-gray-900">Section:</strong> {member.section}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: PPT SUBMISSION */}
        {activeTab === 'ppt' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                <UploadCloud size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">PPT Submission</h2>
                <p className="text-gray-500 text-sm">Submit your Google Drive presentation link</p>
              </div>
            </div>

            {isDeadlinePassed ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl flex flex-col items-center text-center">
                <Clock size={32} className="mb-3 text-red-500" />
                <h3 className="text-lg font-bold">Submission Closed</h3>
                <p className="mt-1">The deadline (August 20, 2026) has passed. You can no longer submit or update your PPT.</p>
                {team.pptLink && (
                  <div className="mt-4 pt-4 border-t border-red-200 w-full">
                    <p className="text-sm font-semibold mb-1 text-left">Your Final Submission:</p>
                    <a href={team.pptLink} target="_blank" rel="noreferrer" className="text-blue-600 underline text-left block truncate">
                      {team.pptLink}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handlePPTSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Google Drive Link *</label>
                  <input 
                    type="url" 
                    required 
                    value={pptLink}
                    onChange={(e) => setPptLink(e.target.value)}
                    placeholder="https://docs.google.com/presentation/d/..."
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <p className="text-xs text-gray-500 mt-2">Ensure the link visibility is set to "Anyone with the link".</p>
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Presentation'}
                </button>
                
                {pptMessage && (
                  <div className={`p-4 rounded-xl text-sm font-semibold ${pptMessage.includes('Failed') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                    {pptMessage}
                  </div>
                )}
              </form>
            )}
          </div>
        )}

        {/* TAB 3: PRELIMS & STATUS */}
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle2 className="text-blue-600" />
                Prelims Status
              </h2>
              
              <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-gray-200 text-center h-[200px]">
                {team.prelimsStatus === 'pending' && (
                  <>
                    <span className="bg-yellow-100 text-yellow-800 font-bold px-4 py-1.5 rounded-full mb-3 text-sm">Under Review</span>
                    <p className="text-gray-600">Your submission is currently being reviewed by the jury. Please check back later.</p>
                  </>
                )}
                {team.prelimsStatus === 'selected' && (
                  <>
                    <span className="bg-green-100 text-green-800 font-bold px-4 py-1.5 rounded-full mb-3 text-sm">Selected for Prelims!</span>
                    <p className="text-gray-600">Congratulations! Your team has been selected to present in the preliminary round.</p>
                  </>
                )}
                {team.prelimsStatus === 'rejected' && (
                  <>
                    <span className="bg-red-100 text-red-800 font-bold px-4 py-1.5 rounded-full mb-3 text-sm">Not Selected</span>
                    <p className="text-gray-600">Unfortunately, your team was not selected for the preliminary round this time.</p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="text-blue-600" />
                Venue / Lab Allocation
              </h2>
              
              <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-gray-200 text-center h-[200px]">
                {team.venue ? (
                  <>
                    <p className="text-sm text-gray-500 font-medium mb-1">Your assigned location:</p>
                    <p className="text-2xl font-extrabold text-blue-900">{team.venue}</p>
                  </>
                ) : (
                  <p className="text-gray-500 italic">No venue allocated yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
