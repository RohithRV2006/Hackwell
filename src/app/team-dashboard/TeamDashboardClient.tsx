'use client';

import { useState, useRef, useEffect } from 'react';
import { clearSessionCookie } from '@/app/actions/session';
import { savePPTLink, checkPPTSubmissionTimelineStatus, uploadPPTToDrive } from '@/app/actions/drive';
import { changeTeamPassword } from '@/app/actions/forgot-password';
import { KeyRound, LogOut, CheckCircle2, Clock, UploadCloud, MapPin, Download, FileText, Users, Info, Trophy, FileUp, ExternalLink, Eye, EyeOff, Lock, AlertTriangle, XCircle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import { useRouter } from 'next/navigation';

export default function TeamDashboardClient({ team }: { team: any }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [resetMessage, setResetMessage] = useState('');
  
  // Change Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // PPT Submission State
  const [pptLink, setPptLink] = useState(team.pptLink || '');
  const [currentFileId, setCurrentFileId] = useState(team.pptDriveFileId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pptMessage, setPptMessage] = useState('');
  const [pptTimelineStatus, setPptTimelineStatus] = useState<{ allowed: boolean; state: string; message: string; consentLetterEnabled?: boolean }>({
    allowed: false,
    state: 'not-set',
    message: 'Checking timeline...',
    consentLetterEnabled: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  useEffect(() => {
    async function checkPPTTimeline() {
      const res = await checkPPTSubmissionTimelineStatus();
      setPptTimelineStatus(res);
    }
    checkPPTTimeline();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (resetMessage) {
      timeout = setTimeout(() => setResetMessage(''), 5000);
    }
    return () => clearTimeout(timeout);
  }, [resetMessage]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (pptMessage) {
      timeout = setTimeout(() => setPptMessage(''), 5000);
    }
    return () => clearTimeout(timeout);
  }, [pptMessage]);

  const leadData = team.leadData || {};
  const membersData = team.membersData || [];

  const pwdLength = newPassword.length >= 8;
  const pwdUpper = /[A-Z]/.test(newPassword);
  const pwdLower = /[a-z]/.test(newPassword);
  const pwdNum = /[0-9]/.test(newPassword);
  const pwdSpec = /[^A-Za-z0-9]/.test(newPassword);
  const isNewPasswordValid = pwdLength && pwdUpper && pwdLower && pwdNum && pwdSpec;

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword) {
      setPasswordError('Old password is required.');
      return;
    }
    if (!newPassword) {
      setPasswordError('New password is required.');
      return;
    }
    if (!isNewPasswordValid) {
      setPasswordError('New password does not meet complexity requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changeTeamPassword(team.leadEmail, oldPassword, newPassword);
      if (res.success) {
        setPasswordSuccess('Password updated successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        setPasswordError(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearSessionCookie();
    router.push('/login');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const timelineCheck = await checkPPTSubmissionTimelineStatus();
    if (!timelineCheck.allowed) {
      setPptMessage(timelineCheck.message || 'PPT submission phase is not active.');
      return;
    }

    if (!file.name.endsWith('.ppt') && !file.name.endsWith('.pptx')) {
      setPptMessage('Please select a valid .ppt or .pptx file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setPptMessage('File size must be under 15MB.');
      return;
    }

    setIsSubmitting(true);
    setPptMessage('Uploading presentation to Google Drive, please wait...');

    try {
      // Create standardized file name: TeamID_PrelimsVenue_TeamName_PSID
      const venueStr = team.venue ? team.venue.replace(/\s+/g, '') : 'NoVenue';
      const safeTeamName = (team.teamName || 'Unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = file.name.split('.').pop();
      const teamIdentifier = team.displayId || team.id;
      const fileName = `${teamIdentifier}_${safeTeamName}_${team.psId}.${ext}`;

      // Convert file to base64 for direct upload to Google Script
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        try {
          // Send base64 upload to server action (runs in Node server, avoiding browser CORS errors)
          const uploadRes = await uploadPPTToDrive(team.id, {
            fileName,
            mimeType: file.type,
            base64Data,
            oldFileId: currentFileId,
          });

          setIsSubmitting(false);

          if (uploadRes.success && uploadRes.url) {
            setPptMessage('PPT submitted successfully!');
            setPptLink(uploadRes.url);
            if (uploadRes.fileId) setCurrentFileId(uploadRes.fileId);
          } else {
            setPptMessage(uploadRes.error || 'Failed to upload PPT to Drive.');
          }
        } catch (err: any) {
          setIsSubmitting(false);
          setPptMessage(err.message || 'Error occurred during PPT upload.');
          console.error(err);
        }
      };
      
      reader.onerror = () => {
        setIsSubmitting(false);
        setPptMessage('Failed to read file.');
      };
      
    } catch (error: any) {
      setIsSubmitting(false);
      setPptMessage('An unexpected error occurred.');
      console.error(error);
    }
  };

  const isDeadlinePassed = new Date() > new Date('2026-08-20T23:59:59');

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-blue-900">
              <span className="text-gray-400 font-medium mr-2">#{team.displayId || team.id}</span>
              {team.teamName}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowPasswordModal(true)}
            title="Change Password"
            className="flex items-center justify-center p-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition"
          >
            <KeyRound size={20} />
          </button>
          <button 
            onClick={handleLogout}
            title="Logout"
            className="flex items-center justify-center p-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl transition"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      
      {resetMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl shadow-sm font-semibold">
          {resetMessage}
        </div>
      )}

      {/* ELIMINATION NOTICE BANNER */}
      {(team.eliminated || team.pptQualified === false || (!team.pptLink && pptTimelineStatus.state === 'ended')) && (
        <div className="bg-red-50 border-2 border-red-300 p-6 rounded-2xl mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
              <XCircle size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-red-900">Team Disqualified / Eliminated</h2>
                <span className="bg-red-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Eliminated</span>
              </div>
              <p className="text-sm text-red-700 font-medium mt-1">
                Your team did not submit the mandatory PPT presentation during Phase 2 (PPT Submission Phase). As per hackathon rules, unsubmitted teams cannot proceed to the Prelims round.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto hide-scrollbar bg-white rounded-t-xl px-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Info size={16} /> Overview
        </button>
        {/* TAB 2: MEMBERS */}
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'members' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Users size={16} /> Members
        </button>

        {/* TAB 3: PPT SUBMISSION */}
        <button
          onClick={() => setActiveTab('submission')}
          className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'submission' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <UploadCloud size={16} /> Submissions
        </button>

        {/* TAB 4: CONSENT LETTER (Conditionally rendered) */}
        {pptTimelineStatus.consentLetterEnabled && (
          <button
            onClick={() => setActiveTab('consent')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'consent' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText size={16} /> Consent Letter
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Essential Info */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-2">Team Overview</h2>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Email</span>
                <span className="font-semibold text-gray-800">{team.leadEmail}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Theme</span>
                <span className="font-semibold text-gray-800">{team.theme || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium whitespace-nowrap mr-4">PS ID & Title</span>
                <span className="font-semibold text-blue-600 text-right">
                  {team.psId} - {team.problemStatement || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Submission Status</span>
                {pptLink ? (
                  <span className="font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm">Submitted</span>
                ) : (
                  <span className="font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm">Pending Upload</span>
                )}
              </div>
            </div>

            {/* Event Progress */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-2">Event Progress</h2>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Prelims Venue</span>
                <span className="font-semibold text-gray-800">
                  {team.assignedLabName && team.assignedLabName !== 'Unassigned'
                    ? team.assignedLabName
                    : team.labNo && team.labNo !== 'Unassigned'
                    ? team.labNo
                    : team.venue && team.venue !== 'Unassigned'
                    ? team.venue
                    : 'TBA'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Prelims Status</span>
                <span className={`font-semibold ${team.prelimsStatus === 'selected' ? 'text-green-600' : team.prelimsStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                  {team.prelimsStatus ? team.prelimsStatus.toUpperCase() : 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Finals Venue</span>
                <span className="font-semibold text-gray-800">{team.finalVenue || 'TBA'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Finals Status</span>
                <span
                  className={`font-semibold ${
                    (team as any).finalePublished && (team as any).isWinner
                      ? 'text-amber-600 font-extrabold'
                      : (team as any).finalePublished
                      ? 'text-emerald-600'
                      : team.finalStatus === 'selected' || team.finalStatus === 'pending'
                      ? 'text-blue-600'
                      : team.finalStatus === 'rejected'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}
                >
                  {(team as any).finalePublished
                    ? ((team as any).winnerTitle || ((team as any).isWinner ? 'WINNER 🏆' : 'COMPLETED'))
                    : team.finalStatus
                    ? team.finalStatus.toUpperCase()
                    : 'PENDING'}
                </span>
              </div>
            </div>

            {/* Leaderboard & XP */}
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-blue-100 p-4 rounded-full">
                  <Trophy size={28} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Leaderboard Rank</p>
                  <p className="text-2xl font-bold text-gray-900">#{team.leaderboardPosition || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Game XP</p>
                  <p className="text-2xl font-bold text-gray-900">{team.totalGameXP || 0} XP</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMBERS */}
        {activeTab === 'members' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            
            {/* Contact Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Primary Contact</h3>
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-lg">
                  <p><span className="font-semibold text-gray-700">Email:</span> <a href={`mailto:${team.leadEmail}`} className="text-blue-600 hover:underline">{team.leadEmail}</a></p>
                  <p><span className="font-semibold text-gray-700">Phone:</span> {leadData.contactNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-sm uppercase text-gray-500 font-semibold">
                      <th className="py-4 px-6">Role</th>
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Batch</th>
                      <th className="py-4 px-6">Dept</th>
                      <th className="py-4 px-6">Year</th>
                      <th className="py-4 px-6">Section</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50 transition">
                      <td className="py-4 px-6"><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">LEAD</span></td>
                      <td className="py-4 px-6 font-semibold text-gray-900">{leadData.name}</td>
                      <td className="py-4 px-6 text-gray-600">{leadData.batchNumber}</td>
                      <td className="py-4 px-6 text-gray-600">{leadData.department}</td>
                      <td className="py-4 px-6 text-gray-600">{leadData.year}</td>
                      <td className="py-4 px-6 text-gray-600">{leadData.section}</td>
                    </tr>
                    {membersData.map((member: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50 transition">
                        <td className="py-4 px-6"><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">MEMBER</span></td>
                        <td className="py-4 px-6 font-semibold text-gray-900">{member.name}</td>
                        <td className="py-4 px-6 text-gray-600">{member.batchNumber}</td>
                        <td className="py-4 px-6 text-gray-600">{member.department}</td>
                        <td className="py-4 px-6 text-gray-600">{member.year}</td>
                        <td className="py-4 px-6 text-gray-600">{member.section}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PPT SUBMISSION */}
        {activeTab === 'submission' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6 border-b pb-4">
                <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                  <FileUp size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Upload Presentation</h2>
                  <p className="text-gray-500 text-sm">Upload your PPT file to the committee</p>
                </div>
              </div>

              {!pptTimelineStatus.allowed ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-xl flex flex-col items-center text-center shadow-sm">
                  <Lock size={32} className="mb-3 text-amber-600" />
                  <h3 className="text-lg font-bold text-amber-900">PPT Submission Phase Inactive</h3>
                  <p className="mt-1 text-sm text-amber-800 max-w-md">
                    {pptTimelineStatus.message || 'The administrators have not activated the PPT Submission Phase (Phase 2) yet. Presentations cannot be submitted until Phase 2 is started by the admin.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Download Template Box */}
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-blue-900">Step 1: Download Template</h3>
                      <p className="text-sm text-blue-700">Please format your presentation using the official hackathon template.</p>
                    </div>
                    <a href="/template.pptx" download className="flex items-center gap-2 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-lg font-semibold transition shadow-sm">
                      <Download size={18} />
                      Template
                    </a>
                  </div>

                  {/* Upload Box */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Step 2: Upload Presentation (.ppt or .pptx)</h3>
                    <input 
                      type="file" 
                      accept=".ppt,.pptx"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={!pptTimelineStatus.allowed || isSubmitting}
                    />
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!pptTimelineStatus.allowed || isSubmitting}
                      className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition rounded-xl flex flex-col items-center justify-center text-gray-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="font-semibold text-blue-600">Uploading to Google Drive...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <UploadCloud size={32} className="text-gray-400" />
                          <span className="font-semibold text-gray-700">Click to browse or Drag & Drop</span>
                          <span className="text-xs">Max size: 15MB</span>
                        </div>
                      )}
                    </button>
                    
                    {pptMessage && (
                      <div className={`mt-4 p-4 rounded-xl text-sm font-semibold ${pptMessage.includes('Failed') || pptMessage.includes('error') || pptMessage.includes('Please') || pptMessage.includes('size') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                        {pptMessage}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* View Uploaded PPT */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 w-full">
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Current Submission</h2>
              {pptLink ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <FileText className="text-blue-600 flex-shrink-0" size={24} />
                      <div className="overflow-hidden">
                        <p className="font-semibold text-sm text-gray-900 truncate" title="View Presentation">Official Submission</p>
                        <p className="text-xs text-green-600 font-semibold mt-1">Uploaded Successfully</p>
                      </div>
                    </div>
                    <a 
                      href={pptLink} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition"
                    >
                      <ExternalLink size={18} />
                      Open in Drive
                    </a>
                  </div>
                  
                  {/* --- VIEWER OPTION 1: Standard Google Drive Preview --- */}
                  
                  <div className="w-full rounded-xl overflow-hidden border border-gray-200 mt-4">
                    <iframe 
                      src={pptLink.includes('/view') ? pptLink.replace(/\/view.*$/, '/preview') : pptLink} 
                      className="w-full h-[500px] md:h-[600px]" 
                      title="PPT Viewer"
                      allowFullScreen
                    ></iframe>
                  </div>
                  

                  {/* --- VIEWER OPTION 2: Microsoft Office Viewer (Cleaner Slideshow, but sometimes blocked by Google) --- */}
                  {/* 
                  <div className="w-full rounded-xl overflow-hidden border border-gray-200 mt-4">
                    <iframe 
                      src={pptLink.match(/\/d\/([a-zA-Z0-9_-]+)/) ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${pptLink.match(/\/d\/([a-zA-Z0-9_-]+)/)![1]}`)}` : ''} 
                      className="w-full h-[500px] md:h-[600px]" 
                      title="PPT Viewer"
                      allowFullScreen
                    ></iframe>
                  </div>
                  */}

                  {/* --- VIEWER OPTION 3: Google Docs Viewer (Minimal, but flaky with Drive links) --- */}
                  {/* 
                  <div className="w-full rounded-xl overflow-hidden border border-gray-200 mt-4">
                    <iframe 
                      src={pptLink.match(/\/d\/([a-zA-Z0-9_-]+)/) ? `https://docs.google.com/gview?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${pptLink.match(/\/d\/([a-zA-Z0-9_-]+)/)![1]}`)}&embedded=true` : ''} 
                      className="w-full h-[500px] md:h-[600px]" 
                      title="PPT Viewer"
                      allowFullScreen
                    ></iframe>
                  </div>
                  */}

                  {/* --- VIEWER OPTION 4: Google Slides Embed (ONLY works if you use Drive API to convert the .pptx to Google Slides on upload) --- */}
                  {/* 
                  <div className="w-full rounded-xl overflow-hidden border border-gray-200 mt-4">
                    <iframe 
                      src={pptLink.match(/\/d\/([a-zA-Z0-9_-]+)/) ? `https://docs.google.com/presentation/d/${pptLink.match(/\/d\/([a-zA-Z0-9_-]+)/)![1]}/embed?start=false&loop=false&delayms=3000` : ''} 
                      className="w-full h-[500px] md:h-[600px]" 
                      title="PPT Viewer"
                      allowFullScreen
                    ></iframe>
                  </div>
                  */}
                  {!isDeadlinePassed && (
                    <p className="text-xs text-gray-500 text-left mt-2">
                      Uploading a new file will automatically overwrite this submission.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center text-gray-400">
                  <FileText size={48} className="mb-2 opacity-20" />
                  <p className="font-medium">No presentation uploaded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CONSENT LETTER */}
        {activeTab === 'consent' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-blue-50 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
              <FileText className="text-blue-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Consent Letter</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              All participating teams must download, sign, and carry the official consent letter during the offline event. Please ensure it is signed by your Head of Department.
            </p>
            <a 
              href="/consent-form.pdf" 
              download
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-md hover:shadow-lg"
            >
              <Download size={20} />
              Download Consent Letter
            </a>
          </div>
        )}
      </div>
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 border-b pb-3 mb-4">Change Password</h2>
            
            {passwordError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-xs font-semibold">
                {passwordError}
              </div>
            )}
            
            {passwordSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4 text-xs font-semibold">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700">Old Password *</label>
                <div className="relative">
                  <input 
                    type={showOldPassword ? 'text' : 'password'} 
                    value={oldPassword} 
                    onChange={(e) => setOldPassword(e.target.value)} 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm pr-10" 
                    placeholder="Enter old password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowOldPassword(!showOldPassword)} 
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700">New Password *</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? 'text' : 'password'} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm pr-10" 
                    placeholder="Enter new password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPassword(!showNewPassword)} 
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Password constraints indicator */}
                <div className="mt-2 text-[10px] grid grid-cols-2 gap-1 bg-gray-50 p-2 rounded border border-gray-100">
                  <span className={pwdLength ? "text-green-600 font-semibold" : "text-gray-400"}>✓ Min 8 chars</span>
                  <span className={pwdUpper ? "text-green-600 font-semibold" : "text-gray-400"}>✓ 1 Uppercase</span>
                  <span className={pwdLower ? "text-green-600 font-semibold" : "text-gray-400"}>✓ 1 Lowercase</span>
                  <span className={pwdNum ? "text-green-600 font-semibold" : "text-gray-400"}>✓ 1 Number</span>
                  <span className={pwdSpec ? "text-green-600 font-semibold" : "text-gray-400"}>✓ 1 Special Char</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700">Confirm New Password *</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }} 
                  className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={passwordLoading || !oldPassword || !newPassword || !isNewPasswordValid || newPassword !== confirmPassword}
                  className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
