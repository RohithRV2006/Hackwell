'use client';

import React, { useState, useEffect } from 'react';
import {
  getAllUsersAdmin,
  createJuryUser,
  createCoordinatorUser,
  createUserAdmin,
  deleteUserAdmin,
  AdminUser,
} from './actions';
import { useRouter } from 'next/navigation';
import { verifyAdminSession } from '@/app/admin/actions';

type ActiveForm = 'jury' | 'coordinator' | 'admin';

export default function UsersCreatorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const [successMsg, setSuccessMsg] = useState('');

  // Active tab: which form to show
  const [activeForm, setActiveForm] = useState<ActiveForm>('jury');

  // Jury form
  const [juryName, setJuryName] = useState('');
  const [juryInstitution, setJuryInstitution] = useState('');
  const [juryEmail, setJuryEmail] = useState('');
  const [juryPassword, setJuryPassword] = useState('');

  // Coordinator form
  const [coordName, setCoordName] = useState('');
  const [coordDept, setCoordDept] = useState('');
  const [coordEmail, setCoordEmail] = useState('');
  const [coordPassword, setCoordPassword] = useState('');

  // Admin form
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    const res = await getAllUsersAdmin();
    if (res.success && res.users) setUsers(res.users);
    else setErrorMsg(res.error || 'Failed to load users');
    setLoading(false);
  };

  const checkSession = async () => {
    const valid = await verifyAdminSession();
    setIsAuthenticated(valid);
    if (valid) loadUsers();
  };

  useEffect(() => { const run = async () => { await checkSession(); }; run(); }, []);

  const clearMessages = () => { setErrorMsg(''); setSuccessMsg(''); };

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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setCreating(true);
    // createUserAdmin is used for generic/admin role
    const res = await createUserAdmin(adminEmail, adminPassword, 'admin');
    setCreating(false);
    if (res.success) {
      setSuccessMsg(`Admin account (${adminEmail}) created successfully!`);
      setAdminName(''); setAdminEmail(''); setAdminPassword('');
      loadUsers();
    } else {
      setErrorMsg(res.error || 'Failed to create admin account');
    }
  };

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

  if (isAuthenticated === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-gray-500 font-bold">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center text-gray-500 font-bold">
        Access Denied. You must be an administrator.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-gray-50 border border-gray-300 text-blue-700 rounded-sm text-sm font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-gray-50 border border-gray-300 text-gray-700 rounded-sm text-sm font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* LEFT: Form area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-sm border border-gray-200 shadow-sm sticky top-24 overflow-hidden">
            {/* Form Tabs */}
            <div className="flex border-b border-gray-200 text-sm font-bold bg-gray-50">
              <button
                onClick={() => { setActiveForm('jury'); clearMessages(); }}
                className={`flex-1 py-3 transition ${
                  activeForm === 'jury'
                    ? 'bg-white text-blue-600 border-t-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Add Jury
              </button>
              <button
                onClick={() => { setActiveForm('coordinator'); clearMessages(); }}
                className={`flex-1 py-3 transition ${
                  activeForm === 'coordinator'
                    ? 'bg-white text-blue-600 border-t-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Add Coordinator
              </button>
              <button
                onClick={() => { setActiveForm('admin'); clearMessages(); }}
                className={`flex-1 py-3 transition ${
                  activeForm === 'admin'
                    ? 'bg-white text-blue-600 border-t-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Add Admin
              </button>
            </div>

            <div className="p-6">
              {/* JURY FORM */}
              {activeForm === 'jury' && (
                <form onSubmit={handleCreateJury} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. A. Kumar"
                      value={juryName}
                      onChange={e => setJuryName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Institution/Company</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ABC Technologies"
                      value={juryInstitution}
                      onChange={e => setJuryInstitution(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="jury@example.com"
                      value={juryEmail}
                      onChange={e => setJuryEmail(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                    <input
                      type="text"
                      required
                      placeholder="Create a strong password"
                      value={juryPassword}
                      onChange={e => setJuryPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-sm transition mt-6 text-sm disabled:opacity-50"
                  >
                    {creating ? 'Creating Account...' : 'Create Jury Account'}
                  </button>
                </form>
              )}

              {/* COORDINATOR FORM */}
              {activeForm === 'coordinator' && (
                <form onSubmit={handleCreateCoordinator} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Doe"
                      value={coordName}
                      onChange={e => setCoordName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Department (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. CSE"
                      value={coordDept}
                      onChange={e => setCoordDept(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="coordinator@example.com"
                      value={coordEmail}
                      onChange={e => setCoordEmail(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                    <input
                      type="text"
                      required
                      placeholder="Create a strong password"
                      value={coordPassword}
                      onChange={e => setCoordPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-sm transition mt-6 text-sm disabled:opacity-50"
                  >
                    {creating ? 'Creating Account...' : 'Create Coordinator'}
                  </button>
                </form>
              )}
              {/* ADMIN FORM */}
              {activeForm === 'admin' && (
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@example.com"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                    <input
                      type="text"
                      required
                      placeholder="Create a strong password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-sm transition mt-6 text-sm disabled:opacity-50"
                  >
                    {creating ? 'Creating Account...' : 'Create Admin Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: List of users */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">User Accounts</h3>
                <p className="text-sm text-gray-500">List of all privileged users and their credentials.</p>
              </div>
              <button
                onClick={loadUsers}
                disabled={loading}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-blue-600 border border-gray-300 rounded-sm text-sm font-bold transition duration-200"
              >
                Refresh
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Account details</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">
                        No privileged users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      return (
                        <tr key={u.email} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{u.name || u.email}</div>
                            <div className="text-sm text-gray-500 font-mono">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wider">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.email, u.role)}
                                className="text-red-600 hover:text-red-800 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-sm text-xs font-bold transition"
                              >
                                Delete
                              </button>
                            )}
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
