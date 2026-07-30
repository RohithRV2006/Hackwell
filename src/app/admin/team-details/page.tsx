'use client';

import { useState, useEffect } from 'react';
import {
  verifyAdminSession,
  getAllTeamsAdmin,
  updateTeamAdmin,
  deleteTeamAdmin,
  AdminTeamData,
} from './actions';
import { clearSessionCookie } from '@/app/actions/session';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Dashboard Data State
  const [teams, setTeams] = useState<AdminTeamData[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProblem, setFilterProblem] = useState('All');

  // Edit Modal State
  const [editingTeam, setEditingTeam] = useState<AdminTeamData | null>(null);
  const [saving, setSaving] = useState(false);

  // Check Session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const valid = await verifyAdminSession();
    setIsAuthenticated(valid);
    if (valid) {
      loadTeams();
    }
  };

  const loadTeams = async () => {
    setLoadingData(true);
    setErrorMsg('');
    const res = await getAllTeamsAdmin();
    if (res.success && res.teams) {
      setTeams(res.teams);
    } else {
      setErrorMsg(res.error || 'Failed to load teams');
    }
    setLoadingData(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await clearSessionCookie();
      setIsAuthenticated(false);
      setTeams([]);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await updateTeamAdmin(editingTeam.id, {
      teamName: editingTeam.teamName,
      problemStatement: editingTeam.problemStatement,
      leadEmail: editingTeam.leadEmail,
      leadData: editingTeam.leadData,
      membersData: editingTeam.membersData,
      score: editingTeam.score,
      judge: editingTeam.judge,
      feedback: editingTeam.feedback,
    });

    setSaving(false);

    if (res.success) {
      setSuccessMsg(`Team "${editingTeam.teamName}" updated successfully!`);
      setEditingTeam(null);
      loadTeams();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to save changes');
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete team "${teamName}"? This action cannot be undone.`)) {
      return;
    }

    const res = await deleteTeamAdmin(teamId);
    if (res.success) {
      setSuccessMsg(`Team "${teamName}" deleted successfully.`);
      loadTeams();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to delete team');
    }
  };

  // Filtered Teams
  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.leadEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.leadData?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.judge?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProblem = filterProblem === 'All' || team.problemStatement === filterProblem;

    return matchesSearch && matchesProblem;
  });

  // Calculate Metrics
  const totalTeams = teams.length;
  const totalStudents = teams.reduce((acc, t) => acc + 1 + (t.membersData?.length || 0), 0);
  const avgScore =
    totalTeams > 0 ? (teams.reduce((acc, t) => acc + (t.score || 0), 0) / totalTeams).toFixed(1) : '0';
  const assignedJudges = new Set(teams.map((t) => t.judge).filter((j) => j && j !== 'Unassigned')).size;

  // Render Loading State
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Render Login State if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-500 mb-6">You must be logged in as an administrator to view this page.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Main Admin Dashboard UI
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-gray-200 shadow-lg">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-blue-600">Hackwell Admin Control</h1>
              <span className="bg-green-100 text-green-700 border border-green-200 text-xs px-3 py-1 rounded-full font-bold">
                Full Database Access
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Logged in as <span className="text-blue-600 font-mono font-medium">rohithrv2006@gmail.com</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTeams}
              disabled={loadingData}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold border border-gray-300 transition"
            >
              🔄 {loadingData ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-bold transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Notifications */}
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
            ✅ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Teams</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{totalTeams}</h3>
            <p className="text-gray-500 text-xs mt-1">Registered hackathon teams</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Students</p>
            <h3 className="text-3xl font-extrabold text-blue-600 mt-2">{totalStudents}</h3>
            <p className="text-gray-500 text-xs mt-1">Leads & Members combined</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Average Team Score</p>
            <h3 className="text-3xl font-extrabold text-yellow-600 mt-2">{avgScore} / 100</h3>
            <p className="text-gray-500 text-xs mt-1">Across all evaluated teams</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Judges</p>
            <h3 className="text-3xl font-extrabold text-green-600 mt-2">{assignedJudges}</h3>
            <p className="text-gray-500 text-xs mt-1">Judges assigned to teams</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Search team name, lead email, student name, or judge..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={filterProblem}
              onChange={(e) => setFilterProblem(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="All">All Problem Statements</option>
              <option value="AI in Healthcare">AI in Healthcare</option>
              <option value="Fintech Solutions">Fintech Solutions</option>
              <option value="EdTech Innovations">EdTech Innovations</option>
              <option value="Smart City">Smart City</option>
            </select>
          </div>
        </div>

        {/* Teams List */}
        <div className="space-y-6">
          {filteredTeams.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
              No teams found matching your query.
            </div>
          ) : (
            filteredTeams.map((team) => (
              <div
                key={team.id}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md space-y-6 hover:shadow-lg transition"
              >
                {/* Team Top Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-200">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-gray-900">{team.teamName}</h2>
                      <span className="bg-blue-100 text-blue-700 border border-blue-200 text-xs px-3 py-1 rounded-full font-bold">
                        ID: {team.id}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                      Problem Statement: <span className="text-gray-800 font-bold">{team.problemStatement}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-xl text-center">
                      <span className="block text-[10px] font-bold uppercase text-yellow-700">Score</span>
                      <span className="text-xl font-extrabold text-yellow-600">{team.score || 0} / 100</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-center">
                      <span className="block text-[10px] font-bold uppercase text-gray-500">Assigned Judge</span>
                      <span className="text-sm font-bold text-gray-700">{team.judge || 'Unassigned'}</span>
                    </div>
                    <button
                      onClick={() => setEditingTeam(JSON.parse(JSON.stringify(team)))}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
                    >
                      ✏️ Edit Team & Score
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id, team.teamName)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Feedback Note if present */}
                {team.feedback && (
                  <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl text-xs text-gray-700">
                    <strong className="text-blue-900">Judge Feedback / Admin Notes:</strong> {team.feedback}
                  </div>
                )}

                {/* Unencrypted Decrypted Student & Lead Details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Lead Card */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Team Lead
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-base">{team.leadData?.name || 'N/A'}</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><span className="text-gray-500 font-medium">Email:</span> {team.leadEmail}</p>
                      <p><span className="text-gray-500 font-medium">Contact:</span> {team.leadData?.contactNumber || 'N/A'}</p>
                      <p><span className="text-gray-500 font-medium">Dept:</span> {team.leadData?.department || 'N/A'} (Batch: {team.leadData?.batchNumber || 'N/A'})</p>
                      <p><span className="text-gray-500 font-medium">Year/Sec:</span> {team.leadData?.year || 'N/A'} / {team.leadData?.section || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Members Cards */}
                  {team.membersData?.map((m, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                      <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Member {idx + 2}
                      </span>
                      <h4 className="font-bold text-gray-900 text-base">{m.name || 'N/A'}</h4>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><span className="text-gray-500 font-medium">Dept:</span> {m.department || 'N/A'}</p>
                        <p><span className="text-gray-500 font-medium">Batch:</span> {m.batchNumber || 'N/A'}</p>
                        <p><span className="text-gray-500 font-medium">Year/Sec:</span> {m.year || 'N/A'} / {m.section || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 w-full max-w-4xl rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-gray-900">
                Edit Team: <span className="text-blue-600">{editingTeam.teamName}</span>
              </h3>
              <button
                onClick={() => setEditingTeam(null)}
                className="text-gray-400 hover:text-gray-900 text-xl font-bold px-2 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-6">
              {/* Core Information & Evaluation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Team Name</label>
                  <input
                    type="text"
                    value={editingTeam.teamName}
                    onChange={(e) => setEditingTeam({ ...editingTeam, teamName: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Problem Statement</label>
                  <select
                    value={editingTeam.problemStatement}
                    onChange={(e) => setEditingTeam({ ...editingTeam, problemStatement: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="AI in Healthcare">AI in Healthcare</option>
                    <option value="Fintech Solutions">Fintech Solutions</option>
                    <option value="EdTech Innovations">EdTech Innovations</option>
                    <option value="Smart City">Smart City</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lead Email</label>
                  <input
                    type="email"
                    value={editingTeam.leadEmail}
                    onChange={(e) => setEditingTeam({ ...editingTeam, leadEmail: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-yellow-600 uppercase mb-1">Team Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingTeam.score || 0}
                    onChange={(e) => setEditingTeam({ ...editingTeam, score: Number(e.target.value) })}
                    className="w-full bg-white border border-yellow-400 rounded-lg p-2 text-sm text-yellow-700 font-bold focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-green-600 uppercase mb-1">Assigned Judge</label>
                  <input
                    type="text"
                    placeholder="Judge Name / Email"
                    value={editingTeam.judge || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, judge: e.target.value })}
                    className="w-full bg-white border border-green-400 rounded-lg p-2 text-sm text-green-700 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Judge Notes / Feedback</label>
                  <input
                    type="text"
                    placeholder="Evaluation feedback"
                    value={editingTeam.feedback || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, feedback: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Lead Student PII */}
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-blue-700 text-sm uppercase tracking-wider">Team Lead Student Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500">Name</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.name || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, name: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500">Contact Number</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.contactNumber || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, contactNumber: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500">Department</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.department || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, department: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500">Batch Number</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.batchNumber || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, batchNumber: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500">Year</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.year || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, year: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500">Section</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.section || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, section: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Members PII */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Team Members Student Details</h4>
                {editingTeam.membersData?.map((m, idx) => (
                  <div key={idx} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                    <span className="text-xs font-bold text-gray-500">Member {idx + 2}</span>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500">Name</label>
                        <input
                          type="text"
                          value={m.name || ''}
                          onChange={(e) => {
                            const newMembers = [...editingTeam.membersData];
                            newMembers[idx].name = e.target.value;
                            setEditingTeam({ ...editingTeam, membersData: newMembers });
                          }}
                          className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500">Department</label>
                        <input
                          type="text"
                          value={m.department || ''}
                          onChange={(e) => {
                            const newMembers = [...editingTeam.membersData];
                            newMembers[idx].department = e.target.value;
                            setEditingTeam({ ...editingTeam, membersData: newMembers });
                          }}
                          className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500">Batch</label>
                        <input
                          type="text"
                          value={m.batchNumber || ''}
                          onChange={(e) => {
                            const newMembers = [...editingTeam.membersData];
                            newMembers[idx].batchNumber = e.target.value;
                            setEditingTeam({ ...editingTeam, membersData: newMembers });
                          }}
                          className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500">Year</label>
                        <input
                          type="text"
                          value={m.year || ''}
                          onChange={(e) => {
                            const newMembers = [...editingTeam.membersData];
                            newMembers[idx].year = e.target.value;
                            setEditingTeam({ ...editingTeam, membersData: newMembers });
                          }}
                          className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500">Section</label>
                        <input
                          type="text"
                          value={m.section || ''}
                          onChange={(e) => {
                            const newMembers = [...editingTeam.membersData];
                            newMembers[idx].section = e.target.value;
                            setEditingTeam({ ...editingTeam, membersData: newMembers });
                          }}
                          className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-xl text-sm font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
                >
                  {saving ? 'Saving to Database...' : 'Save All Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
