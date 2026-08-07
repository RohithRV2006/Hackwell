'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  verifyAdminSession,
  getEventManagementDashboardDataAdmin,
  promoteTopTeamsToFinaleAdmin,
  toggleTeamFinaleQualifiedAdmin,
  setFinalWinnersAdmin,
  createLabAdmin,
  updateLabAdmin,
  deleteLabAdmin,
  autoAssignTeamsToLabsAdmin,
  randomlyAssignTeamsToLabsAdmin,
  unassignAllTeamsJuriesAdmin,
  autoAssignFinalTeamsToLabsAdmin,
  FinalLabData,
  getFinalLabsAdmin,
  createFinalLabAdmin,
  updateFinalLabAdmin,
  deleteFinalLabAdmin,
  setTimelinePhaseAdmin,
  updateTimelinePhaseAdmin,
  resetTimelinePhaseAdmin,
  updateEventTimelinesAdmin,
  applyPptFilterAdmin,
  resetPrelimsFiltersAndAssignmentsAdmin,
  publishJurySelectedFinalistsAdmin,
  upsertEvalRecordAdmin,
  updateTeamInDomainDocAdmin,
  EventTimelinesData,
  PhaseState,
  LabData,
  JuryOption,
  AdminTeamData,
  AdminScoreData,
  TimelineLiveStats,
  JuryStat,
} from '@/app/admin/actions';
import {
  exportToCSV,
  exportToPDF,
  exportAttendanceSheet,
  exportRegistrationReportPDF,
  exportRegistrationReportCSV,
} from './reports';
import { THEME_NAMES } from '@/lib/data/themes';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPhaseState(tl: { startDate?: string; endDate?: string; state?: PhaseState }): PhaseState {
  return (tl.state as PhaseState) || 'not-set';
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase Badge Component
// ─────────────────────────────────────────────────────────────────────────────
function PhaseBadge({ state }: { state: PhaseState }) {
  if (state === 'active') return (
    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
       LIVE / ACTIVE
    </span>
  );
  if (state === 'paused') return (
    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
       STOPPED / PAUSED
    </span>
  );
  if (state === 'ended') return (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
       FINISHED
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 border border-gray-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
      ○ NOT STARTED
    </span>
  );
}

function RoundControlButtons({
  state,
  canStart = true,
  canStartReason = '',
  onStart,
  onPause,
  onFinish,
  onReset,
}: {
  state: PhaseState;
  canStart?: boolean;
  canStartReason?: string;
  onStart: () => void;
  onPause: () => void;
  onFinish: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 bg-gray-50 border border-gray-200 rounded-sm">
        <button
          type="button"
          onClick={onStart}
          disabled={state === 'active' || !canStart}
          title={!canStart ? canStartReason : ''}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm text-xs font-extrabold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
        >
           Start Round
        </button>

        <button
          type="button"
          onClick={onPause}
          disabled={state === 'paused'}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-sm text-xs font-extrabold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
        >
           Stop / Pause Round
        </button>

        <button
          type="button"
          onClick={onFinish}
          disabled={state === 'ended'}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-sm text-xs font-extrabold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
        >
           Finish This Round
        </button>

        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-sm text-xs font-extrabold transition flex items-center gap-1.5 ml-auto"
        >
           Reset This Round
        </button>
      </div>

      {!canStart && state !== 'active' && (
        <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-sm flex items-center gap-1.5">
          <span></span> {canStartReason}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminEventManagementPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Timelines ──────────────────────────────────────────────────────────────
  const [timelines, setTimelines] = useState<EventTimelinesData>({
    timeline1: { name: 'Registration Phase', startDate: '', endDate: '', enabled: true, state: 'not-set' },
    timeline2: { name: 'PPT Submission Phase', startDate: '', endDate: '', enabled: true, state: 'not-set', pptFilterApplied: false },
    timeline3: { name: 'Prelims Round', startDate: '', endDate: '', enabled: true, topTeamsToFinal: 10, state: 'not-set', finalistsPromoted: false },
    timeline4: { name: 'Final Round', startDate: '', endDate: '', enabled: true, winnerCount: 3, state: 'not-set' },
  });

  // ── Derived Phase States ───────────────────────────────────────────────────
  const phase1State = getPhaseState(timelines.timeline1);
  const phase2State = getPhaseState(timelines.timeline2);
  const phase3State = getPhaseState(timelines.timeline3);
  const phase4State = getPhaseState(timelines.timeline4);

  // ── Live Stats ─────────────────────────────────────────────────────────────
  // ── Data ───────────────────────────────────────────────────────────────────
  const [teams, setTeams] = useState<AdminTeamData[]>([]);
  const [prelimsScores, setPrelimsScores] = useState<AdminScoreData[]>([]);
  const [finaleScores, setFinaleScores] = useState<AdminScoreData[]>([]);

  // ── Lab / Jury ─────────────────────────────────────────────────────────────
  const [labs, setLabs] = useState<LabData[]>([]);
  const [juriesList, setJuriesList] = useState<JuryOption[]>([]);

  // ── Computed Live Stats (In Client Memory - Zero extra Firestore reads!) ─
  const liveStats: TimelineLiveStats = useMemo(() => {
    const totalTeams = teams.length;
    let totalStudents = 0;
    let pptSubmittedCount = 0;
    let finalistCount = 0;

    teams.forEach((t) => {
      let count = 0;
      if (t.leadData || t.leadEmail) count += 1;
      if (Array.isArray(t.membersData)) count += t.membersData.length;
      if (count === 0) count = 1;
      totalStudents += count;

      if (t.pptLink && String(t.pptLink).trim().length > 0) {
        pptSubmittedCount += 1;
      }
      if (t.finaleQualified === true) {
        finalistCount += 1;
      }
    });

    const labJuryMap = new Map<string, string>();
    labs.forEach((l) => {
      if (l.assignedJuryName) {
        labJuryMap.set(l.assignedJuryName, l.labName || '');
      }
    });

    const prelimsCountByJury: Record<string, number> = {};
    prelimsScores.forEach((s) => {
      const key = s.juryName || s.juryId || 'Unassigned';
      prelimsCountByJury[key] = (prelimsCountByJury[key] || 0) + 1;
    });

    const finaleCountByJury: Record<string, number> = {};
    finaleScores.forEach((s) => {
      const key = s.juryName || s.juryId || 'Unassigned';
      finaleCountByJury[key] = (finaleCountByJury[key] || 0) + 1;
    });

    const juryStats: JuryStat[] = juriesList.map((j) => ({
      juryId: j.id,
      juryName: j.name,
      institution: j.institution || '',
      assignedLab: labJuryMap.get(j.name) || 'Unassigned',
      prelimsEvaluatedCount: prelimsCountByJury[j.name] || prelimsCountByJury[j.id] || 0,
      finaleEvaluatedCount: finaleCountByJury[j.name] || finaleCountByJury[j.id] || 0,
    }));

    return {
      totalTeams,
      totalStudents,
      pptSubmittedCount,
      prelimsEvaluatedCount: prelimsScores.length,
      finaleEvaluatedCount: finaleScores.length,
      finalistCount,
      juryStats,
    };
  }, [teams, prelimsScores, finaleScores, labs, juriesList]);
  const [editingLabId, setEditingLabId] = useState<string | null>(null);
  const [labName, setLabName] = useState('');
  const [labCode, setLabCode] = useState('');
  const [assignedJuryName, setAssignedJuryName] = useState('');
  const [assignedTheme, setAssignedTheme] = useState('');
  const [submittingLab, setSubmittingLab] = useState(false);
  const [allocating, setAllocating] = useState(false);

  // ── Final Labs State ───────────────────────────────────────────────────────
  const [finalLabs, setFinalLabs] = useState<FinalLabData[]>([]);
  const [editingFinalLabId, setEditingFinalLabId] = useState<string | null>(null);
  const [finalLabName, setFinalLabName] = useState('');
  const [finalLabCode, setFinalLabCode] = useState('');
  const [finalLabCapacity, setFinalLabCapacity] = useState<number>(25);
  const [finalLabCoordinator, setFinalLabCoordinator] = useState('');
  const [submittingFinalLab, setSubmittingFinalLab] = useState(false);
  const [allocatingFinal, setAllocatingFinal] = useState(false);

  // ── Per-phase form state ───────────────────────────────────────────────────
  const [p1Start, setP1Start] = useState('');
  const [p1End, setP1End] = useState('');
  const [p1Saving, setP1Saving] = useState(false);

  const [p2Start, setP2Start] = useState('');
  const [p2End, setP2End] = useState('');
  const [p2Saving, setP2Saving] = useState(false);
  const [applyingPptFilter, setApplyingPptFilter] = useState(false);

  const [p3Start, setP3Start] = useState('');
  const [p3End, setP3End] = useState('');
  const [p3Saving, setP3Saving] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const [p4Start, setP4Start] = useState('');
  const [p4End, setP4End] = useState('');
  const [p4Saving, setP4Saving] = useState(false);

  // ── Prelims Selection & Sub-tabs State ─────────────────────────────────────
  const [prelimsSubTab, setPrelimsSubTab] = useState<'scores' | 'selection'>('scores');
  const [selectedFinalistIds, setSelectedFinalistIds] = useState<Set<string>>(new Set());
  const [publishingFinalists, setPublishingFinalists] = useState(false);

  // Admin Score Edit Modal State
  const [editingScoreItem, setEditingScoreItem] = useState<{ team: AdminTeamData; evalRecord?: AdminScoreData } | null>(null);
  const [editScoreConcept, setEditScoreConcept] = useState<number>(0);
  const [editScoreBuild, setEditScoreBuild] = useState<number>(0);
  const [editScoreDelivery, setEditScoreDelivery] = useState<number>(0);
  const [editScoreDefense, setEditScoreDefense] = useState<number>(0);
  const [editScoreComm, setEditScoreComm] = useState<number>(0);
  const [editScoreFeedback, setEditScoreFeedback] = useState<string>('');
  const [editScoreJudge, setEditScoreJudge] = useState<string>('');
  const [editScoreLab, setEditScoreLab] = useState<string>('');
  const [savingScoreEdit, setSavingScoreEdit] = useState(false);

  // ── Winner Selection ───────────────────────────────────────────────────────
  const [winner1st, setWinner1st] = useState('');
  const [winner2nd, setWinner2nd] = useState('');
  const [winner3rd, setWinner3rd] = useState('');
  const [savingWinners, setSavingWinners] = useState(false);

  // ── Details Modal ──────────────────────────────────────────────────────────
  const [activeModalTimeline, setActiveModalTimeline] = useState<'1' | '2' | '3' | '4' | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState<AdminTeamData | null>(null);



  // ─────────────────────────────────────────────────────────────────────────
  // Single-Call Data Load (Minimum Quota & Zero Duplicate Reads)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const valid = await verifyAdminSession();
      setIsAuthenticated(valid);
      if (valid) {
        setLoading(true);
        const res = await getEventManagementDashboardDataAdmin();

        if (res.success && res.timelines) {
          const tl = res.timelines;
          setTimelines(tl);
          setP1Start(tl.timeline1.startDate || '');
          setP1End(tl.timeline1.endDate || '');
          setP2Start(tl.timeline2.startDate || '');
          setP2End(tl.timeline2.endDate || '');
          setP3Start(tl.timeline3.startDate || '');
          setP3End(tl.timeline3.endDate || '');
          setP4Start(tl.timeline4.startDate || '');
          setP4End(tl.timeline4.endDate || '');
        }
        if (res.teams) {
          setTeams(res.teams);
          setWinner1st(res.teams.find((t) => t.winnerRank === 1)?.id || '');
          setWinner2nd(res.teams.find((t) => t.winnerRank === 2)?.id || '');
          setWinner3rd(res.teams.find((t) => t.winnerRank === 3)?.id || '');
        }
        if (res.prelimsScores) setPrelimsScores(res.prelimsScores);
        if (res.finaleScores) setFinaleScores(res.finaleScores);
        if (res.labs) setLabs(res.labs);
        if (res.finalLabs) setFinalLabs(res.finalLabs);
        if (res.juries) setJuriesList(res.juries);
        setLoading(false);
      } else {
        setLoading(false);
      }
    })();
  }, []);

  // Sync selected finalist IDs from teams and prelimsScores
  useEffect(() => {
    const ids = new Set<string>();
    teams.forEach((t) => {
      if (t.finaleQualified === true || t.prelimsStatus === 'selected') {
        ids.add(t.id);
      }
    });
    prelimsScores.forEach((s) => {
      if (s.selectedForFinal) {
        ids.add(s.teamId);
      }
    });
    setSelectedFinalistIds(ids);
  }, [teams, prelimsScores]);

  const handleToggleFinalist = (teamId: string) => {
    setSelectedFinalistIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handlePublishFinalists = async () => {
    if (selectedFinalistIds.size === 0) {
      if (!confirm('No teams selected for Final Round. Proceed to clear all finalists?')) return;
    }
    setPublishingFinalists(true);
    setMsg(null);

    const res = await publishJurySelectedFinalistsAdmin(Array.from(selectedFinalistIds));
    if (res.success) {
      setMsg({
        type: 'success',
        text: ` Successfully published ${res.count} teams to the Final Round! All student dashboards and Phase 4 are updated.`,
      });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to publish finalists.' });
    }
    setPublishingFinalists(false);
  };

  const handleOpenEditScore = (team: AdminTeamData, evalRecord?: AdminScoreData) => {
    setEditingScoreItem({ team, evalRecord });
    const r = evalRecord?.rubric || ({} as any);
    setEditScoreConcept(r.conceptStrength ?? 0);
    setEditScoreBuild(r.buildIntelligence ?? 0);
    setEditScoreDelivery(r.deliveryImpact ?? 0);
    setEditScoreDefense(r.liveDefenseScore ?? 0);
    setEditScoreComm(r.communication ?? 0);
    setEditScoreFeedback(evalRecord?.feedback || evalRecord?.remarks || team.feedback || '');
    setEditScoreJudge(evalRecord?.juryName || team.judge || 'Unassigned');
    setEditScoreLab(team.labNo || 'Unassigned');
  };

  const handleSaveScoreEdit = async () => {
    if (!editingScoreItem) return;
    setSavingScoreEdit(true);
    setMsg(null);

    const team = editingScoreItem.team;
    const totalScore = editScoreConcept + editScoreBuild + editScoreDelivery + editScoreDefense + editScoreComm;

    const evalPayload = {
      id: editingScoreItem.evalRecord?.id || `prelims_${editScoreJudge.toLowerCase().replace(/\s+/g, '_')}_${team.id}`,
      round: 'prelims',
      teamName: team.teamName,
      displayId: team.displayId || team.id,
      teamId: team.id,
      juryId: editingScoreItem.evalRecord?.juryId || editScoreJudge.toLowerCase().replace(/\s+/g, '_'),
      juryName: editScoreJudge,
      rubric: {
        conceptStrength: editScoreConcept,
        buildIntelligence: editScoreBuild,
        deliveryImpact: editScoreDelivery,
        liveDefenseScore: editScoreDefense,
        communication: editScoreComm,
      },
      totalScore,
      feedback: editScoreFeedback.trim(),
      remarks: editScoreFeedback.trim(),
      selectedForFinal: editingScoreItem.evalRecord?.selectedForFinal || false,
      selectionReason: editingScoreItem.evalRecord?.selectionReason || '',
      isFrozen: true,
    };

    const evalRes = await upsertEvalRecordAdmin('prelims', evalPayload);
    const teamRes = await updateTeamInDomainDocAdmin(team.id, {
      score: totalScore,
      judge: editScoreJudge,
      labNo: editScoreLab,
      assignedLabName: editScoreLab,
      feedback: editScoreFeedback.trim(),
    });

    if (evalRes.success && teamRes.success) {
      setMsg({ type: 'success', text: `Updated score & assignment for team "${team.teamName}".` });
      setEditingScoreItem(null);
      await refreshData();
    } else {
      setMsg({ type: 'error', text: evalRes.error || teamRes.error || 'Failed to update score.' });
    }
    setSavingScoreEdit(false);
  };

  const refreshData = async () => {
    const res = await getEventManagementDashboardDataAdmin();
    if (res.success && res.timelines) setTimelines(res.timelines);
    if (res.teams) setTeams(res.teams);
    if (res.prelimsScores) setPrelimsScores(res.prelimsScores);
    if (res.finaleScores) setFinaleScores(res.finaleScores);
    if (res.labs) setLabs(res.labs);
    if (res.finalLabs) setFinalLabs(res.finalLabs);
    if (res.juries) setJuriesList(res.juries);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Explicit Phase & Round Handlers (Start, Stop/Pause, Finish, Reset)
  // ─────────────────────────────────────────────────────────────────────────
  const handleStartRound = async (timeline: '1' | '2' | '3' | '4') => {
    setMsg(null);

    // Sequence Validation: Cannot start next round unless previous round is FINISHED ('ended')
    if (timeline === '2' && phase1State !== 'ended') {
      setMsg({
        type: 'error',
        text: ' Cannot start Phase 2 (PPT Submission)! Phase 1 (Registration Phase) must be FINISHED before Phase 2 can begin.',
      });
      return;
    }

    if (timeline === '3' && phase2State !== 'ended') {
      setMsg({
        type: 'error',
        text: ' Cannot start Phase 3 (Prelims Round)! Phase 2 (PPT Submission Phase) must be FINISHED before Phase 3 can begin.',
      });
      return;
    }

    if (timeline === '4' && phase3State !== 'ended') {
      setMsg({
        type: 'error',
        text: ' Cannot start Phase 4 (Final Round)! Phase 3 (Prelims Round) must be FINISHED before Phase 4 can begin.',
      });
      return;
    }

    const res = await updateTimelinePhaseAdmin(timeline, {
      state: 'active',
      enabled: true,
      updatedAt: new Date().toISOString(),
    });
    if (res.success) {
      setMsg({ type: 'success', text: ` Phase ${timeline} has been STARTED and is now LIVE.` });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to start round.' });
    }
  };

  const handlePauseRound = async (timeline: '1' | '2' | '3' | '4') => {
    setMsg(null);
    const res = await updateTimelinePhaseAdmin(timeline, {
      state: 'paused',
      enabled: false,
      updatedAt: new Date().toISOString(),
    });
    if (res.success) {
      setMsg({ type: 'success', text: ` Phase ${timeline} has been STOPPED / PAUSED.` });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to pause round.' });
    }
  };

  const handleFinishRound = async (timeline: '1' | '2' | '3' | '4') => {
    if (!confirm(`Are you sure you want to FINISH Phase ${timeline}?`)) return;
    setMsg(null);
    const res = await updateTimelinePhaseAdmin(timeline, {
      state: 'ended',
      enabled: false,
      updatedAt: new Date().toISOString(),
    });
    if (res.success) {
      setMsg({ type: 'success', text: ` Phase ${timeline} is now FINISHED / ENDED.` });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to finish round.' });
    }
  };

  const handleResetRound = async (timeline: '1' | '2' | '3' | '4') => {
    if (!confirm(`Are you sure you want to RESET Phase ${timeline}? This will reset progress for Phase ${timeline}.`)) return;
    setMsg(null);
    const res = await resetTimelinePhaseAdmin(timeline);
    if (res.success) {
      setMsg({ type: 'success', text: ` Phase ${timeline} has been RESET.` });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to reset round.' });
    }
  };

  const handleSetPhase = async (phase: '1' | '2' | '3' | '4') => {
    let start = '', end = '', extra: Record<string, any> = {};

    if (phase === '1') { start = p1Start; end = p1End; setP1Saving(true); }
    if (phase === '2') { start = p2Start; end = p2End; setP2Saving(true); }
    if (phase === '3') { start = p3Start; end = p3End; setP3Saving(true); }
    if (phase === '4') { start = p4Start; end = p4End; setP4Saving(true); }

    if (!start || !end) {
      setMsg({ type: 'error', text: 'Please set both Start and End date/time.' });
      if (phase === '1') setP1Saving(false);
      if (phase === '2') setP2Saving(false);
      if (phase === '3') setP3Saving(false);
      if (phase === '4') setP4Saving(false);
      return;
    }

    setMsg(null);
    const res = await setTimelinePhaseAdmin(phase, start, end, extra);
    if (res.success) {
      setMsg({ type: 'success', text: `Phase ${phase} has been set successfully!` });
      setTimelines((prev) => ({
        ...prev,
        [`timeline${phase}`]: {
          ...prev[`timeline${phase}` as 'timeline1' | 'timeline2' | 'timeline3' | 'timeline4'],
          startDate: start,
          endDate: end,
          state: 'active',
          enabled: true,
          ...extra,
        },
      }));
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to set phase.' });
    }
    if (phase === '1') setP1Saving(false);
    if (phase === '2') setP2Saving(false);
    if (phase === '3') setP3Saving(false);
    if (phase === '4') setP4Saving(false);
  };

  const handleToggleConsent = async () => {
    setMsg(null);
    const newValue = !timelines.consentLetterEnabled;
    const newTimelines = { ...timelines, consentLetterEnabled: newValue };
    
    // Optimistic update
    setTimelines(newTimelines);

    const res = await updateEventTimelinesAdmin(newTimelines);
    if (res.success) {
      setMsg({ type: 'success', text: `Consent Letter is now ${newValue ? 'ENABLED (Visible)' : 'DISABLED (Hidden)'} for students.` });
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to toggle consent letter.' });
      // Revert on failure
      setTimelines(timelines);
    }
  };

  const handleUpdatePhase = async (phase: '1' | '2' | '3' | '4') => {
    let updates: Record<string, any> = {};
    if (phase === '1') { updates = { startDate: p1Start, endDate: p1End }; setP1Saving(true); }
    if (phase === '2') { updates = { startDate: p2Start, endDate: p2End }; setP2Saving(true); }
    if (phase === '3') { updates = { startDate: p3Start, endDate: p3End }; setP3Saving(true); }
    if (phase === '4') { updates = { startDate: p4Start, endDate: p4End }; setP4Saving(true); }

    setMsg(null);
    const res = await updateTimelinePhaseAdmin(phase, updates);
    if (res.success) {
      setMsg({ type: 'success', text: `Phase ${phase} updated successfully.` });
      setTimelines((prev) => ({
        ...prev,
        [`timeline${phase}`]: {
          ...prev[`timeline${phase}` as 'timeline1' | 'timeline2' | 'timeline3' | 'timeline4'],
          ...updates,
        },
      }));
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to update.' });
    }
    if (phase === '1') setP1Saving(false);
    if (phase === '2') setP2Saving(false);
    if (phase === '3') setP3Saving(false);
    if (phase === '4') setP4Saving(false);
  };

  const handleResetPhase = async (phase: '1' | '2' | '3' | '4') => {
    if (!confirm(`Are you sure you want to reset Phase ${phase}? This will clear configured dates and reset Phase ${phase} back to Not Set.`)) return;

    setMsg(null);
    const res = await resetTimelinePhaseAdmin(phase);
    if (res.success) {
      setMsg({ type: 'success', text: `Phase ${phase} reset to Not Set successfully!` });
      if (phase === '1') { setP1Start(''); setP1End(''); }
      if (phase === '2') { setP2Start(''); setP2End(''); }
      if (phase === '3') { setP3Start(''); setP3End(''); }
      if (phase === '4') { setP4Start(''); setP4End(''); }

      setTimelines((prev) => ({
        ...prev,
        [`timeline${phase}`]: {
          ...prev[`timeline${phase}` as 'timeline1' | 'timeline2' | 'timeline3' | 'timeline4'],
          startDate: '',
          endDate: '',
          state: 'not-set',
          enabled: false,
          ...(phase === '2' ? { pptFilterApplied: false } : {}),
          ...(phase === '3' ? { finalistsPromoted: false } : {}),
        },
      }));
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to reset phase.' });
    }
  };

  const handleApplyPptFilter = async () => {
    if (phase2State !== 'ended') {
      setMsg({ type: 'error', text: 'Phase 2 hasn\'t completed yet! You cannot apply the PPT filter until Phase 2 ends.' });
      return;
    }
    if (!confirm('Apply PPT filter? Teams without a PPT link will be marked as failed and cannot proceed to Prelims.')) return;
    setApplyingPptFilter(true);
    setMsg(null);
    const res = await applyPptFilterAdmin();
    if (res.success) {
      setMsg({ type: 'success', text: `PPT filter applied!  ${res.passed} teams passed,  ${res.failed} teams failed.` });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to apply PPT filter.' });
    }
    setApplyingPptFilter(false);
  };

  const handleResetPrelimsFilters = async () => {
    if (!confirm('Undo/reset all Prelims filters and team assignments? This will clear disqualifications and reset team lab/jury allocations without deleting any team, jury, or lab configuration data.')) return;
    setMsg(null);
    const res = await resetPrelimsFiltersAndAssignmentsAdmin();
    if (res.success) {
      setMsg({ type: 'success', text: ` Undone all Prelims filters and team assignments successfully! ${res.resetCount} teams reset.` });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to reset prelims filters.' });
    }
  };

  const handlePromoteTeams = async () => {
    await handlePublishFinalists();
  };

  const handleToggleQualification = async (teamId: string, currentVal: boolean) => {
    if (phase3State !== 'ended') {
      setMsg({ type: 'error', text: 'Phase 3 hasn\'t completed yet! You cannot modify finalists until Phase 3 ends.' });
      return;
    }
    setMsg(null);
    const res = await toggleTeamFinaleQualifiedAdmin(teamId, !currentVal);
    if (res.success) {
      setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, finaleQualified: !currentVal } : t)));
      refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to update qualification.' });
    }
  };

  const handleSaveWinners = async () => {
    if (phase3State !== 'ended') {
      setMsg({ type: 'error', text: 'Phase 3 hasn\'t completed yet! You cannot select winners until Phase 3 ends.' });
      return;
    }
    setSavingWinners(true);
    setMsg(null);
    const payload: { teamId: string; rank: number; title: string }[] = [];
    if (winner1st) payload.push({ teamId: winner1st, rank: 1, title: '1st Place / Champion' });
    if (winner2nd) payload.push({ teamId: winner2nd, rank: 2, title: '2nd Place / 1st Runner Up' });
    if (winner3rd) payload.push({ teamId: winner3rd, rank: 3, title: '3rd Place / 2nd Runner Up' });
    const res = await setFinalWinnersAdmin(payload);
    if (res.success) {
      setMsg({ type: 'success', text: ' Final winners saved and published!' });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to save winners.' });
    }
    setSavingWinners(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Prelims Lab Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleStartEditLab = (lab: LabData) => {
    setEditingLabId(lab.labId);
    setLabName(lab.labName);
    setLabCode(lab.labCode || '');
    setAssignedJuryName(lab.assignedJuryName !== 'Unassigned' ? lab.assignedJuryName : '');
    setAssignedTheme(lab.assignedTheme || '');
  };

  const handleCancelEditLab = () => {
    setEditingLabId(null);
    setLabName('');
    setLabCode('');
    setAssignedJuryName('');
    setAssignedTheme('');
  };

  const handleSubmitLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase2State !== 'ended') {
      setMsg({ type: 'error', text: 'Phase 2 hasn\'t completed yet! You cannot configure labs until Phase 2 ends.' });
      return;
    }
    if (!labName.trim()) { setMsg({ type: 'error', text: 'Lab Name is required.' }); return; }
    setSubmittingLab(true);
    setMsg(null);
    const fn = editingLabId
      ? updateLabAdmin(editingLabId, labName, labCode, 0, assignedJuryName, assignedTheme)
      : createLabAdmin(labName, labCode, 0, assignedJuryName, assignedTheme);
    const res = await fn;
    if (res.success) {
      setMsg({ type: 'success', text: `Lab "${labName}" ${editingLabId ? 'updated' : 'created'} successfully.` });
      handleCancelEditLab();
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to save lab.' });
    }
    setSubmittingLab(false);
  };

  const handleDeleteLab = async (lab: LabData) => {
    if (phase2State !== 'ended') {
      setMsg({ type: 'error', text: 'Phase 2 hasn\'t completed yet! You cannot delete labs until Phase 2 ends.' });
      return;
    }
    if (!confirm(`Delete "${lab.labName}"?`)) return;
    setMsg(null);
    const res = await deleteLabAdmin(lab.labId);
    if (res.success) {
      setMsg({ type: 'success', text: `Lab "${lab.labName}" deleted.` });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to delete lab.' });
    }
  };

  const handleAutoAssignTeams = async () => {
    setAllocating(true);
    setMsg(null);
    const res = await autoAssignTeamsToLabsAdmin();
    if (res.success) {
      setMsg({
        type: 'success',
        text: `Auto-assigned ${res.assignedCount} teams across labs based on Problem Statement Theme matching! ${res.eliminatedCount ? `${res.eliminatedCount} non-PPT teams marked as eliminated.` : ''}`
      });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to auto-assign.' });
    }
    setAllocating(false);
  };

  const handleRandomAssignTeams = async () => {
    if (!confirm('Randomly assign all teams across configured Juries & Labs?')) return;
    setAllocating(true);
    setMsg(null);
    const res = await randomlyAssignTeamsToLabsAdmin();
    if (res.success) {
      setMsg({
        type: 'success',
        text: ` Randomly assigned ${res.assignedCount} teams across active Juries & Labs! ${res.eliminatedCount ? `${res.eliminatedCount} non-PPT teams marked as eliminated.` : ''}`
      });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to randomly assign.' });
    }
    setAllocating(false);
  };

  const handleUndoAllAssignments = async () => {
    if (!confirm('Are you sure you want to undo and reset ALL Jury/Lab assignments back to Unassigned?')) return;
    setAllocating(true);
    setMsg(null);
    const res = await unassignAllTeamsJuriesAdmin();
    if (res.success) {
      setMsg({
        type: 'success',
        text: `↺ Successfully undone and reset assignments for ${res.count} teams back to Unassigned.`
      });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to undo assignments.' });
    }
    setAllocating(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Final Lab Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleStartEditFinalLab = (lab: FinalLabData) => {
    setEditingFinalLabId(lab.labId);
    setFinalLabName(lab.labName);
    setFinalLabCode(lab.labCode || '');
    setFinalLabCapacity(lab.capacity || 25);
    setFinalLabCoordinator(lab.coordinator !== 'Unassigned' ? (lab.coordinator || '') : '');
  };

  const handleCancelEditFinalLab = () => {
    setEditingFinalLabId(null);
    setFinalLabName('');
    setFinalLabCode('');
    setFinalLabCapacity(25);
    setFinalLabCoordinator('');
  };

  const handleSubmitFinalLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase3State !== 'ended') {
      setMsg({ type: 'error', text: 'Phase 3 hasn\'t completed yet! You cannot configure Final Labs until Phase 3 ends.' });
      return;
    }
    if (!finalLabName.trim()) { setMsg({ type: 'error', text: 'Final Lab Name is required.' }); return; }
    setSubmittingFinalLab(true);
    setMsg(null);
    const fn = editingFinalLabId
      ? updateFinalLabAdmin(editingFinalLabId, finalLabName, finalLabCode, finalLabCapacity, finalLabCoordinator)
      : createFinalLabAdmin(finalLabName, finalLabCode, finalLabCapacity, finalLabCoordinator);
    const res = await fn;
    if (res.success) {
      setMsg({ type: 'success', text: `Final Lab "${finalLabName}" ${editingFinalLabId ? 'updated' : 'created'} successfully.` });
      handleCancelEditFinalLab();
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to save final lab.' });
    }
    setSubmittingFinalLab(false);
  };

  const handleDeleteFinalLab = async (lab: FinalLabData) => {
    if (phase3State !== 'ended') {
      setMsg({ type: 'error', text: 'Phase 3 hasn\'t completed yet! You cannot delete Final Labs until Phase 3 ends.' });
      return;
    }
    if (!confirm(`Delete Final Lab "${lab.labName}"?`)) return;
    setMsg(null);
    const res = await deleteFinalLabAdmin(lab.labId);
    if (res.success) {
      setMsg({ type: 'success', text: `Final Lab "${lab.labName}" deleted.` });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to delete final lab.' });
    }
  };

  const handleAutoAssignFinalTeams = async () => {
    if (phase3State !== 'ended') {
      setMsg({ type: 'error', text: 'Phase 3 hasn\'t completed yet! You cannot auto-assign final venues until Phase 3 ends.' });
      return;
    }
    setAllocatingFinal(true);
    setMsg(null);
    const res = await autoAssignFinalTeamsToLabsAdmin();
    if (res.success) {
      setMsg({
        type: 'success',
        text: ` Auto-assigned final round venues for ${res.assignedCount} qualified finalist teams!`
      });
      await refreshData();
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to auto-assign final venues.' });
    }
    setAllocatingFinal(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Computed Data
  // ─────────────────────────────────────────────────────────────────────────
  const prelimsRankedTeams = teams
    .map((team) => {
      const teamScores = prelimsScores.filter((s) => s.teamId === team.id);
      const score = teamScores.length > 0 ? (teamScores[0].totalScore || 0) : 0;
      return { ...team, judge: team.judge || 'Unassigned', labNo: team.labNo || 'Unassigned', evalCount: teamScores.length, score, scoresBreakdown: teamScores };
    })
    .sort((a, b) => b.score - a.score);

  const finaleRankedTeams = teams
    .filter((t) => t.finaleQualified === true || t.prelimsStatus === 'selected')
    .map((team) => {
      const scores = finaleScores.filter((s) => s.teamId === team.id);
      const avg = scores.length > 0 ? scores.reduce((a, s) => a + s.totalScore, 0) / scores.length : 0;
      return { ...team, judge: team.judge || 'Unassigned', labNo: team.finalVenue || team.labNo || 'Unassigned', evalCount: scores.length, avgScore: Number(avg.toFixed(1)), scoresBreakdown: scores };
    })
    .sort((a, b) => b.avgScore - a.avgScore);

  const modalFilteredTeams = teams.filter((t) => {
    const q = modalSearchQuery.toLowerCase();
    return !q || t.teamName.toLowerCase().includes(q) || t.displayId?.toLowerCase().includes(q) || t.leadEmail.toLowerCase().includes(q) || t.leadData?.name.toLowerCase().includes(q);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Export Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const exportTimeline1Report = (fmt: 'csv' | 'pdf') => {
    fmt === 'csv'
      ? exportRegistrationReportCSV(teams)
      : exportRegistrationReportPDF(teams);
  };

  const exportTimeline2Report = (fmt: 'csv' | 'pdf') => {
    const headers = ['Display ID', 'Team Name', 'Lead Email', 'PPT Link', 'Status'];
    const rows: (string | number)[][] = teams.map((t) => [t.displayId || t.id, t.teamName, t.leadEmail, t.pptLink || 'Not Uploaded', t.pptLink ? 'Submitted' : 'Pending']);
    fmt === 'csv' ? exportToCSV('Timeline2_PPT_Report', headers, rows) : exportToPDF('PPT Submission Phase Report', 'PPT submission status', headers, rows);
  };

  const exportTimeline3Report = (fmt: 'csv' | 'pdf') => {

    const headers = ['Rank', 'Team Name', 'Jury', 'Lab', 'Evals', 'Score (/50)', 'Finalist'];
    const rows: (string | number)[][] = prelimsRankedTeams.map((t, i) => [i + 1, t.teamName, t.judge, t.labNo, t.evalCount, t.score, t.finaleQualified ? 'Yes' : 'No']);
    fmt === 'csv' ? exportToCSV('Timeline3_Prelims_Report', headers, rows) : exportToPDF('Prelims Round Report', 'Prelims evaluation scores & rankings', headers, rows);
  };

  const exportTimeline4Report = (fmt: 'csv' | 'pdf') => {
    const headers = ['Rank', 'Display ID', 'Team Name', 'Lead Email', 'Final Venue', 'Finale Score (/40)', 'Award'];
    const rows: (string | number)[][] = finaleRankedTeams.map((t, i) => [i + 1, t.displayId || t.id, t.teamName, t.leadEmail, t.finalVenue || 'TBA', t.avgScore, t.winnerTitle || (t.isWinner ? 'Winner' : 'Finalist')]);
    fmt === 'csv' ? exportToCSV('Timeline4_Final_Report', headers, rows) : exportToPDF('Final Round Report', 'Final round qualified teams & evaluation scores', headers, rows);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading / Auth guards
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center p-12"><div className="text-gray-500 font-bold">Loading Event Management Dashboard...</div></div>;
  if (isAuthenticated === false) return <div className="p-12 text-center text-gray-500 font-bold">Access Denied. You must be an administrator.</div>;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Event Management</h2>
            <p className="text-sm text-gray-500 mt-1">Configure event phases step by step. All phases are visible below.</p>
          </div>
          <button
            onClick={() => refreshData()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-sm text-xs font-bold transition"
          >
             Refresh Data
          </button>
        </div>

        {/* Phase progress strip */}
        <div className="mt-5 grid grid-cols-4 gap-0 border border-gray-200 rounded-sm overflow-hidden text-xs font-bold">
          {[
            { label: 'Registration', color: 'blue', state: phase1State },
            { label: 'PPT Submission', color: 'purple', state: phase2State },
            { label: 'Prelims Round', color: 'indigo', state: phase3State },
            { label: 'Final Round', color: 'emerald', state: phase4State },
          ].map((p, i) => {
            const bg = p.state === 'active' ? 'bg-emerald-500 text-white' : p.state === 'ended' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500';
            return (
              <div key={i} className={`py-2.5 px-3 text-center ${bg} ${i > 0 ? 'border-l border-white/20' : ''}`}>
                <div className="text-[10px] opacity-80 mb-0.5">Phase {i + 1}</div>
                <div>{p.label}</div>
                {p.state === 'active' && <div className="text-[9px] mt-0.5 opacity-90"> LIVE</div>}
                {p.state === 'ended' && <div className="text-[9px] mt-0.5 opacity-80"> Complete</div>}
              </div>
            );
          })}
        </div>

        {/* Global Event Settings */}
        <div className="mt-5 p-4 border border-blue-200 bg-blue-50/50 rounded-sm flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Consent Letter</h4>
            <p className="text-xs text-gray-500 mt-0.5">Toggle whether the Consent Letter tab is visible to students in their Team Dashboard.</p>
          </div>
          <button
            onClick={handleToggleConsent}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              timelines.consentLetterEnabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span className="sr-only">Toggle Consent Letter</span>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                timelines.consentLetterEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── MESSAGE BAR ───────────────────────────────────────────────────── */}
      {/* Floating Notifications */}
      {msg && (
        <div className={`fixed top-24 right-6 z-50 p-4 border rounded-sm text-sm font-bold shadow-lg flex items-center justify-between gap-4 min-w-[300px] ${msg.type === 'success' ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TIMELINE 1: REGISTRATION PHASE                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-gray-200 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">Phase 1</span>
            <h3 className="text-base font-bold text-gray-900">Registration Phase</h3>
            <PhaseBadge state={phase1State} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveModalTimeline('1')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs font-bold transition">
               View Teams
            </button>
            <button onClick={() => exportTimeline1Report('csv')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-sm text-xs font-bold transition">
               CSV
            </button>
            <button onClick={() => exportTimeline1Report('pdf')} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-sm text-xs font-bold transition">
               PDF
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Live stat */}
          <div className="flex items-center gap-4 p-3.5 bg-blue-50 border border-blue-100 rounded-sm">
            <div className="text-2xl font-extrabold text-blue-700">{liveStats?.totalTeams || 0}</div>
            <div>
              <div className="text-xs font-bold text-blue-900">Teams Registered</div>
              <div className="text-xs text-blue-600">{liveStats?.totalStudents || 0} Total Students</div>
            </div>
          </div>

          {/* Phase Control Buttons */}
          <RoundControlButtons
            state={phase1State}
            onStart={() => handleStartRound('1')}
            onPause={() => handlePauseRound('1')}
            onFinish={() => handleFinishRound('1')}
            onReset={() => handleResetRound('1')}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TIMELINE 2: PPT SUBMISSION PHASE                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-gray-200 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded">Phase 2</span>
            <h3 className="text-base font-bold text-gray-900">PPT Submission Phase</h3>
            <PhaseBadge state={phase2State} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveModalTimeline('2')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-sm text-xs font-bold transition">
               View PPTs
            </button>
            <button onClick={() => exportTimeline2Report('csv')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-sm text-xs font-bold transition"> CSV</button>
            <button onClick={() => exportTimeline2Report('pdf')} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-sm text-xs font-bold transition"> PDF</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Live stat */}
          <div className="flex items-center gap-4 p-3.5 bg-purple-50 border border-purple-100 rounded-sm">
            <div className="text-2xl font-extrabold text-purple-700">{liveStats?.pptSubmittedCount || 0}</div>
            <div>
              <div className="text-xs font-bold text-purple-900">PPTs Submitted</div>
              <div className="text-xs text-purple-600">out of {liveStats?.totalTeams || 0} registered teams</div>
            </div>
          </div>

          {/* Phase Control Buttons */}
          <RoundControlButtons
            state={phase2State}
            canStart={phase1State === 'ended'}
            canStartReason="Phase 1 (Registration Phase) must be FINISHED before Phase 2 can begin."
            onStart={() => handleStartRound('2')}
            onPause={() => handlePauseRound('2')}
            onFinish={() => handleFinishRound('2')}
            onReset={() => handleResetRound('2')}
          />

          {/* PPT Filter */}
          <div className="bg-purple-50/80 border border-purple-200 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide">PPT Filter &amp; Assignments Control</h4>
              {timelines.timeline2.pptFilterApplied ? (
                <p className="text-xs text-emerald-700 mt-0.5 font-semibold"> Filter applied — Only teams with submitted PPTs advance to Prelims.</p>
              ) : (
                <p className="text-xs text-gray-600 mt-0.5">Filter teams for Prelims. Teams without a PPT link will be marked as failed.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleResetPrelimsFilters}
                className="shrink-0 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-sm text-xs font-bold transition">
                 Reset Filters &amp; Assignments
              </button>
              {!timelines.timeline2.pptFilterApplied && (
                <button onClick={handleApplyPptFilter} disabled={applyingPptFilter}
                  className="shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-sm text-xs font-bold transition disabled:opacity-50">
                  {applyingPptFilter ? 'Applying...' : ' Apply PPT Filter'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TIMELINE 3: PRELIMS ROUND & LAB MANAGEMENT                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-gray-200 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded">Phase 3</span>
            <h3 className="text-base font-bold text-gray-900">Prelims Round &amp; Lab Management</h3>
            <PhaseBadge state={phase3State} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveModalTimeline('3')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm text-xs font-bold transition">
               View Evaluations
            </button>
            <button onClick={() => exportAttendanceSheet('Prelims Round (Prelims Teams)', teams)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-sm text-xs font-bold transition shadow-sm">
               Attendance Sheet
            </button>
            <button onClick={handleAutoAssignTeams} disabled={allocating} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-sm text-xs font-bold transition disabled:opacity-50">
               {allocating ? 'Assigning...' : 'Auto Assign Teams'}
            </button>
            <button onClick={handleRandomAssignTeams} disabled={allocating} className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-sm text-xs font-bold transition disabled:opacity-50">
               Random Assign
            </button>
            <button onClick={handleUndoAllAssignments} disabled={allocating} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-sm text-xs font-bold transition disabled:opacity-50">
              ↺ Undo All
            </button>
            <button onClick={() => exportTimeline3Report('csv')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-sm text-xs font-bold transition"> CSV</button>
            <button onClick={() => exportTimeline3Report('pdf')} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-sm text-xs font-bold transition"> PDF</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Live stat */}
          <div className="flex items-center gap-4 p-3.5 bg-indigo-50 border border-indigo-100 rounded-sm">
            <div className="text-2xl font-extrabold text-indigo-700">{liveStats?.prelimsEvaluatedCount || 0}</div>
            <div>
              <div className="text-xs font-bold text-indigo-900">Prelims Evaluations Done</div>
              <div className="text-xs text-indigo-600">{liveStats?.juryStats?.length || 0} active juries</div>
            </div>
          </div>

          {/* Phase Control Buttons */}
          <RoundControlButtons
            state={phase3State}
            canStart={phase2State === 'ended'}
            canStartReason="Phase 2 (PPT Submission Phase) must be FINISHED before Phase 3 can begin."
            onStart={() => handleStartRound('3')}
            onPause={() => handlePauseRound('3')}
            onFinish={() => handleFinishRound('3')}
            onReset={() => handleResetRound('3')}
          />

          {/* Per-Jury Live Tracker */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-sm p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-indigo-200/60 pb-2">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                Live Per-Jury Evaluation Tracker ({liveStats?.juryStats?.length || 0} Juries)
              </h4>
              <span className="text-[11px] text-indigo-600 font-semibold">Evaluation counts per jury member</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {(!liveStats?.juryStats || liveStats.juryStats.length === 0) ? (
                <div className="col-span-4 text-xs text-indigo-600 italic py-2">No juries registered yet.</div>
              ) : (
                liveStats.juryStats.map((jury) => (
                  <div key={jury.juryId} className="bg-white p-3.5 rounded-sm border border-indigo-200 shadow-sm space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-gray-900 truncate" title={jury.juryName}>{jury.juryName}</span>
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-1">{jury.assignedLab}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                      <span className="text-gray-500">Evaluated:</span>
                      <span className="font-extrabold text-indigo-600 text-sm">{jury.prelimsEvaluatedCount} Teams</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Finalist Selection & Publishing Bar */}
          <div className="bg-purple-50/80 border border-purple-200 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide"> Final Round Selection &amp; Publishing</h4>
              <p className="text-xs text-purple-700 mt-0.5">
                Finalists are selected from Jury recommendations and Admin adjustments in the Prelims View. Currently selected: <strong>{liveStats?.finalistCount || selectedFinalistIds.size} teams</strong>
              </p>
            </div>
            <a href="/admin/prelims-scores"
              className="shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-sm text-xs font-bold transition inline-block">
               Go to Prelims Round Tab
            </a>
          </div>

          {/* Lab Management (Prelims Round) */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Prelims Lab &amp; Jury Configuration</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Lab Form */}
              <div className="bg-gray-50 p-4 rounded-sm border border-gray-200 space-y-3">
                <h5 className="text-xs font-bold text-gray-700 border-b border-gray-200 pb-2">
                  {editingLabId ? 'Edit Lab' : 'Add New Lab'}
                </h5>
                <form onSubmit={handleSubmitLab} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Lab Name *</label>
                    <input type="text" placeholder="e.g. CS Lab 1" value={labName} onChange={(e) => setLabName(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Lab ID / Code (Optional)</label>
                    <input type="text" placeholder="e.g. LAB-101" value={labCode} onChange={(e) => setLabCode(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Jury</label>
                    <select value={assignedJuryName} onChange={(e) => setAssignedJuryName(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500">
                      <option value="">-- Select Jury --</option>
                      {juriesList.map((j) => <option key={j.id} value={j.name}>{j.name}{j.institution ? ` (${j.institution})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Problem Statement Theme</label>
                    <select value={assignedTheme} onChange={(e) => setAssignedTheme(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500">
                      <option value="">-- All / Any Theme (General Lab) --</option>
                      {THEME_NAMES.map((themeName) => (
                        <option key={themeName} value={themeName}>{themeName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button type="submit" disabled={submittingLab}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-sm text-xs transition disabled:opacity-50">
                      {submittingLab ? 'Saving...' : editingLabId ? 'Update Lab' : 'Add Lab'}
                    </button>
                    {editingLabId && (
                      <button type="button" onClick={handleCancelEditLab}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1.5 px-2.5 rounded-sm text-xs transition">
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Labs Table */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-sm overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h5 className="font-bold text-gray-800 text-xs">Configured Prelims Labs &amp; Juries ({labs.length})</h5>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Lab Name</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Lab ID</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Jury</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">PS Theme</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Teams</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {labs.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-xs italic">No prelims labs configured yet.</td></tr>
                      ) : labs.map((lab) => (
                        <tr key={lab.labId} className="hover:bg-gray-50 transition text-xs">
                          <td className="px-4 py-3 font-bold text-gray-900">{lab.labName}</td>
                          <td className="px-4 py-3 font-mono text-gray-600">{lab.labCode || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{lab.assignedJuryName}</td>
                          <td className="px-4 py-3">
                            {lab.assignedTheme ? (
                              <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-bold">
                                {lab.assignedTheme}
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                                All / General
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-indigo-600">{lab.currentTeamCount}</td>
                          <td className="px-4 py-3 text-right space-x-1.5">
                            <button onClick={() => handleStartEditLab(lab)} className="text-blue-600 font-bold border border-gray-200 px-2 py-0.5 rounded hover:bg-blue-50">Edit</button>
                            <button onClick={() => handleDeleteLab(lab)} className="text-red-600 font-bold border border-gray-200 px-2 py-0.5 rounded hover:bg-red-50">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TIMELINE 4: FINAL ROUND & WINNER SELECTION                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-gray-200 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded">Phase 4</span>
            <h3 className="text-base font-bold text-gray-900">Final Round &amp; Winner Selection</h3>
            <PhaseBadge state={phase4State} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveModalTimeline('4')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm text-xs font-bold transition">
               View Final Round
            </button>
            <button onClick={() => exportAttendanceSheet('Final Round (Qualified Finalists)', finaleRankedTeams)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-sm text-xs font-bold transition shadow-sm">
               Attendance Sheet
            </button>
            <button onClick={handleAutoAssignFinalTeams} disabled={allocatingFinal} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-sm text-xs font-bold transition disabled:opacity-50">
               {allocatingFinal ? 'Assigning...' : 'Auto Assign Final Venues'}
            </button>
            <button onClick={() => exportTimeline4Report('csv')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-sm text-xs font-bold transition"> CSV</button>
            <button onClick={() => exportTimeline4Report('pdf')} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-sm text-xs font-bold transition"> PDF</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Live stat */}
          <div className="flex items-center gap-4 p-3.5 bg-emerald-50 border border-emerald-100 rounded-sm">
            <div className="text-2xl font-extrabold text-emerald-700">{liveStats?.finalistCount || 0}</div>
            <div>
              <div className="text-xs font-bold text-emerald-900">Qualified Finalists</div>
              <div className="text-xs text-emerald-600">{liveStats?.finaleEvaluatedCount || 0} evaluations recorded</div>
            </div>
          </div>

          {/* Phase Control Buttons */}
          <RoundControlButtons
            state={phase4State}
            canStart={phase3State === 'ended'}
            canStartReason="Phase 3 (Prelims Round) must be FINISHED before Phase 4 can begin."
            onStart={() => handleStartRound('4')}
            onPause={() => handlePauseRound('4')}
            onFinish={() => handleFinishRound('4')}
            onReset={() => handleResetRound('4')}
          />

          {/* Final Round Lab Management */}
          <div className="border-t border-emerald-100 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Final Round Lab Configuration</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Final Lab Form */}
              <div className="bg-emerald-50/40 p-4 rounded-sm border border-emerald-200 space-y-3">
                <h5 className="text-xs font-bold text-emerald-900 border-b border-emerald-200 pb-2">
                  {editingFinalLabId ? 'Edit Final Lab' : 'Add New Final Lab'}
                </h5>
                <form onSubmit={handleSubmitFinalLab} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Final Lab Name *</label>
                    <input type="text" placeholder="e.g. Main Hall Lab 1" value={finalLabName} onChange={(e) => setFinalLabName(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Lab ID / Code (Optional)</label>
                    <input type="text" placeholder="e.g. FLAB-101" value={finalLabCode} onChange={(e) => setFinalLabCode(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Lab Limit / Capacity *</label>
                    <input type="number" min={1} max={500} placeholder="e.g. 25" value={finalLabCapacity} onChange={(e) => setFinalLabCapacity(Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Coordinator Name (Optional)</label>
                    <input type="text" placeholder="e.g. Prof. Narayana" value={finalLabCoordinator} onChange={(e) => setFinalLabCoordinator(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button type="submit" disabled={submittingFinalLab}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-sm text-xs transition disabled:opacity-50">
                      {submittingFinalLab ? 'Saving...' : editingFinalLabId ? 'Update Final Lab' : 'Add Final Lab'}
                    </button>
                    {editingFinalLabId && (
                      <button type="button" onClick={handleCancelEditFinalLab}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1.5 px-2.5 rounded-sm text-xs transition">
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Final Labs Table */}
              <div className="lg:col-span-2 bg-white border border-emerald-200 rounded-sm overflow-hidden">
                <div className="p-3 bg-emerald-50/60 border-b border-emerald-200 flex justify-between items-center">
                  <h5 className="font-bold text-emerald-900 text-xs">Configured Final Round Labs ({finalLabs.length})</h5>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Final Lab Name</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Lab ID</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Coordinator</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Teams / Limit</th>
                        <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {finalLabs.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-xs italic">No final round labs configured yet.</td></tr>
                      ) : finalLabs.map((lab) => (
                        <tr key={lab.labId} className="hover:bg-gray-50 transition text-xs">
                          <td className="px-4 py-3 font-bold text-gray-900">{lab.labName}</td>
                          <td className="px-4 py-3 font-mono text-gray-600">{lab.labCode || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">{lab.coordinator || 'Unassigned'}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">{lab.currentTeamCount} / {lab.capacity || 25}</td>
                          <td className="px-4 py-3 text-right space-x-1.5">
                            <button onClick={() => handleStartEditFinalLab(lab)} className="text-blue-600 font-bold border border-gray-200 px-2 py-0.5 rounded hover:bg-blue-50">Edit</button>
                            <button onClick={() => handleDeleteFinalLab(lab)} className="text-red-600 font-bold border border-gray-200 px-2 py-0.5 rounded hover:bg-red-50">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Per-Jury Finale Tracker */}
          {liveStats?.juryStats && liveStats.juryStats.length > 0 && (
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-sm p-4 space-y-3">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide border-b border-emerald-200/60 pb-2">
                Live Per-Jury Finale Tracker
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {liveStats.juryStats.map((jury) => (
                  <div key={jury.juryId} className="bg-white p-3.5 rounded-sm border border-emerald-200 shadow-sm space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-gray-900 truncate" title={jury.juryName}>{jury.juryName}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-1">{jury.assignedLab}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                      <span className="text-gray-500">Finale Evals:</span>
                      <span className="font-extrabold text-emerald-600 text-sm">{jury.finaleEvaluatedCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Winner Selection */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-sm p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-amber-200 pb-3">
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide"> Select Final Round Winners</h4>
                <p className="text-xs text-amber-700 mt-0.5">Pick the top 1st, 2nd, and 3rd place winners from qualified finalists.</p>
              </div>
              <button onClick={handleSaveWinners} disabled={savingWinners}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-sm text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5">
                 {savingWinners ? 'Saving...' : 'Save & Publish'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-3.5 rounded-sm border border-amber-300 space-y-1.5">
                <div className="font-bold text-amber-800"> 1st Place / Champion</div>
                <select value={winner1st} onChange={(e) => setWinner1st(e.target.value)}
                  className="w-full bg-amber-50/40 border border-amber-300 rounded-sm px-2.5 py-1.5 text-xs font-semibold focus:outline-none">
                  <option value="">-- Select Champion --</option>
                  {finaleRankedTeams.map((t) => <option key={t.id} value={t.id}>{t.teamName} ({t.avgScore}/40)</option>)}
                </select>
              </div>
              <div className="bg-white p-3.5 rounded-sm border border-slate-300 space-y-1.5">
                <div className="font-bold text-slate-800"> 2nd Place / 1st Runner Up</div>
                <select value={winner2nd} onChange={(e) => setWinner2nd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-sm px-2.5 py-1.5 text-xs font-semibold focus:outline-none">
                  <option value="">-- Select 1st Runner Up --</option>
                  {finaleRankedTeams.map((t) => <option key={t.id} value={t.id}>{t.teamName} ({t.avgScore}/40)</option>)}
                </select>
              </div>
              <div className="bg-white p-3.5 rounded-sm border border-amber-600/30 space-y-1.5">
                <div className="font-bold text-amber-900"> 3rd Place / 2nd Runner Up</div>
                <select value={winner3rd} onChange={(e) => setWinner3rd(e.target.value)}
                  className="w-full bg-amber-50/20 border border-amber-200 rounded-sm px-2.5 py-1.5 text-xs font-semibold focus:outline-none">
                  <option value="">-- Select 2nd Runner Up --</option>
                  {finaleRankedTeams.map((t) => <option key={t.id} value={t.id}>{t.teamName} ({t.avgScore}/40)</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FULL TIMELINE DETAILS MODAL                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeModalTimeline && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-sm max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-300">
            {/* Modal Header */}
            <div className="p-5 bg-gray-900 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded">Phase {activeModalTimeline}</span>
                  <h3 className="text-base font-bold">
                    {activeModalTimeline === '1' && 'Registration Phase — Registered Teams'}
                    {activeModalTimeline === '2' && 'PPT Submission Phase — Submissions'}
                    {activeModalTimeline === '3' && 'Prelims Round — Evaluations & Finalists'}
                    {activeModalTimeline === '4' && 'Final Round — Selected Finalist Teams & Members'}
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeModalTimeline === '4'
                    ? 'Showing only finalist teams and student members selected from the Prelims round.'
                    : 'Full details of all teams, submissions, and evaluation scores.'}
                </p>
              </div>
              <button onClick={() => { setActiveModalTimeline(null); setModalSearchQuery(''); }}
                className="text-gray-400 hover:text-white font-bold text-lg px-2"></button>
            </div>

            {/* Modal Controls */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <input type="text" placeholder=" Search Team Name, Lead Email, ID..."
                value={modalSearchQuery} onChange={(e) => setModalSearchQuery(e.target.value)}
                className="w-full sm:w-80 bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
              <div className="flex items-center gap-2">
                {activeModalTimeline === '1' && <><button onClick={() => exportTimeline1Report('csv')} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-bold"> CSV</button><button onClick={() => exportTimeline1Report('pdf')} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold"> PDF</button></>}
                {activeModalTimeline === '2' && <><button onClick={() => exportTimeline2Report('csv')} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-bold"> CSV</button><button onClick={() => exportTimeline2Report('pdf')} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold"> PDF</button></>}
                {activeModalTimeline === '3' && (
                  <>
                    <div className="flex items-center gap-1 bg-gray-200 p-0.5 rounded-sm mr-2">
                      <button
                        onClick={() => setPrelimsSubTab('scores')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-sm transition ${
                          prelimsSubTab === 'scores' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
                        }`}
                      >
                         Score Details
                      </button>
                      <button
                        onClick={() => setPrelimsSubTab('selection')}
                        className={`px-2.5 py-1 text-xs font-bold rounded-sm transition ${
                          prelimsSubTab === 'selection' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'
                        }`}
                      >
                         Final Selection ({selectedFinalistIds.size})
                      </button>
                    </div>
                    <button onClick={() => exportAttendanceSheet('Prelims Round', teams)} className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700"> Attendance Sheet</button>
                    <button onClick={() => exportTimeline3Report('csv')} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-bold"> CSV</button>
                    <button onClick={() => exportTimeline3Report('pdf')} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold"> PDF</button>
                  </>
                )}
                {activeModalTimeline === '4' && <><button onClick={() => exportAttendanceSheet('Final Round (Finalists)', finaleRankedTeams)} className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700"> Attendance Sheet</button><button onClick={() => exportTimeline4Report('csv')} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-bold"> CSV</button><button onClick={() => exportTimeline4Report('pdf')} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold"> PDF</button></>}
              </div>
            </div>

            {/* Modal Table */}
            <div className="p-4 overflow-y-auto flex-1 text-xs">
              {activeModalTimeline === '1' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 uppercase font-bold text-[11px]">
                      <th className="px-3 py-2">Display ID</th>
                      <th className="px-3 py-2">Team Name</th>
                      <th className="px-3 py-2">Problem Statement</th>
                      <th className="px-3 py-2">Lead Name / Contact</th>
                      <th className="px-3 py-2">Dept</th>
                      <th className="px-3 py-2 text-right">Members</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modalFilteredTeams.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-bold text-blue-600">{t.displayId || t.id}</td>
                        <td className="px-3 py-2 font-bold text-gray-900">{t.teamName}</td>
                        <td className="px-3 py-2 max-w-xs truncate text-gray-600">{t.problemStatement}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold">{t.leadData?.name || 'N/A'}</div>
                          <div className="text-[10px] text-gray-400">{t.leadEmail}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{t.leadData?.department || 'N/A'}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => setSelectedTeamForMembers(t)}
                            className="px-2 py-1 bg-white border border-gray-300 text-blue-700 rounded font-bold text-[11px] hover:bg-blue-50">
                            View ({t.membersData?.length || 0})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeModalTimeline === '2' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 uppercase font-bold text-[11px]">
                      <th className="px-3 py-2">Display ID</th>
                      <th className="px-3 py-2">Team Name</th>
                      <th className="px-3 py-2">Lead Email</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-right">PPT Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modalFilteredTeams.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-bold text-purple-700">{t.displayId || t.id}</td>
                        <td className="px-3 py-2 font-bold text-gray-900">{t.teamName}</td>
                        <td className="px-3 py-2 font-mono text-gray-600">{t.leadEmail}</td>
                        <td className="px-3 py-2 text-center">
                          {t.pptLink
                            ? <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Submitted</span>
                            : <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">Pending</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {t.pptLink
                            ? <a href={t.pptLink} target="_blank" rel="noreferrer" className="text-purple-600 font-bold underline"> Open</a>
                            : <span className="text-gray-400 italic">No link</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeModalTimeline === '3' && prelimsSubTab === 'scores' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 uppercase font-bold text-[11px]">
                      <th className="px-3 py-2 text-center">Rank</th>
                      <th className="px-3 py-2">Display ID</th>
                      <th className="px-3 py-2">Team Name</th>
                      <th className="px-3 py-2">Theme</th>
                      <th className="px-3 py-2">Jury</th>
                      <th className="px-3 py-2">Lab</th>
                      <th className="px-3 py-2 text-center">Score (/50)</th>
                      <th className="px-3 py-2">Jury Feedback / Remarks</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {prelimsRankedTeams
                      .filter((t) => {
                        const q = modalSearchQuery.toLowerCase();
                        return !q || t.teamName.toLowerCase().includes(q) || t.displayId?.toLowerCase().includes(q) || t.leadEmail.toLowerCase().includes(q) || t.leadData?.name.toLowerCase().includes(q);
                      })
                      .map((t, idx) => {
                        const evalRecord = prelimsScores.find((s) => s.teamId === t.id);
                        return (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-center font-bold text-gray-500">#{idx + 1}</td>
                            <td className="px-3 py-2 font-mono font-bold text-indigo-700">{t.displayId || t.id}</td>
                            <td className="px-3 py-2 font-bold text-gray-900">{t.teamName}</td>
                            <td className="px-3 py-2 text-gray-600 text-[11px]">{t.theme}</td>
                            <td className="px-3 py-2 text-gray-700 font-medium">{evalRecord?.juryName || t.judge || 'Unassigned'}</td>
                            <td className="px-3 py-2 text-gray-700 font-medium">{t.labNo || 'Unassigned'}</td>
                            <td className="px-3 py-2 text-center font-extrabold text-indigo-700 text-sm">{t.score}</td>
                            <td className="px-3 py-2 text-gray-600 text-[11px] max-w-xs truncate">{evalRecord?.feedback || evalRecord?.remarks || '—'}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => handleOpenEditScore(t, evalRecord)}
                                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded hover:bg-indigo-100 transition"
                              >
                                 Edit Score
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}

              {activeModalTimeline === '3' && prelimsSubTab === 'selection' && (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider"> Selected Teams for Final Round</h4>
                      <p className="text-xs text-purple-700">Review Jury nominations & recommendations below. Toggle teams in/out of the list and click Publish when ready.</p>
                    </div>
                    <button
                      onClick={handlePublishFinalists}
                      disabled={publishingFinalists}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition shadow-sm disabled:opacity-50 shrink-0"
                    >
                      {publishingFinalists ? 'Publishing...' : ` Publish ${selectedFinalistIds.size} Finalists`}
                    </button>
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 uppercase font-bold text-[11px]">
                        <th className="px-3 py-2 text-center">SI No</th>
                        <th className="px-3 py-2">Display ID</th>
                        <th className="px-3 py-2">Team Name</th>
                        <th className="px-3 py-2">Theme</th>
                        <th className="px-3 py-2">Lab</th>
                        <th className="px-3 py-2">Jury Nominated</th>
                        <th className="px-3 py-2">Jury Recommendation Reason</th>
                        <th className="px-3 py-2 text-center">Score</th>
                        <th className="px-3 py-2 text-right">Finalist Selection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prelimsRankedTeams
                        .filter((t) => {
                          const q = modalSearchQuery.toLowerCase();
                          return !q || t.teamName.toLowerCase().includes(q) || t.displayId?.toLowerCase().includes(q) || t.leadEmail.toLowerCase().includes(q) || t.leadData?.name.toLowerCase().includes(q);
                        })
                        .map((t, idx) => {
                          const evalRecord = prelimsScores.find((s) => s.teamId === t.id);
                          const isSelected = selectedFinalistIds.has(t.id);
                          const isJuryNominated = Boolean(evalRecord?.selectedForFinal);

                          return (
                            <tr key={t.id} className={isSelected ? 'bg-purple-50/50' : 'hover:bg-gray-50'}>
                              <td className="px-3 py-2 text-center font-bold text-gray-500">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono font-bold text-purple-800">{t.displayId || t.id}</td>
                              <td className="px-3 py-2 font-bold text-gray-900">{t.teamName}</td>
                              <td className="px-3 py-2 text-gray-600 text-[11px]">{t.theme}</td>
                              <td className="px-3 py-2 text-gray-700 font-medium">{t.labNo || 'Unassigned'}</td>
                              <td className="px-3 py-2">
                                {isJuryNominated ? (
                                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">
                                     Nominated by {evalRecord?.juryName || 'Jury'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic text-[10px]">Not Nominated</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-700 text-[11px] max-w-xs">
                                {evalRecord?.selectionReason || '—'}
                              </td>
                              <td className="px-3 py-2 text-center font-extrabold text-indigo-700 text-sm">{t.score}</td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => handleToggleFinalist(t.id)}
                                  className={`px-3 py-1 text-xs font-bold rounded transition ${
                                    isSelected
                                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                  }`}
                                >
                                  {isSelected ? ' Finalist Selected' : '+ Select Team'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeModalTimeline === '4' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 uppercase font-bold text-[11px]">
                      <th className="px-3 py-2 text-center">Rank</th>
                      <th className="px-3 py-2">Display ID</th>
                      <th className="px-3 py-2">Team Name</th>
                      <th className="px-3 py-2">Lead Email</th>
                      <th className="px-3 py-2">Final Venue</th>
                      <th className="px-3 py-2 text-center">Finale Score (/40)</th>
                      <th className="px-3 py-2 text-right">Award / Members</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {finaleRankedTeams.length === 0 ? (
                      <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400 italic text-xs">No teams selected from Prelims Round for Final Round yet.</td></tr>
                    ) : (
                      finaleRankedTeams
                        .filter((t) => {
                          const q = modalSearchQuery.toLowerCase();
                          return !q || t.teamName.toLowerCase().includes(q) || t.displayId?.toLowerCase().includes(q) || t.leadEmail.toLowerCase().includes(q) || t.leadData?.name.toLowerCase().includes(q);
                        })
                        .map((t, idx) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-center font-bold text-gray-500">#{idx + 1}</td>
                            <td className="px-3 py-2 font-mono font-bold text-emerald-700">{t.displayId || t.id}</td>
                            <td className="px-3 py-2 font-bold text-gray-900">{t.teamName}</td>
                            <td className="px-3 py-2 font-mono text-gray-600">{t.leadEmail}</td>
                            <td className="px-3 py-2 font-semibold text-gray-800">{t.finalVenue || 'TBA'}</td>
                            <td className="px-3 py-2 text-center font-extrabold text-emerald-700">{t.avgScore}</td>
                            <td className="px-3 py-2 text-right font-bold space-x-2">
                              <span className="text-gray-800">{t.id === winner1st ? ' 1st Place' : t.id === winner2nd ? ' 2nd Place' : t.id === winner3rd ? ' 3rd Place' : 'Finalist'}</span>
                              <button onClick={() => setSelectedTeamForMembers(t)} className="px-2 py-1 bg-white border border-gray-300 text-blue-700 rounded font-bold text-[11px] hover:bg-blue-50">
                                Members ({t.membersData?.length || 0})
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button onClick={() => { setActiveModalTimeline(null); setModalSearchQuery(''); }}
                className="px-4 py-2 bg-gray-800 text-white rounded text-xs font-bold">
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TEAM MEMBERS MODAL                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {selectedTeamForMembers && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-sm max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600">{selectedTeamForMembers.displayId || selectedTeamForMembers.id}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">{selectedTeamForMembers.teamName}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedTeamForMembers.problemStatement}</p>
              </div>
              <button onClick={() => setSelectedTeamForMembers(null)} className="text-gray-400 font-bold px-2 hover:text-gray-700"></button>
            </div>
            <div className="bg-blue-50 p-3.5 rounded-sm text-xs space-y-1">
              <div className="font-bold text-blue-900 uppercase text-[10px] mb-1">Team Leader</div>
              <div className="font-bold text-gray-900 text-sm">{selectedTeamForMembers.leadData?.name || 'N/A'}</div>
              <div className="text-gray-600 font-mono">{selectedTeamForMembers.leadEmail}</div>
              <div className="text-gray-600">Phone: <span className="font-semibold">{selectedTeamForMembers.leadData?.contactNumber || 'N/A'}</span></div>
              <div className="text-gray-600">Dept: <span className="font-semibold">{selectedTeamForMembers.leadData?.department || 'N/A'}</span> (Sec: {selectedTeamForMembers.leadData?.section})</div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-800 uppercase">Team Members ({selectedTeamForMembers.membersData?.length || 0})</h4>
              {!selectedTeamForMembers.membersData || selectedTeamForMembers.membersData.length === 0 ? (
                <div className="text-xs text-gray-500 italic p-3 text-center bg-gray-50 rounded">No additional members.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedTeamForMembers.membersData.map((m, idx) => (
                    <div key={idx} className="bg-gray-50 p-2.5 rounded border border-gray-200 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-gray-900">{m.name}</div>
                        <div className="text-gray-500 text-[11px]">{m.department} | {m.year} | Sec {m.section}</div>
                      </div>
                      <div className="text-[10px] font-mono text-gray-400">Batch {m.batchNumber}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <button onClick={() => setSelectedTeamForMembers(null)} className="px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-sm">Close</button>
            </div>
          </div>
        </div>
      )}
      {editingScoreItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-sm max-w-lg w-full shadow-2xl overflow-hidden border border-gray-300">
            <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold"> Edit Score & Assignment</h3>
                <p className="text-xs text-indigo-200 mt-0.5">{editingScoreItem.team.teamName} ({editingScoreItem.team.displayId || editingScoreItem.team.id})</p>
              </div>
              <button onClick={() => setEditingScoreItem(null)} className="text-indigo-300 hover:text-white font-bold text-base"></button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Concept Strength (Max 12)</label>
                  <input type="number" min={0} max={12} value={editScoreConcept} onChange={(e) => setEditScoreConcept(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs font-bold text-center" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Build Intelligence (Max 12)</label>
                  <input type="number" min={0} max={12} value={editScoreBuild} onChange={(e) => setEditScoreBuild(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs font-bold text-center" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Delivery Impact (Max 8)</label>
                  <input type="number" min={0} max={8} value={editScoreDelivery} onChange={(e) => setEditScoreDelivery(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs font-bold text-center" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Live Defense Score (Max 8)</label>
                  <input type="number" min={0} max={8} value={editScoreDefense} onChange={(e) => setEditScoreDefense(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs font-bold text-center" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Communication (Max 10)</label>
                <input type="number" min={0} max={10} value={editScoreComm} onChange={(e) => setEditScoreComm(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs font-bold text-center" />
              </div>

              <div className="p-2 bg-indigo-50 border border-indigo-200 rounded flex justify-between items-center font-bold text-indigo-900">
                <span>Calculated Total Score:</span>
                <span className="text-sm text-indigo-700">{editScoreConcept + editScoreBuild + editScoreDelivery + editScoreDefense + editScoreComm} / 50</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Jury / Judge</label>
                  <input type="text" value={editScoreJudge} onChange={(e) => setEditScoreJudge(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Lab / Venue</label>
                  <input type="text" value={editScoreLab} onChange={(e) => setEditScoreLab(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded p-1.5 text-xs" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Feedback / Remarks</label>
                <textarea rows={2} value={editScoreFeedback} onChange={(e) => setEditScoreFeedback(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-xs" />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setEditingScoreItem(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 font-bold rounded text-xs">
                Cancel
              </button>
              <button onClick={handleSaveScoreEdit} disabled={savingScoreEdit} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs disabled:opacity-50">
                {savingScoreEdit ? 'Saving...' : ' Save Score & Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
