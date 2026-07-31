'use client';

import React, { useState, useEffect } from 'react';
import {
  verifyAdminSession,
  getAllTeamsAdmin,
  updateTeamAdmin,
  deleteTeamAdmin,
  AdminTeamData,
  Lead,
  Member,
} from './actions';
import { useRouter } from 'next/navigation';

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

  // Edit Modal State (Focused only on Student Personal Details)
  const [editingTeam, setEditingTeam] = useState<AdminTeamData | null>(null);
  const [saving, setSaving] = useState(false);

  // Row Expansion for Member Details
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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

  const handleSaveStudentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Strictly limit update inputs to student details only (names, contact, dept, batch, section, and email)
    const res = await updateTeamAdmin(editingTeam.id, {
      leadEmail: editingTeam.leadEmail,
      leadData: editingTeam.leadData,
      membersData: editingTeam.membersData,
    });

    setSaving(false);

    if (res.success) {
      setSuccessMsg(`Student personal details for team "${editingTeam.teamName}" updated successfully!`);
      setEditingTeam(null);
      loadTeams();
      setTimeout(() => setSuccessMsg(''), 4500);
    } else {
      setErrorMsg(res.error || 'Failed to update student details');
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

  const toggleRowExpansion = (teamId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
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
          <p className="text-gray-500 mb-6 font-medium">You must be logged in as an administrator to view this page.</p>
          <button
            onClick={() => window.location.replace('/login')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Teams Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registered Student Teams</h2>
            <p className="text-xs text-gray-500 mt-1">
              Administer team memberships and student personal details. Scores, problem statements, and jury assignments are locked.
            </p>
          </div>
          <button
            onClick={loadTeams}
            disabled={loadingData}
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-bold border border-blue-200 transition"
          >
            🔄 {loadingData ? 'Refreshing...' : 'Refresh Records'}
          </button>
        </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Teams</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{totalTeams}</h3>
            <p className="text-gray-400 text-xs mt-1">Registered hackathon teams</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Students</p>
            <h3 className="text-3xl font-extrabold text-blue-600 mt-2">{totalStudents}</h3>
            <p className="text-gray-400 text-xs mt-1">Leads & Members combined</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Juries</p>
            <h3 className="text-3xl font-extrabold text-green-600 mt-2">{assignedJudges}</h3>
            <p className="text-gray-400 text-xs mt-1">Evaluators synchronized</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Search Team Name, Lead Email, Student name or Jury..."
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

        {/* Teams Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden animate-fade-in">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 md:px-6 md:py-4">Team Metadata</th>
                  <th className="p-4 md:px-6 md:py-4">Team Lead (Student Details)</th>
                  <th className="p-4 md:px-6 md:py-4 text-center">Members Count</th>
                  <th className="p-4 md:px-6 md:py-4">Jury Assignment / Score</th>
                  <th className="p-4 md:px-6 md:py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingData ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-sm font-semibold">Synchronizing registry...</p>
                    </td>
                  </tr>
                ) : filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500 font-medium">
                      No registered teams match the current query.
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team) => {
                    const isExpanded = !!expandedRows[team.id];
                    return (
                      <React.Fragment key={team.id}>
                        {/* Primary Row */}
                        <tr className="hover:bg-slate-50 transition duration-150">
                          
                          {/* Column 1: Team name + ID & Problem Statement */}
                          <td className="p-4 md:px-6 md:py-4">
                            <div className="space-y-1">
                              <h4 className="font-bold text-gray-900 text-base">{team.teamName}</h4>
                              <div className="flex gap-2 flex-wrap items-center">
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                                  ID: {team.id}
                                </span>
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                  {team.problemStatement}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Lead Details */}
                          <td className="p-4 md:px-6 md:py-4">
                            <div className="space-y-1 text-xs">
                              <p className="font-bold text-gray-800 text-sm">{team.leadData?.name || 'N/A'}</p>
                              <p className="text-gray-500 font-medium">{team.leadEmail}</p>
                              <p className="text-gray-400">
                                {team.leadData?.department || 'N/A'} | {team.leadData?.year || 'N/A'}-Yr | Sec: {team.leadData?.section || 'N/A'}
                              </p>
                            </div>
                          </td>

                          {/* Column 3: Count of members */}
                          <td className="p-4 md:px-6 md:py-4 text-center">
                            <button
                              onClick={() => toggleRowExpansion(team.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition"
                            >
                              <span>🧑‍💻 {team.membersData?.length ? team.membersData.length + 1 : 1}</span>
                              <span className="text-[10px] text-gray-400">{isExpanded ? '▲' : '▼'} Details</span>
                            </button>
                          </td>

                          {/* Column 4: Jury / Score */}
                          <td className="p-4 md:px-6 md:py-4">
                            <div className="space-y-1 text-xs">
                              <p className="text-gray-500">
                                Jury: <span className="font-bold text-gray-800">{team.judge || 'Unassigned'}</span>
                              </p>
                              <p className="text-gray-500">
                                Grade: <span className="font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{typeof team.score === 'number' && team.score > 0 ? `${team.score} / 100` : 'Not graded'}</span>
                              </p>
                            </div>
                          </td>

                          {/* Column 5: Edit Button */}
                          <td className="p-4 md:px-6 md:py-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => setEditingTeam(JSON.parse(JSON.stringify(team)))}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                                title="Edit Student Personal Details Only"
                              >
                                ✏️ Edit Students
                              </button>
                              <button
                                onClick={() => handleDeleteTeam(team.id, team.teamName)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs transition"
                                title="Delete Team"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Collapsed Members list details */}
                        {isExpanded && (
                          <tr className="bg-slate-50/40">
                            <td colSpan={5} className="p-4 md:px-8 border-t border-slate-100">
                              <div className="space-y-3">
                                <h5 className="font-bold text-xs text-gray-500 uppercase tracking-widest">
                                  Complete Student Registry
                                </h5>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                  {/* Lead Details */}
                                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-1.5 shadow-sm">
                                    <div className="flex justify-between items-center pb-1 border-b border-blue-100">
                                      <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold uppercase">
                                        Team Lead
                                      </span>
                                    </div>
                                    <h6 className="font-bold text-gray-900 text-sm mt-1">{team.leadData?.name || 'N/A'}</h6>
                                    <div className="text-xs text-gray-500 space-y-1">
                                      <p><span className="font-medium text-gray-400">Email:</span> {team.leadEmail}</p>
                                      <p><span className="font-medium text-gray-400">Contact:</span> {team.leadData?.contactNumber || 'N/A'}</p>
                                      <p><span className="font-medium text-gray-400">Class:</span> {team.leadData?.department || 'N/A'} ({team.leadData?.year || 'N/A'} Year, {team.leadData?.section || 'N/A'})</p>
                                      <p><span className="font-medium text-gray-400">Batch:</span> {team.leadData?.batchNumber || 'N/A'}</p>
                                    </div>
                                  </div>

                                  {/* Members Lists */}
                                  {(!team.membersData || team.membersData.length === 0) ? (
                                    <div className="col-span-3 bg-white border border-gray-150 rounded-xl p-4 flex items-center justify-center text-xs text-gray-400 font-medium italic">
                                      No other members registered in this team.
                                    </div>
                                  ) : (
                                    team.membersData.map((m, idx) => (
                                      <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 space-y-1.5 shadow-sm">
                                        <div className="flex justify-between items-center pb-1 border-b border-gray-100">
                                          <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">
                                            Member {idx + 2}
                                          </span>
                                        </div>
                                        <h6 className="font-bold text-gray-900 text-sm mt-1">{m.name || 'N/A'}</h6>
                                        <div className="text-xs text-gray-500 space-y-1 mt-2">
                                          <p><span className="font-medium text-gray-400">Dept:</span> {m.department || 'N/A'}</p>
                                          <p><span className="font-medium text-gray-400">Class:</span> {m.year || 'N/A'} Year, {m.section || 'N/A'}</p>
                                          <p><span className="font-medium text-gray-400">Batch:</span> {m.batchNumber || 'N/A'}</p>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>

                                {team.feedback && (
                                  <div className="bg-blue-50/40 p-3 rounded-lg border border-blue-100 text-xs text-gray-700">
                                    <strong className="text-blue-900 font-bold block mb-0.5">Assigned Jury Remarks:</strong>
                                    <span>&ldquo;{team.feedback}&rdquo;</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* EDIT MODAL: LOCKED STRICTLY TO STUDENT PERSONAL DETAILS */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 w-full max-w-4xl rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Edit Student Personal Details
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Editing members of Team: <span className="font-bold text-blue-600">{editingTeam.teamName}</span> | Status/Grades are locked.
                </p>
              </div>
              <button
                onClick={() => setEditingTeam(null)}
                className="text-gray-400 hover:text-gray-900 text-xl font-bold px-2 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudentDetails} className="space-y-6">
              
              {/* Display read-only settings for verification */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs text-gray-500 font-semibold select-none">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Team Name</span>
                  <span className="text-gray-800 text-sm font-bold block mt-0.5">{editingTeam.teamName}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Problem Statement</span>
                  <span className="text-gray-800 text-sm font-bold block mt-0.5">{editingTeam.problemStatement}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Assigned Jury</span>
                  <span className="text-gray-800 text-sm font-bold block mt-0.5">{editingTeam.judge || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Grade / Score</span>
                  <span className="text-blue-600 text-sm font-black block mt-0.5">
                    {editingTeam.score ? `${editingTeam.score} / 100` : 'Not graded'}
                  </span>
                </div>
              </div>

              {/* Lead Student PII */}
              <div className="bg-blue-50/50 border border-blue-105 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-blue-700 text-sm uppercase tracking-wider">Team Lead Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editingTeam.leadData?.name || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, name: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Lead Email</label>
                    <input
                      type="email"
                      required
                      value={editingTeam.leadEmail}
                      onChange={(e) => setEditingTeam({ ...editingTeam, leadEmail: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Contact Number</label>
                    <input
                      type="text"
                      required
                      value={editingTeam.leadData?.contactNumber || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, contactNumber: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Department</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.department || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, department: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Batch (e.g. 2022-26)</label>
                    <input
                      type="text"
                      value={editingTeam.leadData?.batchNumber || ''}
                      onChange={(e) =>
                        setEditingTeam({
                          ...editingTeam,
                          leadData: { ...editingTeam.leadData, batchNumber: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">Year</label>
                      <input
                        type="text"
                        value={editingTeam.leadData?.year || ''}
                        onChange={(e) =>
                          setEditingTeam({
                            ...editingTeam,
                            leadData: { ...editingTeam.leadData, year: e.target.value },
                          })
                        }
                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">Section</label>
                      <input
                        type="text"
                        value={editingTeam.leadData?.section || ''}
                        onChange={(e) =>
                          setEditingTeam({
                            ...editingTeam,
                            leadData: { ...editingTeam.leadData, section: e.target.value },
                          })
                        }
                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Members PII */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Team Members Details</h4>
                {(!editingTeam.membersData || editingTeam.membersData.length === 0) ? (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-400 font-medium italic select-none">
                    No other members registered in this team.
                  </div>
                ) : (
                  editingTeam.membersData.map((m, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-250 space-y-2">
                      <span className="text-xs font-bold text-gray-500">Member {idx + 2} Details</span>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Name</label>
                          <input
                            type="text"
                            required
                            value={m.name || ''}
                            onChange={(e) => {
                              const newMembers = [...editingTeam.membersData];
                              newMembers[idx].name = e.target.value;
                              setEditingTeam({ ...editingTeam, membersData: newMembers });
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Department</label>
                          <input
                            type="text"
                            value={m.department || ''}
                            onChange={(e) => {
                              const newMembers = [...editingTeam.membersData];
                              newMembers[idx].department = e.target.value;
                              setEditingTeam({ ...editingTeam, membersData: newMembers });
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Batch</label>
                          <input
                            type="text"
                            value={m.batchNumber || ''}
                            onChange={(e) => {
                              const newMembers = [...editingTeam.membersData];
                              newMembers[idx].batchNumber = e.target.value;
                              setEditingTeam({ ...editingTeam, membersData: newMembers });
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Year</label>
                            <input
                              type="text"
                              value={m.year || ''}
                              onChange={(e) => {
                                const newMembers = [...editingTeam.membersData];
                                newMembers[idx].year = e.target.value;
                                setEditingTeam({ ...editingTeam, membersData: newMembers });
                              }}
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Section</label>
                            <input
                              type="text"
                              value={m.section || ''}
                              onChange={(e) => {
                                const newMembers = [...editingTeam.membersData];
                                newMembers[idx].section = e.target.value;
                                setEditingTeam({ ...editingTeam, membersData: newMembers });
                              }}
                              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-55"
                >
                  {saving ? 'Updating Student Details...' : 'Save Student Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
