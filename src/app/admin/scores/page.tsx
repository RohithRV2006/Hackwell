'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  verifyAdminSession,
  getAllScoresAdmin,
  createScoreAdmin,
  updateScoreAdmin,
  deleteScoreAdmin,
  getAllTeamsAdmin,
  AdminScoreData,
  Rubric,
  AdminTeamData,
} from '../actions';

export default function AdminScoresPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Data States
  const [scores, setScores] = useState<AdminScoreData[]>([]);
  const [teams, setTeams] = useState<AdminTeamData[]>([]);
  const [loading, setLoading] = useState(true);

  // Notification States
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Search/Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProblem, setFilterProblem] = useState('All');
  const [filterStarred, setFilterStarred] = useState('All');

  // Modals
  const [editingScore, setEditingScore] = useState<AdminScoreData | null>(null);
  const [creatingScore, setCreatingScore] = useState<{
    teamId: string;
    juryName: string;
    rubric: Rubric;
    feedback: string;
    starred: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

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
    const [resScores, resTeams] = await Promise.all([
      getAllScoresAdmin(),
      getAllTeamsAdmin(),
    ]);

    if (resScores.success && resScores.scores) {
      setScores(resScores.scores);
    } else {
      setErrorMsg(resScores.error || 'Failed to load scores');
    }

    if (resTeams.success && resTeams.teams) {
      setTeams(resTeams.teams);
    }
    setLoading(false);
  };

  const handleToggleStar = async (score: AdminScoreData) => {
    const nextStarred = !score.starred;
    // Optimistic UI Update
    setScores((prev) =>
      prev.map((s) => (s.id === score.id ? { ...s, starred: nextStarred } : s))
    );

    const res = await updateScoreAdmin(score.id, { starred: nextStarred });
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update starred status');
      // Revert UI Update
      setScores((prev) =>
        prev.map((s) => (s.id === score.id ? { ...s, starred: score.starred } : s))
      );
    } else {
      setSuccessMsg(`Toggled highlight for team "${score.teamName || score.teamId}"!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleDeleteScore = async (scoreId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete the score evaluation for team "${teamName}"? This action cannot be undone.`)) {
      return;
    }

    const res = await deleteScoreAdmin(scoreId);
    if (res.success) {
      setSuccessMsg(`Score record for "${teamName}" deleted successfully.`);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to delete score record');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScore) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await updateScoreAdmin(editingScore.id, {
      juryName: editingScore.juryName,
      rubric: editingScore.rubric,
      feedback: editingScore.feedback,
      starred: editingScore.starred,
    });

    setSaving(false);

    if (res.success) {
      setSuccessMsg(`Evaluation for "${editingScore.teamName || editingScore.teamId}" updated successfully!`);
      setEditingScore(null);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to save score changes');
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingScore) return;

    if (!creatingScore.teamId) {
      setErrorMsg('Please select a team.');
      return;
    }
    if (!creatingScore.juryName.trim()) {
      setErrorMsg('Please enter a jury name.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await createScoreAdmin({
      teamId: creatingScore.teamId,
      juryName: creatingScore.juryName,
      rubric: creatingScore.rubric,
      feedback: creatingScore.feedback,
      starred: creatingScore.starred,
    });

    setSaving(false);

    if (res.success) {
      const selectedTeam = teams.find((t) => t.id === creatingScore.teamId);
      setSuccessMsg(`Score evaluation for team "${selectedTeam?.teamName || creatingScore.teamId}" created successfully!`);
      setCreatingScore(null);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to create score record');
    }
  };

  // Filtered lists
  const filteredScores = scores.filter((score) => {
    const matchesSearch =
      (score.teamName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      score.teamId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      score.juryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (score.feedback || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProblem =
      filterProblem === 'All' || score.problemStatement === filterProblem;

    const matchesStarred =
      filterStarred === 'All' ||
      (filterStarred === 'Starred' && score.starred) ||
      (filterStarred === 'Unstarred' && !score.starred);

    return matchesSearch && matchesProblem && matchesStarred;
  });

  // Calculate Metrics
  const totalEvaluated = scores.length;
  const avgScoreVal =
    totalEvaluated > 0
      ? (scores.reduce((acc, s) => acc + s.totalScore, 0) / totalEvaluated).toFixed(1)
      : '0.0';
  const highestScoreVal =
    totalEvaluated > 0
      ? Math.max(...scores.map((s) => s.totalScore))
      : 0;
  const totalStarredVal = scores.filter((s) => s.starred).length;

  // Filter out teams that already have evaluations
  const evaluatedTeamIds = new Set(scores.map((s) => s.teamId));
  const unevaluatedTeams = teams.filter((t) => !evaluatedTeamIds.has(t.id));

  // Loading Authenticity state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-500 mb-6">You must be logged in as an administrator to access this page.</p>
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

  // Main UI
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Jury Matrix Evaluations</h2>
            <p className="text-sm text-gray-500 mt-1">
              Refined scoreboards showing rubric metrics: Idea, Output, Innovation, Presentation, and Final Output.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setCreatingScore({
                  teamId: '',
                  juryName: '',
                  rubric: { idea: 0, output: 0, innovation: 0, presentation: 0, finalOutput: 0 },
                  feedback: '',
                  starred: false,
                })
              }
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
            >
              ➕ Add Evaluation
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-bold border border-blue-200 transition"
            >
              🏢 {loading ? 'Refreshing...' : 'Refresh Records'}
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

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Teams Evaluated</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{totalEvaluated}</h3>
            <p className="text-gray-400 text-xs mt-1">Active scores in database</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Average Total Score</p>
            <h3 className="text-3xl font-extrabold text-blue-600 mt-2">{avgScoreVal} <span className="text-sm font-normal text-gray-400">/ 100</span></h3>
            <p className="text-gray-400 text-xs mt-1">Across all categories</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Highest Score</p>
            <h3 className="text-3xl font-extrabold text-green-600 mt-2">{highestScoreVal} <span className="text-sm font-normal text-gray-400">/ 100</span></h3>
            <p className="text-gray-400 text-xs mt-1">Outstanding submission</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Starred by Jury</p>
            <h3 className="text-3xl font-extrabold text-amber-500 mt-2">⭐ {totalStarredVal}</h3>
            <p className="text-gray-400 text-xs mt-1">Highlighted team status</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <input
              type="text"
              placeholder="🔍 Search team name, jury, or feedback..."
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
              <option value="All">All Problems</option>
              <option value="AI in Healthcare">AI in Healthcare</option>
              <option value="Fintech Solutions">Fintech Solutions</option>
              <option value="EdTech Innovations">EdTech Innovations</option>
              <option value="Smart City">Smart City</option>
            </select>
          </div>
          <div>
            <select
              value={filterStarred}
              onChange={(e) => setFilterStarred(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="All">All Highlighting Status</option>
              <option value="Starred">⭐ High-priority Starred</option>
              <option value="Unstarred">Standard Unstarred</option>
            </select>
          </div>
        </div>

        {/* Scores List */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4">Loading scores data from Firestore...</p>
            </div>
          ) : filteredScores.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
              No score records found matching your filters.
            </div>
          ) : (
            filteredScores.map((score) => (
              <div
                key={score.id}
                className={`bg-white border rounded-2xl p-6 shadow-md space-y-6 transition hover:shadow-lg ${
                  score.starred ? 'border-amber-400 bg-amber-50/20' : 'border-gray-200'
                }`}
              >
                {/* Score Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900">{score.teamName || score.teamId}</h3>
                      <button
                        onClick={() => handleToggleStar(score)}
                        className={`text-lg p-1 rounded-lg border transition ${
                          score.starred
                            ? 'bg-amber-100 border-amber-300 text-amber-600 hover:bg-amber-200'
                            : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                        }`}
                        title={score.starred ? 'Starred Team' : 'Click to Star Team'}
                      >
                        {score.starred ? '⭐ Starred' : '☆ Star'}
                      </button>
                      <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-mono">
                        Team ID: {score.teamId}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Problem: <span className="font-semibold text-gray-800">{score.problemStatement}</span> | Jury: <span className="font-semibold text-gray-800">{score.juryName}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Big Score Box */}
                    <div className="bg-blue-50 border border-blue-100 text-blue-700 px-5 py-2.5 rounded-2xl text-center min-w-[100px]">
                      <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest">Total score</span>
                      <span className="text-2xl font-extrabold">{score.totalScore}</span>
                      <span className="text-xs font-semibold text-blue-400">/ 100</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => setEditingScore(JSON.parse(JSON.stringify(score)))}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-sm font-semibold transition"
                      >
                        ✏️ Edit Metrics
                      </button>
                      <button
                        onClick={() => handleDeleteScore(score.id, score.teamName || score.teamId)}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm transition"
                        title="Delete Evaluation"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rubrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { label: 'Idea / Concept', key: 'idea', value: score.rubric.idea },
                    { label: 'Output / Code', key: 'output', value: score.rubric.output },
                    { label: 'Innovation', key: 'innovation', value: score.rubric.innovation },
                    { label: 'Presentation / Pitch', key: 'presentation', value: score.rubric.presentation },
                    { label: 'Final Output / Demo', key: 'finalOutput', value: score.rubric.finalOutput },
                  ].map((rub) => (
                    <div key={rub.key} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{rub.label}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold text-gray-800">{rub.value}</span>
                        <span className="text-xs text-gray-400">/ 20</span>
                      </div>
                      {/* Mini progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-300">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${(rub.value / 20) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Jury Feedback Notes */}
                {(score.feedback || score.updatedAt) && (
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-2">
                    {score.feedback && (
                      <p className="text-sm text-gray-700">
                        <strong className="text-gray-900 font-bold block mb-1">Feedback Remarks:</strong>
                        <span className="italic">&ldquo;{score.feedback}&rdquo;</span>
                      </p>
                    )}
                    <div className="text-[10px] text-gray-400 border-t border-slate-100 pt-2 flex justify-between flex-wrap gap-2">
                      <span>Evaluated: {new Date(score.createdAt || '').toLocaleString()}</span>
                      {score.updatedAt !== score.createdAt && (
                        <span>Last Updated: {new Date(score.updatedAt || '').toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {creatingScore && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 w-full max-w-2xl rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-gray-900">Add New Jury Evaluation</h3>
              <button
                onClick={() => setCreatingScore(null)}
                className="text-gray-400 hover:text-gray-900 text-xl font-bold px-2 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Team</label>
                  {unevaluatedTeams.length === 0 ? (
                    <div className="text-xs text-amber-600 bg-amber-55/40 p-3 rounded-lg border border-amber-200 font-medium">
                      All registered teams already have scores! Edit their evaluations from the list instead.
                    </div>
                  ) : (
                    <select
                      required
                      value={creatingScore.teamId}
                      onChange={(e) => setCreatingScore({ ...creatingScore, teamId: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Select Unevaluated Team --</option>
                      {unevaluatedTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.teamName} ({t.problemStatement})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assigned Jury Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. A. Kumar"
                    value={creatingScore.juryName}
                    onChange={(e) => setCreatingScore({ ...creatingScore, juryName: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Rubrics Form */}
              <div className="space-y-4 bg-gray-50 border border-gray-150 p-4 rounded-xl">
                <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Evaluation Rubric Breakdown (0 - 20 pts each)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Idea', key: 'idea' },
                    { label: 'Output', key: 'output' },
                    { label: 'Innovation', key: 'innovation' },
                    { label: 'Presentation', key: 'presentation' },
                    { label: 'Final Output', key: 'finalOutput' },
                  ].map((rub) => (
                    <div key={rub.key}>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">{rub.label}</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        required
                        value={creatingScore.rubric[rub.key as keyof Rubric]}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCreatingScore({
                            ...creatingScore,
                            rubric: {
                              ...creatingScore.rubric,
                              [rub.key]: val > 20 ? 20 : val < 0 ? 0 : val,
                            },
                          });
                        }}
                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm text-center font-bold text-gray-800"
                      />
                    </div>
                  ))}
                </div>

                {/* Live total score */}
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-bold text-gray-700 uppercase">
                  <span>Total Calculated Score:</span>
                  <span className="text-xl text-blue-600 bg-blue-50 border border-blue-200. px-4 py-1.5 rounded-xl">
                    {Object.values(creatingScore.rubric).reduce((a, b) => a + Number(b), 0)} / 100
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Optional Feedback / Notes</label>
                <textarea
                  placeholder="Enter comments about the evaluation..."
                  rows={3}
                  value={creatingScore.feedback}
                  onChange={(e) => setCreatingScore({ ...creatingScore, feedback: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="createStarred"
                  checked={creatingScore.starred}
                  onChange={(e) => setCreatingScore({ ...creatingScore, starred: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="createStarred" className="text-sm font-bold text-gray-700 select-none">
                  ⭐ Star/Highlight this team (High priority)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCreatingScore(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-sm font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || unevaluatedTeams.length === 0}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-55"
                >
                  {saving ? 'Creating Scorecard...' : 'Submit Scorecard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingScore && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 w-full max-w-2xl rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
              <h3 className="text-2xl font-bold text-gray-900">
                Edit Metrics for: <span className="text-blue-600">{editingScore.teamName || editingScore.teamId}</span>
              </h3>
              <button
                onClick={() => setEditingScore(null)}
                className="text-gray-400 hover:text-gray-900 text-xl font-bold px-2 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assigned Jury Name</label>
                <input
                  type="text"
                  required
                  value={editingScore.juryName}
                  onChange={(e) => setEditingScore({ ...editingScore, juryName: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Rubrics Form */}
              <div className="space-y-4 bg-gray-50 border border-gray-150 p-4 rounded-xl">
                <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Evaluation Rubric Breakdown (0 - 20 pts each)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Idea', key: 'idea' },
                    { label: 'Output', key: 'output' },
                    { label: 'Innovation', key: 'innovation' },
                    { label: 'Presentation', key: 'presentation' },
                    { label: 'Final Output', key: 'finalOutput' },
                  ].map((rub) => (
                    <div key={rub.key}>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">{rub.label}</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        required
                        value={editingScore.rubric[rub.key as keyof Rubric]}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditingScore({
                            ...editingScore,
                            rubric: {
                              ...editingScore.rubric,
                              [rub.key]: val > 20 ? 20 : val < 0 ? 0 : val,
                            },
                          });
                        }}
                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm text-center font-bold text-gray-800"
                      />
                    </div>
                  ))}
                </div>

                {/* Live total score */}
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-bold text-gray-700 uppercase">
                  <span>Total Calculated Score:</span>
                  <span className="text-xl text-blue-600 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-xl">
                    {Object.values(editingScore.rubric).reduce((a, b) => a + Number(b), 0)} / 100
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Optional Feedback / Notes</label>
                <textarea
                  placeholder="Enter comments about the evaluation..."
                  rows={3}
                  value={editingScore.feedback || ''}
                  onChange={(e) => setEditingScore({ ...editingScore, feedback: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="editStarred"
                  checked={editingScore.starred}
                  onChange={(e) => setEditingScore({ ...editingScore, starred: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="editStarred" className="text-sm font-bold text-gray-700 select-none">
                  ⭐ Star/Highlight this team (High priority)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingScore(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl text-sm font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-55"
                >
                  {saving ? 'Saving changes...' : 'Save All Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
