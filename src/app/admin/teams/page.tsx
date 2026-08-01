'use client';

import React, { useState, useEffect } from 'react';
import { verifyAdminSession, getAllTeamsAdmin, AdminTeamData } from '@/app/admin/actions';

export default function AdminTeamsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [teams, setTeams] = useState<AdminTeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Popup state
  const [selectedTeam, setSelectedTeam] = useState<AdminTeamData | null>(null);

  const loadTeams = async () => {
    setLoading(true);
    setErrorMsg('');
    const res = await getAllTeamsAdmin();
    if (res.success && res.teams) {
      setTeams(res.teams);
    } else {
      setErrorMsg(res.error || 'Failed to load teams');
    }
    setLoading(false);
  };

  const checkSession = async () => {
    const valid = await verifyAdminSession();
    setIsAuthenticated(valid);
    if (valid) {
      loadTeams();
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const filteredTeams = teams.filter(t => 
    t.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.leadEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.leadData?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !teams.length) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500 font-bold">Loading Teams...</div>
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
          <h2 className="text-2xl font-bold text-gray-900">Team Details</h2>
          <p className="text-sm text-gray-500 mt-1">View registered hackathon teams and their details.</p>
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
            onClick={loadTeams}
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Lead Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Lead Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Members</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No teams found.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-bold text-gray-900">{team.teamName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{team.leadEmail}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{team.leadData?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{team.membersData?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedTeam(team)}
                        className="text-blue-600 hover:text-blue-800 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-sm text-xs font-bold transition"
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
          <div className="bg-white border border-gray-200 rounded-sm p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedTeam.teamName}</h3>
                <p className="text-sm text-gray-500 font-mono">{selectedTeam.leadEmail}</p>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Problem Statement</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-sm border border-gray-200">
                  {selectedTeam.problemStatement}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Team Lead</h4>
                <div className="bg-white border border-gray-200 p-4 rounded-sm grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Name:</span> <span className="font-semibold">{selectedTeam.leadData?.name || 'N/A'}</span></div>
                  <div><span className="text-gray-500">Phone:</span> <span className="font-mono">{selectedTeam.leadData?.contactNumber || 'N/A'}</span></div>
                  <div><span className="text-gray-500">Dept:</span> {selectedTeam.leadData?.department || 'N/A'}</div>
                  <div><span className="text-gray-500">Year/Sec:</span> {selectedTeam.leadData?.year || 'N/A'} - {selectedTeam.leadData?.section || 'N/A'}</div>
                  <div className="col-span-2"><span className="text-gray-500">Batch:</span> {selectedTeam.leadData?.batchNumber || 'N/A'}</div>
                </div>
              </div>

              {selectedTeam.membersData && selectedTeam.membersData.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Team Members ({selectedTeam.membersData.length})</h4>
                  <div className="space-y-2">
                    {selectedTeam.membersData.map((member, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 p-3 rounded-sm text-sm">
                        <div className="font-semibold text-gray-900 mb-1">{member.name || `Member ${idx + 1}`}</div>
                        <div className="text-gray-600 flex gap-4">
                          <span>Dept: {member.department || 'N/A'}</span>
                          <span>Year/Sec: {member.year || 'N/A'} - {member.section || 'N/A'}</span>
                          <span>Batch: {member.batchNumber || 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
