'use client';

import React, { useState, useEffect } from 'react';
import { getAdminOverviewStats } from './actions';
import { verifyAdminSession } from '@/app/admin/actions';
import { useRouter } from 'next/navigation';

export default function AdminOverviewPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const loadData = async () => {
    setLoading(true);
    const res = await getAdminOverviewStats();
    if (res.success) {
      setStats(res.stats);
    } else {
      setErrorMsg(res.error || 'Failed to load stats');
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
      window.location.href = '/api/logout';
    }
  };

  useEffect(() => {
    const run = async () => {
      await checkSession();
    };
    run();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500 font-bold">Loading Overview...</div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null; // Will redirect
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center bg-white p-6 rounded-sm border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
          <p className="text-sm text-gray-500 mt-1">High level statistics of the Hackwell platform.</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-blue-600 border border-gray-300 rounded-sm text-sm font-bold transition duration-200"
        >
          Refresh Stats
        </button>
      </div>

      {/* Floating Notifications */}
      {errorMsg && (
        <div className="fixed top-24 right-6 z-50 p-4 bg-white border border-red-500 text-red-700 rounded-sm text-sm font-bold shadow-lg flex items-center justify-between gap-4 min-w-[300px]">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Teams</p>
          <h3 className="text-4xl font-extrabold text-blue-600 mt-2">{stats?.totalTeams || 0}</h3>
          <p className="text-gray-400 text-xs mt-1">Registered hackathon teams</p>
        </div>

        <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Juries</p>
          <h3 className="text-4xl font-extrabold text-gray-900 mt-2">{stats?.totalJuries || 0}</h3>
          <p className="text-gray-400 text-xs mt-1">Registered jury members</p>
        </div>

        <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Privileged Accounts</p>
          <h3 className="text-4xl font-extrabold text-gray-900 mt-2">{stats?.totalRoles || 0}</h3>
          <p className="text-gray-400 text-xs mt-1">Admins, Coords, and Juries</p>
        </div>

        <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prelims Evaluations</p>
          <h3 className="text-4xl font-extrabold text-blue-600 mt-2">{stats?.totalPrelims || 0}</h3>
          <p className="text-gray-400 text-xs mt-1">Total submitted prelims scores</p>
        </div>

        <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Finale Evaluations</p>
          <h3 className="text-4xl font-extrabold text-blue-600 mt-2">{stats?.totalFinale || 0}</h3>
          <p className="text-gray-400 text-xs mt-1">Total submitted finale scores</p>
        </div>
      </div>
    </div>
  );
}
