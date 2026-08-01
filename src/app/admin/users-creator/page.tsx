'use client';

import React, { useState, useEffect } from 'react';
import {
  getAllUsersAdmin,
  createJuryUser,
  createCoordinatorUser,
  deleteUserAdmin,
  AdminUser,
} from './actions';
import { verifyAdminSession } from '@/app/admin/actions';

type ActiveForm = 'jury' | 'coordinator';

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  admin:       { label: 'Admin',       className: 'bg-purple-100 text-purple-800 border border-purple-200' },
  jury:        { label: 'Jury',        className: 'bg-amber-100  text-amber-800  border border-amber-200'  },
  coordinator: { label: 'Coordinator', className: 'bg-blue-100   text-blue-800   border border-blue-200'   },
  team:        { label: 'Team',        className: 'bg-slate-100  text-slate-700  border border-slate-200'  },
};

function badgeFor(role: string) {
  return ROLE_BADGE[role] ?? { label: role, className: 'bg-gray-100 text-gray-600 border border-gray-200' };
}

export default function UsersCreatorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [users, setUsers]                     = useState<AdminUser[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [creating, setCreating]               = useState(false);
  const [errorMsg, setErrorMsg]               = useState('');
  const [successMsg, setSuccessMsg]           = useState('');

  // Active tab: which form to show
  const [activeForm, setActiveForm] = useState<ActiveForm>('jury');

  // Jury form
  const [juryName, setJuryName]               = useState('');
  const [juryInstitution, setJuryInstitution] = useState('');
  const [juryEmail, setJuryEmail]             = useState('');
  const [juryPassword, setJuryPassword]       = useState('');

  // Coordinator form
  const [coordName, setCoordName]             = useState('');
  const [coordDept, setCoordDept]             = useState('');
  const [coordEmail, setCoordEmail]           = useState('');
  const [coordPassword, setCoordPassword]     = useState('');

  useEffect(() => { checkSession(); }, []);

  const checkSession = async () => {
    const valid = await verifyAdminSession();
    setIsAuthenticated(valid);
    if (valid) loadUsers();
  };

  const loadUsers = async () => {
    setLoading(true);
    const res = await getAllUsersAdmin();
    if (res.success && res.users) setUsers(res.users);
    else setErrorMsg(res.error || 'Failed to load users');
    setLoading(false);
  };

  const clearMessages = () => { setErrorMsg(''); setSuccessMsg(''); };

  /* ── Jury submit ────────────────────────────────────────────── */
  const handleCreateJury = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setCreating(true);
    const res = await createJuryUser(juryName, juryInstitution, juryEmail, juryPassword);
    setCreating(false);
    if (res.success) {
      setSuccessMsg(`Jury account for "${juryName}" (${juryEmail}) created successfully!`);
      setJuryName(''); setJuryInstitution(''); setJuryEmail(''); setJuryPassword('');
      loadUsers();
    } else {
      setErrorMsg(res.error || 'Failed to create jury account');
    }
  };

  /* ── Coordinator submit ─────────────────────────────────────── */
  const handleCreateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setCreating(true);
    const res = await createCoordinatorUser(coordName, coordDept, coordEmail, coordPassword);
    setCreating(false);
    if (res.success) {
      setSuccessMsg(`Coordinator account for "${coordName}" (${coordEmail}) created successfully!`);
      setCoordName(''); setCoordDept(''); setCoordEmail(''); setCoordPassword('');
      loadUsers();
    } else {
      setErrorMsg(res.error || 'Failed to create coordinator account');
    }
  };

  /* ── Delete ─────────────────────────────────────────────────── */
  const handleDeleteUser = async (email: string, role: string) => {
    if (!confirm(`Delete ${role} account "${email}"?\nThis action is permanent and cannot be undone.`)) return;
    clearMessages();
    setLoading(true);
    const res = await deleteUserAdmin(email);
    if (res.success) {
      setSuccessMsg(`Account "${email}" deleted successfully.`);
      loadUsers();
    } else {
      setErrorMsg(res.error || 'Failed to delete user');
      setLoading(false);
    }
  };

  /* ── Auth guards ────────────────────────────────────────────── */
  if (isAuthenticated === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center text-red-600 font-bold text-xl">
        Access Denied. You must be an administrator.
      </div>
    );
  }

  /* ── Filter users by role for stats ────────────────────────── */
  const juryCount = users.filter(u => u.role === 'jury').length;
  const coordCount = users.filter(u => u.role === 'coordinator').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

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

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Accounts</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Jury Members</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{juryCount}</p>
        </div>
        <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Coordinators</p>
          <p className="text-3xl font-extrabold text-blue-600 mt-1">{coordCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── LEFT: Form area ─────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md sticky top-24 overflow-hidden">

            {/* Form Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => { setActiveForm('jury'); clearMessages(); }}
                className={`flex-1 py-3.5 text-sm font-bold transition ${
                  activeForm === 'jury'
                    ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                ⚖️ Add Jury Member
              </button>
              <button
                onClick={() => { setActiveForm('coordinator'); clearMessages(); }}
                className={`flex-1 py-3.5 text-sm font-bold transition ${
                  activeForm === 'coordinator'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                🎓 Add Coordinator
              </button>
            </div>

            <div className="p-6">
              {/* ── JURY FORM ───────────────────────────────────── */}
              {activeForm === 'jury' && (
                <form onSubmit={handleCreateJury} className="space-y-4">
                  <p className="text-xs text-gray-400 -mt-1 mb-2">
                    Creates a login account for the jury member and stores their profile in the database.
                  </p>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. A. Kumar"
                      value={juryName}
                      onChange={e => setJuryName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Institution / Organisation</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IIT Madras"
                      value={juryInstitution}
                      onChange={e => setJuryInstitution(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Login Email</label>
                    <input
                      type="email"
                      required
                      placeholder="jury@example.com"
                      value={juryEmail}
                      onChange={e => setJuryEmail(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Login Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                      value={juryPassword}
                      onChange={e => setJuryPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {creating ? 'Creating Jury Account...' : '⚖️ Create Jury Account'}
                  </button>
                </form>
              )}

              {/* ── COORDINATOR FORM ─────────────────────────────── */}
              {activeForm === 'coordinator' && (
                <form onSubmit={handleCreateCoordinator} className="space-y-4">
                  <p className="text-xs text-gray-400 -mt-1 mb-2">
                    Creates a login account for the coordinator and stores their profile in the database.
                  </p>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prof. R. Lakshmi"
                      value={coordName}
                      onChange={e => setCoordName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CSE, IT, AI&DS..."
                      value={coordDept}
                      onChange={e => setCoordDept(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Login Email</label>
                    <input
                      type="email"
                      required
                      placeholder="coordinator@college.ac.in"
                      value={coordEmail}
                      onChange={e => setCoordEmail(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Login Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                      value={coordPassword}
                      onChange={e => setCoordPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {creating ? 'Creating Coordinator Account...' : '🎓 Create Coordinator Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Users Table ─────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Registered User Accounts</h2>
              <button
                onClick={loadUsers}
                disabled={loading}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition"
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100">
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                        No accounts found in the database.
                      </td>
                    </tr>
                  ) : (
                    users.map(user => {
                      const badge = badgeFor(user.role);
                      return (
                        <tr key={user.email} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-gray-900">
                              {user.name || <span className="italic text-gray-400">—</span>}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{user.email}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {user.role === 'jury' && user.institution && (
                              <span>{user.institution}</span>
                            )}
                            {user.role === 'coordinator' && user.department && (
                              <span>Dept: {user.department}</span>
                            )}
                            {user.role === 'admin' && (
                              <span className="text-purple-600 font-medium">System Admin</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteUser(user.email, badge.label)}
                              className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                            >
                              Delete
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
      </div>
    </div>
  );
}
