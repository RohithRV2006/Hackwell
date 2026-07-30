'use client';

import { useState, useEffect } from 'react';
import {
  addJuryMember,
  getAllJuryMembers,
  getTeamsWithScores,
  submitOrUpdateScore,
  getAllScores,
  JuryMember,
  SimpleTeam,
  TeamScore,
} from './actions';

export default function JuryPage() {
  const [activeTab, setActiveTab] = useState<'evaluate' | 'addJury' | 'allScores'>('evaluate');

  // Data States
  const [juryList, setJuryList] = useState<JuryMember[]>([]);
  const [teams, setTeams] = useState<SimpleTeam[]>([]);
  const [scoresList, setScoresList] = useState<TeamScore[]>([]);

  // Form States - Add Jury
  const [juryName, setJuryName] = useState('');
  const [institution, setInstitution] = useState('');
  const [addingJury, setAddingJury] = useState(false);

  // Form States - Scoring
  const [selectedJury, setSelectedJury] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [scoreInput, setScoreInput] = useState<number | ''>('');
  const [submittingScore, setSubmittingScore] = useState(false);

  // UI Message States
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg('');

    const [resJury, resTeams, resScores] = await Promise.all([
      getAllJuryMembers(),
      getTeamsWithScores(),
      getAllScores(),
    ]);

    if (resJury.success && resJury.juryList) setJuryList(resJury.juryList);
    if (resTeams.success && resTeams.teams) setTeams(resTeams.teams);
    if (resScores.success && resScores.scoresList) setScoresList(resScores.scoresList);

    setLoading(false);
  };

  const handleAddJury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!juryName.trim() || !institution.trim()) {
      setErrorMsg('Please enter both Jury Name and Institution.');
      return;
    }

    setAddingJury(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await addJuryMember(juryName, institution);
    setAddingJury(false);

    if (res.success) {
      setSuccessMsg(`Jury member "${juryName}" added successfully to database!`);
      setJuryName('');
      setInstitution('');
      loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to add jury member');
    }
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setErrorMsg('Please select a team.');
      return;
    }
    if (!selectedJury) {
      setErrorMsg('Please select an evaluating Jury member.');
      return;
    }
    if (scoreInput === '' || isNaN(Number(scoreInput))) {
      setErrorMsg('Please enter a valid score (0-100).');
      return;
    }

    setSubmittingScore(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await submitOrUpdateScore(selectedTeamId, selectedJury, Number(scoreInput));
    setSubmittingScore(false);

    if (res.success) {
      const selectedTeam = teams.find((t) => t.id === selectedTeamId);
      setSuccessMsg(
        `Score ${scoreInput}/100 submitted successfully for team "${selectedTeam?.teamName || selectedTeamId}" by ${selectedJury}!`
      );
      setScoreInput('');
      loadAllData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to submit score');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl border border-slate-800 shadow-2xl">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Jury & Score Management</h1>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs px-3 py-1 rounded-full font-medium">
                Official Portal
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Evaluate hackathon teams and record scores directly into Firestore.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('evaluate')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'evaluate'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚖️ Evaluate Team
            </button>
            <button
              onClick={() => setActiveTab('addJury')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'addJury'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🧑‍⚖️ Add Jury Member
            </button>
            <button
              onClick={() => setActiveTab('allScores')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'allScores'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📋 Scores Table ({scoresList.length})
            </button>
          </div>
        </header>

        {/* Notifications */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-sm font-medium">
            ✅ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* TAB 1: EVALUATE TEAM */}
        {activeTab === 'evaluate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Score Submission Form */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📝 Submit Team Score</span>
              </h2>

              <form onSubmit={handleSubmitScore} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                    Select Evaluating Jury Member
                  </label>
                  {juryList.length === 0 ? (
                    <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                      No Jury members found. Click &quot;Add Jury Member&quot; tab to create one first.
                    </p>
                  ) : (
                    <select
                      required
                      value={selectedJury}
                      onChange={(e) => setSelectedJury(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Choose Jury Member --</option>
                      {juryList.map((j) => (
                        <option key={j.id} value={j.juryName}>
                          {j.juryName} ({j.institution})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                    Select Team to Evaluate
                  </label>
                  <select
                    required
                    value={selectedTeamId}
                    onChange={(e) => {
                      setSelectedTeamId(e.target.value);
                      const existing = teams.find((t) => t.id === e.target.value);
                      if (existing?.currentScore !== undefined) {
                        setScoreInput(existing.currentScore);
                      } else {
                        setScoreInput('');
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Team --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamName} ({t.problemStatement})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-400 uppercase mb-2">
                    Score (0 - 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    placeholder="Enter total score e.g. 88"
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-800 border border-amber-500/40 rounded-xl px-4 py-3 text-lg font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingScore || juryList.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition disabled:opacity-50"
                >
                  {submittingScore ? 'Submitting Score...' : 'Submit / Update Score'}
                </button>
              </form>
            </div>

            {/* Teams List Cards */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Registered Teams & Current Evaluations</h2>
              {loading ? (
                <div className="p-8 text-center text-slate-400">Loading teams...</div>
              ) : teams.length === 0 ? (
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400">
                  No registered teams found in Firestore.
                </div>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{team.teamName}</h3>
                        <span className="bg-slate-800 text-slate-400 text-[10px] px-2.5 py-0.5 rounded-full font-mono">
                          ID: {team.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Problem Statement: <span className="text-slate-200 font-medium">{team.problemStatement}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-center">
                        <span className="block text-[9px] font-semibold text-slate-400 uppercase">Jury</span>
                        <span className="text-xs font-semibold text-slate-200">{team.assignedJury}</span>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-xl text-center min-w-[80px]">
                        <span className="block text-[9px] font-semibold text-amber-400 uppercase">Score</span>
                        <span className="text-base font-extrabold text-amber-300">
                          {team.currentScore !== undefined ? `${team.currentScore}/100` : 'Not Scored'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTeamId(team.id);
                          setScoreInput(team.currentScore !== undefined ? team.currentScore : '');
                        }}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-medium transition"
                      >
                        Evaluate
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ADD JURY MEMBER */}
        {activeTab === 'addJury' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Jury Form */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🧑‍⚖️ Add Jury Member</span>
              </h2>

              <form onSubmit={handleAddJury} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                    Jury Member Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. A. Kumar"
                    value={juryName}
                    onChange={(e) => setJuryName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                    Institution / Organization
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Saranathan College of Engineering"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingJury}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition disabled:opacity-50"
                >
                  {addingJury ? 'Adding Jury Member...' : 'Save Jury Member'}
                </button>
              </form>
            </div>

            {/* Existing Jury List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Registered Jury Members (`jury` collection)</h2>
              {juryList.length === 0 ? (
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center text-slate-400">
                  No jury members added yet. Use the form on the left to add one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {juryList.map((j) => (
                    <div
                      key={j.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-white">{j.juryName}</h3>
                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2.5 py-0.5 rounded-full font-mono">
                          {j.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Institution: <span className="text-slate-200 font-medium">{j.institution}</span>
                      </p>
                      {j.createdAt && (
                        <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                          Added: {new Date(j.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ALL SCORES TABLE */}
        {activeTab === 'allScores' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h2 className="text-xl font-bold text-white">Scores Collection (`scores`) Records</h2>

            {scoresList.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No score records found in `scores` collection. Evaluate a team to create a record.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-4 rounded-l-xl">Document ID</th>
                      <th className="p-4">Team ID</th>
                      <th className="p-4">Assigned Jury</th>
                      <th className="p-4">Awarded Score</th>
                      <th className="p-4 rounded-r-xl">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {scoresList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-mono text-xs text-slate-400">{s.id}</td>
                        <td className="p-4 font-semibold text-white">{s.teamId}</td>
                        <td className="p-4 text-indigo-400 font-medium">{s.juryName}</td>
                        <td className="p-4">
                          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs px-3 py-1 rounded-full font-bold">
                            {s.score} / 100
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-500">
                          {s.createdAt ? new Date(s.createdAt).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
