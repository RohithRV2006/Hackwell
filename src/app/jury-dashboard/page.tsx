'use client';

import { useState, useEffect } from 'react';
import {
  getJuryDashboardData,
  getTeamDetails,
  submitAndFreezeEvaluation,
  SimpleTeam,
  DetailedTeam,
  Rubric
} from './actions';

export default function JuryDashboard() {
  const [teams, setTeams] = useState<SimpleTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState<string>(ConfigSearch);
  function ConfigSearch() { return ''; }

  // Modal active state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamDetails, setTeamDetails] = useState<DetailedTeam | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form scores
  const [conceptStrength, setConceptStrength] = useState<string>('');
  const [buildIntelligence, setBuildIntelligence] = useState<string>('');
  const [deliveryImpact, setDeliveryImpact] = useState<string>('');
  const [liveDefenseScore, setLiveDefenseScore] = useState<string>('');
  const [communication, setCommunication] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isFrozen, setIsFrozen] = useState<boolean>(false);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [prelimsActive, setPrelimsActive] = useState<boolean>(true);

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMsg('');
    const res = await getJuryDashboardData();
    if (res.success && res.teams) {
      setTeams(res.teams);
      if (res.prelimsActive !== undefined) {
        setPrelimsActive(res.prelimsActive);
      }
    } else {
      setErrorMsg(res.error || 'Failed to retrieve teams list.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCardClick = async (teamId: string) => {
    setSelectedTeamId(teamId);
    setLoadingDetails(true);
    setErrorMsg('');
    setSuccessMsg('');
    setValidationErrors({});
    
    // Reset states
    setConceptStrength('');
    setBuildIntelligence('');
    setDeliveryImpact('');
    setLiveDefenseScore('');
    setCommunication('');
    setFeedback('');
    setIsFrozen(false);

    const res = await getTeamDetails(teamId);
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
        setIsFrozen(res.scoreData.isFrozen);
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
      if (val.trim() === '') {
        errors[key] = 'Required';
        return;
      }
      const num = parseInt(val, 10);
      if (isNaN(num) || !Number.isInteger(num)) {
        errors[key] = 'Must be an integer';
      } else if (num < 0 || num > max) {
        errors[key] = `Range 0-${max}`;
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

  const handleConfirmFreeze = async () => {
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
      feedback
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

  // Filter team listings
  const filteredTeams = teams.filter(team => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      team.teamName.toLowerCase().includes(q) ||
      team.displayId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Title & Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Team Evaluations</h2>
          <p className="text-sm text-gray-500">List of teams to evaluate. Click a team name to enter/freeze scores.</p>
        </div>
        
        {/* Simple Search */}
        <div>
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {!prelimsActive && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-sm text-amber-900 text-sm font-semibold flex items-center gap-3 shadow-sm">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold text-amber-900">Prelims Round is Not Active</p>
            <p className="text-xs text-amber-700 mt-0.5">
              The administrator has not started Phase 3 (Prelims Round) yet. You can view assigned teams, but evaluation score submission is locked until the admin activates the Prelims Round.
            </p>
          </div>
        </div>
      )}

      {errorMsg && !selectedTeamId && (
        <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded">
          {errorMsg}
        </div>
      )}

      {/* Main Grid: 2 Teams per Row */}
      {loading ? (
        <div className="text-center py-10 text-gray-500 font-mono text-sm">Loading teams directory...</div>
      ) : filteredTeams.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded text-gray-550 text-sm">
          No teams found matching search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTeams.map((team) => {
            const isEval = team.evaluationStatus === 'Evaluated';
            return (
              <div
                key={team.id}
                onClick={() => handleCardClick(team.id)}
                className="bg-white border border-gray-200 rounded p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition"
              >
                <div>
                  <span className="text-xs text-gray-400 font-mono block">#{team.displayId}</span>
                  {/* Clicking the Team Name or anywhere in the card will open modal. */}
                  <h3 className="text-base font-bold text-gray-800 hover:text-blue-600 transition">
                    {team.teamName}
                  </h3>
                </div>

                <div className="flex items-center space-x-3">
                  {isEval ? (
                    <span className="px-2 py-1 bg-green-100 border border-green-200 text-green-700 text-xs font-bold rounded">
                      Evaluated
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 border border-yellow-250 text-yellow-700 text-xs font-bold rounded">
                      Pending
                    </span>
                  )}
                  {isEval && team.totalScore !== undefined && (
                    <span className="font-mono text-sm font-bold text-gray-600">
                      [{team.totalScore}/50]
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================== */}
      {/* SIMPLE POPUP MODAL: SCORING & DETAILS */}
      {/* ============================================== */}
      {selectedTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40 overflow-y-auto">
          <div className="bg-white border border-gray-300 rounded shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Evaluation: {teamDetails ? teamDetails.teamName : 'Loading...'}
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
                    <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded">
                      {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 bg-green-100 border border-green-200 text-green-700 text-sm rounded">
                      {successMsg}
                    </div>
                  )}

                  {isFrozen && (
                    <div className="p-3 bg-blue-100 border border-blue-200 text-blue-800 text-xs rounded font-medium">
                      🔒 Marks for this team are frozen in the database. Editing is disabled.
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
                    
                    <table className="w-full text-sm text-left border border-gray-200 rounded">
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
                        <tr className="bg-gray-55 font-bold">
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
                      rows={3}
                      value={feedback}
                      disabled={isFrozen || isSubmitting}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Submit / Close Actions */}
                  <div className="pt-4 border-t border-gray-250 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={closeEvaluationModal}
                      className="px-4 py-2 border border-gray-350 text-gray-700 rounded hover:bg-gray-100 transition text-sm"
                    >
                      Close
                    </button>
                    {!isFrozen && (
                      <button
                        type="button"
                        onClick={handleSubmitRequest}
                        disabled={isSubmitting || !prelimsActive}
                        className={`px-4 py-2 text-white rounded font-bold transition text-sm ${isSubmitting || !prelimsActive ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white border border-gray-300 rounded p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h4 className="text-base font-bold text-red-600">Confirm Evaluation Submission</h4>
            <p className="text-sm text-gray-650 leading-relaxed">
              Are you sure you want to freeze evaluations for team <strong>"{teamDetails.teamName}"</strong>? 
            </p>
            <p className="text-xs text-red-600 bg-red-50 p-2 border border-red-100 rounded leading-relaxed">
              Note: Once frozen, you will no longer be able to edit or resubmit these marks in the database.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 border border-gray-350 text-gray-600 rounded text-xs hover:bg-gray-100 transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmFreeze}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition"
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
