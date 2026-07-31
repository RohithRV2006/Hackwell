'use client';

import { useState, useEffect } from 'react';
import { getAllUsersAdmin, createUserAdmin, deleteUserAdmin, AdminUser } from './actions';
import { verifyAdminSession } from '@/app/admin/actions';

export default function UsersCreatorPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student-coord');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const valid = await verifyAdminSession();
    setIsAuthenticated(valid);
    if (valid) {
      loadUsers();
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    const res = await getAllUsersAdmin();
    if (res.success && res.users) {
      setUsers(res.users);
    } else {
      setErrorMsg(res.error || 'Failed to load users');
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !role) {
      setErrorMsg('All fields are required');
      return;
    }

    setCreating(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await createUserAdmin(email, password, role);
    if (res.success) {
      setSuccessMsg(`User ${email} created successfully as ${role}!`);
      setEmail('');
      setPassword('');
      setRole('student-coord');
      loadUsers();
    } else {
      setErrorMsg(res.error || 'Failed to create user');
    }
    setCreating(false);
  };

  const handleDeleteUser = async (userEmail: string) => {
    if (!confirm(`Are you sure you want to completely delete ${userEmail}?\nThis action is permanent and cannot be undone.`)) {
      return;
    }
    setLoading(true);
    setErrorMsg('');
    
    const res = await deleteUserAdmin(userEmail);
    if (res.success) {
      setSuccessMsg(`User ${userEmail} deleted successfully.`);
      loadUsers();
    } else {
      setErrorMsg(res.error || 'Failed to delete user');
      setLoading(false);
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create User Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
                >
                  <option value="admin">Administrator</option>
                  <option value="student-coord">Student Coordinator</option>
                  <option value="faculty-coord">Faculty Coordinator</option>
                  <option value="jury">Jury Member</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {creating ? 'Creating User...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>

        {/* Users Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Registered Users Directory</h2>
              <button
                onClick={loadUsers}
                disabled={loading}
                className="text-sm font-bold text-blue-600 hover:text-blue-800"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Email Account</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Role</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                        No users found in database.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.email} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 
                              user.role === 'jury' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                              'bg-blue-100 text-blue-800 border border-blue-200'}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteUser(user.email)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
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
