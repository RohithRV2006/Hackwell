'use client';

import React, { useState, useMemo } from 'react';
import { problemStatements } from '@/data/problem-statements';

export default function ProblemStatementPage() {
  const [selectedTheme, setSelectedTheme] = useState<string>('All');
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const themes = useMemo(() => {
    const t = new Set<string>();
    problemStatements.forEach(ps => t.add(ps.theme));
    return ['All', ...Array.from(t)];
  }, []);

  const domains = useMemo(() => {
    const d = new Set<string>();
    problemStatements.forEach(ps => d.add(ps.domain));
    return ['All', ...Array.from(d)];
  }, []);

  const filteredPS = useMemo(() => {
    return problemStatements.filter(ps => {
      const matchTheme = selectedTheme === 'All' || ps.theme === selectedTheme;
      const matchDomain = selectedDomain === 'All' || ps.domain === selectedDomain;
      const matchSearch =
        searchQuery === '' ||
        ps.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ps.ps_id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTheme && matchDomain && matchSearch;
    });
  }, [selectedTheme, selectedDomain, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        
        {/* Header Section */}
        <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Problem Statements</h2>
          <p className="text-sm text-gray-500 mt-1">Explore all the challenges, domains, and themes for the hackathon.</p>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by Title or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter by Theme</label>
            <select
              value={selectedTheme}
              onChange={e => setSelectedTheme(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {themes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter by Domain</label>
            <select
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {domains.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* PS List */}
        <div className="space-y-6">
          {filteredPS.length === 0 ? (
            <div className="bg-white p-8 rounded-sm border border-gray-200 shadow-sm text-center text-gray-500">
              No problem statements found matching your criteria.
            </div>
          ) : (
            filteredPS.map(ps => (
              <div key={ps.ps_id} className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm transition hover:shadow-md">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {ps.ps_id}
                      </span>
                      <h3 className="text-xl font-extrabold text-gray-900">{ps.title}</h3>
                    </div>
                    <p className="text-sm font-medium text-gray-500">{ps.theme}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-block px-3 py-1 bg-gray-100 border border-gray-200 rounded-sm text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {ps.domain}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Problem Statement</h4>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-sm border border-gray-100 whitespace-pre-wrap">
                      {ps.statement}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Problem Description</h4>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {ps.description}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
