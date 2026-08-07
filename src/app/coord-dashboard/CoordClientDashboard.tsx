'use client';

import { useState, useEffect, useMemo } from 'react';
import LogoutButton from '@/components/LogoutButton';
import { Search, Filter, X } from 'lucide-react';

export default function CoordClientDashboard({ coordName, coordEmail, initialTeams }: { coordName: string; coordEmail: string; initialTeams: any[] }) {
  const [teams, setTeams] = useState<any[]>(initialTeams);
  const [searchTerm, setSearchTerm] = useState('');
  const [venueFilter, setVenueFilter] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  const venues = useMemo(() => {
    const vSet = new Set<string>();
    teams.forEach(t => {
      if (t.venue) vSet.add(t.venue);
    });
    return Array.from(vSet).sort();
  }, [teams]);

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const matchesSearch = 
        (team.teamDisplayId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (team.teamName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVenue = venueFilter ? team.venue === venueFilter : true;
      
      return matchesSearch && matchesVenue;
    });
  }, [teams, searchTerm, venueFilter]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coordinator Dashboard</h1>
            <div className="text-sm text-gray-500 mt-1">
              <span className="font-semibold text-gray-700">{coordName}</span> • {coordEmail}
            </div>
          </div>
          <div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by Team ID or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative flex-shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                className="block w-full pl-10 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none bg-white"
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
              >
                <option value="">All Venues</option>
                {venues.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-100/50">
                    Team ID
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-100/50">
                    Team Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-100/50">
                    Venue
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-100/50">
                    View Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No teams found.</td>
                  </tr>
                ) : (
                  filteredTeams.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {team.displayId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {team.teamName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {team.assignedLabName || team.labNo || team.venue || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedTeam(team)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md transition-colors"
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
      </main>

      {/* Team Details Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onClick={() => setSelectedTeam(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 relative">
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors z-10"
                >
                  <X className="h-6 w-6" />
                </button>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-xl leading-6 font-bold text-gray-900 mb-4" id="modal-title">
                      {selectedTeam.teamName} Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-gray-500 font-bold mb-1 text-xs uppercase tracking-wider">Team ID</p>
                        <p className="font-semibold text-gray-900 text-base">{selectedTeam.displayId || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-gray-500 font-bold mb-1 text-xs uppercase tracking-wider">Venue</p>
                        <p className="font-semibold text-gray-900 text-base">{selectedTeam.assignedLabName || selectedTeam.labNo || selectedTeam.venue || 'Not Assigned'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-gray-500 font-bold mb-1 text-xs uppercase tracking-wider">Lead Email</p>
                        <p className="font-semibold text-gray-900 text-base break-all">{selectedTeam.leadEmail || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-gray-500 font-bold mb-1 text-xs uppercase tracking-wider">Phone</p>
                        <p className="font-semibold text-gray-900 text-base break-all">{selectedTeam.leadData?.contactNumber || selectedTeam.leadData?.phone || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-100/80 px-4 py-2 border-b border-gray-200 font-bold text-gray-800 text-sm uppercase tracking-wider">
                        Problem Statement
                      </div>
                      <div className="p-4 text-gray-600 bg-white whitespace-pre-wrap">
                        {selectedTeam.problemStatement || 'No problem statement provided.'}
                      </div>
                    </div>

                    {/* Members Table */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Members</h4>
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-3">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                <th className="py-3 px-4">Role</th>
                                <th className="py-3 px-4">Name</th>
                                <th className="py-3 px-4">Batch</th>
                                <th className="py-3 px-4">Dept</th>
                                <th className="py-3 px-4">Year</th>
                                <th className="py-3 px-4">Section</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                              {selectedTeam.leadData && (
                                <tr className="hover:bg-gray-50 transition">
                                  <td className="py-3 px-4"><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">LEAD</span></td>
                                  <td className="py-3 px-4 font-semibold text-gray-900">{selectedTeam.leadData.name || '-'}</td>
                                  <td className="py-3 px-4 text-gray-600">{selectedTeam.leadData.batchNumber || '-'}</td>
                                  <td className="py-3 px-4 text-gray-600">{selectedTeam.leadData.department || '-'}</td>
                                  <td className="py-3 px-4 text-gray-600">{selectedTeam.leadData.year || '-'}</td>
                                  <td className="py-3 px-4 text-gray-600">{selectedTeam.leadData.section || '-'}</td>
                                </tr>
                              )}
                              
                              {selectedTeam.membersData && Array.isArray(selectedTeam.membersData) && selectedTeam.membersData.length > 0 ? (
                                selectedTeam.membersData.map((member: any, i: number) => (
                                  <tr key={i} className="hover:bg-gray-50 transition">
                                    <td className="py-3 px-4"><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">MEMBER</span></td>
                                    <td className="py-3 px-4 font-semibold text-gray-900">{member.name || '-'}</td>
                                    <td className="py-3 px-4 text-gray-600">{member.batchNumber || '-'}</td>
                                    <td className="py-3 px-4 text-gray-600">{member.department || '-'}</td>
                                    <td className="py-3 px-4 text-gray-600">{member.year || '-'}</td>
                                    <td className="py-3 px-4 text-gray-600">{member.section || '-'}</td>
                                  </tr>
                                ))
                              ) : (
                                !selectedTeam.leadData && (
                                  <tr>
                                    <td colSpan={6} className="py-4 px-4 text-center text-gray-500 italic">No members documented.</td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm transition-colors"
                  onClick={() => setSelectedTeam(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
