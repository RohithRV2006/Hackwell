'use client';

import React, { useState, useEffect } from 'react';
import {
  verifyAdminSession,
  getAllGameScoresAdmin,
} from '@/app/admin/actions';

export default function AdminGameScoresPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    
    const res = await getAllGameScoresAdmin();

    if (res.success) {
      setScores(res.scores || []);
    } else {
      setErrorMsg(res.error || 'Failed to sync data');
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
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const filteredRecords = scores.filter((rec) =>
    rec.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.gameName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !scores.length) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500 font-bold">Loading Game Scores...</div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="p-12 text-center text-gray-500 font-bold">
        Access Denied. You must be an administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-sm border border-gray-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Game Scores</h2>
          <p className="text-sm text-gray-500 mt-1">Aggregated XP points awarded to teams during hackathon games.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search teams or games..."
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Game Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">XP Awarded</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Date Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No game scores found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-bold text-gray-900">{rec.teamName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{rec.gameName}</td>
                    <td className="px-6 py-4 font-bold text-blue-600 text-right">+{rec.xpAwarded} XP</td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right">
                      {rec.createdAt ? new Date(rec.createdAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
