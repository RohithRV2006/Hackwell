'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  verifyAdminSession,
  getAllEvaluationsAdmin,
  getAllTeamsAdmin,
  getFinalLabsAdmin,
  updateTeamAdmin,
  getEventTimelinesAdmin,
  publishFinalRoundResultsAdmin,
  AdminScoreData,
  FinalLabData,
} from '@/app/admin/actions';

interface MergedRecord {
  teamId: string;
  displayId: string;
  teamName: string;
  theme: string;
  problemStatement: string;
  finalVenue: string;
  isWinner: boolean;
  winnerRank: number | null;
  winnerTitle: string | null;
  evaluations: AdminScoreData[];
  isEvaluated: boolean;
  totalAvgScore: number;
}

export default function AdminFinaleScoresPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mergedRecords, setMergedRecords] = useState<MergedRecord[]>([]);
  const [finalLabs, setFinalLabs] = useState<FinalLabData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // Final Round Publishing State
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);

  // Explicit Winner Selection State
  const [selected1st, setSelected1st] = useState<string>('');
  const [selected2nd, setSelected2nd] = useState<string>('');
  const [selected3rd, setSelected3rd] = useState<string>('');

  // Selected Team for details popup modal
  const [selectedTeam, setSelectedTeam] = useState<MergedRecord | null>(null);

  // Change Final Lab Modal State
  const [editingLabTeam, setEditingLabTeam] = useState<MergedRecord | null>(null);
  const [selectedLabVenue, setSelectedLabVenue] = useState<string>('');
  const [savingLab, setSavingLab] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');

    const [resScores, resTeams, resLabs, resTimelines] = await Promise.all([
      getAllEvaluationsAdmin('finale'),
      getAllTeamsAdmin(),
      getFinalLabsAdmin(),
      getEventTimelinesAdmin(),
    ]);

    if (resTimelines.success && resTimelines.timelines) {
      setIsPublished(resTimelines.timelines.timeline4?.state === 'ended' || (resTimelines.timelines.timeline4 as any)?.finalePublished === true);
    }

    if (resLabs.success && resLabs.finalLabs) {
      setFinalLabs(resLabs.finalLabs);
    }

    if (resScores.success && resTeams.success) {
      const scores = resScores.scores || [];
      const teams = resTeams.teams || [];

      // Restore existing saved winners from DB (if any)
      const existing1st = teams.find((t) => t.winnerRank === 1)?.id || '';
      const existing2nd = teams.find((t) => t.winnerRank === 2)?.id || '';
      const existing3rd = teams.find((t) => t.winnerRank === 3)?.id || '';

      setSelected1st(existing1st);
      setSelected2nd(existing2nd);
      setSelected3rd(existing3rd);

      // Filter teams that qualified for Final Round
      const qualifiedTeams = teams.filter((t) => t.finaleQualified === true || t.prelimsStatus === 'selected');

      const merged: MergedRecord[] = qualifiedTeams.map((team) => {
        const teamScores = scores.filter((s) => s.teamId === team.id);
        const totalAvgScore = teamScores.length > 0
          ? teamScores.reduce((acc, s) => acc + s.totalScore, 0) / teamScores.length
          : (team.score || 0);

        return {
          teamId: team.id,
          displayId: team.displayId || team.id,
          teamName: team.teamName,
          theme: team.theme || (team as any).assignedTheme || 'General AI',
          problemStatement: team.problemStatement || '',
          finalVenue: team.finalVenue || team.assignedLabName || team.labNo || 'TBA',
          isWinner: team.isWinner === true,
          winnerRank: typeof team.winnerRank === 'number' ? team.winnerRank : null,
          winnerTitle: team.winnerTitle || null,
          evaluations: teamScores,
          isEvaluated: teamScores.length > 0,
          totalAvgScore: Number(totalAvgScore.toFixed(1)),
        };
      });

      // Sort descending by score for table listing
      merged.sort((a, b) => b.totalAvgScore - a.totalAvgScore);

      setMergedRecords(merged);
    } else {
      setErrorMsg(
        (!resScores.success ? resScores.error : '') ||
        (!resTeams.success ? resTeams.error : '') ||
        'Failed to sync data'
      );
    }

    setLoading(false);
  };

  const handlePublishFinalResults = async () => {
    if (!confirm(' Are you sure you want to PUBLISH the Final Round Winners & Scores? This will update the database permanently and show final results on student dashboards.')) return;

    setPublishing(true);
    setErrorMsg('');
    setSuccessMsg('');

    const explicitWinners: { teamId: string; rank: number; title: string }[] = [];
    if (selected1st) explicitWinners.push({ teamId: selected1st, rank: 1, title: '1st Place Winner / Champion' });
    if (selected2nd) explicitWinners.push({ teamId: selected2nd, rank: 2, title: '2nd Place / 1st Runner Up' });
    if (selected3rd) explicitWinners.push({ teamId: selected3rd, rank: 3, title: '3rd Place / 2nd Runner Up' });

    const res = await publishFinalRoundResultsAdmin(explicitWinners);
    if (res.success) {
      setSuccessMsg(` Successfully published Final Round Winners & Scores to the database! (${res.count} finalist teams updated).`);
      setIsPublished(true);
      await loadData();
    } else {
      setErrorMsg(res.error || 'Failed to publish final round results.');
    }

    setPublishing(false);
  };

  const checkSession = async () => {
    const valid = await verifyAdminSession();
    setIsAuthenticated(valid);
    if (valid) {
      loadData();
    } else {
      setLoading(false);
      window.location.href = '/api/logout';
    }
  };

  useEffect(() => {
    const run = async () => { await checkSession(); };
    run();
  }, []);

  const openChangeLabModal = (rec: MergedRecord) => {
    setEditingLabTeam(rec);
    setSelectedLabVenue(rec.finalVenue !== 'TBA' ? rec.finalVenue : '');
    setErrorMsg('');
  };

  const handleSaveFinalLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabTeam) return;

    setSavingLab(true);
    setErrorMsg('');
    setSuccessMsg('');

    const venueVal = selectedLabVenue.trim() || 'TBA';

    const res = await updateTeamAdmin(editingLabTeam.teamId, {
      finalVenue: venueVal,
      assignedLabName: venueVal,
      labNo: venueVal,
    });

    if (res.success) {
      setSuccessMsg(`Updated Final Lab location for "${editingLabTeam.teamName}" to "${venueVal}"`);
      setEditingLabTeam(null);
      await loadData();
    } else {
      setErrorMsg(res.error || 'Failed to update Final Lab venue');
    }

    setSavingLab(false);
  };

  const filteredRecords = mergedRecords.filter((rec) =>
    rec.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.teamId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.finalVenue.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !mergedRecords.length) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500 font-bold font-mono">Loading Final Round Scores...</div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null;
  }

  const team1stObj = mergedRecords.find((r) => r.teamId === selected1st);
  const team2ndObj = mergedRecords.find((r) => r.teamId === selected2nd);
  const team3rdObj = mergedRecords.find((r) => r.teamId === selected3rd);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-sm border border-gray-200 shadow-sm gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold text-gray-900">Final Round</h2>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded border border-purple-200">
               {mergedRecords.length} Finalists Qualified
            </span>
            {isPublished ? (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                🟢 PUBLISHED TO DB & STUDENTS
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded border border-amber-200">
                🟡 DRAFT / UNPUBLISHED
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Select 1st, 2nd, and 3rd place winners using the dropdown cards below, then click <strong>Publish Final Round Results</strong> to permanently sync with the database and student dashboards.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search team, display id, lab..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 md:w-56 bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-blue-600 border border-gray-300 rounded-sm text-sm font-bold transition duration-200"
          >
            Refresh
          </button>
          <button
            onClick={handlePublishFinalResults}
            disabled={publishing || mergedRecords.length === 0}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm text-sm font-extrabold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            {publishing ? 'Publishing to DB...' : ' Publish Final Round Results'}
          </button>
        </div>
      </div>

      {/* Floating Notifications */}
      {(successMsg || errorMsg) && (
        <div className={`fixed top-24 right-6 z-50 p-4 border rounded-sm text-sm font-bold shadow-lg flex items-center justify-between gap-4 min-w-[300px] ${successMsg ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'}`}>
          <span>{successMsg || errorMsg}</span>
          <button onClick={() => { setSuccessMsg(''); setErrorMsg(''); }} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
      )}

      {/* INTERACTIVE WINNER SELECTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1st Place Card */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-sm p-4 shadow-sm relative">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
               1st Place • Champion
            </span>
            <span className="text-xl"></span>
          </div>
          <select
            value={selected1st}
            onChange={(e) => setSelected1st(e.target.value)}
            className="w-full bg-white border border-amber-300 rounded-sm px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs mb-2"
          >
            <option value="">-- Select 1st Place Winner --</option>
            {mergedRecords.map((m) => (
              <option key={m.teamId} value={m.teamId} disabled={m.teamId === selected2nd || m.teamId === selected3rd}>
                {m.teamName} ({m.displayId}) - {m.totalAvgScore}/50 {m.teamId === selected2nd ? '(Selected for 2nd)' : m.teamId === selected3rd ? '(Selected for 3rd)' : ''}
              </option>
            ))}
          </select>
          {team1stObj ? (
            <div className="mt-2 pt-2 border-t border-amber-200 text-xs">
              <div className="font-bold text-gray-900">{team1stObj.teamName} <span className="font-mono text-amber-800">({team1stObj.displayId})</span></div>
              <div className="flex justify-between items-center text-amber-900 mt-1">
                <span>Lab: <strong>{team1stObj.finalVenue}</strong></span>
                <span className="font-extrabold text-sm">{team1stObj.totalAvgScore} / 50</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700/70 italic mt-1">No team selected for 1st Place</div>
          )}
        </div>

        {/* 2nd Place Card */}
        <div className="bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-slate-300 rounded-sm p-4 shadow-sm relative">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
               2nd Place • Runner-Up
            </span>
            <span className="text-xl"></span>
          </div>
          <select
            value={selected2nd}
            onChange={(e) => setSelected2nd(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-sm px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-xs mb-2"
          >
            <option value="">-- Select 2nd Place Winner --</option>
            {mergedRecords.map((m) => (
              <option key={m.teamId} value={m.teamId} disabled={m.teamId === selected1st || m.teamId === selected3rd}>
                {m.teamName} ({m.displayId}) - {m.totalAvgScore}/50 {m.teamId === selected1st ? '(Selected for 1st)' : m.teamId === selected3rd ? '(Selected for 3rd)' : ''}
              </option>
            ))}
          </select>
          {team2ndObj ? (
            <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
              <div className="font-bold text-gray-900">{team2ndObj.teamName} <span className="font-mono text-slate-700">({team2ndObj.displayId})</span></div>
              <div className="flex justify-between items-center text-slate-800 mt-1">
                <span>Lab: <strong>{team2ndObj.finalVenue}</strong></span>
                <span className="font-extrabold text-sm">{team2ndObj.totalAvgScore} / 50</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic mt-1">No team selected for 2nd Place</div>
          )}
        </div>

        {/* 3rd Place Card */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50/60 border-2 border-orange-300 rounded-sm p-4 shadow-sm relative">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-extrabold text-orange-800 uppercase tracking-wider flex items-center gap-1">
               3rd Place • 2nd Runner-Up
            </span>
            <span className="text-xl"></span>
          </div>
          <select
            value={selected3rd}
            onChange={(e) => setSelected3rd(e.target.value)}
            className="w-full bg-white border border-orange-300 rounded-sm px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-xs mb-2"
          >
            <option value="">-- Select 3rd Place Winner --</option>
            {mergedRecords.map((m) => (
              <option key={m.teamId} value={m.teamId} disabled={m.teamId === selected1st || m.teamId === selected2nd}>
                {m.teamName} ({m.displayId}) - {m.totalAvgScore}/50 {m.teamId === selected1st ? '(Selected for 1st)' : m.teamId === selected2nd ? '(Selected for 2nd)' : ''}
              </option>
            ))}
          </select>
          {team3rdObj ? (
            <div className="mt-2 pt-2 border-t border-orange-200 text-xs">
              <div className="font-bold text-gray-900">{team3rdObj.teamName} <span className="font-mono text-orange-800">({team3rdObj.displayId})</span></div>
              <div className="flex justify-between items-center text-orange-900 mt-1">
                <span>Lab: <strong>{team3rdObj.finalVenue}</strong></span>
                <span className="font-extrabold text-sm">{team3rdObj.totalAvgScore} / 50</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-orange-700/70 italic mt-1">No team selected for 3rd Place</div>
          )}
        </div>
      </div>

      {/* FINAL ROUND SCORES TABLE */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Rank</th>
                <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Display ID</th>
                <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Team Name</th>
                <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Theme</th>
                <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Final Lab</th>
                <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Evals</th>
                <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Avg Score (/50)</th>
                <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No final round teams found. Promote teams from Prelims Round first.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const isTop1 = selected1st && rec.teamId === selected1st;
                  const isTop2 = selected2nd && rec.teamId === selected2nd;
                  const isTop3 = selected3rd && rec.teamId === selected3rd;
                  const displayRank = idx + 1;

                  return (
                    <tr
                      key={rec.teamId}
                      className={
                        isTop1 ? 'bg-amber-50/60 font-semibold border-l-4 border-l-amber-400' :
                        isTop2 ? 'bg-slate-50/60 border-l-4 border-l-slate-400' :
                        isTop3 ? 'bg-orange-50/50 border-l-4 border-l-orange-400' : 'hover:bg-gray-50 transition'
                      }
                    >
                      <td className="px-4 py-3.5 text-center font-bold text-xs">
                        {isTop1 && <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-black text-xs"> #1 Champion</span>}
                        {isTop2 && <span className="bg-slate-100 text-slate-900 border border-slate-300 px-2 py-0.5 rounded-full font-black text-xs"> #2 Runner-Up</span>}
                        {isTop3 && <span className="bg-orange-100 text-orange-900 border border-orange-300 px-2 py-0.5 rounded-full font-black text-xs"> #3 2nd Runner-Up</span>}
                        {!isTop1 && !isTop2 && !isTop3 && <span className="text-gray-400">#{displayRank}</span>}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-purple-900 text-xs">{rec.displayId}</td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">{rec.teamName}</td>
                      <td className="px-4 py-3.5 text-gray-600 text-xs max-w-xs truncate">{rec.theme}</td>
                      <td className="px-4 py-3.5 font-mono">
                        {rec.finalVenue && rec.finalVenue !== 'TBA' ? (
                          <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded text-xs font-bold border border-blue-200">
                             {rec.finalVenue}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">TBA (Unassigned)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {rec.isEvaluated ? (
                          <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded-sm text-xs font-bold border border-blue-200">Evaluated</span>
                        ) : (
                          <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-sm text-xs font-bold border border-gray-200">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-600">{rec.evaluations.length}</td>
                      <td className="px-4 py-3.5 text-center font-extrabold text-blue-700 text-base">{rec.totalAvgScore} / 50</td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openChangeLabModal(rec)}
                          className="text-purple-700 hover:text-purple-900 bg-purple-50 border border-purple-200 hover:bg-purple-100 px-2.5 py-1 rounded-sm text-xs font-bold transition"
                        >
                           Change Lab
                        </button>
                        <button
                          onClick={() => setSelectedTeam(rec)}
                          disabled={!rec.isEvaluated}
                          className={`px-3 py-1 rounded-sm text-xs font-bold transition border ${
                            rec.isEvaluated 
                              ? 'text-blue-600 hover:text-blue-800 bg-white border-gray-200 hover:bg-gray-50' 
                              : 'text-gray-400 bg-gray-50 border-transparent cursor-not-allowed'
                          }`}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CHANGE FINAL LAB MODAL */}
      {editingLabTeam && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-sm p-6 w-full max-w-lg shadow-xl my-8">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900"> Assign / Change Final Lab</h3>
                <p className="text-xs text-gray-500 font-semibold">{editingLabTeam.teamName} ({editingLabTeam.displayId})</p>
              </div>
              <button
                onClick={() => setEditingLabTeam(null)}
                className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
              >
                
              </button>
            </div>

            <form onSubmit={handleSaveFinalLab} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Configured Final Lab</label>
                <select
                  value={selectedLabVenue}
                  onChange={(e) => setSelectedLabVenue(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-sm px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 mb-2"
                >
                  <option value="">-- Custom / Direct Venue Entry --</option>
                  {finalLabs.map((fl) => (
                    <option key={fl.labId} value={fl.labName}>
                      {fl.labName} {fl.coordinator ? `(Coordinator: ${fl.coordinator})` : ''}
                    </option>
                  ))}
                </select>

                <label className="block text-xs font-semibold text-gray-700 mb-1">Or Type Final Lab / Venue Name</label>
                <input
                  type="text"
                  value={selectedLabVenue}
                  onChange={(e) => setSelectedLabVenue(e.target.value)}
                  placeholder="e.g. LAB1, Main Auditorium, Seminar Hall A..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-sm px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLabTeam(null)}
                  disabled={savingLab}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm text-sm font-bold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLab}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-sm text-sm font-bold transition disabled:opacity-50"
                >
                  {savingLab ? 'Saving Lab...' : 'Save Final Lab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: POPUP DETAILS MODAL */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-sm p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedTeam.teamName} - Finale Scores</h3>
                <p className="text-sm text-gray-500">Average Score: <span className="font-bold text-gray-900">{selectedTeam.totalAvgScore} / 50</span> • Lab: <span className="font-bold text-purple-700">{selectedTeam.finalVenue}</span></p>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedTeam.evaluations.map((evalRecord) => (
                <div key={evalRecord.id} className="bg-white border border-gray-200 rounded-sm p-4">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                    <span className="font-bold text-gray-900">Jury: {evalRecord.juryName}</span>
                    <span className="font-bold text-blue-600 text-lg">{evalRecord.totalScore} / 50</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-xs">
                    <div>
                      <div className="text-gray-500">Concept Strength</div>
                      <div className="font-semibold text-gray-900">{evalRecord.rubric?.conceptStrength ?? 0}/12</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Build Intelligence</div>
                      <div className="font-semibold text-gray-900">{evalRecord.rubric?.buildIntelligence ?? 0}/12</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Delivery Impact</div>
                      <div className="font-semibold text-gray-900">{evalRecord.rubric?.deliveryImpact ?? 0}/8</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Live Defense</div>
                      <div className="font-semibold text-gray-900">{evalRecord.rubric?.liveDefenseScore ?? 0}/8</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Communication</div>
                      <div className="font-semibold text-gray-900">{evalRecord.rubric?.communication ?? 0}/10</div>
                    </div>
                  </div>
                  {evalRecord.remarks && (
                    <div className="bg-gray-50 p-3 rounded-sm border border-gray-200 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900 block mb-1">Remarks:</span>
                      {evalRecord.remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedTeam(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-sm font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
