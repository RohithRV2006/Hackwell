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
  AdminScoreData,
  LabData,
  JuryOption,
} from '@/app/admin/actions';

interface MergedRecord {
  teamId: string;
  teamName: string;
  problemStatement: string;
  judge: string;
  labNo: string;
  evaluations: AdminScoreData[];
  isEvaluated: boolean;
  totalScore: number;
}

export default function AdminPrelimsScoresPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mergedRecords, setMergedRecords] = useState<MergedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Team for details popup
  const [selectedTeam, setSelectedTeam] = useState<MergedRecord | null>(null);

  // Assignment Modal State (Jury Name & Lab No.)
  const [editingAssignTeam, setEditingAssignTeam] = useState<MergedRecord | null>(null);
  const [assignJuryName, setAssignJuryName] = useState('');
  const [assignLabNo, setAssignLabNo] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignErrorMsg, setAssignErrorMsg] = useState('');

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

      const merged: MergedRecord[] = pptQualifiedTeams.map((team) => {
        const teamScores = scores.filter((s) => s.teamId === team.id);
        const totalScore = teamScores.length > 0 ? (teamScores[0].totalScore || 0) : 0;

        const evaluatedJuryName = teamScores.length > 0 ? (teamScores[0].juryName || teamScores[0].juryId) : '';
        const resolvedJudge = (team.judge && team.judge !== 'Unassigned') ? team.judge : (evaluatedJuryName || 'Unassigned');

        return {
          teamId: team.id,
          teamName: team.teamName,
          problemStatement: team.problemStatement,
          judge: resolvedJudge,
          labNo: team.labNo || 'Unassigned',
          evaluations: teamScores,
          isEvaluated: teamScores.length > 0,
          totalScore,
        };
      });

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

  const handleJurySelectChange = (selectedJuryName: string) => {
    setAssignJuryName(selectedJuryName);
    if (!selectedJuryName) {
      setAssignLabNo('');
      return;
    }

    // Auto-find Lab assigned to this Jury
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

    setAssignErrorMsg('');
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignTeam) return;

    setAssigning(true);
    setAssignErrorMsg('');
    setSuccessMsg('');

    const res = await updateTeamAdmin(editingAssignTeam.teamId, {
      judge: assignJuryName,
      labNo: assignLabNo,
    });

    if (res.success) {
      setSuccessMsg(`Updated Jury & Lab No. for team "${editingAssignTeam.teamName}"`);
      setEditingAssignTeam(null);
      await loadData();
    } else {
      setAssignErrorMsg(res.error || 'Failed to update assignment');
    }

    setAssigning(false);
  };

  const filteredRecords = mergedRecords.filter((rec) =>
    rec.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.teamId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.judge.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.labNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !mergedRecords.length) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500 font-bold">Loading Scores...</div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-sm border border-gray-200 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-gray-900">Prelims Round</h2>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded border border-purple-200">
              📄 PPT Submitted Teams Only ({mergedRecords.length})
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Manage Jury assignments, Lab locations, and view evaluation scores for PPT-submitted teams in the Prelims round.</p>
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

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-sm font-medium flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 font-bold">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-gray-50 border border-gray-300 text-gray-700 rounded-sm text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* TABLE VIEW */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Team Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Jury Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Lab No.</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Evals Count</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Score (/50)</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No prelims scores or teams found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.teamId} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-bold text-gray-900">{rec.teamName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                      {rec.judge !== 'Unassigned' ? (
                        <span className="text-gray-900 font-semibold">{rec.judge}</span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-mono">
                      {rec.labNo !== 'Unassigned' ? (
                        <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-semibold border border-gray-200">{rec.labNo}</span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {rec.isEvaluated ? (
                        <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded-sm text-xs font-bold border border-blue-200">Evaluated</span>
                      ) : (
                        <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-sm text-xs font-bold border border-gray-200">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{rec.evaluations.length}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{rec.totalScore} / 50</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openAssignModal(rec)}
                        className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-sm text-xs font-bold transition"
                      >
                        Assign / Edit
                      </button>
                      <button
                        onClick={() => setSelectedTeam(rec)}
                        disabled={!rec.isEvaluated}
                        className={`px-3 py-1.5 rounded-sm text-xs font-bold transition border ${
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

      {/* ASSIGN JURY & LAB NO. MODAL */}
      {editingAssignTeam && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-sm p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign Jury & Lab No.</h3>
                <p className="text-xs text-gray-500 font-semibold">{editingAssignTeam.teamName}</p>
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

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Predefined Jury *</label>
                <select
                  value={assignJuryName}
                  onChange={(e) => handleJurySelectChange(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-sm px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
                  required
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
                  {assigning ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <div className="bg-gray-50 p-3 rounded-sm border border-gray-200 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900 block mb-1">Remarks / Feedback:</span>
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
