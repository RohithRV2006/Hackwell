'use client';

import { useState, useEffect } from 'react';
import {
  adminLogin,
  adminLogout,
  verifyAdminSession,
  getAllTeamsAdmin,
  updateTeamAdmin,
  deleteTeamAdmin,
  AdminTeamData,
} from './actions';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginEmail, setLoginEmail] = useState('adminhackwell@saranathan.ac.in');
  const [loginPassword, setLoginPassword] = useState('iluvrohith@123');
  const [loginError, setLoginError] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoadingAuth(true);

    const formData = new FormData();
    formData.append('email', loginEmail);
    formData.append('password', loginPassword);

    const res = await adminLogin(formData);
    setLoadingAuth(false);

    if (res.success) {
      setIsAuthenticated(true);
      loadTeams();
    } else {
      setLoginError(res.error || 'Login failed');
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setIsAuthenticated(false);
    setTeams([]);
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Render Login State if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-4 border border-indigo-500/30">
              🛡️
            </div>
            <h1 className="text-3xl font-extrabold text-white">Hackwell Admin</h1>
            <p className="text-slate-400 text-sm mt-1">Management & Scoring Dashboard Portal</p>
          </div>

          {loginError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loadingAuth}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition duration-200 disabled:opacity-50 mt-2"
            >
              {loadingAuth ? 'Authenticating...' : 'Login to Admin Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main Admin Dashboard UI
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Hackwell Admin Control</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1 rounded-full font-medium">
                Full Database Access
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Logged in as <span className="text-indigo-400 font-mono">adminhackwell@saranathan.ac.in</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTeams}
              disabled={loadingData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-700 transition"
            >
              🔄 {loadingData ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Notifications */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium">
            ✅ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Teams</p>
            <h3 className="text-3xl font-extrabold text-white mt-2">{totalTeams}</h3>
            <p className="text-slate-500 text-xs mt-1">Registered hackathon teams</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</p>
            <h3 className="text-3xl font-extrabold text-indigo-400 mt-2">{totalStudents}</h3>
            <p className="text-slate-500 text-xs mt-1">Leads & Members combined</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Team Score</p>
            <h3 className="text-3xl font-extrabold text-amber-400 mt-2">{avgScore} / 100</h3>
            <p className="text-slate-500 text-xs mt-1">Across all evaluated teams</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Judges</p>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">{assignedJudges}</h3>
            <p className="text-slate-500 text-xs mt-1">Judges assigned to teams</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Search team name, lead email, student name, or judge..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={filterProblem}
              onChange={(e) => setFilterProblem(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              No teams found matching your query.
            </div>
          ) : (
            filteredTeams.map((team) => (
              <div
                key={team.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 hover:border-slate-700 transition"
              >
                {/* Team Top Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">{team.teamName}</h2>
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs px-3 py-1 rounded-full font-medium">
                        ID: {team.id}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                      Problem Statement: <span className="text-slate-200 font-medium">{team.problemStatement}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl text-center">
                      <span className="block text-[10px] font-semibold uppercase text-amber-400">Score</span>
                      <span className="text-xl font-extrabold text-amber-300">{team.score || 0} / 100</span>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-center">
                      <span className="block text-[10px] font-semibold uppercase text-slate-400">Assigned Judge</span>
                      <span className="text-sm font-semibold text-slate-200">{team.judge || 'Unassigned'}</span>
                    </div>
                    <button
                      onClick={() => setEditingTeam(JSON.parse(JSON.stringify(team)))}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
                    >
                      ✏️ Edit Team & Score
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id, team.teamName)}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Feedback Note if present */}
                {team.feedback && (
                  <div className="bg-slate-800/50 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300">
                    <strong className="text-slate-100">Judge Feedback / Admin Notes:</strong> {team.feedback}
                  </div>
                )}

                {/* Unencrypted Decrypted Student & Lead Details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Lead Card */}
                  <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Team Lead
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-base">{team.leadData?.name || 'N/A'}</h4>
                    <div className="text-xs text-slate-300 space-y-1">
                      <p><span className="text-slate-400">Email:</span> {team.leadEmail}</p>
                      <p><span className="text-slate-400">Contact:</span> {team.leadData?.contactNumber || 'N/A'}</p>
                      <p><span className="text-slate-400">Dept:</span> {team.leadData?.department || 'N/A'} (Batch: {team.leadData?.batchNumber || 'N/A'})</p>
                      <p><span className="text-slate-400">Year/Sec:</span> {team.leadData?.year || 'N/A'} / {team.leadData?.section || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Members Cards */}
                  {team.membersData?.map((m, idx) => (
                    <div key={idx} className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Member {idx + 2}
                      </span>
                      <h4 className="font-bold text-white text-base">{m.name || 'N/A'}</h4>
                      <div className="text-xs text-slate-300 space-y-1">
                        <p><span className="text-slate-400">Dept:</span> {m.department || 'N/A'}</p>
                        <p><span className="text-slate-400">Batch:</span> {m.batchNumber || 'N/A'}</p>
                        <p><span className="text-slate-400">Year/Sec:</span> {m.year || 'N/A'} / {m.section || 'N/A'}</p>
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-2xl font-bold text-white">
                Edit Team: <span className="text-indigo-400">{editingTeam.teamName}</span>
              </h3>
              <button
                onClick={() => setEditingTeam(null)}
                className="text-slate-400 hover:text-white text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-6">
              {/* Core Information & Evaluation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/50 p-4 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Team Name</label>
                  <input
                    type="text"
                    value={editingTeam.teamName}
                    onChange={(e) => setEditingTeam({ ...editingTeam, teamName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Problem Statement</label>
                  <select
                    value={editingTeam.problemStatement}
                    onChange={(e) => setEditingTeam({ ...editingTeam, problemStatement: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                  >
                    <option value="AI in Healthcare">AI in Healthcare</option>
                    <option value="Fintech Solutions">Fintech Solutions</option>
                    <option value="EdTech Innovations">EdTech Innovations</option>
                    <option value="Smart City">Smart City</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Lead Email</label>
                  <input
                    type="email"
                    value={editingTeam.leadEmail}
                    onChange={(e) => setEditingTeam({ ...editingTeam, leadEmail: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-400 uppercase mb-1">Team Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingTeam.score || 0}
                    onChange={(e) => setEditingTeam({ ...editingTeam, score: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-amber-500/40 rounded-lg p-2 text-sm text-amber-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-400 uppercase mb-1">Assigned Judge</label>
                  <input
                    type="text"
                    placeholder="Judge Name / Email"
                    value={editingTeam.judge || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, judge: e.target.value })}
                    className="w-full bg-slate-800 border border-emerald-500/40 rounded-lg p-2 text-sm text-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Judge Notes / Feedback</label>
                  <input
                    type="text"
                    placeholder="Evaluation feedback"
                    value={editingTeam.feedback || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, feedback: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              {/* Lead Student PII */}
              <div className="bg-slate-800/40 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-indigo-400 text-sm uppercase tracking-wider">Team Lead Student Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400">Name</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.name || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, name: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400">Contact Number</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.contactNumber || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, contactNumber: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400">Department</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.department || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, department: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400">Batch Number</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.batchNumber || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, batchNumber: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400">Year</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.year || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, year: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400">Section</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.section || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, section: e.target.value },
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Members PII */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Team Members Student Details</h4>
                {editingTeam.membersData?.map((m, idx) => (
                  <div key={idx} className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-400">Member {idx + 2}</span>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400">Name</label>
                        <input
                          type="text"
                          value={m.name || ''}
                          onChange={(e) => {
                            const newMembers = [...editingTeam.membersData];
                            newMembers[idx].name = e.target.value;
                            setEditingTeam({ ...editingTeam, membersData: newMembers });
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Department</label>
                        <input
                          type="text"
                          value={m.department || ''}
                          onChange={(e) => {
                            const newMembers = [...editingTeam.membersData];
                            newMembers[idx].department = e.target.value;
                            setEditingTeam({ ...editingTeam, membersData: newMembers });
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Batch</label>
                        <input
                          type="text"
                          value={m.batchNumber || ''}
                          onChange={(e) => {
                            const newMembers = [...editingTeam.membersData];
                            newMembers[idx].batchNumber = e.target.value;
                            setEditingTeam({ ...editingTeam, membersData: newMembers });
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Year</label>
                        <input
                          type="text"
                          value={m.year || ''}
                          onChange={(e) => {
                            const newMembers = [...editingTeam.membersData];
                            newMembers[idx].year = e.target.value;
                            setEditingTeam({ ...editingTeam, membersData: newMembers });
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">Section</label>
                        <input
                          type="text"
                          value={m.section || ''}
                          onChange={(e) => {
                            const newMembers = [...editingTeam.membersData];
                            newMembers[idx].section = e.target.value;
                            setEditingTeam({ ...editingTeam, membersData: newMembers });
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
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
