'use client';

import { useState, useEffect } from 'react';
import {
  getJuryDashboardData,
  getTeamDetails,
  submitAndFreezeEvaluation,
  updateFinalRoundRecommendation,
  SimpleTeam,
  DetailedTeam,
  Rubric
} from './actions';

export default function JuryDashboard() {
  // Navigation Tabs State
  const [mainTab, setMainTab] = useState<'prelims' | 'finale'>('prelims');
  const [subTab, setSubTab] = useState<'score' | 'final_selection'>('score');

  // Dashboard Data State
  const [prelimsTeams, setPrelimsTeams] = useState<SimpleTeam[]>([]);
  const [finaleTeams, setFinaleTeams] = useState<SimpleTeam[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{ juryName?: string; email?: string; labName?: string } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Timeline active flags & states
  const [prelimsActive, setPrelimsActive] = useState<boolean>(true);
  const [prelimsState, setPrelimsState] = useState<string>('not-set');
  const [finaleActive, setFinaleActive] = useState<boolean>(false);
  const [finaleState, setFinaleState] = useState<string>('not-set');

  // Modal active state for scoring
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState<'prelims' | 'finale'>('prelims');
  const [teamDetails, setTeamDetails] = useState<DetailedTeam | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form scores state
  const [conceptStrength, setConceptStrength] = useState<string>('');
  const [buildIntelligence, setBuildIntelligence] = useState<string>('');
  const [deliveryImpact, setDeliveryImpact] = useState<string>('');
  const [liveDefenseScore, setLiveDefenseScore] = useState<string>('');
  const [communication, setCommunication] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [selectedForFinal, setSelectedForFinal] = useState<boolean>(false);
  const [selectionReason, setSelectionReason] = useState<string>('');
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [evalJuryName, setEvalJuryName] = useState<string>('');

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  // Final round recommendation sync state for inline edits
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});
  const [syncSuccessMap, setSyncSuccessMap] = useState<Record<string, string>>({});

  const loadDashboard = async () => {

    setLoading(true);
    setErrorMsg('');
    const res = await getJuryDashboardData();
    if (res.success) {
      if (res.prelimsTeams) setPrelimsTeams(res.prelimsTeams);
      if (res.finaleTeams) setFinaleTeams(res.finaleTeams);
      if (res.prelimsActive !== undefined) setPrelimsActive(res.prelimsActive);
      if (res.prelimsState) setPrelimsState(res.prelimsState);
      if (res.finaleActive !== undefined) setFinaleActive(res.finaleActive);
      if (res.finaleState) setFinaleState(res.finaleState);
      if (res.sessionInfo) setSessionInfo(res.sessionInfo);

      // If finale is not active, force mainTab to 'prelims'
      if (!res.finaleActive && mainTab === 'finale') {
        setMainTab('prelims');
      }
    } else {
      if (res.error?.includes('Unauthorized') || res.error?.includes('Invalid session') || res.error?.includes('No active session')) {
        window.location.href = '/api/logout';
        return;
      }
      setErrorMsg(res.error || 'Failed to retrieve dashboard data.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCardClick = async (teamId: string, round: 'prelims' | 'finale' = 'prelims') => {
    setSelectedTeamId(teamId);
    setActiveRound(round);
    setLoadingDetails(true);
    setErrorMsg('');
    setSuccessMsg('');
    setValidationErrors({});

    // Reset score inputs
    setConceptStrength('');
    setBuildIntelligence('');
    setDeliveryImpact('');
    setLiveDefenseScore('');
    setCommunication('');
    setFeedback('');
    setSelectedForFinal(false);
    setSelectionReason('');
    setIsFrozen(false);
    setEvalJuryName('');

    const res = await getTeamDetails(teamId, round);
    if (res.success && res.teamDetails) {
      setTeamDetails(res.teamDetails);
      if (res.scoreData) {
        const rubric = res.scoreData.rubric;
        setConceptStrength(rubric.conceptStrength?.toString() || '0');
        setBuildIntelligence(rubric.buildIntelligence?.toString() || '0');
        setDeliveryImpact(rubric.deliveryImpact?.toString() || '0');
        setLiveDefenseScore(rubric.liveDefenseScore?.toString() || '0');
        setCommunication(rubric.communication?.toString() || '0');
        setFeedback(res.scoreData.feedback || '');
        setSelectedForFinal(res.scoreData.selectedForFinal || false);
        setSelectionReason(res.scoreData.selectionReason || '');
        setIsFrozen(res.scoreData.isFrozen);
        setEvalJuryName(res.scoreData.juryName || '');
      }
    } else {
      setErrorMsg(res.error || 'Failed to retrieve team details.');
      setSelectedTeamId(null);
    }
    setLoadingDetails(false);
  };

  const closeEvaluationModal = () => {
    setSelectedTeamId(null);
    setTeamDetails(null);
    setValidationErrors({});
  };

  const parseScoreInput = (val: string): number => {
    if (val === '') return 0;
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  };

  // Live total sum calculation
  const liveTotal =
    parseScoreInput(conceptStrength) +
    parseScoreInput(buildIntelligence) +
    parseScoreInput(deliveryImpact) +
    parseScoreInput(liveDefenseScore) +
    parseScoreInput(communication);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const validateField = (val: string, max: number, key: string) => {
      if (val === '') {
        errors[key] = 'Required';
        return;
      }
      const num = Number(val);
      if (isNaN(num) || !Number.isInteger(num) || num < 0 || num > max) {
        errors[key] = `Must be 0-${max}`;
      }
    };

    validateField(conceptStrength, 12, 'conceptStrength');
    validateField(buildIntelligence, 12, 'buildIntelligence');
    validateField(deliveryImpact, 8, 'deliveryImpact');
    validateField(liveDefenseScore, 8, 'liveDefenseScore');
    validateField(communication, 10, 'communication');

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitRequest = () => {
    if (validateForm()) {
      setShowConfirm(true);
    }
  };

  const handleFreezeSubmit = async () => {
    if (!teamDetails) return;

    setShowConfirm(false);
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const rubric: Rubric = {
      conceptStrength: parseScoreInput(conceptStrength),
      buildIntelligence: parseScoreInput(buildIntelligence),
      deliveryImpact: parseScoreInput(deliveryImpact),
      liveDefenseScore: parseScoreInput(liveDefenseScore),
      communication: parseScoreInput(communication)
    };

    const res = await submitAndFreezeEvaluation(
      teamDetails.id,
      teamDetails.teamName,
      teamDetails.displayId,
      rubric,
      feedback,
      selectedForFinal,
      selectionReason,
      activeRound
    );

    if (res.success) {
      setSuccessMsg(`Marks frozen and saved successfully for team "${teamDetails.teamName}".`);
      setIsFrozen(true);
      await loadDashboard();
      setTimeout(() => {
        closeEvaluationModal();
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Failed to freeze and submit marks.');
    }
    setIsSubmitting(false);
  };

  // Handler for updating Final Round Recommendation inline on the Final Round Selection sub-tab
  const handleRecommendationChange = async (
    teamId: string,
    newSelected: boolean,
    newReason: string
  ) => {
    setSyncingMap(prev => ({ ...prev, [teamId]: true }));
    setSyncSuccessMap(prev => ({ ...prev, [teamId]: '' }));

    // Optimistically update local state
    setPrelimsTeams(prev =>
      prev.map(t => (t.id === teamId ? { ...t, selectedForFinal: newSelected, selectionReason: newReason } : t))
    );

    const res = await updateFinalRoundRecommendation(teamId, newSelected, newReason);
    setSyncingMap(prev => ({ ...prev, [teamId]: false }));

    if (res.success) {
      setSyncSuccessMap(prev => ({ ...prev, [teamId]: 'Saved to DB ✓' }));
      setTimeout(() => {
        setSyncSuccessMap(prev => ({ ...prev, [teamId]: '' }));
      }, 2500);
    } else {
      setErrorMsg(res.error || 'Failed to update recommendation in DB.');
      await loadDashboard();
    }
  };

  // Filter team listings for Score sub-tab
  const currentTeamsList = mainTab === 'prelims' ? prelimsTeams : finaleTeams;
  const filteredTeams = currentTeamsList.filter(team => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      team.teamName.toLowerCase().includes(q) ||
      team.displayId.toLowerCase().includes(q)
    );
  });

  // Filter ONLY evaluated teams assigned to jury for Final Round Selection sub-tab
  const evaluatedAssignedTeams = prelimsTeams.filter(
    team => team.evaluationStatus === 'Evaluated'
  );

  return (
    <div className="space-y-6">

      {/* Top Header Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <span>⚖️</span> Jury Evaluation Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Review assigned teams, grade rubric criteria, and nominate top teams for the Final Round.
          </p>
        </div>

        {sessionInfo && (
          <div className="flex items-center gap-3 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div>
              <span className="font-bold text-gray-800 block">{sessionInfo.juryName}</span>
              <span className="text-gray-500 font-mono">{sessionInfo.email}</span>
            </div>
            {sessionInfo.labName && sessionInfo.labName !== 'N/A' && (
              <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-md border border-blue-200">
                📍 {sessionInfo.labName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* TOP LEVEL MAIN TABS: PRELIMS vs FINALE (Finale tab ONLY visible when final round starts in admin page) */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-3 shadow-xs">
        <button
          onClick={() => { setMainTab('prelims'); setSearchQuery(''); }}
          className={`pb-3 px-6 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 ${
            mainTab === 'prelims'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🏆</span> Prelims Round
        </button>

        {/* Finale Round Tab renders ONLY when finaleActive is true */}
        {finaleActive && (
          <button
            onClick={() => { setMainTab('finale'); setSearchQuery(''); }}
            className={`pb-3 px-6 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 ${
              mainTab === 'finale'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🚀</span> Finale Round (Finals)
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* PRELIMS ROUND SECTION */}
      {/* ============================================================== */}
      {mainTab === 'prelims' && (
        <div className="space-y-6">

          {/* SUB-TABS: SCORE vs FINAL ROUND SELECTION */}
          <div className="flex items-center space-x-2 bg-gray-100 p-1.5 rounded-lg w-fit text-sm font-bold border border-gray-200">
            <button
              onClick={() => setSubTab('score')}
              className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                subTab === 'score'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>📝</span> Score Teams
            </button>

            <button
              onClick={() => setSubTab('final_selection')}
              className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                subTab === 'final_selection'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>🌟</span> Final Round Selection
              {evaluatedAssignedTeams.length > 0 && (
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {evaluatedAssignedTeams.length}
                </span>
              )}
            </button>
          </div>

          {/* SUB-TAB 1: SCORE TEAMS */}
          {subTab === 'score' && (
            <div className="space-y-6">

              {/* Filter & Search Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Prelims Team Evaluations</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click any team card below to inspect roster and record evaluation scores.
                  </p>
                </div>

                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search teams by name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-xs"
                  />
                </div>
              </div>

              {!prelimsActive && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-sm font-semibold flex items-center gap-3 shadow-xs">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-bold text-amber-900">
                      {prelimsState === 'ended' ? 'Prelims Round Has Ended' : 'Prelims Round is Not Active'}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {prelimsState === 'ended'
                        ? 'Phase 3 (Prelims Round) evaluation period is closed. You can view scores and manage Final Round recommendations under the "Final Round Selection" tab.'
                        : 'The administrator has not started Phase 3 (Prelims Round) yet. You can view assigned teams, but evaluation score submission is locked until the admin activates the Prelims Round.'}
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded-lg">
                  {errorMsg}
                </div>
              )}

              {/* Main Teams Grid */}
              {loading ? (
                <div className="text-center py-12 text-gray-500 font-mono text-sm">Loading teams directory...</div>
              ) : filteredTeams.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-200 rounded-xl text-gray-500 text-sm shadow-xs">
                  No assigned teams found matching search criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTeams.map((team) => {
                    const isEval = team.evaluationStatus === 'Evaluated';
                    return (
                      <div
                        key={team.id}
                        onClick={() => handleCardClick(team.id, 'prelims')}
                        className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between cursor-pointer hover:bg-blue-50/40 hover:border-blue-300 transition-all shadow-xs group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-gray-400 font-mono block mb-1">#{team.displayId}</span>
                            <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition">
                              {team.teamName}
                            </h4>
                            {team.theme && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                📌 {team.theme}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            {isEval ? (
                              <span className="px-2.5 py-1 bg-green-100 border border-green-200 text-green-800 text-xs font-bold rounded-md flex items-center gap-1">
                                ✓ Evaluated
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-100 border border-amber-250 text-amber-800 text-xs font-bold rounded-md">
                                ⏳ Pending
                              </span>
                            )}

                            {isEval && team.totalScore !== undefined && (
                              <span className="font-mono text-sm font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                [{team.totalScore}/50]
                              </span>
                            )}
                          </div>
                        </div>

                        {team.selectedForFinal && (
                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                            <span className="px-2.5 py-1 bg-purple-100 border border-purple-200 text-purple-900 font-bold rounded-md flex items-center gap-1">
                              🌟 Nominated for Final Round
                            </span>
                            {team.selectionReason && (
                              <span className="text-gray-500 italic truncate max-w-[200px]">
                                "{team.selectionReason}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* SUB-TAB 2: FINAL ROUND SELECTION */}
          {subTab === 'final_selection' && (
            <div className="space-y-6">

              {/* Sub-tab Banner Header */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-2">
                <h3 className="text-lg font-bold text-purple-950 flex items-center gap-2">
                  <span>🌟</span> Final Round Selection & Recommendation
                </h3>
                <p className="text-xs text-purple-800 leading-relaxed">
                  Below are <strong>only the teams assigned to you that have been evaluated</strong>. You can toggle their nomination status for the Final Round and edit recommendation notes. All changes sync directly to the database in real-time.
                </p>
              </div>

              {evaluatedAssignedTeams.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-xl text-gray-500 space-y-3 shadow-xs">
                  <span className="text-3xl block">📋</span>
                  <h4 className="text-base font-bold text-gray-700">No Evaluated Teams Yet</h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    You have not submitted scores for any of your assigned teams. Please switch to the <strong>Score Teams</strong> sub-tab and evaluate teams first to manage their final round recommendations.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evaluatedAssignedTeams.map((team) => {
                    const isSyncing = syncingMap[team.id];
                    const syncMsg = syncSuccessMap[team.id];

                    return (
                      <div
                        key={team.id}
                        className={`bg-white border rounded-xl p-5 shadow-xs transition-all space-y-4 ${
                          team.selectedForFinal ? 'border-purple-300 ring-1 ring-purple-100' : 'border-gray-200'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-mono">#{team.displayId}</span>
                              <h4 className="text-base font-bold text-gray-900">{team.teamName}</h4>
                              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                Total: {team.totalScore}/50
                              </span>
                            </div>
                            {team.theme && (
                              <p className="text-xs text-gray-500 mt-0.5">Track: {team.theme}</p>
                            )}
                          </div>

                          {/* Nomination Toggle */}
                          <div className="flex items-center gap-3 bg-purple-50/70 p-2.5 rounded-lg border border-purple-200">
                            <label className="text-xs font-bold text-purple-900 cursor-pointer select-none">
                              Nominate for Final Round
                            </label>
                            <input
                              type="checkbox"
                              checked={Boolean(team.selectedForFinal)}
                              onChange={(e) =>
                                handleRecommendationChange(team.id, e.target.checked, team.selectionReason || '')
                              }
                              className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Recommendation Reason Edit Box */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-700">
                              Recommendation Notes / Reason for Final Round Selection
                            </label>

                            {/* Sync Status Badge */}
                            {isSyncing && (
                              <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1">
                                ⏳ Syncing to DB...
                              </span>
                            )}
                            {syncMsg && (
                              <span className="text-[11px] text-green-600 font-bold">
                                {syncMsg}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <textarea
                              rows={2}
                              value={team.selectionReason || ''}
                              onChange={(e) => {
                                const newReason = e.target.value;
                                setPrelimsTeams(prev =>
                                  prev.map(t => (t.id === team.id ? { ...t, selectionReason: newReason } : t))
                                );
                              }}
                              onBlur={(e) =>
                                handleRecommendationChange(team.id, Boolean(team.selectedForFinal), e.target.value)
                              }
                              placeholder="Add specific notes explaining why this team is recommended for the Final Round..."
                              className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleRecommendationChange(
                                  team.id,
                                  Boolean(team.selectedForFinal),
                                  team.selectionReason || ''
                                )
                              }
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                            >
                              Save Notes
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* FINALE ROUND SECTION (Only renders when finaleActive === true) */}
      {/* ============================================================== */}
      {mainTab === 'finale' && finaleActive && (
        <div className="space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Grand Finale Team Evaluations</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Select any un-evaluated finalist team below to evaluate. Already evaluated teams show the evaluating jury name.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search finale teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-xs"
              />
            </div>
          </div>

          {/* Finale Teams Grid */}
          {loading ? (
            <div className="text-center py-12 text-gray-500 font-mono text-sm">Loading finale teams...</div>
          ) : filteredTeams.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl text-gray-500 text-sm shadow-xs">
              No qualified finale teams found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTeams.map((team) => {
                const isEval = team.evaluationStatus === 'Evaluated';
                return (
                  <div
                    key={team.id}
                    onClick={() => handleCardClick(team.id, 'finale')}
                    className={`bg-white border rounded-xl p-5 flex flex-col justify-between cursor-pointer transition-all shadow-xs group ${
                      isEval
                        ? 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                        : 'border-purple-200 hover:bg-purple-50/40 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs text-purple-500 font-mono block mb-1">#{team.displayId}</span>
                        <h4 className="text-base font-bold text-gray-900 group-hover:text-purple-600 transition">
                          {team.teamName}
                        </h4>
                        {team.theme && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            📌 {team.theme}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        {isEval ? (
                          <div className="text-right">
                            <span className="px-2.5 py-1 bg-green-100 border border-green-200 text-green-800 text-xs font-bold rounded-md block">
                              ✓ Evaluated
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium block mt-1">
                              by {team.evaluatedBy || 'Jury'}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-100 border border-amber-250 text-amber-800 text-xs font-bold rounded-md">
                            ⏳ Pending Evaluation
                          </span>
                        )}

                        {isEval && team.totalScore !== undefined && (
                          <span className="font-mono text-sm font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 mt-1">
                            [{team.totalScore}/50]
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* POPUP MODAL: SCORING & DETAILS */}
      {/* ============================================================== */}
      {selectedTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white border border-gray-300 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">

            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Evaluation ({activeRound === 'prelims' ? 'Prelims' : 'Finale'}): {teamDetails ? teamDetails.teamName : 'Loading...'}
                </h3>
                {teamDetails && (
                  <span className="text-xs font-mono text-gray-500">ID: #{teamDetails.displayId}</span>
                )}
              </div>
              <button
                onClick={closeEvaluationModal}
                className="text-gray-500 hover:text-gray-800 font-bold px-2 text-xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">

              {loadingDetails ? (
                <div className="text-center py-6 text-gray-500 font-mono text-xs">Loading team data...</div>
              ) : teamDetails ? (
                <>
                  {errorMsg && (
                    <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded-lg">
                      {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 bg-green-100 border border-green-200 text-green-700 text-sm rounded-lg">
                      {successMsg}
                    </div>
                  )}

                  {isFrozen && (
                    <div className="p-3 bg-blue-100 border border-blue-200 text-blue-800 text-xs rounded-lg font-medium">
                      🔒 Marks for this team are frozen in the database{evalJuryName ? ` (Evaluated by ${evalJuryName})` : ''}. Editing rubric scores is disabled.
                    </div>
                  )}

                  {/* Team Members List */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-1 mb-2">
                      Team Roster
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">

                      {/* Lead */}
                      <div>
                        <span className="font-bold text-blue-600">Lead: </span>
                        {teamDetails.leadData?.name || 'N/A'}
                        <div className="text-xs text-gray-400">
                          Dept: {teamDetails.leadData?.department || 'N/A'} | Batch: {teamDetails.leadData?.batchNumber || 'N/A'}
                        </div>
                      </div>

                      {/* Members */}
                      {Array.from({ length: 3 }).map((_, idx) => {
                        const m = teamDetails.membersData?.[idx];
                        if (!m) return null;
                        return (
                          <div key={idx}>
                            <span className="font-bold">Member {idx + 1}: </span>
                            {m.name || 'N/A'}
                            <div className="text-xs text-gray-400">
                              Dept: {m.department || 'N/A'} | Batch: {m.batchNumber || 'N/A'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Evaluation Scores Table */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-1 mb-2">
                      Rubric Scoring (Entry Mandatory)
                    </h4>

                    <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50 text-gray-700 font-bold">
                        <tr>
                          <th className="p-2 border-b border-gray-200">Evaluation Criteria</th>
                          <th className="p-2 border-b border-gray-200 text-center w-24">Max Score</th>
                          <th className="p-2 border-b border-gray-200 text-center w-28">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {/* Concept Strength */}
                        <tr>
                          <td className="p-2">
                            <span className="font-bold block">Concept Strength</span>
                            <span className="text-xs text-gray-400">Research depth, concept originality & feasibility</span>
                          </td>
                          <td className="p-2 text-center">12</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={12}
                              value={conceptStrength}
                              disabled={isFrozen || isSubmitting}
                              onChange={(e) => setConceptStrength(e.target.value)}
                              className="w-16 p-1 border border-gray-300 rounded text-center"
                            />
                            {validationErrors.conceptStrength && (
                              <span className="text-[10px] text-red-500 block font-bold">{validationErrors.conceptStrength}</span>
                            )}
                          </td>
                        </tr>

                        {/* Build Intelligence */}
                        <tr>
                          <td className="p-2">
                            <span className="font-bold block">Build Intelligence</span>
                            <span className="text-xs text-gray-400">Software architecture, complexity & tech stack choice</span>
                          </td>
                          <td className="p-2 text-center">12</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={12}
                              value={buildIntelligence}
                              disabled={isFrozen || isSubmitting}
                              onChange={(e) => setBuildIntelligence(e.target.value)}
                              className="w-16 p-1 border border-gray-300 rounded text-center"
                            />
                            {validationErrors.buildIntelligence && (
                              <span className="text-[10px] text-red-500 block font-bold">{validationErrors.buildIntelligence}</span>
                            )}
                          </td>
                        </tr>

                        {/* Delivery Impact */}
                        <tr>
                          <td className="p-2">
                            <span className="font-bold block">Delivery Impact</span>
                            <span className="text-xs text-gray-400">Functional prototype status, responsiveness & viability</span>
                          </td>
                          <td className="p-2 text-center">8</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={8}
                              value={deliveryImpact}
                              disabled={isFrozen || isSubmitting}
                              onChange={(e) => setDeliveryImpact(e.target.value)}
                              className="w-16 p-1 border border-gray-300 rounded text-center"
                            />
                            {validationErrors.deliveryImpact && (
                              <span className="text-[10px] text-red-500 block font-bold">{validationErrors.deliveryImpact}</span>
                            )}
                          </td>
                        </tr>

                        {/* Live Defense Score */}
                        <tr>
                          <td className="p-2">
                            <span className="font-bold block">Live Defense Score</span>
                            <span className="text-xs text-gray-400">Technical Q&A defense & explanations</span>
                          </td>
                          <td className="p-2 text-center">8</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={8}
                              value={liveDefenseScore}
                              disabled={isFrozen || isSubmitting}
                              onChange={(e) => setLiveDefenseScore(e.target.value)}
                              className="w-16 p-1 border border-gray-300 rounded text-center"
                            />
                            {validationErrors.liveDefenseScore && (
                              <span className="text-[10px] text-red-500 block font-bold">{validationErrors.liveDefenseScore}</span>
                            )}
                          </td>
                        </tr>

                        {/* Communication */}
                        <tr>
                          <td className="p-2">
                            <span className="font-bold block">Communication</span>
                            <span className="text-xs text-gray-400">Presentation pitch delivery, slides & time keeping</span>
                          </td>
                          <td className="p-2 text-center">10</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={communication}
                              disabled={isFrozen || isSubmitting}
                              onChange={(e) => setCommunication(e.target.value)}
                              className="w-16 p-1 border border-gray-300 rounded text-center"
                            />
                            {validationErrors.communication && (
                              <span className="text-[10px] text-red-500 block font-bold">{validationErrors.communication}</span>
                            )}
                          </td>
                        </tr>

                        {/* Total Sum */}
                        <tr className="bg-gray-50 font-bold">
                          <td className="p-2 text-gray-800">Total Score (Calculated)</td>
                          <td className="p-2 text-center">50</td>
                          <td className="p-2 text-center text-blue-600 font-mono font-black text-base">
                            {liveTotal}/50
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Feedback Text Area */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-1 mb-2">
                      Jury Feedback (Optional)
                    </h4>
                    <textarea
                      placeholder="Write evaluation comments..."
                      rows={2}
                      value={feedback}
                      disabled={isFrozen || isSubmitting}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Submit / Close Actions */}
                  <div className="pt-4 border-t border-gray-250 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={closeEvaluationModal}
                      className="px-4 py-2 border border-gray-350 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm"
                    >
                      Close
                    </button>
                    {!isFrozen && (
                      <button
                        type="button"
                        onClick={handleSubmitRequest}
                        disabled={isSubmitting || (activeRound === 'prelims' ? !prelimsActive : !finaleActive)}
                        className={`px-4 py-2 text-white rounded-lg font-bold transition text-sm ${
                          isSubmitting || (activeRound === 'prelims' ? !prelimsActive : !finaleActive)
                            ? 'bg-red-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        Submit & Freeze
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500">Failed to load data.</div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG POPUP */}
      {showConfirm && teamDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white border border-gray-300 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-red-600">Confirm Evaluation Submission</h4>
            <p className="text-sm text-gray-650 leading-relaxed">
              Are you sure you want to freeze evaluations for team <strong>"{teamDetails.teamName}"</strong>?
            </p>
            <p className="text-xs text-red-600 bg-red-50 p-2 border border-red-100 rounded-lg leading-relaxed">
              Note: Once frozen, rubric scores will be locked in the database.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 border border-gray-350 text-gray-600 rounded-lg text-xs hover:bg-gray-100 transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFreezeSubmit}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition"
              >
                Yes, Submit & Freeze
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
