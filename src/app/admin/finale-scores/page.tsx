'use client';

import React, { useState, useEffect } from 'react';
import {
  verifyAdminSession,
  getAllEvaluationsAdmin,
  getAllTeamsAdmin,
  AdminScoreData,
} from '@/app/admin/actions';

interface MergedRecord {
  teamId: string;
  teamName: string;
  problemStatement: string;
  evaluations: AdminScoreData[];
  isEvaluated: boolean;
  totalAvgScore: number;
}

export default function AdminFinaleScoresPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mergedRecords, setMergedRecords] = useState<MergedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Team for details popup
  const [selectedTeam, setSelectedTeam] = useState<MergedRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    
    const [resScores, resTeams] = await Promise.all([
      getAllEvaluationsAdmin('finaleEvaluations'),
      getAllTeamsAdmin(),
    ]);

    if (resScores.success && resTeams.success) {
      const scores = resScores.scores || [];
      const teams = resTeams.teams || [];

      const merged: MergedRecord[] = teams.map((team) => {
        const teamScores = scores.filter((s) => s.teamId === team.id);
        const totalAvgScore = teamScores.length > 0 
          ? teamScores.reduce((acc, s) => acc + s.totalScore, 0) / teamScores.length 
          : 0;

        return {
          teamId: team.id,
          teamName: team.teamName,
          problemStatement: team.problemStatement,
          evaluations: teamScores,
          isEvaluated: teamScores.length > 0,
          totalAvgScore,
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
    checkSession();
  }, []);

  const filteredRecords = mergedRecords.filter((rec) =>
    rec.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.teamId.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h2 className="text-2xl font-bold text-gray-900">Finale Scores</h2>
          <p className="text-sm text-gray-500 mt-1">Aggregated scores from the finale round evaluations.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search teams..."
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Evals Count</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Score</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No finale scores found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.teamId} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-bold text-gray-900">{rec.teamName}</td>
                    <td className="px-6 py-4">
                      {rec.isEvaluated ? (
                        <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded-sm text-xs font-bold border border-blue-200">Evaluated</span>
                      ) : (
                        <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-sm text-xs font-bold border border-gray-200">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{rec.evaluations.length}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{rec.totalAvgScore.toFixed(1)} / 40</td>
                    <td className="px-6 py-4 text-right">
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

      {/* POPUP MODAL */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-sm p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedTeam.teamName} - Finale Scores</h3>
                <p className="text-sm text-gray-500">Average Score: <span className="font-bold text-gray-900">{selectedTeam.totalAvgScore.toFixed(1)}</span></p>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedTeam.evaluations.map((evalRecord, idx) => (
                <div key={evalRecord.id} className="bg-white border border-gray-200 rounded-sm p-4">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                    <span className="font-bold text-gray-900">Jury: {evalRecord.juryName}</span>
                    <span className="font-bold text-blue-600 text-lg">{evalRecord.totalScore} / 40</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-gray-500">Innovation</div>
                      <div className="font-semibold text-gray-900">{evalRecord.rubric.innovation}/10</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Feasibility</div>
                      <div className="font-semibold text-gray-900">{evalRecord.rubric.technicalFeasibility}/10</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Impact</div>
                      <div className="font-semibold text-gray-900">{evalRecord.rubric.impact}/10</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Presentation</div>
                      <div className="font-semibold text-gray-900">{evalRecord.rubric.presentation}/10</div>
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
