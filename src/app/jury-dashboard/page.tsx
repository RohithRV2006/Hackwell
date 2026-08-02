'use client';

import { useState, useEffect, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  verifyJurySession,
  getJuryDashboardData,
  getTeamDetails,
  saveEvaluation,
  toggleHighlight,
  freezeJuryScores,
  SimpleTeam,
  DetailedTeam,
  EvaluationData,
} from './actions';
import { clearSessionCookie } from '@/app/actions/session';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  Search,
  Filter,
  ArrowUpDown,
  Lock,
  Unlock,
  Star,
  ArrowLeft,
  ArrowRight,
  Save,
  RefreshCw,
  User,
  BookOpen,
  Code,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

function JuryDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPendingTransition, startTransition] = useTransition();

  // Authentication & Session state
  const [session, setSession] = useState<{
    email: string;
    juryName: string;
    institution: string;
    scoresFrozen: boolean;
    frozenAt: string | null;
  } | null>(null);

  // Dashboard Data states
  const [teams, setTeams] = useState<SimpleTeam[]>([]);
  const [assignmentsSupported, setAssignmentsSupported] = useState<boolean>(true);
  const [scoresFrozen, setScoresFrozen] = useState<boolean>(false);
  const [frozenAt, setFrozenAt] = useState<string | null>(null);
  
  // Loading & Error states
  const [loading, setLoading] = useState<boolean>(true);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [freezing, setFreezing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Selected Team Details
  const [selectedTeam, setSelectedTeam] = useState<DetailedTeam | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationData>({
    problemStatement: 0,
    presentation: 0,
    communication: 0,
    solution: 0,
    idea: 0,
    remarks: '',
    highlighted: false,
    score: 0,
  });

  // Dialog State
  const [showFreezeModal, setShowFreezeModal] = useState<boolean>(false);

  // URL State values
  const urlSearch = searchParams.get('search') || '';
  const urlFilter = searchParams.get('filter') || 'All';
  const urlSort = searchParams.get('sort') || 'teamNumber';
  const urlTeam = searchParams.get('team') || '';

  // Local state for instant search input
  const [searchInput, setSearchInput] = useState<string>(urlSearch);

  // Fetch Dashboard Data
  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMsg('');
    const res = await getJuryDashboardData();
    if (res.success) {
      if (res.assignmentsSupported === false) {
        setAssignmentsSupported(false);
      } else {
        setAssignmentsSupported(true);
        setTeams(res.teams || []);
        if (res.scoresFrozen !== undefined) {
          setScoresFrozen(res.scoresFrozen);
          setFrozenAt(res.frozenAt || null);
        }
      }
    } else {
      setErrorMsg(res.error || 'Failed to load dashboard data.');
    }
    setLoading(false);
  };

  // Fetch team details for evaluation
  const fetchDetails = async (teamId: string) => {
    setDetailsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    const res = await getTeamDetails(teamId);
    if (res.success && res.teamDetails) {
      setSelectedTeam(res.teamDetails);
      if (res.scoreData) {
        setEvaluation(res.scoreData);
      } else {
        setEvaluation({
          problemStatement: 0,
          presentation: 0,
          communication: 0,
          solution: 0,
          idea: 0,
          remarks: '',
          highlighted: res.teamDetails.highlighted,
          score: 0,
        });
      }
    } else {
      setErrorMsg(res.error || 'Failed to load team details.');
      updateUrlParams({ team: '' });
    }
    setDetailsLoading(false);
  };

  // Load Session and initialize
  useEffect(() => {
    async function initSession() {
      const check = await verifyJurySession();
      if (!check.success || !check.email) {
        router.replace('/');
        return;
      }
      setSession({
        email: check.email,
        juryName: check.juryName || '',
        institution: check.institution || '',
        scoresFrozen: check.scoresFrozen || false,
        frozenAt: check.frozenAt || null,
      });
      setScoresFrozen(check.scoresFrozen || false);
      setFrozenAt(check.frozenAt || null);
      loadDashboardData();
    }
    initSession();
  }, []);

  // Sync Search input state when URL param updates
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // Load Team Details if selected in URL
  useEffect(() => {
    if (urlTeam && session) {
      fetchDetails(urlTeam);
    } else {
      setSelectedTeam(null);
    }
  }, [urlTeam, session]);

  // Helper to update URL params
  const updateUrlParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      await clearSessionCookie();
      router.replace('/');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  // Handle Search Input Change
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    updateUrlParams({ search: val });
  };

  // Handle Numeric Rubric Change (only integer 0-10)
  const handleScoreChange = (field: keyof Omit<EvaluationData, 'remarks' | 'highlighted' | 'score'>, val: string) => {
    if (scoresFrozen) return;
    
    if (val === '') {
      setEvaluation(prev => {
        const next = { ...prev, [field]: 0 };
        next.score = next.problemStatement + next.presentation + next.communication + next.solution + next.idea;
        return next;
      });
      return;
    }

    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || num > 10) return;

    setEvaluation(prev => {
      const next = { ...prev, [field]: num };
      next.score = next.problemStatement + next.presentation + next.communication + next.solution + next.idea;
      return next;
    });
  };

  // Save Team Evaluation
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || scoresFrozen) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await saveEvaluation(
      selectedTeam.id,
      {
        problemStatement: evaluation.problemStatement,
        presentation: evaluation.presentation,
        communication: evaluation.communication,
        solution: evaluation.solution,
        idea: evaluation.idea,
      },
      evaluation.remarks,
      evaluation.highlighted
    );

    if (res.success) {
      setSuccessMsg(`Evaluation saved successfully for ${selectedTeam.teamName}!`);
      // Update team status in local list
      setTeams(prev =>
        prev.map(t =>
          t.id === selectedTeam.id
            ? {
                ...t,
                evaluationStatus: 'Evaluated',
                score: evaluation.score,
                highlighted: evaluation.highlighted,
              }
            : t
        )
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to save evaluation.');
    }
    setSubmitting(false);
  };

  // Toggle Highlight Star
  const handleStarToggle = async (teamId: string, currentHighlighted: boolean) => {
    if (scoresFrozen) return;
    
    const newHighlight = !currentHighlighted;
    
    // Optimistically update details if open
    if (selectedTeam && selectedTeam.id === teamId) {
      setEvaluation(prev => ({ ...prev, highlighted: newHighlight }));
    }

    // Optimistically update list
    setTeams(prev =>
      prev.map(t => (t.id === teamId ? { ...t, highlighted: newHighlight } : t))
    );

    const res = await toggleHighlight(teamId, newHighlight);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to toggle highlight.');
      // Revert states on error
      setTeams(prev =>
        prev.map(t => (t.id === teamId ? { ...t, highlighted: currentHighlighted } : t))
      );
      if (selectedTeam && selectedTeam.id === teamId) {
        setEvaluation(prev => ({ ...prev, highlighted: currentHighlighted }));
      }
    }
  };

  // Freeze Scores Action
  const handleFreezeScores = async () => {
    setFreezing(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowFreezeModal(false);

    const res = await freezeJuryScores();
    if (res.success) {
      setScoresFrozen(true);
      setFrozenAt(new Date().toISOString());
      setSuccessMsg('All evaluations successfully locked and frozen!');
      loadDashboardData();
    } else {
      setErrorMsg(res.error || 'Failed to freeze scores.');
    }
    setFreezing(false);
  };

  // Filtering and Sorting logic
  const filteredTeams = teams
    .filter(t => {
      // 1. Search Query
      const query = urlSearch.toLowerCase().trim();
      const matchQuery =
        !query ||
        t.teamName.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        (t.leadName && t.leadName.toLowerCase().includes(query)) ||
        (t.teamNumber && t.teamNumber.toLowerCase().includes(query)) ||
        (t.labNumber && t.labNumber.toLowerCase().includes(query));

      // 2. Filters
      let matchFilter = true;
      if (urlFilter === 'Pending') matchFilter = t.evaluationStatus === 'Pending';
      if (urlFilter === 'Evaluated') matchFilter = t.evaluationStatus === 'Evaluated';
      if (urlFilter === 'Highlighted') matchFilter = t.highlighted === true;
      if (urlFilter.startsWith('Lab_')) {
        const lab = urlFilter.replace('Lab_', '');
        matchFilter = t.labNumber === lab;
      }

      return matchQuery && matchFilter;
    })
    .sort((a, b) => {
      // Sorting
      if (urlSort === 'teamNumber') return (a.teamNumber || '').localeCompare(b.teamNumber || '');
      if (urlSort === 'teamName') return a.teamName.localeCompare(b.teamName);
      if (urlSort === 'teamLeader') return (a.leadName || '').localeCompare(b.leadName || '');
      if (urlSort === 'labNumber') return (a.labNumber || '').localeCompare(b.labNumber || '');
      if (urlSort === 'evaluated') return a.evaluationStatus === 'Evaluated' ? -1 : 1;
      if (urlSort === 'pending') return a.evaluationStatus === 'Pending' ? -1 : 1;
      if (urlSort === 'highlighted') return a.highlighted === b.highlighted ? 0 : a.highlighted ? -1 : 1;
      return 0;
    });

  // Unique Lab Numbers list for filter dropdown
  const uniqueLabs = Array.from(new Set(teams.map(t => t.labNumber).filter(Boolean)));

  // Statistics calculations
  const totalAssigned = teams.length;
  const evaluatedCount = teams.filter(t => t.evaluationStatus === 'Evaluated').length;
  const pendingCount = totalAssigned - evaluatedCount;
  const highlightedCount = teams.filter(t => t.highlighted).length;
  const progressPercent = totalAssigned > 0 ? Math.round((evaluatedCount / totalAssigned) * 100) : 0;

  // Next / Previous team navigation helper
  const navigateTeam = (direction: 'prev' | 'next') => {
    if (filteredTeams.length === 0 || !selectedTeam) return;
    const currentIndex = filteredTeams.findIndex(t => t.id === selectedTeam.id);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === 'prev') {
      targetIndex = currentIndex > 0 ? currentIndex - 1 : filteredTeams.length - 1;
    } else {
      targetIndex = currentIndex < filteredTeams.length - 1 ? currentIndex + 1 : 0;
    }

    const targetTeam = filteredTeams[targetIndex];
    setSuccessMsg('');
    setErrorMsg('');
    updateUrlParams({ team: targetTeam.id });
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Header Banner - Matches existing Admin Layout styling */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40 px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-md">
            H
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-blue-600 flex items-center gap-2">
              Hackwell Jury
              <span className="bg-green-100 text-green-700 border border-green-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                Jury Area
              </span>
            </h1>
            {session && (
              <p className="text-xs text-gray-500 mt-1">
                Logged in as <span className="text-blue-600 font-mono font-medium">{session.email}</span> ({session.juryName})
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {scoresFrozen ? (
            <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <Lock size={14} className="text-amber-600" /> Scores Frozen
            </span>
          ) : (
            <span className="bg-green-100 text-green-700 border border-green-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <Unlock size={14} className="text-green-600" /> Open for Scoring
            </span>
          )}
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* Status Alerts */}
        {successMsg && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-sm font-semibold shadow-sm transition animate-fadeIn">
            <CheckCircle2 size={18} className="text-green-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold shadow-sm transition animate-fadeIn">
            <AlertTriangle size={18} className="text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* LOADING SKELETON */}
        {loading ? (
          <div className="space-y-6 animate-pulse">
            {/* Stats Loader */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-3xl border border-gray-200 shadow-sm" />
              ))}
            </div>
            {/* List Loader */}
            <div className="space-y-4">
              <div className="h-12 bg-white rounded-2xl border border-gray-200 shadow-sm" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-2xl border border-gray-200 shadow-sm" />
              ))}
            </div>
          </div>
        ) : (
          /* ACTIVE JURY DASHBOARD IMPLEMENTATION */
          <div className="space-y-6">
            
            {/* STATS OVERVIEW CARDS (Light Theme) */}
            {!urlTeam && (
              <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Total Teams</span>
                  <span className="text-3xl font-extrabold text-gray-900 mt-2">{totalAssigned}</span>
                  <span className="text-[10px] text-gray-400 mt-1">Available for evaluation</span>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-green-600 font-bold">Evaluated</span>
                  <span className="text-3xl font-extrabold text-green-600 mt-2">{evaluatedCount}</span>
                  <span className="text-[10px] text-gray-400 mt-1">Scoring completed</span>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">Unevaluated</span>
                  <span className="text-3xl font-extrabold text-amber-600 mt-2">{pendingCount}</span>
                  <span className="text-[10px] text-gray-400 mt-1">Teams not yet scored</span>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">Highlighted</span>
                  <span className="text-3xl font-extrabold text-blue-600 mt-2">{highlightedCount}</span>
                  <span className="text-[10px] text-gray-400 mt-1">Starred teams ⭐</span>
                </div>

                <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Progress</span>
                    <span className="text-xs font-extrabold text-gray-900">{progressPercent}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-4 border border-gray-200">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                    <TrendingUp size={10} className="text-blue-500" /> Progress Rate
                  </span>
                </div>
              </section>
            )}

            {/* DASHBOARD VIEW: LIST & DETAILS SPLIT OR CARDS */}
            {!urlTeam ? (
              /* TAB 1: TEAM LIST VIEW */
              <div className="space-y-4">
                
                {/* Search / Filter / Sort Bar (Light Theme) */}
                <div className="flex flex-col md:flex-row gap-3 bg-white border border-gray-200 p-3.5 rounded-2xl shadow-sm">
                  {/* Search Input */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search Team Name, Leader, Number, or Lab..."
                      value={searchInput}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-950 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition duration-150"
                    />
                  </div>

                  {/* Filter Dropdown */}
                  <div className="flex items-center gap-2">
                    <Filter className="text-gray-400" size={16} />
                    <select
                      value={urlFilter}
                      onChange={(e) => updateUrlParams({ filter: e.target.value })}
                      className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs text-gray-950 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer transition duration-150"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending Evaluation</option>
                      <option value="Evaluated">Evaluated</option>
                      <option value="Highlighted">Highlighted ⭐</option>
                      {uniqueLabs.map(lab => (
                        <option key={lab} value={`Lab_${lab}`}>Lab {lab}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="text-gray-400" size={16} />
                    <select
                      value={urlSort}
                      onChange={(e) => updateUrlParams({ sort: e.target.value })}
                      className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs text-gray-950 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer transition duration-150"
                    >
                      <option value="teamNumber">Sort by Team Number</option>
                      <option value="teamName">Sort by Team Name</option>
                      <option value="teamLeader">Sort by Team Leader</option>
                      <option value="labNumber">Sort by Lab Number</option>
                      <option value="evaluated">Sort by Evaluated</option>
                      <option value="pending">Sort by Pending</option>
                      <option value="highlighted">Sort by Highlighted</option>
                    </select>
                  </div>
                </div>

                {/* Team List Results (Light Theme Cards matching Admin) */}
                {filteredTeams.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
                    No teams found matching search, filter, or sorting criteria.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTeams.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => updateUrlParams({ team: t.id })}
                        className="group bg-white border border-gray-200 hover:border-blue-500/50 rounded-2xl p-5 flex items-start justify-between gap-4 hover:bg-gray-50/50 transition duration-200 cursor-pointer shadow-sm"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-gray-100 border border-gray-200 text-gray-600 font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                              No. {t.teamNumber || 'N/A'}
                            </span>
                            <span className="bg-gray-100 border border-gray-200 text-gray-600 font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                              Lab {t.labNumber || 'N/A'}
                            </span>
                            {t.evaluationStatus === 'Evaluated' ? (
                              <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Evaluated
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Pending
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">
                              {t.teamName}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              Problem: <span className="text-gray-700 font-medium">{t.problemStatement}</span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100 mt-1">
                            <span className="flex items-center gap-1">
                              <User size={12} className="text-gray-400" /> Lead: <strong className="text-gray-600 font-semibold">{t.leadName}</strong>
                            </span>
                            <span>{t.membersCount} members</span>
                          </div>
                        </div>

                        {/* Interactive highlights & values */}
                        <div className="flex flex-col items-end justify-between self-stretch">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStarToggle(t.id, t.highlighted);
                            }}
                            className={`p-2 rounded-xl transition duration-150 ${
                              scoresFrozen ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100 cursor-pointer'
                            }`}
                            disabled={scoresFrozen}
                          >
                            <Star
                              size={20}
                              className={t.highlighted ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-gray-400'}
                            />
                          </button>

                          <div className="text-right">
                            {t.evaluationStatus === 'Evaluated' && t.score !== undefined ? (
                              <div className="bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl">
                                <span className="block text-[8px] uppercase tracking-wider text-gray-500 font-bold leading-none">Score</span>
                                <span className="text-sm font-extrabold text-blue-600 leading-none mt-1 inline-block">{t.score}/40</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Not evaluated</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* FREEZE SCORES ACTION BAR (Light Theme) */}
                {totalAssigned > 0 && !scoresFrozen && (
                  <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
                    <div>
                      <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        <Lock size={16} className="text-amber-500" />
                        Freeze Evaluation Scores
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-xl">
                        When you have finished evaluating your selected teams, freeze your scores. This submits your evaluations permanently and locks them from future edits.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowFreezeModal(true)}
                      disabled={evaluatedCount === 0}
                      className="px-6 py-3 font-bold rounded-xl text-sm transition duration-200 flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Freeze Scores
                    </button>
                  </section>
                )}
              </div>
            ) : (
              /* TAB 2: DETAILED TEAM EVALUATION VIEW */
              <div className="space-y-6">
                
                {/* Navigation Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <button
                    onClick={() => updateUrlParams({ team: '' })}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition duration-200 cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Back to Dashboard
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateTeam('prev')}
                      className="p-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-gray-500 hover:text-gray-900 transition cursor-pointer shadow-sm"
                      title="Previous Team"
                    >
                      <ChevronLeftIcon />
                    </button>
                    <span className="text-xs font-mono text-gray-500 bg-white border border-gray-300 px-3 py-1 rounded-xl shadow-sm">
                      {filteredTeams.findIndex(t => t.id === urlTeam) + 1} / {filteredTeams.length}
                    </span>
                    <button
                      onClick={() => navigateTeam('next')}
                      className="p-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-gray-500 hover:text-gray-900 transition cursor-pointer shadow-sm"
                      title="Next Team"
                    >
                      <ChevronRightIcon />
                    </button>
                  </div>
                </div>

                {detailsLoading || !selectedTeam ? (
                  <div className="p-12 text-center text-gray-500 animate-pulse">Loading team data...</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fadeIn">
                    
                    {/* LEFT COLUMN: TEAM INFO & DETAILS */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Team Header Info */}
                      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-3 py-1 rounded-xl font-bold font-mono">
                            No. {selectedTeam.teamNumber || 'N/A'}
                          </span>
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-3 py-1 rounded-xl font-bold font-mono">
                            Lab {selectedTeam.labNumber || 'N/A'}
                          </span>
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-3">{selectedTeam.teamName}</h2>
                        
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-500 pt-4 border-t border-gray-150">
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Problem Statement</span>
                            <span className="text-gray-800 font-bold">{selectedTeam.problemStatement}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Team Lead</span>
                            <span className="text-gray-800 font-medium">{selectedTeam.leadData.name} ({selectedTeam.leadEmail})</span>
                          </div>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-5">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-250 pb-3">
                          <BookOpen size={18} className="text-blue-500" />
                          Project Details
                        </h3>

                        <div className="space-y-4 text-sm leading-relaxed">
                          {selectedTeam.abstract && selectedTeam.abstract !== 'N/A' && (
                            <div>
                              <h4 className="font-bold text-gray-700">Abstract</h4>
                              <p className="text-gray-600 mt-1">{selectedTeam.abstract}</p>
                            </div>
                          )}

                          {selectedTeam.proposedSolution && selectedTeam.proposedSolution !== 'N/A' && (
                            <div>
                              <h4 className="font-bold text-gray-700">Proposed Solution</h4>
                              <p className="text-gray-600 mt-1">{selectedTeam.proposedSolution}</p>
                            </div>
                          )}

                          {selectedTeam.projectDescription && selectedTeam.projectDescription !== 'N/A' && (
                            <div>
                              <h4 className="font-bold text-gray-700">Project Description</h4>
                              <p className="text-gray-600 mt-1">{selectedTeam.projectDescription}</p>
                            </div>
                          )}

                          {selectedTeam.techStack && selectedTeam.techStack !== 'N/A' && (
                            <div className="flex items-start gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                              <Code size={18} className="text-blue-500 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider">Tech Stack</h4>
                                <p className="text-gray-600 mt-1">{selectedTeam.techStack}</p>
                              </div>
                            </div>
                          )}

                          {selectedTeam.submissionLink && (
                            <div className="pt-2">
                              <a
                                href={selectedTeam.submissionLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                View Submission Link <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Team Members List */}
                      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-250 pb-3">
                          <User size={18} className="text-blue-500" />
                          Team Members ({selectedTeam.membersCount})
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Lead card */}
                          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center">
                                <h4 className="font-bold text-gray-950 text-sm">{selectedTeam.leadData.name}</h4>
                                <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Lead</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1.5">
                                Batch: <span className="text-gray-900 font-semibold">{selectedTeam.leadData.batchNumber}</span> | Dept: <span className="text-gray-900 font-semibold">{selectedTeam.leadData.department}</span>
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Year: <span className="text-gray-900 font-semibold">{selectedTeam.leadData.year}</span> | Section: <span className="text-gray-900 font-semibold">{selectedTeam.leadData.section}</span>
                              </p>
                            </div>
                            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 mt-3 font-mono">
                              Tel: {selectedTeam.leadData.contactNumber}
                            </div>
                          </div>

                          {/* Member cards */}
                          {selectedTeam.membersData.map((m, i) => (
                            <div key={i} className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                              <div className="flex justify-between items-center">
                                <h4 className="font-bold text-gray-950 text-sm">{m.name}</h4>
                                <span className="bg-gray-200 text-gray-600 border border-gray-300 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Member</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1.5">
                                Batch: <span className="text-gray-900 font-semibold">{m.batchNumber}</span> | Dept: <span className="text-gray-900 font-semibold">{m.department}</span>
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Year: <span className="text-gray-900 font-semibold">{m.year}</span> | Section: <span className="text-gray-900 font-semibold">{m.section}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* RIGHT COLUMN: SCORE INPUT FORM */}
                    <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-6 sticky top-24">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                          Evaluation Form
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleStarToggle(selectedTeam.id, evaluation.highlighted)}
                          disabled={scoresFrozen}
                          className={`p-2 rounded-xl transition duration-150 ${
                            scoresFrozen ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'
                          }`}
                        >
                          <Star
                            size={22}
                            className={evaluation.highlighted ? 'fill-yellow-400 text-yellow-400 animate-scaleIn' : 'text-gray-300 hover:text-gray-400'}
                          />
                        </button>
                      </div>

                      <form onSubmit={handleSaveEvaluation} className="space-y-5">
                        
                        {/* Rubrics (0 - 10) */}
                        <div className="space-y-4">
                          {[
                            { key: 'problemStatement', label: 'Problem Statement' },
                            { key: 'presentation', label: 'Presentation' },
                            { key: 'communication', label: 'Communication' },
                            { key: 'solution', label: 'Solution' },
                            { key: 'idea', label: 'Idea' },
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                              <div>
                                <label htmlFor={key} className="block text-xs font-bold text-gray-700">{label}</label>
                                <span className="text-[10px] text-gray-400">Range: 0 – 10 (Integer)</span>
                              </div>
                              <input
                                id={key}
                                type="number"
                                min="0"
                                max="10"
                                required
                                value={evaluation[key as keyof Omit<EvaluationData, 'remarks' | 'highlighted' | 'score'>] || ''}
                                onChange={(e) => handleScoreChange(key as any, e.target.value)}
                                disabled={scoresFrozen}
                                className="w-16 bg-white border border-gray-300 focus:border-blue-500 rounded-xl px-3 py-2 text-center text-base font-extrabold text-gray-900 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Remarks */}
                        <div className="space-y-2">
                          <label htmlFor="remarks" className="block text-xs font-bold text-gray-700">Jury Remarks</label>
                          <textarea
                            id="remarks"
                            rows={3}
                            placeholder="Add evaluation comments..."
                            value={evaluation.remarks}
                            onChange={(e) => !scoresFrozen && setEvaluation(prev => ({ ...prev, remarks: e.target.value }))}
                            disabled={scoresFrozen}
                            className="w-full bg-gray-50 border border-gray-300 focus:border-blue-500 rounded-xl p-3 text-xs text-gray-950 placeholder:text-gray-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                          />
                        </div>

                        {/* Calculated Total Score */}
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-gray-600 tracking-wider">Total Score</span>
                            <span className="text-[10px] text-gray-500">Sum of the 5 Rubrics</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-blue-600 font-mono">{evaluation.score}</span>
                            <span className="text-xs text-gray-500 font-mono"> / 50</span>
                          </div>
                        </div>

                        {/* Save Action */}
                        {scoresFrozen ? (
                          <div className="bg-amber-100 border border-amber-200 p-3 rounded-xl text-center text-xs text-amber-800 font-semibold flex items-center justify-center gap-1.5 animate-pulse shadow-sm">
                            <Lock size={14} className="text-amber-600" /> Scores Frozen: Read-Only
                          </div>
                        ) : (
                          <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Save size={16} />
                            {submitting ? 'Saving Evaluation...' : 'Save Evaluation'}
                          </button>
                        )}

                      </form>

                    </div>

                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* CONFIRMATION FREEZE MODAL */}
      {showFreezeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl animate-scaleIn animate-duration-150">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-red-100 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                <Lock size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-gray-950">Freeze All Scores?</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  After freezing, scores cannot be edited. Do you want to continue?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowFreezeModal(false)}
                disabled={freezing}
                className="px-4 py-2.5 bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFreezeScores}
                disabled={freezing}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {freezing ? 'Freezing...' : 'Freeze'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Helpers for navigation buttons inside page (custom icons)
function ChevronLeftIcon() {
  return <ArrowLeft size={16} />;
}

function ChevronRightIcon() {
  return <ArrowRight size={16} />;
}

export default function JuryDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500 animate-pulse">Loading dashboard...</div></div>}>
      <JuryDashboardContent />
    </Suspense>
  );
}
