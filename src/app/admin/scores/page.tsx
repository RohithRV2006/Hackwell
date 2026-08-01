'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  verifyAdminSession,
  getAllScoresAdmin,
  getAllTeamsAdmin,
  updateTeamAdmin,
  AdminScoreData,
  AdminTeamData,
  Rubric,
} from '../actions';
import { getAllJuryMembers, JuryMember } from '@/app/jury-dashboard/actions';

interface MergedRecord {
  teamId: string;
  teamName: string;
  problemStatement: string;
  assignedJury: string;
  isEvaluated: boolean;
  rubric?: Rubric;
  totalScore?: number;
  feedback?: string;
  starred?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminScoresPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Data States
  const [mergedRecords, setMergedRecords] = useState<MergedRecord[]>([]);
  const [juries, setJuries] = useState<JuryMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Row-level loading state (duriong jury update/autosave)
  const [updatingJuryForTeam, setUpdatingJuryForTeam] = useState<string | null>(null);

  // Notification States
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Search/Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProblem, setFilterProblem] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Expanded rows for viewing detailed rubrics
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const valid = await verifyAdminSession();
    setIsAuthenticated(valid);
    if (valid) {
      loadData();
    }
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    
    const [resScores, resTeams, resJuries] = await Promise.all([
      getAllScoresAdmin(),
      getAllTeamsAdmin(),
      getAllJuryMembers(),
    ]);

    if (resJuries.success && resJuries.juryList) {
      setJuries(resJuries.juryList);
    }

    if (resScores.success && resTeams.success) {
      const scores = resScores.scores || [];
      const teams = resTeams.teams || [];

      // Merge teams with evaluation data
      const merged: MergedRecord[] = teams.map((team) => {
        const scoreVal = scores.find((s) => s.teamId === team.id);
        return {
          teamId: team.id,
          teamName: team.teamName,
          problemStatement: team.problemStatement,
          // If evaluated, the official evaluator name comes from the score record
          // Else, read the assigned judge from the team record
          assignedJury: scoreVal ? scoreVal.juryName : (team.judge || ''),
          isEvaluated: !!scoreVal,
          rubric: scoreVal?.rubric,
          totalScore: scoreVal?.totalScore,
          feedback: scoreVal?.feedback,
          starred: scoreVal?.starred,
          createdAt: scoreVal?.createdAt,
          updatedAt: scoreVal?.updatedAt,
        };
      });

      setMergedRecords(merged);
    } else {
      setErrorMsg(
        (!resScores.success ? resScores.error : '') ||
        (!resTeams.success ? resTeams.error : '') ||
        'Failed to sync Teams and Evaluations'
      );
    }
    
    setLoading(false);
  };

  const handleJuryChange = async (teamId: string, teamName: string, newJury: string) => {
    setUpdatingJuryForTeam(teamId);
    setErrorMsg('');
    setSuccessMsg('');

    // Call server action to update judge field on team data
    const res = await updateTeamAdmin(teamId, { judge: newJury });
    
    setUpdatingJuryForTeam(null);
    
    if (res.success) {
      setSuccessMsg(`Successfully assigned jury "${newJury || 'Unassigned'}" to team "${teamName}".`);
      
      // Update local state record optimistically to fast-render UI
      setMergedRecords((prev) =>
        prev.map((rec) => (rec.teamId === teamId ? { ...rec, assignedJury: newJury } : rec))
      );
      setTimeout(() => setSuccessMsg(''), 4500);
    } else {
      setErrorMsg(res.error || 'Failed to update jury assignment.');
    }
  };

  const toggleRowExpansion = (teamId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  // Filtered lists
  const filteredRecords = mergedRecords.filter((rec) => {
    const matchesSearch =
      rec.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.teamId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.assignedJury.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.feedback || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProblem =
      filterProblem === 'All' || rec.problemStatement === filterProblem;

    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Evaluated' && rec.isEvaluated) ||
      (filterStatus === 'Pending' && !rec.isEvaluated);

    return matchesSearch && matchesProblem && matchesStatus;
  });

  // Calculate Metrics
  const totalTeams = mergedRecords.length;
  const totalEvaluated = mergedRecords.filter((r) => r.isEvaluated).length;
  const totalPending = totalTeams - totalEvaluated;
  const avgScoreVal =
    totalEvaluated > 0
      ? (
          mergedRecords.reduce((acc, r) => acc + (r.totalScore || 0), 0) /
          totalEvaluated
        ).toFixed(1)
      : '0.0';

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-500 mb-6 font-medium">You must be logged in as an administrator to access resources.</p>
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
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Jury Scoring & Assignment Panel</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select and assign jury members. Submissions and scores entered by juries are locked and cannot be edited by administrators.
            </p>
          </div>
          <div>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-bold border border-blue-200 transition"
            >
              {loading ? 'Refreshing...' : '🔄 Refresh Data'}
            </button>
          </div>
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

        {/* Dashboard Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Teams</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{totalTeams}</h3>
            <p className="text-gray-400 text-xs mt-1">Registered in Hackathon</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider font-semibold">Evaluated Teams</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">{totalEvaluated}</h3>
            <p className="text-gray-400 text-xs mt-1">Locked score sheets</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Evaluation</p>
            <h3 className="text-3xl font-extrabold text-amber-500 mt-2">{totalPending}</h3>
            <p className="text-gray-400 text-xs mt-1">Jury grading incomplete</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Average Total Score</p>
            <h3 className="text-3xl font-extrabold text-blue-600 mt-2">
              {avgScoreVal} <span className="text-sm font-normal text-gray-400">/ 100</span>
            </h3>
            <p className="text-gray-400 text-xs mt-1">Across all evaluated teams</p>
          </div>
        </div>

        {/* Search, Status & Category Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <input
              type="text"
              placeholder="🔍 Search Team Name, ID, or Jury name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
          <div>
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
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="All">All Evaluation Statuses</option>
              <option value="Evaluated">Evaluated (Score Submitted & Locked)</option>
              <option value="Pending">Pending (Jury Assignment Open)</option>
            </select>
          </div>
        </div>

        {/* Scores Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 md:px-6 md:py-4">Team Information</th>
                  <th className="p-4 md:px-6 md:py-4">Evaluation Status</th>
                  <th className="p-4 md:px-6 md:py-4">Assigned Jury</th>
                  <th className="p-4 md:px-6 md:py-4 text-center">Total Score</th>
                  <th className="p-4 md:px-6 md:py-4">Action Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-sm font-medium">Fetching sync information...</p>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500 font-medium">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const isExpanded = !!expandedRows[record.teamId];
                    return (
                      <React.Fragment key={record.teamId}>
                        <tr className="hover:bg-slate-50 transition duration-150">
                          {/* Column 1: Team Details */}
                          <td className="p-4 md:px-6 md:py-4">
                            <div className="space-y-1">
                              <h4 className="font-bold text-gray-900">{record.teamName}</h4>
                              <div className="flex gap-2 flex-wrap items-center">
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                                  ID: {record.teamId}
                                </span>
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                  {record.problemStatement}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Status */}
                          <td className="p-4 md:px-6 md:py-4">
                            {record.isEvaluated ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                🔒 Locked (Evaluated)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                ⏳ Pending Score
                              </span>
                            )}
                          </td>

                          {/* Column 3: Assigned Jury */}
                          <td className="p-4 md:px-6 md:py-4">
                            {record.isEvaluated ? (
                              // Locked if score has been submitted
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800">{record.assignedJury || 'Anonymous Judge'}</span>
                                <span className="text-gray-400" title="Scores are locked: cannot modify jury assignment">🔒</span>
                              </div>
                            ) : (
                              // Allow modification if score is not entered
                              <div className="flex items-center gap-2 max-w-sm">
                                <select
                                  disabled={updatingJuryForTeam === record.teamId}
                                  value={record.assignedJury}
                                  onChange={(e) => handleJuryChange(record.teamId, record.teamName, e.target.value)}
                                  className="bg-white border border-gray-300 rounded-xl p-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                >
                                  <option value="">-- Click to Assign Jury --</option>
                                  {juries.map((j) => (
                                    <option key={j.id} value={j.juryName}>
                                      {j.juryName} ({j.institution})
                                    </option>
                                  ))}
                                  {/* Allow assigning a custom text name backup in case list is missing */}
                                  {record.assignedJury && !juries.find(j => j.juryName === record.assignedJury) && (
                                    <option value={record.assignedJury}>
                                      {record.assignedJury} (Assigned)
                                    </option>
                                  )}
                                </select>
                                {updatingJuryForTeam === record.teamId && (
                                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Column 4: Total Score */}
                          <td className="p-4 md:px-6 md:py-4 text-center">
                            {record.isEvaluated ? (
                              <div className="inline-block py-1 px-3 bg-blue-50 text-blue-700 font-extrabold rounded-lg text-sm border border-blue-100">
                                {record.totalScore}
                              </div>
                            ) : (
                              <span className="text-gray-400 font-bold">&#8212;</span>
                            )}
                          </td>

                          {/* Column 5: Expansion details */}
                          <td className="p-4 md:px-6 md:py-4">
                            <button
                              onClick={() => toggleRowExpansion(record.teamId)}
                              disabled={!record.isEvaluated}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                                record.isEvaluated
                                  ? 'bg-slate-50 hover:bg-slate-100 text-gray-700 border-gray-200'
                                  : 'bg-transparent text-gray-300 border-transparent cursor-not-allowed'
                              }`}
                            >
                              {isExpanded ? '🔼 Hide Rubrics' : '🔽 View Rubrics'}
                            </button>
                          </td>
                        </tr>

                        {/* Collapsible Rubric Breakdown & Feedback Row */}
                        {isExpanded && record.isEvaluated && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={5} className="p-4 md:px-8 border-t border-slate-100">
                              <div className="space-y-4">
                                <h5 className="font-bold text-xs text-gray-500 uppercase tracking-widest">
                                  Evaluation Scoring Rubric Breakdown (Locked)
                                </h5>
                                
                                {/* Rubric Progress pills */}
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                  {[
                                    { label: 'Idea / Concept', key: 'idea', val: record.rubric?.idea ?? 0 },
                                    { label: 'Output / Code', key: 'output', val: record.rubric?.output ?? 0 },
                                    { label: 'Innovation', key: 'innovation', val: record.rubric?.innovation ?? 0 },
                                    { label: 'Presentation / Pitch', key: 'presentation', val: record.rubric?.presentation ?? 0 },
                                    { label: 'Final Output / Demo', key: 'finalOutput', val: record.rubric?.finalOutput ?? 0 },
                                  ].map((rub) => (
                                    <div key={rub.key} className="bg-white border border-gray-200 rounded-xl p-3 space-y-1.5 shadow-sm">
                                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{rub.label}</span>
                                      <div className="flex items-baseline gap-1">
                                        <span className="text-base font-extrabold text-gray-800">{rub.val}</span>
                                        <span className="text-xs text-gray-400">/ 20</span>
                                      </div>
                                      {/* Bar */}
                                      <div className="w-full bg-gray-100 rounded-full h-1">
                                        <div
                                          className="bg-blue-600 h-1 rounded-full"
                                          style={{ width: `${(rub.val / 20) * 100}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Comments */}
                                {record.feedback && (
                                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                    <h6 className="font-bold text-xs text-gray-900 mb-1">Jury Remarks & Feedback:</h6>
                                    <p className="text-sm italic text-gray-600">&ldquo;{record.feedback}&rdquo;</p>
                                  </div>
                                )}
                                
                                <div className="text-[10px] text-gray-400 flex gap-4">
                                  <span>Created: {record.createdAt ? new Date(record.createdAt).toLocaleString() : ''}</span>
                                  {record.updatedAt && record.updatedAt !== record.createdAt && (
                                    <span>Last Modified: {new Date(record.updatedAt).toLocaleString()}</span>
                                  )}
                                </div>
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
    </div>
  );
}
