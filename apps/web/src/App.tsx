import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Artifact {
  id: string;
  title: string;
  content: string;
  type?: string;
}

interface ScenarioData {
  id: string;
  title: string;
  domain: string;
  prompt: string;
  artifacts: Artifact[];
}

const DOMAIN_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'Catalog': { bg: 'rgba(99,102,241,0.14)', text: '#a5b4fc', border: 'rgba(99,102,241,0.4)', icon: '📦' },
  'Cart & Checkout': { bg: 'rgba(39,211,182,0.14)', text: '#7ae2cf', border: 'rgba(39,211,182,0.4)', icon: '🛒' },
  'Risk & Compliance': { bg: 'rgba(251,146,60,0.14)', text: '#fdba74', border: 'rgba(251,146,60,0.4)', icon: '🛡️' },
};

const DEFAULT_DOMAIN_STYLE = { bg: 'rgba(148,163,184,0.14)', text: '#94a3b8', border: 'rgba(148,163,184,0.4)', icon: '📊' };

function DomainBadge({ domain, size = 'sm' }: { domain: string; size?: 'sm' | 'xs' }) {
  const style = DOMAIN_STYLES[domain] || DEFAULT_DOMAIN_STYLE;
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${
        size === 'sm' ? 'text-[11px] px-2.5 py-0.5' : 'text-[10px] px-2 py-0.5'
      }`}
      style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
    >
      <span className={size === 'sm' ? 'text-xs' : 'text-[10px]'}>{style.icon}</span>
      {domain}
    </span>
  );
}

interface EvidenceItem {
  id: string;
  title: string;
  body: string;
  role: 'primary' | 'corroborating' | 'reference';
  metadata?: {
    source?: string;
    type?: string;
    retrievalScore?: number;
    timestamp?: string;
  };
}

interface RubricScoreItem {
  criterion: string;
  score: number;
  maxScore: number;
  explanation: string;
}

interface MetricsData {
  ownerAccuracy: number;
  dependencyAccuracy: number;
  directionCorrect: boolean;
  blastRadiusCompleteness: number;
  evidenceRelevance: number;
  unsupportedClaimCount: number;
  criticalErrorCount: number;
}

interface ScoreResponse {
  overallScore: number;
  gatingPass: boolean;
  criticalErrors: string[];
  rubricScores?: RubricScoreItem[];
  metrics?: MetricsData;
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-current" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 50;
  const circ = 2 * Math.PI * r;
  const pct = Math.round(score * 100);
  const offset = circ * (1 - score);
  const color = pct >= 80 ? '#4bd79e' : pct >= 60 ? '#f0b45a' : '#ff7c7c';
  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} stroke="#284056" strokeWidth="10" fill="none" />
        <circle
          cx="60" cy="60" r={r}
          stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{pct}%</span>
        <span className="text-xs text-[var(--text-2)] mono-kicker">score</span>
      </div>
    </div>
  );
}

export default function App() {
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioData | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    ownerRouting: '',
    dependencyTrace: [] as Array<{ from: string; to: string; type: string }>,
    actionPlan: '',
    blastRadius: [] as string[],
    evidenceNotes: '',
  });
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [completedScenarios, setCompletedScenarios] = useState<Map<string, ScoreResponse>>(new Map());
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Scenario Workspace' | 'System Graph' | 'Evidence' | 'Evaluation' | 'Check-in Export'>('Overview');
  const [dependencyTraceInput, setDependencyTraceInput] = useState('');
  const [blastRadiusInput, setBlastRadiusInput] = useState('');

  // Learning analytics state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasLoggedFirstEvidence, setHasLoggedFirstEvidence] = useState(false);

  // Survey state
  const [showSurvey, setShowSurvey] = useState<'pre' | 'post' | null>(null);
  const [surveyStatus, setSurveyStatus] = useState({ preCompleted: false, postCompleted: false });
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, number>>({});

  const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:9992';

  // Timer tick effect
  useEffect(() => {
    if (!sessionStartTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Check survey status on boot
  const checkSurveyStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/surveys/status`);
      setSurveyStatus(res.data);
    } catch { /* non-critical */ }
  }, [API_URL]);

  // Start a learning session for the selected scenario
  const startSession = useCallback(async (scenarioId: string) => {
    try {
      const res = await axios.post(`${API_URL}/sessions/start`, { scenarioId });
      setCurrentSessionId(res.data.sessionId);
      setSessionStartTime(Date.now());
      setElapsedSeconds(0);
      setHasLoggedFirstEvidence(false);
    } catch { /* non-critical */ }
  }, [API_URL]);

  // Log a session event
  const logSessionEvent = useCallback(async (event: 'first_evidence' | 'first_submit' | 'completed') => {
    if (!currentSessionId) return;
    try {
      await axios.post(`${API_URL}/sessions/event`, { sessionId: currentSessionId, event });
    } catch { /* non-critical */ }
  }, [API_URL, currentSessionId]);

  // Submit survey
  const submitSurvey = useCallback(async () => {
    if (!showSurvey) return;
    try {
      await axios.post(`${API_URL}/surveys`, {
        surveyType: showSurvey,
        q1Confidence: surveyAnswers.q1 ?? 3,
        q2Comfort: surveyAnswers.q2 ?? 3,
        q3Clarity: surveyAnswers.q3 ?? 3,
        q4Readiness: surveyAnswers.q4 ?? 3,
        q5Anxiety: surveyAnswers.q5 ?? 3,
      });
      setSurveyStatus((prev) => ({
        ...prev,
        [showSurvey === 'pre' ? 'preCompleted' : 'postCompleted']: true,
      }));
      setShowSurvey(null);
      setSurveyAnswers({});
    } catch { /* non-critical */ }
  }, [API_URL, showSurvey, surveyAnswers]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const fetchEvidence = useCallback(async (scenarioId: string) => {
    try {
      const res = await axios.get(`${API_URL}/evidence?scenarioId=${encodeURIComponent(scenarioId)}&mode=vector`);
      setEvidenceItems(res.data);
    } catch {
      setEvidenceItems([]);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchScenarios();
    checkSurveyStatus();
  }, []);

  const fetchScenarios = async () => {
    setBootLoading(true);
    setBootError(null);
    try {
      const res = await axios.get(`${API_URL}/scenarios`);
      setScenarios(res.data);
      if (res.data.length > 0) {
        setSelectedScenario(res.data[0]);
        await fetchEvidence(res.data[0].id);
        await startSession(res.data[0].id);
        // Show pre-survey if not yet completed
        const surveyRes = await axios.get(`${API_URL}/surveys/status`).catch(() => null);
        if (surveyRes && !surveyRes.data.preCompleted) {
          setShowSurvey('pre');
        }
      } else {
        setSelectedScenario(null);
        setBootError('No scenarios are available yet.');
      }
    } catch (err: unknown) {
      console.error('Error fetching scenarios:', err);
      if (axios.isAxiosError(err)) {
        setBootError(err.response?.data?.error || err.message || 'Failed to load scenarios.');
      } else {
        setBootError('Failed to load scenarios.');
      }
    } finally {
      setBootLoading(false);
    }
  };

  const validateSubmission = (): string | null => {
    if (!selectedScenario) return 'Select a scenario first.';
    if (!formData.ownerRouting.trim()) return 'Owner Routing is required.';
    if (formData.dependencyTrace.length === 0) return 'Dependency Trace is required.';
    if (!formData.actionPlan.trim()) return 'Action Plan is required.';
    if (formData.blastRadius.length === 0) return 'Blast-Radius Plan is required.';
    if (!formData.evidenceNotes.trim()) return 'Evidence Notes are required.';
    if (selectedEvidence.length === 0) return 'Select at least one evidence artifact.';
    return null;
  };

  const parseDependencyTrace = (value: string) => {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [left, rightRaw] = line.split('->');
        const right = (rightRaw || '').trim();
        if (!left || !right) return null;
        let to = right;
        let type = 'upstream';
        const typeMatch = right.match(/\((upstream|downstream)\)$/i);
        if (typeMatch) {
          type = typeMatch[1].toLowerCase();
          to = right.replace(/\((upstream|downstream)\)$/i, '').trim();
        }
        return { from: left.trim(), to, type };
      })
      .filter((edge): edge is { from: string; to: string; type: string } => edge !== null);
  };

  const parseBlastRadius = (value: string) => {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  };

  const handleSubmit = async () => {
    const validationError = validateSubmission();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    const scenario = selectedScenario;
    if (!scenario) {
      setSubmitError('Select a scenario first.');
      return;
    }

    setLoading(true);
    setSubmitError(null);
    try {
      // Log first submit event
      await logSessionEvent('first_submit');

      // Create submission
      const submissionRes = await axios.post(`${API_URL}/submissions`, {
        scenarioId: scenario.id,
        sessionId: currentSessionId ?? undefined,
        ownerRouting: formData.ownerRouting,
        dependencyTrace: formData.dependencyTrace,
        actionPlan: formData.actionPlan,
        blastRadius: formData.blastRadius,
        evidenceNotes: formData.evidenceNotes,
        selectedEvidenceIds: selectedEvidence,
      });

      // Score submission
      const scoreRes = await axios.post(`${API_URL}/score`, {
        submissionId: submissionRes.data.submissionId,
      });

      const scoreResult: ScoreResponse = scoreRes.data;
      setScore(scoreResult);
      if (scenario) {
        setCompletedScenarios((prev) => new Map(prev).set(scenario.id, scoreResult));
      }
      // Mark session completed
      await logSessionEvent('completed');
      // Check if all scenarios done → trigger post-survey
      const newCompleted = new Map(completedScenarios).set(scenario.id, scoreResult);
      if (newCompleted.size >= scenarios.length && !surveyStatus.postCompleted) {
        setShowSurvey('post');
      }
    } catch (err: unknown) {
      console.error('Error submitting:', err);
      if (axios.isAxiosError(err)) {
        setSubmitError(err.response?.data?.error || err.message || 'Failed to submit.');
      } else {
        setSubmitError('Failed to submit.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (bootLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5 reveal-up">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1db8a2] to-[#f0b45a] flex items-center justify-center shadow-2xl ring-1 ring-white/20 floating-mark">
          <span className="text-2xl select-none">🎓</span>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-[var(--text-0)]">OmniMentor</p>
          <p className="text-sm text-[var(--text-2)] mt-1">Loading scenarios...</p>
        </div>
        <div className="text-[var(--accent)]">
          <Spinner />
        </div>
      </div>
    );
  }

  if (bootError && !selectedScenario) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md w-full card p-8 shadow-2xl reveal-up">
          <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-800/50 flex items-center justify-center mb-5">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm0-10.5a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[var(--text-0)] mb-2">Unable to load scenarios</h2>
          <p className="text-sm text-[var(--text-1)] mb-6 leading-relaxed">{bootError}</p>
          <button
            onClick={fetchScenarios}
            className="w-full bg-[#1db8a2] hover:bg-[#27d3b6] text-slate-950 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!selectedScenario) return null;

  const validationMsg = validateSubmission();
  const canSubmit = !loading && !validationMsg;

  return (
    <div className="min-h-screen text-[var(--text-0)] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[rgba(7,11,20,0.78)] backdrop-blur-md reveal-up">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1db8a2] to-[#f0b45a] flex items-center justify-center shadow-lg ring-1 ring-white/20 shrink-0">
              <span className="text-base select-none leading-none">🎓</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold text-[var(--text-0)]">OmniMentor</span>
              <span className="text-[11px] tracking-wide text-[var(--text-2)] font-medium">From Architecture Blindness to Fluency</span>
            </div>
          </div>
          {sessionStartTime && (
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-2)]">
              <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[var(--text-1)]">{formatTime(elapsedSeconds)}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Scenario selector */}
        <div className="mb-5 reveal-up" style={{ animationDelay: '80ms' }}>
          <label className="label">Active Scenario</label>
          <div className="relative max-w-xl">
            <select
              value={selectedScenario.id}
              onChange={(e) => {
                const next = scenarios.find((s) => s.id === e.target.value) ?? null;
                setSelectedScenario(next);
                setSelectedEvidence([]);
                setScore(null);
                setSubmitError(null);
                setDependencyTraceInput('');
                setBlastRadiusInput('');
                setFormData((prev) => ({ ...prev, ownerRouting: '', actionPlan: '', evidenceNotes: '', dependencyTrace: [], blastRadius: [] }));
                if (next) {
                  fetchEvidence(next.id);
                  startSession(next.id);
                }
              }}
              className="form-input pr-10 appearance-none cursor-pointer"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.domain ? `[${s.domain}] ` : ''}{s.title}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-2)]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/50 text-red-300 rounded-xl px-4 py-3 mb-6 text-sm max-w-xl reveal-up">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm0-10.5a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
            {submitError}
          </div>
        )}

        <div className="mb-6 reveal-up" style={{ animationDelay: '160ms' }}>
          <div className="card p-2">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {(['Overview', 'Scenario Workspace', 'System Graph', 'Evidence', 'Evaluation', 'Check-in Export'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === tab
                      ? 'bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)] border border-[rgba(39,211,182,0.42)]'
                      : 'text-[var(--text-1)] border border-transparent hover:bg-[rgba(18,30,47,0.74)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'Overview' && (
          <div className="space-y-6 reveal-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <p className="label">Progress Snapshot</p>
                <p className="text-2xl font-bold">{completedScenarios.size} <span className="text-base font-normal text-[var(--text-2)]">/</span> <span className="text-base font-normal text-[var(--text-2)]">{scenarios.length}</span></p>
                <p className="text-xs text-[var(--text-2)] mt-1">scenarios complete</p>
                <div className="mt-3 w-full bg-[rgba(10,18,30,0.8)] rounded-full h-2.5 overflow-hidden">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[#4bd79e] transition-all duration-500" style={{ width: `${scenarios.length > 0 ? Math.max((completedScenarios.size / scenarios.length) * 100, completedScenarios.size > 0 ? 8 : 0) : 0}%` }} />
                </div>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {scenarios.map((s) => (
                    <div key={s.id} className={`w-2.5 h-2.5 rounded-sm transition-colors ${
                      completedScenarios.has(s.id)
                        ? 'bg-[var(--ok)]'
                        : selectedScenario?.id === s.id
                          ? 'bg-[var(--accent)] opacity-50'
                          : 'bg-[rgba(124,152,182,0.25)]'
                    }`} title={s.title} />
                  ))}
                </div>
              </div>
              <div className="card p-5">
                <p className="label">Decision Quality</p>
                {completedScenarios.size > 0 ? (() => {
                  const scores = Array.from(completedScenarios.values()).map((s) => s.overallScore);
                  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                  const pct = Math.round(avg * 100);
                  return (
                    <>
                      <p className={`text-2xl font-bold ${pct >= 80 ? 'text-[var(--ok)]' : pct >= 60 ? 'text-[var(--warn)]' : 'text-[var(--danger)]'}`}>{pct}%</p>
                      <p className="text-xs text-[var(--text-2)] mt-1">avg across {scores.length} scored</p>
                    </>
                  );
                })() : (
                  <>
                    <p className="text-2xl font-bold text-[var(--text-2)]">--</p>
                    <p className="text-xs text-[var(--text-2)] mt-1">Submit to see quality score</p>
                  </>
                )}
              </div>
              <div className="card p-5">
                <p className="label">Readiness</p>
                <p className="text-2xl font-bold">{selectedEvidence.length}</p>
                <p className="text-xs text-[var(--text-2)] mt-1">evidence selected</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setActiveTab('Scenario Workspace')} className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-[var(--accent)] text-slate-950 hover:bg-[#27d3b6] transition-colors shadow-sm">Resume Practice</button>
                  <button onClick={() => setActiveTab('Evaluation')} className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-[rgba(240,180,90,0.45)] bg-[rgba(240,180,90,0.12)] text-[#ffd9a0] hover:bg-[rgba(240,180,90,0.22)] transition-colors">View Evaluation</button>
                </div>
              </div>
            </div>

            {/* Scenario list with status */}
            <div className="card p-5">
              <p className="label mb-3">All Scenarios</p>
              <div className="space-y-2">
                {scenarios.map((s) => {
                  const result = completedScenarios.get(s.id);
                  const isActive = selectedScenario?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedScenario(s);
                        setSelectedEvidence([]);
                        setScore(result ?? null);
                        setDependencyTraceInput('');
                        setBlastRadiusInput('');
                        setFormData({ ownerRouting: '', actionPlan: '', evidenceNotes: '', dependencyTrace: [], blastRadius: [] });
                        fetchEvidence(s.id);
                        startSession(s.id);
                        setActiveTab('Scenario Workspace');
                      }}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                        isActive
                          ? 'border-[rgba(39,211,182,0.5)] bg-[rgba(39,211,182,0.06)]'
                          : 'border-[color:var(--line)] hover:bg-[rgba(16,27,42,0.68)] hover:border-[color:var(--line-strong)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-3 h-3 rounded-full shrink-0 flex items-center justify-center ${
                          result
                            ? 'bg-[var(--ok)]'
                            : isActive
                              ? 'bg-transparent border-2 border-[var(--accent)]'
                              : 'bg-transparent border-2 border-[rgba(124,152,182,0.35)]'
                        }`}>
                          {result && (
                            <svg className="w-2 h-2 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm truncate ${result ? 'text-[var(--text-0)]' : 'text-[var(--text-1)]'}`}>{s.title}</span>
                        {s.domain && <DomainBadge domain={s.domain} size="xs" />}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {result ? (
                          <span className={`text-xs font-bold mono-kicker ${
                            Math.round(result.overallScore * 100) >= 80 ? 'text-[var(--ok)]' : Math.round(result.overallScore * 100) >= 60 ? 'text-[var(--warn)]' : 'text-[var(--danger)]'
                          }`}>{Math.round(result.overallScore * 100)}%</span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-2)] mono-kicker">not started</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Scenario Workspace' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Scenario + Evidence */}
          <div className="space-y-5 reveal-up" style={{ animationDelay: '180ms' }}>
            {/* Scenario card */}
            <div className="card p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="mt-0.5 w-7 h-7 rounded-lg bg-[rgba(39,211,182,0.14)] border border-[rgba(39,211,182,0.34)] flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-white">{selectedScenario.title}</h2>
                  {selectedScenario.domain && <DomainBadge domain={selectedScenario.domain} size="sm" />}
                </div>
              </div>
              <p className="text-sm text-[var(--text-1)] leading-relaxed">{selectedScenario.prompt}</p>
            </div>

            {/* Evidence card */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Evidence Artifacts
                </h3>
                {selectedEvidence.length > 0 && (
                  <span className="text-xs font-semibold bg-[rgba(39,211,182,0.16)] border border-[rgba(39,211,182,0.36)] text-[var(--accent-2)] px-2 py-0.5 rounded-full mono-kicker">
                    {selectedEvidence.length} selected
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {evidenceItems.map((ev) => {
                  const checked = selectedEvidence.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                        checked
                          ? 'bg-[rgba(39,211,182,0.12)] border-[rgba(39,211,182,0.5)]'
                          : 'bg-[rgba(12,20,32,0.44)] border-[color:var(--line)] hover:bg-[rgba(16,27,42,0.68)] hover:border-[color:var(--line-strong)]'
                      }`}
                    >
                      <div
                        className={`mt-0.5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                          checked ? 'bg-[#1db8a2] border-[#1db8a2]' : 'border-[color:var(--line)] bg-[rgba(10,18,30,0.92)]'
                        }`}
                        style={{ width: '1.125rem', height: '1.125rem' }}
                      >
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvidence((prev) => [...prev, ev.id]);
                            if (!hasLoggedFirstEvidence) {
                              logSessionEvent('first_evidence');
                              setHasLoggedFirstEvidence(true);
                            }
                          }
                          else setSelectedEvidence((prev) => prev.filter((id) => id !== ev.id));
                        }}
                        className="sr-only"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text-0)]">{ev.title}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                            ev.role === 'primary'
                              ? 'bg-[rgba(75,215,158,0.12)] text-[#7ee8b5] border-[rgba(75,215,158,0.35)]'
                              : 'bg-[rgba(240,180,90,0.12)] text-[#ffd9a0] border-[rgba(240,180,90,0.35)]'
                          }`}>
                            {ev.role}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-2)] mt-0.5 line-clamp-2">
                          {ev.body.substring(0, 150)}…
                        </p>
                        {ev.metadata?.retrievalScore !== undefined && (
                          <p className="text-[10px] text-[var(--text-2)] mt-1 font-mono">
                            relevance: {(ev.metadata.retrievalScore * 100).toFixed(0)}%
                            {ev.metadata.source && <> · {ev.metadata.source}</>}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
                {evidenceItems.length === 0 && (
                  <p className="text-sm text-[var(--text-2)] italic">No evidence retrieved for this scenario.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Form + Score */}
          <div className="space-y-5 reveal-up" style={{ animationDelay: '230ms' }}>
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2 mb-5">
                <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Your Submission
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Owner Routing</label>
                  <input
                    type="text"
                    placeholder="e.g., Platform Team"
                    value={formData.ownerRouting}
                    onChange={(e) => {
                      setSubmitError(null);
                      setFormData({ ...formData, ownerRouting: e.target.value });
                    }}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="label">Action Plan</label>
                  <textarea
                    placeholder="What actions should be taken?"
                    value={formData.actionPlan}
                    onChange={(e) => {
                      setSubmitError(null);
                      setFormData({ ...formData, actionPlan: e.target.value });
                    }}
                    className="form-input resize-none h-28"
                  />
                </div>

                <div>
                  <label className="label">Dependency Trace</label>
                  <textarea
                    placeholder={'One edge per line, e.g.\nGateway -> Auth (upstream)\nAuth -> Checkout (downstream)'}
                    value={dependencyTraceInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSubmitError(null);
                      setDependencyTraceInput(value);
                      setFormData({ ...formData, dependencyTrace: parseDependencyTrace(value) });
                    }}
                    className="form-input resize-none h-24"
                  />
                </div>

                <div>
                  <label className="label">Blast-Radius Plan</label>
                  <textarea
                    placeholder={'One downstream impact per line, e.g.\nCheckout API latency risk\nSLA alert noise increase'}
                    value={blastRadiusInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSubmitError(null);
                      setBlastRadiusInput(value);
                      setFormData({ ...formData, blastRadius: parseBlastRadius(value) });
                    }}
                    className="form-input resize-none h-24"
                  />
                </div>

                <div>
                  <label className="label">Evidence Notes</label>
                  <textarea
                    placeholder="Explain how your evidence supports your submission"
                    value={formData.evidenceNotes}
                    onChange={(e) => {
                      setSubmitError(null);
                      setFormData({ ...formData, evidenceNotes: e.target.value });
                    }}
                    className="form-input resize-none h-28"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full flex items-center justify-center gap-2 bg-[#1db8a2] hover:bg-[#27d3b6] active:bg-[#17a08d] disabled:bg-[rgba(18,29,45,0.85)] disabled:text-[var(--text-2)] disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 rounded-lg transition-colors text-sm mt-1"
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Evaluating…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                      Submit &amp; Score
                    </>
                  )}
                </button>
                {validationMsg && !submitError && (
                  <p className="text-xs text-[var(--text-2)] text-center">{validationMsg}</p>
                )}
              </div>
            </div>

            {/* Score result */}
            {score && (
              <div className={`card p-6 ${score.gatingPass ? 'border-[rgba(75,215,158,0.45)]' : 'border-[rgba(240,180,90,0.55)]'}`}>
                <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2 mb-5">
                  <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  Evaluation Result
                </h3>
                <div className="flex items-center gap-6">
                  <ScoreRing score={score.overallScore} />
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)] mb-1.5">Gating</p>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          score.gatingPass
                            ? 'bg-[rgba(75,215,158,0.14)] text-[#7ee8b5] border-[rgba(75,215,158,0.45)]'
                            : 'bg-[rgba(255,124,124,0.16)] text-[#ff9f9f] border-[rgba(255,124,124,0.5)]'
                        }`}
                      >
                        {score.gatingPass ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {score.gatingPass ? 'Passed' : 'Not Passed'}
                      </span>
                    </div>
                    {score.criticalErrors.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)] mb-1.5">Critical Issues</p>
                        <ul className="space-y-1">
                          {score.criticalErrors.map((err, idx) => (
                            <li key={idx} className="text-xs text-[#ff9f9f] flex items-start gap-1.5">
                              <span className="mt-0.5 text-red-500 shrink-0">•</span>
                              <span>{err}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-[#7ee8b5]">No critical issues detected.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {activeTab === 'System Graph' && (
          <div className="space-y-4 reveal-up">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-[var(--text-1)] mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
                Dependency Graph — {selectedScenario.title}
              </h3>
              {formData.dependencyTrace.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[var(--text-2)] mb-2">No dependency edges captured yet.</p>
                  <button onClick={() => setActiveTab('Scenario Workspace')} className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)]">
                    Add edges in Scenario Workspace
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Unique nodes */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Array.from(
                      new Set(formData.dependencyTrace.flatMap((e) => [e.from, e.to]))
                    ).map((node) => (
                      <span key={node} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[rgba(39,211,182,0.12)] text-[var(--accent-2)] border border-[rgba(39,211,182,0.3)]">
                        {node}
                      </span>
                    ))}
                  </div>
                  {/* Edges */}
                  {formData.dependencyTrace.map((edge, idx) => (
                    <div key={`${edge.from}-${edge.to}-${idx}`} className="flex items-center gap-3 rounded-lg border border-[color:var(--line)] p-3">
                      <span className="text-sm font-medium text-[var(--text-0)] bg-[rgba(15,26,40,0.85)] px-2 py-1 rounded">{edge.from}</span>
                      <div className="flex items-center gap-1">
                        <div className={`w-8 h-px ${edge.type === 'downstream' ? 'bg-[var(--accent)]' : 'bg-[var(--warn)]'}`} />
                        <svg className={`w-3 h-3 ${edge.type === 'downstream' ? 'text-[var(--accent)]' : 'text-[var(--warn)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[var(--text-0)] bg-[rgba(15,26,40,0.85)] px-2 py-1 rounded">{edge.to}</span>
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        edge.type === 'downstream'
                          ? 'bg-[rgba(39,211,182,0.12)] text-[var(--accent-2)] border-[rgba(39,211,182,0.35)]'
                          : 'bg-[rgba(240,180,90,0.12)] text-[#ffd9a0] border-[rgba(240,180,90,0.35)]'
                      }`}>
                        {edge.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Evidence' && (
          <div className="space-y-4 reveal-up">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Evidence Artifacts — {selectedScenario.title}
                </h3>
                <span className="text-xs font-semibold text-[var(--text-2)] mono-kicker">{evidenceItems.length} retrieved</span>
              </div>
              <div className="space-y-3">
                {evidenceItems.map((ev) => {
                  const isSelected = selectedEvidence.includes(ev.id);
                  return (
                    <div key={ev.id} className={`rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? 'border-[rgba(39,211,182,0.5)] bg-[rgba(39,211,182,0.06)]'
                        : 'border-[color:var(--line)] bg-[rgba(12,20,32,0.44)]'
                    }`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text-0)]">{ev.title}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                            ev.role === 'primary'
                              ? 'bg-[rgba(75,215,158,0.12)] text-[#7ee8b5] border-[rgba(75,215,158,0.35)]'
                              : 'bg-[rgba(240,180,90,0.12)] text-[#ffd9a0] border-[rgba(240,180,90,0.35)]'
                          }`}>
                            {ev.role}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)] border border-[rgba(39,211,182,0.4)]">
                              selected
                            </span>
                          )}
                        </div>
                        {ev.metadata?.retrievalScore !== undefined && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-16 bg-[rgba(10,18,30,0.8)] rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-[var(--accent)]" style={{ width: `${Math.round(ev.metadata.retrievalScore * 100)}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-[var(--text-2)]">{(ev.metadata.retrievalScore * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-1)] leading-relaxed">{ev.body}</p>
                      {ev.metadata && (
                        <div className="flex gap-3 mt-2">
                          {ev.metadata.source && <span className="text-[10px] font-mono text-[var(--text-2)]">source: {ev.metadata.source}</span>}
                          {ev.metadata.type && <span className="text-[10px] font-mono text-[var(--text-2)]">type: {ev.metadata.type}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
                {evidenceItems.length === 0 && (
                  <p className="text-sm text-[var(--text-2)] italic text-center py-8">No evidence retrieved for this scenario.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Evaluation' && (
          <div className="space-y-4 reveal-up">
            {score ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Overall score */}
                  <div className="card p-6 flex items-center gap-6">
                    <ScoreRing score={score.overallScore} />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-1)] mb-2">Overall Score</p>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        score.gatingPass
                          ? 'bg-[rgba(75,215,158,0.14)] text-[#7ee8b5] border-[rgba(75,215,158,0.45)]'
                          : 'bg-[rgba(255,124,124,0.16)] text-[#ff9f9f] border-[rgba(255,124,124,0.5)]'
                      }`}>
                        {score.gatingPass ? '✓ Gating Passed' : '✗ Gating Not Passed'}
                      </span>
                      {score.criticalErrors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-[var(--text-2)] mb-1">Critical Issues:</p>
                          {score.criticalErrors.map((err, i) => (
                            <p key={i} className="text-xs text-[#ff9f9f]">• {err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metrics breakdown */}
                  {score.metrics && (
                    <div className="card p-6">
                      <p className="text-sm font-semibold text-[var(--text-1)] mb-3">Metrics</p>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Owner Accuracy', value: score.metrics.ownerAccuracy },
                          { label: 'Dependency Accuracy', value: score.metrics.dependencyAccuracy },
                          { label: 'Blast Radius', value: score.metrics.blastRadiusCompleteness },
                          { label: 'Evidence Relevance', value: score.metrics.evidenceRelevance },
                        ].map((m) => (
                          <div key={m.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[var(--text-2)]">{m.label}</span>
                              <span className="font-mono text-[var(--text-1)]">{(m.value * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-[rgba(10,18,30,0.8)] rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full transition-all ${
                                m.value >= 0.8 ? 'bg-[var(--ok)]' : m.value >= 0.6 ? 'bg-[var(--warn)]' : 'bg-[var(--danger)]'
                              }`} style={{ width: `${Math.round(m.value * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-4 mt-2 pt-2 border-t border-[color:var(--line)]">
                          <span className="text-xs text-[var(--text-2)]">Direction: <span className={score.metrics.directionCorrect ? 'text-[var(--ok)]' : 'text-[var(--danger)]'}>{score.metrics.directionCorrect ? 'Correct' : 'Incorrect'}</span></span>
                          <span className="text-xs text-[var(--text-2)]">Unsupported claims: <span className="text-[var(--text-1)]">{score.metrics.unsupportedClaimCount}</span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rubric scores */}
                {score.rubricScores && score.rubricScores.length > 0 && (
                  <div className="card p-6">
                    <p className="text-sm font-semibold text-[var(--text-1)] mb-3">Rubric Breakdown</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {score.rubricScores.map((rs) => (
                        <div key={rs.criterion} className="rounded-xl border border-[color:var(--line)] p-3 bg-[rgba(12,20,32,0.44)]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-[var(--text-0)]">{rs.criterion}</span>
                            <span className={`text-xs font-mono font-semibold ${
                              rs.score >= rs.maxScore * 0.8 ? 'text-[var(--ok)]' : rs.score >= rs.maxScore * 0.6 ? 'text-[var(--warn)]' : 'text-[var(--danger)]'
                            }`}>{(rs.score * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-2)] leading-relaxed">{rs.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="card p-6 text-center py-12">
                <p className="text-sm text-[var(--text-2)] mb-2">No evaluation results yet.</p>
                <button onClick={() => setActiveTab('Scenario Workspace')} className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)]">
                  Go to Scenario Workspace to submit
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Check-in Export' && (() => {
          const completedArr = Array.from(completedScenarios.entries());
          const avgScore = completedArr.length > 0
            ? completedArr.reduce((s, [, r]) => s + r.overallScore, 0) / completedArr.length
            : 0;
          const exportText = [
            `OmniMentor — Check-in Export`,
            `Generated: ${new Date().toISOString()}`,
            ``,
            `## Summary`,
            `Scenarios completed: ${completedScenarios.size} / ${scenarios.length}`,
            `Average decision quality: ${completedArr.length > 0 ? `${Math.round(avgScore * 100)}%` : 'N/A'}`,
            ``,
            `## Current Scenario`,
            `Title: ${selectedScenario.title}`,
            `Owner routing: ${formData.ownerRouting || 'N/A'}`,
            `Dependency edges: ${formData.dependencyTrace.length}`,
            `Blast-radius items: ${formData.blastRadius.length}`,
            `Selected evidence: ${selectedEvidence.length}`,
            `Score: ${score ? `${Math.round(score.overallScore * 100)}%` : 'Not scored yet'}`,
            `Gating: ${score ? (score.gatingPass ? 'Passed' : 'Not Passed') : 'N/A'}`,
            `Critical errors: ${score?.criticalErrors.length ?? 0}`,
            ``,
            `## Completed Scenarios`,
            ...completedArr.map(([id, r]) => {
              const s = scenarios.find((sc) => sc.id === id);
              return `- ${s?.title ?? id}: ${Math.round(r.overallScore * 100)}% (gating: ${r.gatingPass ? 'pass' : 'fail'})`;
            }),
            completedArr.length === 0 ? '(none yet)' : '',
          ].join('\n');

          return (
            <div className="space-y-4 reveal-up">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Check-in Export
                  </h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(exportText);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.3)] transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <textarea
                  readOnly
                  value={exportText}
                  className="form-input h-64 resize-none font-mono text-xs"
                />
              </div>
            </div>
          );
        })()}
      </main>

      {/* Pre/Post Confidence Survey Modal */}
      {showSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card p-6 max-w-lg w-full mx-4 shadow-2xl reveal-up">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📋</span>
              <h2 className="text-base font-bold text-[var(--text-0)]">
                {showSurvey === 'pre' ? 'Pre-Practice' : 'Post-Practice'} Confidence Survey
              </h2>
            </div>
            <p className="text-xs text-[var(--text-2)] mb-5">
              {showSurvey === 'pre'
                ? 'Before you begin, rate how you feel about architecture decision-making right now.'
                : 'You completed all scenarios. Rate how you feel now about architecture decisions.'}
            </p>
            <div className="space-y-4">
              {[
                { key: 'q1', label: 'I feel confident identifying the correct service owner for an incident.' },
                { key: 'q2', label: 'I feel comfortable tracing upstream and downstream dependencies.' },
                { key: 'q3', label: 'I can clearly assess the blast radius of a system change.' },
                { key: 'q4', label: 'I feel ready to make architecture decisions in a real team meeting.' },
                { key: 'q5', label: 'Thinking about making architecture decisions makes me anxious.' },
              ].map((q) => (
                <div key={q.key}>
                  <p className="text-sm text-[var(--text-1)] mb-2">{q.label}</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setSurveyAnswers((prev) => ({ ...prev, [q.key]: v }))}
                        className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                          surveyAnswers[q.key] === v
                            ? 'bg-[var(--accent)] text-slate-950 ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]'
                            : 'bg-[rgba(18,30,47,0.8)] text-[var(--text-2)] border border-[color:var(--line)] hover:border-[var(--accent)] hover:text-[var(--text-1)]'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-2)] mt-1 px-0.5">
                    <span>Strongly disagree</span>
                    <span>Strongly agree</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={submitSurvey}
                disabled={Object.keys(surveyAnswers).length < 5}
                className="flex-1 bg-[var(--accent)] hover:bg-[#27d3b6] disabled:bg-[rgba(18,29,45,0.85)] disabled:text-[var(--text-2)] disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Submit Survey
              </button>
              <button
                onClick={() => { setShowSurvey(null); setSurveyAnswers({}); }}
                className="px-4 py-2.5 rounded-lg text-sm text-[var(--text-2)] border border-[color:var(--line)] hover:bg-[rgba(18,30,47,0.68)]"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
