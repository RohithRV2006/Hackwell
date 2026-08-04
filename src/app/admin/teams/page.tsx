'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyAdminSession, getAllTeamsAdmin, updateTeamAdmin, applyPptFilterAdmin, resetPrelimsFiltersAndAssignmentsAdmin, AdminTeamData, Lead, Member } from '@/app/admin/actions';

export default function AdminTeamsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [teams, setTeams] = useState<AdminTeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filterApplying, setFilterApplying] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'eliminated'>('all');

  const router = useRouter();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // View Popup state
  const [selectedTeam, setSelectedTeam] = useState<AdminTeamData | null>(null);

  // Edit Modal state
  const [editingTeam, setEditingTeam] = useState<AdminTeamData | null>(null);
  const [editFormData, setEditFormData] = useState<{
    teamName: string;
    problemStatement: string;
    leadEmail: string;
    leadData: Lead;
    membersData: Member[];
  }>({
    teamName: '',
    problemStatement: '',
    leadEmail: '',
    leadData: { name: '', contactNumber: '', batchNumber: '', department: '', year: '', section: '' },
    membersData: [],
  });
  const [saving, setSaving] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');

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

  const openEditModal = (team: AdminTeamData) => {
    setSelectedTeam(null);
    setEditingTeam(team);
    setEditErrorMsg('');
    setEditFormData({
      teamName: team.teamName || '',
      problemStatement: team.problemStatement || '',
      leadEmail: team.leadEmail || '',
      leadData: {
        name: team.leadData?.name || '',
        contactNumber: team.leadData?.contactNumber || '',
        batchNumber: team.leadData?.batchNumber || '',
        department: team.leadData?.department || '',
        year: team.leadData?.year || '',
        section: team.leadData?.section || '',
      },
      membersData: team.membersData
        ? team.membersData.map((m) => ({
            name: m.name || '',
            batchNumber: m.batchNumber || '',
            department: m.department || '',
            year: m.year || '',
            section: m.section || '',
          }))
        : [],
    });
  };

  const handleLeadChange = (field: keyof Lead, value: string) => {
    setEditFormData((prev) => ({
      ...prev,
      leadData: { ...prev.leadData, [field]: value },
    }));
  };

  const handleMemberChange = (index: number, field: keyof Member, value: string) => {
    setEditFormData((prev) => {
      const updatedMembers = [...prev.membersData];
      updatedMembers[index] = { ...updatedMembers[index], [field]: value };
      return { ...prev, membersData: updatedMembers };
    });
  };

  const addMember = () => {
    if (editFormData.membersData.length >= 3) return;
    setEditFormData((prev) => ({
      ...prev,
      membersData: [
        ...prev.membersData,
        { name: '', batchNumber: '', department: '', year: '', section: '' },
      ],
    }));
  };

  const removeMember = (index: number) => {
    setEditFormData((prev) => ({
      ...prev,
      membersData: prev.membersData.filter((_, i) => i !== index),
    }));
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    if (!editFormData.teamName.trim()) {
      setEditErrorMsg('Team Name cannot be empty.');
      return;
    }

    setSaving(true);
    setEditErrorMsg('');
    setSuccessMsg('');

    const res = await updateTeamAdmin(editingTeam.id, {
      teamName: editFormData.teamName,
      problemStatement: editFormData.problemStatement,
      leadEmail: editFormData.leadEmail,
      leadData: editFormData.leadData,
      membersData: editFormData.membersData,
    });

    if (res.success) {
      setSuccessMsg(`Team "${editFormData.teamName}" details updated successfully!`);
      setEditingTeam(null);
      await loadTeams();
    } else {
      setEditErrorMsg(res.error || 'Failed to update team details');
    }

    setSaving(false);
  };

  const handleRunPptFilter = async () => {
    if (!confirm('Are you sure you want to mark all teams without a PPT presentation as Eliminated? This will restrict them from advancing to the Prelims round.')) {
      return;
    }
    setFilterApplying(true);
    setErrorMsg('');
    setSuccessMsg('');
    const res = await applyPptFilterAdmin();
    if (res.success) {
      setSuccessMsg(`PPT filter applied! ${res.passed} teams qualified for Prelims, ${res.failed} unsubmitted teams marked as Eliminated.`);
      await loadTeams();
    } else {
      setErrorMsg(res.error || 'Failed to apply PPT filter.');
    }
    setFilterApplying(false);
  };

  const handleResetPrelimsFilters = async () => {
    if (!confirm('Undo/reset all Prelims filters and team assignments? This will clear disqualifications and reset team lab/jury allocations without deleting any team, jury, or lab data.')) {
      return;
    }
    setFilterApplying(true);
    setErrorMsg('');
    setSuccessMsg('');
    const res = await resetPrelimsFiltersAndAssignmentsAdmin();
    if (res.success) {
      setSuccessMsg(`🔄 Undone all Prelims filters and team assignments successfully! ${res.resetCount} teams reset.`);
      await loadTeams();
    } else {
      setErrorMsg(res.error || 'Failed to reset prelims filters.');
    }
    setFilterApplying(false);
  };

  const submittedCount = teams.filter(t => t.pptLink && String(t.pptLink).trim().length > 0).length;
  const eliminatedCount = teams.filter(t => !t.pptLink || String(t.pptLink).trim().length === 0).length;

  const filteredTeams = teams.filter((t) => {
    const matchesSearch = t.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.leadEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.leadData?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const hasPpt = Boolean(t.pptLink && String(t.pptLink).trim().length > 0);

    if (statusFilter === 'submitted') return matchesSearch && hasPpt;
    if (statusFilter === 'eliminated') return matchesSearch && !hasPpt;
    return matchesSearch;
  });

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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-sm border border-gray-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management &amp; Prelims Filter</h2>
          <p className="text-sm text-gray-500 mt-1">View registered teams, verify PPT submissions, and filter qualified teams for Prelims.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
          <button
            onClick={handleResetPrelimsFilters}
            disabled={filterApplying}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-sm text-sm font-bold transition duration-200 disabled:opacity-50"
          >
            🔄 Reset Prelims Filters
          </button>
          <button
            onClick={handleRunPptFilter}
            disabled={filterApplying}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-sm text-sm font-bold transition duration-200 shadow-sm disabled:opacity-50"
          >
            {filterApplying ? 'Processing...' : '⚡ Apply PPT Filter'}
          </button>
        </div>
      </div>

      {/* Filter Tabs & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-sm border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-sm text-xs font-bold transition ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All Teams ({teams.length})
          </button>
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-4 py-2 rounded-sm text-xs font-bold transition ${statusFilter === 'submitted' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
          >
            ✅ Qualified (PPT Uploaded: {submittedCount})
          </button>
          <button
            onClick={() => setStatusFilter('eliminated')}
            className={`px-4 py-2 rounded-sm text-xs font-bold transition ${statusFilter === 'eliminated' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'}`}
          >
            ❌ Eliminated (No PPT: {eliminatedCount})
          </button>
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Only teams with submitted PPTs can be assigned to Prelims labs/juries.
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-sm font-medium flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 font-bold">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-sm font-medium">
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">PPT Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
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
                    <td className="px-6 py-4 text-sm">
                      {team.pptLink ? (
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-xs font-bold">
                            Submitted
                          </span>
                          <a
                            href={team.pptLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded transition"
                          >
                            📄 Open PPT
                          </a>
                        </div>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded text-xs font-semibold">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedTeam(team)}
                        className="text-blue-600 hover:text-blue-800 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-sm text-xs font-bold transition"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => openEditModal(team)}
                        className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-sm text-xs font-bold transition"
                      >
                        Edit Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
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
                {selectedTeam.theme && (
                  <div className="mt-2 text-xs font-semibold text-purple-800 bg-purple-50 p-2 rounded-sm border border-purple-200">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-purple-600 block mb-0.5">PS Theme:</span>
                    {selectedTeam.theme}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Prelims Round Allocation</h4>
                <div className="bg-indigo-50/60 p-4 rounded-sm border border-indigo-200 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-indigo-700 font-bold block mb-0.5">Assigned Lab</span>
                    <span className="font-extrabold text-indigo-950 text-sm">{selectedTeam.labNo || selectedTeam.assignedLabName || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-indigo-700 font-bold block mb-0.5">Assigned Jury</span>
                    <span className="font-extrabold text-indigo-950 text-sm">{selectedTeam.judge || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">PPT Presentation</h4>
                {selectedTeam.pptLink ? (
                  <div className="bg-purple-50 p-4 rounded-sm border border-purple-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-purple-900 text-sm block">Presentation Uploaded</span>
                      <span className="text-xs text-purple-700">File link synced from student submission portal.</span>
                    </div>
                    <a
                      href={selectedTeam.pptLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-sm text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                    >
                      🔗 Open in Google Drive
                    </a>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3.5 rounded-sm border border-gray-200 text-sm text-gray-500 font-medium">
                    No presentation uploaded yet (Pending).
                  </div>
                )}
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
                        <div className="text-gray-600 flex flex-wrap gap-4">
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

            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => openEditModal(selectedTeam)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm text-sm font-bold transition"
              >
                Edit Details
              </button>
              <button
                onClick={() => setSelectedTeam(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-sm text-sm font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TEAM DETAILS MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-sm p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Edit Team Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">Modify personal information, problem statement, and member details for <span className="font-semibold text-gray-700">{editingTeam.teamName}</span>.</p>
              </div>
              <button
                onClick={() => setEditingTeam(null)}
                className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {editErrorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs font-medium">
                {editErrorMsg}
              </div>
            )}

            <form onSubmit={handleSaveDetails} className="space-y-6">
              {/* TEAM BASIC INFO */}
              <div className="bg-gray-50 p-4 rounded-sm border border-gray-200 space-y-4">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">General Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Team Name</label>
                    <input
                      type="text"
                      value={editFormData.teamName}
                      onChange={(e) => setEditFormData({ ...editFormData, teamName: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Lead Email</label>
                    <input
                      type="email"
                      value={editFormData.leadEmail}
                      onChange={(e) => setEditFormData({ ...editFormData, leadEmail: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Problem Statement</label>
                  <textarea
                    rows={2}
                    value={editFormData.problemStatement}
                    onChange={(e) => setEditFormData({ ...editFormData, problemStatement: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* TEAM LEAD DETAILS */}
              <div className="bg-white p-4 rounded-sm border border-gray-200 space-y-4">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-blue-600">Team Lead Personal Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editFormData.leadData.name}
                      onChange={(e) => handleLeadChange('name', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number</label>
                    <input
                      type="text"
                      value={editFormData.leadData.contactNumber}
                      onChange={(e) => handleLeadChange('contactNumber', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                    <input
                      type="text"
                      value={editFormData.leadData.department}
                      onChange={(e) => handleLeadChange('department', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={editFormData.leadData.batchNumber}
                      onChange={(e) => handleLeadChange('batchNumber', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
                    <input
                      type="text"
                      value={editFormData.leadData.year}
                      onChange={(e) => handleLeadChange('year', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Section</label>
                    <input
                      type="text"
                      value={editFormData.leadData.section}
                      onChange={(e) => handleLeadChange('section', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* TEAM MEMBERS DETAILS */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Team Members ({editFormData.membersData.length})
                  </h4>
                  {editFormData.membersData.length < 3 && (
                    <button
                      type="button"
                      onClick={addMember}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                    >
                      + Add Member
                    </button>
                  )}
                </div>

                {editFormData.membersData.map((member, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-sm border border-gray-200 space-y-3 relative">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-xs font-bold text-gray-700">Member #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeMember(idx)}
                        className="text-xs text-red-600 hover:text-red-800 font-bold"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-0.5">Name</label>
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-0.5">Department</label>
                        <input
                          type="text"
                          value={member.department}
                          onChange={(e) => handleMemberChange(idx, 'department', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-0.5">Batch Number</label>
                        <input
                          type="text"
                          value={member.batchNumber}
                          onChange={(e) => handleMemberChange(idx, 'batchNumber', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-0.5">Year</label>
                          <input
                            type="text"
                            value={member.year}
                            onChange={(e) => handleMemberChange(idx, 'year', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-0.5">Section</label>
                          <input
                            type="text"
                            value={member.section}
                            onChange={(e) => handleMemberChange(idx, 'section', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm text-sm font-bold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm text-sm font-bold transition disabled:opacity-50"
                >
                  {saving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
