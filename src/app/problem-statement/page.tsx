'use client';

import React, { useState, useMemo } from 'react';
import { problemStatements, ProblemStatement } from '@/data/problem-statements';

export default function ProblemStatementPage() {
  const [selectedTheme, setSelectedTheme] = useState<string>('All');
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<ProblemStatement | null>(null);

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
              className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter by Theme</label>
            <select
              value={selectedTheme}
              onChange={e => setSelectedTheme(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
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
              className="w-full bg-gray-50 border border-gray-300 rounded-sm px-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
            >
              {domains.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* PS List Grouped by Theme */}
        <div className="space-y-10">
          {filteredPS.length === 0 ? (
            <div className="bg-white p-8 rounded-sm border border-gray-200 shadow-sm text-center text-gray-500">
              No problem statements found matching your criteria.
            </div>
          ) : (
            Object.entries(
              filteredPS.reduce((acc, ps) => {
                if (!acc[ps.theme]) acc[ps.theme] = [];
                acc[ps.theme].push(ps);
                return acc;
              }, {} as Record<string, typeof filteredPS>)
            ).map(([themeName, statements]) => (
              <div key={themeName} className="space-y-4">
                <div className="bg-blue-600 text-white p-4 rounded-sm shadow-sm flex items-center justify-between">
                  <h3 className="text-xl font-extrabold">{themeName}</h3>
                  <span className="text-sm font-bold bg-blue-800 px-3 py-1 rounded-full">{statements.length} {statements.length === 1 ? 'Statement' : 'Statements'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {statements.map(ps => (
                    <div 
                      key={ps.ps_id} 
                      onClick={() => setSelectedProblem(ps)}
                      className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm transition hover:shadow-md cursor-pointer hover:border-blue-300"
                    >
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 whitespace-nowrap shrink-0">
                              {ps.ps_id}
                            </span>
                            <h3 className="text-xl font-extrabold text-gray-900">{ps.title}</h3>
                          </div>
                          <div className="mt-3 inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-sm text-xs font-bold text-indigo-700 uppercase tracking-wider">
                            {ps.theme}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <span className="inline-block px-3 py-1 bg-gray-100 border border-gray-200 rounded-sm text-xs font-bold text-gray-600 uppercase tracking-wider">
                            {ps.domain}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {selectedProblem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedProblem(null)}>
            <div 
              className="bg-white rounded-md shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 whitespace-nowrap shrink-0">
                      {selectedProblem.ps_id}
                    </span>
                    <span className="inline-block px-3 py-1 bg-gray-100 border border-gray-200 rounded-sm text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {selectedProblem.domain}
                    </span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900">{selectedProblem.title}</h3>
                  <div className="mt-2 text-sm font-bold text-indigo-700 uppercase tracking-wider">
                    Theme: {selectedProblem.theme}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedProblem(null)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition shrink-0 ml-4"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Problem Statement</h4>
                  <p className="text-base text-gray-800 leading-relaxed bg-blue-50 p-5 rounded-sm border border-blue-100 whitespace-pre-wrap">
                    {selectedProblem.problemStatement}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Description</h4>
                  <p className="text-base text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {selectedProblem.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
