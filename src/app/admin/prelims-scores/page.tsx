'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  verifyAdminSession,
  getAllEvaluationsAdmin,
  getAllTeamsAdmin,
  updateTeamAdmin,
  getLabsAdmin,
  getJuriesAdmin,
  publishJurySelectedFinalistsAdmin,
  upsertEvalRecordAdmin,
  AdminScoreData,
  AdminTeamData,
  LabData,
  JuryOption,
} from '@/app/admin/actions';

interface MergedRecord {
  teamId: string;
  displayId: string;
  teamName: string;
  theme: string;
  problemStatement: string;
  judge: string;
  labNo: string;
  evaluations: AdminScoreData[];
  isEvaluated: boolean;
  totalScore: number;
  selectedForFinal: boolean;
  selectionReason: string;
  finaleQualified: boolean;
}

export default function AdminPrelimsScoresPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mergedRecords, setMergedRecords] = useState<MergedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // Sub-tabs State
  const [subTab, setSubTab] = useState<'scores' | 'selection'>('scores');
  const [selectedFinalistIds, setSelectedFinalistIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);

  // Selected Team for details popup
  const [selectedTeam, setSelectedTeam] = useState<MergedRecord | null>(null);

  // Assignment & Marks Modal State (Jury Name, Lab No., and Rubric Breakdown)
  const [editingAssignTeam, setEditingAssignTeam] = useState<MergedRecord | null>(null);
  const [assignJuryName, setAssignJuryName] = useState('');
  const [assignLabNo, setAssignLabNo] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignErrorMsg, setAssignErrorMsg] = useState('');

  // Rubric Scores Editing State
  const [editConcept, setEditConcept] = useState<number>(0);
  const [editBuild, setEditBuild] = useState<number>(0);
  const [editDelivery, setEditDelivery] = useState<number>(0);
  const [editDefense, setEditDefense] = useState<number>(0);
  const [editComm, setEditComm] = useState<number>(0);
  const [editFeedback, setEditFeedback] = useState<string>('');

  // Configured Labs and Predefined Juries State
  const [labs, setLabs] = useState<LabData[]>([]);
  const [juriesList, setJuriesList] = useState<JuryOption[]>([]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');

    const [resScores, resTeams, resLabs, resJuries] = await Promise.all([
      getAllEvaluationsAdmin('prelims'),
      getAllTeamsAdmin(),
      getLabsAdmin(),
      getJuriesAdmin(),
    ]);

    if (resLabs.success && resLabs.labs) {
      setLabs(resLabs.labs);
    }
    if (resJuries.success && resJuries.juries) {
      setJuriesList(resJuries.juries);
    }

    if (resScores.success && resTeams.success) {
      const scores = resScores.scores || [];
      const teams = resTeams.teams || [];

      // Filter ONLY teams that have submitted a PPT presentation for the Prelims round
      const pptQualifiedTeams = teams.filter((t) => t.pptLink && String(t.pptLink).trim().length > 0);

      const finalistSet = new Set<string>();

      const merged: MergedRecord[] = pptQualifiedTeams.map((team) => {
        const teamScores = scores.filter((s) => s.teamId === team.id);
        const evalRec = teamScores.length > 0 ? teamScores[0] : null;
        const totalScore = evalRec ? (evalRec.totalScore || 0) : (team.score || 0);

        const evaluatedJuryName = evalRec ? (evalRec.juryName || evalRec.juryId) : '';
        const resolvedJudge = (team.judge && team.judge !== 'Unassigned') ? team.judge : (evaluatedJuryName || 'Unassigned');

        const isQualified = team.finaleQualified === true || team.prelimsStatus === 'selected';
        const isJuryNominated = Boolean(evalRec?.selectedForFinal);

        if (isQualified || isJuryNominated) {
          finalistSet.add(team.id);
        }

        return {
          teamId: team.id,
          displayId: team.displayId || team.id,
          teamName: team.teamName,
          theme: team.theme || (team as any).assignedTheme || 'General AI',
          problemStatement: team.problemStatement || '',
          judge: resolvedJudge,
          labNo: team.labNo || 'Unassigned',
          evaluations: teamScores,
          isEvaluated: teamScores.length > 0,
          totalScore,
          selectedForFinal: isJuryNominated,
          selectionReason: evalRec?.selectionReason || '',
          finaleQualified: isQualified,
        };
      });

      // Sort descending by score
      merged.sort((a, b) => b.totalScore - a.totalScore);

      setMergedRecords(merged);
      setSelectedFinalistIds(finalistSet);
    } else {
      setErrorMsg(
        (!resScores.success ? resScores.error : '') ||
        (!resTeams.success ? resTeams.error : '') ||
        'Failed to sync data'
      );
    }

    setLoading(false);
  };

  const checkSession = async () => {
    const valid = await verifyAdminSession();
    setIsAuthenticated(valid);
    if (valid) {
      loadData();
    } else {
      setLoading(false);
      router.replace('/');
    }
  };

  useEffect(() => {
    const run = async () => { await checkSession(); };
    run();
  }, []);

  const handleToggleFinalist = (teamId: string) => {
    setSelectedFinalistIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handlePublishFinalists = async () => {
    if (selectedFinalistIds.size === 0) {
      if (!confirm('No teams selected for Final Round. Proceed to clear all finalists?')) return;
    }
    setPublishing(true);
    setSuccessMsg('');
    setErrorMsg('');

    const res = await publishJurySelectedFinalistsAdmin(Array.from(selectedFinalistIds));
    if (res.success) {
      setSuccessMsg(`🚀 Successfully promoted and published ${res.count} teams to the Final Round! Changes are live on Final Round tab & Student Dashboards.`);
      await loadData();
    } else {
      setErrorMsg(res.error || 'Failed to publish finalists.');
    }
    setPublishing(false);
  };

  const handleJurySelectChange = (selectedJuryName: string) => {
    setAssignJuryName(selectedJuryName);
    if (!selectedJuryName) {
      setAssignLabNo('');
      return;
    }

    const matchedLab = labs.find(
      (l) => l.assignedJuryName && l.assignedJuryName.toLowerCase() === selectedJuryName.toLowerCase()
    );
    setAssignLabNo(matchedLab ? (matchedLab.assignedTheme ? `${matchedLab.labName} • Theme: ${matchedLab.assignedTheme}` : matchedLab.labName) : 'Unassigned');
  };

  const openAssignModal = (rec: MergedRecord) => {
    setEditingAssignTeam(rec);
    const juryVal = rec.judge === 'Unassigned' ? '' : rec.judge;
    setAssignJuryName(juryVal);

    if (juryVal) {
      const matchedLab = labs.find(
        (l) => l.assignedJuryName && l.assignedJuryName.toLowerCase() === juryVal.toLowerCase()
      );
      setAssignLabNo(matchedLab ? matchedLab.labName : rec.labNo);
    } else {
      setAssignLabNo(rec.labNo === 'Unassigned' ? '' : rec.labNo);
    }

    // Populate existing evaluation scores for editing
    const evalRec = rec.evaluations.length > 0 ? rec.evaluations[0] : null;
    const r = evalRec?.rubric || ({} as any);
    setEditConcept(r.conceptStrength ?? 0);
    setEditBuild(r.buildIntelligence ?? 0);
    setEditDelivery(r.deliveryImpact ?? 0);
    setEditDefense(r.liveDefenseScore ?? 0);
    setEditComm(r.communication ?? 0);
    setEditFeedback(evalRec?.feedback || evalRec?.remarks || '');

    setAssignErrorMsg('');
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignTeam) return;

    setAssigning(true);
    setAssignErrorMsg('');
    setSuccessMsg('');

    const isLabLocked = editingAssignTeam.labNo && editingAssignTeam.labNo !== 'Unassigned';
    const totalScore = editConcept + editBuild + editDelivery + editDefense + editComm;

    // 1. Update Team attributes (Score & Judge/Lab if unlocked)
    const teamUpdates: Record<string, any> = {
      score: totalScore,
    };

    if (!isLabLocked) {
      teamUpdates.judge = assignJuryName;
      teamUpdates.labNo = assignLabNo;
      teamUpdates.assignedLabName = assignLabNo;
    }

    const teamRes = await updateTeamAdmin(editingAssignTeam.teamId, teamUpdates);

    // 2. Save evaluation record (rubric breakdown & total score)
    const evalRec = editingAssignTeam.evaluations.length > 0 ? editingAssignTeam.evaluations[0] : null;
    const evalPayload = {
      id: evalRec?.id || `prelims_${(assignJuryName || 'admin').toLowerCase().replace(/\s+/g, '_')}_${editingAssignTeam.teamId}`,
      round: 'prelims',
      teamName: editingAssignTeam.teamName,
      displayId: editingAssignTeam.displayId,
      teamId: editingAssignTeam.teamId,
      juryId: evalRec?.juryId || (assignJuryName || 'admin').toLowerCase().replace(/\s+/g, '_'),
      juryName: isLabLocked ? (editingAssignTeam.judge || 'Jury') : (assignJuryName || evalRec?.juryName || 'Admin'),
      rubric: {
        conceptStrength: editConcept,
        buildIntelligence: editBuild,
        deliveryImpact: editDelivery,
        liveDefenseScore: editDefense,
        communication: editComm,
      },
      totalScore,
      feedback: editFeedback.trim(),
      remarks: editFeedback.trim(),
      selectedForFinal: evalRec?.selectedForFinal || false,
      selectionReason: evalRec?.selectionReason || '',
      isFrozen: true,
    };

    const evalRes = await upsertEvalRecordAdmin('prelims', evalPayload);

    if (teamRes.success && evalRes.success) {
      setSuccessMsg(`Updated assignment & score for team "${editingAssignTeam.teamName}"`);
      setEditingAssignTeam(null);
      await loadData();
    } else {
      setAssignErrorMsg(teamRes.error || evalRes.error || 'Failed to update assignment & score');
    }

    setAssigning(false);
  };

  const filteredRecords = mergedRecords.filter((rec) =>
    rec.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.teamId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.judge.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.labNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !mergedRecords.length) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500 font-bold font-mono">Loading Prelims Round Data...</div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Sub-tabs Switcher */}
      <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold text-gray-900">Prelims Round</h2>
              <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded border border-purple-200">
                📄 PPT Submitted Teams Only ({mergedRecords.length})
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Manage score evaluations, Jury assignments, and select finalists for promotion to the Final Round.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search team, jury, lab..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 md:w-64 bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-blue-600 border border-gray-300 rounded-sm text-sm font-bold transition duration-200"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Sub-tabs Segment Control */}
        <div className="border-t border-gray-100 pt-4 flex items-center gap-2">
          <button
            onClick={() => setSubTab('scores')}
            className={`px-4 py-2 text-xs font-bold rounded transition ${
              subTab === 'scores'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            📊 Prelims Round Score Details
          </button>
          <button
            onClick={() => setSubTab('selection')}
            className={`px-4 py-2 text-xs font-bold rounded transition flex items-center gap-1.5 ${
              subTab === 'selection'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <span>🌟 Final Round Selection</span>
            <span className="bg-white/20 text-current px-1.5 py-0.5 rounded-full text-[10px]">
              {selectedFinalistIds.size}
            </span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-sm font-medium flex justify-between items-center shadow-sm">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 font-bold">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* SUB-TAB 1: PRELIMS ROUND SCORE DETAILS */}
      {subTab === 'scores' && (
        <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Rank</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Display ID</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Team Name</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Jury Name</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Lab No.</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Evals</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Score (/50)</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500 text-sm">
                      No prelims scores or teams found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, idx) => (
                    <tr key={rec.teamId} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3.5 text-center font-bold text-gray-400 text-xs">#{idx + 1}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-700 text-xs">{rec.displayId}</td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">{rec.teamName}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">
                        {rec.judge !== 'Unassigned' ? (
                          <span className="text-gray-900 font-semibold">{rec.judge}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 font-mono">
                        {rec.labNo !== 'Unassigned' ? (
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-semibold border border-gray-200">{rec.labNo}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
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
                      <td className="px-4 py-3.5 text-center font-extrabold text-blue-700 text-base">{rec.totalScore} / 50</td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openAssignModal(rec)}
                          className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1 rounded-sm text-xs font-bold transition"
                        >
                          Assign / Edit
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FINAL ROUND SELECTION */}
      {subTab === 'selection' && (
        <div className="space-y-4">
          {/* Action Header Card */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div>
              <h4 className="text-sm font-bold text-purple-900 uppercase tracking-wider">🌟 Final Round Selected Finalists ({selectedFinalistIds.size})</h4>
              <p className="text-xs text-purple-700 mt-0.5">
                Review Jury recommendations below. Add or remove teams from the finalist list and click <strong>Publish Finalists</strong> to promote them to the next round.
              </p>
            </div>
            <button
              onClick={handlePublishFinalists}
              disabled={publishing}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-extrabold transition shadow-md disabled:opacity-50 shrink-0"
            >
              {publishing ? 'Publishing...' : `🚀 Publish ${selectedFinalistIds.size} Finalists`}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">SI No</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Display ID</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Team Name</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Theme</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Lab No.</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Jury Nominated</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Jury Recommendation Reason</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Score</th>
                    <th className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Finalist Selection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500 text-sm">
                        No teams found.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec, idx) => {
                      const isSelected = selectedFinalistIds.has(rec.teamId);

                      return (
                        <tr key={rec.teamId} className={isSelected ? 'bg-purple-50/60 font-medium' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3.5 text-center font-bold text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-3.5 font-mono font-bold text-purple-900">{rec.displayId}</td>
                          <td className="px-4 py-3.5 font-bold text-gray-900 text-sm">{rec.teamName}</td>
                          <td className="px-4 py-3.5 text-gray-600 max-w-xs truncate">{rec.theme}</td>
                          <td className="px-4 py-3.5 text-gray-700 font-mono">{rec.labNo || 'Unassigned'}</td>
                          <td className="px-4 py-3.5">
                            {rec.selectedForFinal ? (
                              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">
                                🌟 Nominated by {rec.judge || 'Jury'}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-[10px]">Not Nominated</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-gray-700 max-w-xs leading-relaxed">
                            {rec.selectionReason || '—'}
                          </td>
                          <td className="px-4 py-3.5 text-center font-extrabold text-blue-700 text-sm">{rec.totalScore} / 50</td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleToggleFinalist(rec.teamId)}
                              className={`px-3 py-1.5 text-xs font-bold rounded transition ${
                                isSelected
                                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                              }`}
                            >
                              {isSelected ? '✓ Finalist Selected' : '+ Select Team'}
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
        </div>
      )}

      {/* ASSIGN JURY, LAB NO. & EDIT MARKS MODAL */}
      {editingAssignTeam && (() => {
        const isLabLocked = editingAssignTeam.labNo && editingAssignTeam.labNo !== 'Unassigned';

        return (
          <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white border border-gray-200 rounded-sm p-6 w-full max-w-lg shadow-xl my-8">
              <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Assign Jury, Lab &amp; Update Marks</h3>
                  <p className="text-xs text-gray-500 font-semibold">{editingAssignTeam.teamName} ({editingAssignTeam.displayId})</p>
                </div>
                <button
                  onClick={() => setEditingAssignTeam(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
                >
                  ✕
                </button>
              </div>

              {assignErrorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs font-medium">
                  {assignErrorMsg}
                </div>
              )}

              {/* Lab Locked Warning */}
              {isLabLocked && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-sm text-xs font-semibold flex items-start gap-2.5">
                  <span className="text-base">🔒</span>
                  <div>
                    <p className="font-bold">Lab Location Assigned &amp; Locked</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Lab location is assigned to <strong>"{editingAssignTeam.labNo}"</strong> with Jury <strong>"{editingAssignTeam.judge}"</strong>. Once a lab is assigned, it cannot be modified or re-assigned.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveAssignment} className="space-y-4">
                {/* Jury & Lab Selection Section */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Predefined Jury {isLabLocked ? '(Locked)' : '*'}</label>
                    <select
                      value={assignJuryName}
                      disabled={Boolean(isLabLocked)}
                      onChange={(e) => handleJurySelectChange(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      required={!isLabLocked}
                    >
                      <option value="">-- Select Predefined Jury --</option>
                      {juriesList.map((j) => (
                        <option key={j.id} value={j.name}>
                          {j.name} {j.institution ? `(${j.institution})` : j.email ? `(${j.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Lab No. (Auto-assigned based on Jury)</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={assignLabNo || 'Unassigned'}
                      className="w-full bg-gray-100 border border-gray-300 rounded-sm px-3 py-2 text-sm font-bold text-gray-800 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Automatically linked from Timeline 3 Lab configuration.</p>
                  </div>
                </div>

                {/* Rubric Score Editing Section */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">✏️ Update Team Marks &amp; Rubric Breakdown</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Concept Strength (Max 12)</label>
                      <input type="number" min={0} max={12} value={editConcept} onChange={(e) => setEditConcept(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs font-bold text-center" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Build Intelligence (Max 12)</label>
                      <input type="number" min={0} max={12} value={editBuild} onChange={(e) => setEditBuild(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs font-bold text-center" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Delivery Impact (Max 8)</label>
                      <input type="number" min={0} max={8} value={editDelivery} onChange={(e) => setEditDelivery(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs font-bold text-center" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Live Defense (Max 8)</label>
                      <input type="number" min={0} max={8} value={editDefense} onChange={(e) => setEditDefense(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs font-bold text-center" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Communication (Max 10)</label>
                    <input type="number" min={0} max={10} value={editComm} onChange={(e) => setEditComm(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs font-bold text-center" />
                  </div>

                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded flex justify-between items-center font-bold text-blue-900 text-xs">
                    <span>Calculated Total Score:</span>
                    <span className="text-sm font-extrabold text-blue-700">{editConcept + editBuild + editDelivery + editDefense + editComm} / 50</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Remarks / Feedback</label>
                    <textarea rows={2} value={editFeedback} onChange={(e) => setEditFeedback(e.target.value)}
                      placeholder="Enter evaluation feedback..."
                      className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-xs" />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAssignTeam(null)}
                    disabled={assigning}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm text-sm font-bold transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigning}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm text-sm font-bold transition disabled:opacity-50"
                  >
                    {assigning ? 'Saving...' : 'Save Assignment & Marks'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* POPUP DETAILS MODAL */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-sm p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedTeam.teamName} - Prelims Scores</h3>
                <p className="text-sm text-gray-500">Total Score: <span className="font-bold text-gray-900">{selectedTeam.totalScore} / 50</span></p>
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
                    <div className="bg-gray-50 p-3 rounded-sm border border-gray-200 text-sm text-gray-700 mb-3">
                      <span className="font-semibold text-gray-900 block mb-1">Remarks / Feedback:</span>
                      {evalRecord.remarks}
                    </div>
                  )}
                  {evalRecord.selectedForFinal && (
                    <div className="bg-purple-50 p-3 rounded-sm border border-purple-200 text-xs text-purple-900">
                      <span className="font-bold block mb-1">🌟 Nominated for Final Round:</span>
                      {evalRecord.selectionReason || 'No specific reason provided.'}
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
