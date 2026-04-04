/**
 * Guided-first TPM practice UI with onboarding help, evidence-backed decisions, and feedback review.
 */
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
const WALKTHROUGH_STORAGE_KEY = 'omnimentor.walkthrough.dismissed.v1';

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
    selectionPolicy?: string;
    graphSeedServices?: string[];
    graphConnectedServices?: string[];
    graphMatchedServices?: string[];
    graphTraversalEdges?: Array<{ from: string; to: string; type: 'upstream' | 'downstream' }>;
  };
}

type RetrievalMode = 'vector' | 'graph' | 'graphrag' | 'graphrag_gating';

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

interface EvaluationCompareModeResult {
  mode: RetrievalMode;
  overallScore: number;
  gatingPass: boolean;
  criticalErrors: string[];
  evidenceCount: number;
  selectedEvidenceIds: string[];
  selectedEvidenceTitles: string[];
  metrics: MetricsData;
}

interface EvaluationCompareResponse {
  scenarioId: string;
  scenarioTitle: string;
  bestMode: RetrievalMode;
  results: EvaluationCompareModeResult[];
}

interface ExampleAnswerResponse {
  scenarioId: string;
  ownerRouting: string;
  dependencyTrace: Array<{ from: string; to: string; type: 'upstream' | 'downstream' }>;
  actionPlan: string;
  blastRadius: string[];
  evidenceNotes: string;
  selectedEvidenceIds: string[];
  selectedEvidence: EvidenceItem[];
  whyItWorks: string;
  fieldGuidance: {
    ownerRouting: string;
    actionPlan: string;
    dependencyTrace: string;
    blastRadius: string;
    evidenceNotes: string;
  };
}

type WorkspaceTab = 'Overview' | 'Scenario Workspace' | 'System Graph' | 'Evidence' | 'Evaluation' | 'Check-in Export';
type GuidedStep = 'Brief' | 'Investigate' | 'Decide' | 'Feedback';

const RETRIEVAL_MODE_OPTIONS: Array<{ value: RetrievalMode; label: string; description: string }> = [
  { value: 'vector', label: 'Vector', description: 'Keyword-ranked baseline evidence.' },
  { value: 'graph', label: 'Graph', description: 'Topology-aware retrieval from connected services.' },
  { value: 'graphrag', label: 'GraphRAG', description: 'Graph-aware retrieval with provenance boosting.' },
  { value: 'graphrag_gating', label: 'GraphRAG + Gating', description: 'GraphRAG evidence set tuned for stronger gating support.' },
];

const SERVICE_NAME_PATTERN = /\b([A-Z][A-Za-z0-9&/-]+(?: [A-Z][A-Za-z0-9&/-]+){0,3} (?:API|Team|BFF|Indexer|Engine|Service|Gateway|Sync|Router|Provider|Portal|Hub|Control|Logger|Detection|Orchestrator))\b/g;

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
        <span className="text-2xl font-bold text-[var(--text-0)]">{pct}%</span>
        <span className="text-xs text-[var(--text-2)] mono-kicker">score</span>
      </div>
    </div>
  );
}

function getPerformanceLabel(score: number) {
  if (score >= 0.8) return 'Strong';
  if (score >= 0.6) return 'Needs work';
  return 'High risk';
}

function getPerformanceTone(score: number) {
  if (score >= 0.8) return 'text-[var(--ok)]';
  if (score >= 0.6) return 'text-[var(--warn)]';
  return 'text-[var(--danger)]';
}

function getMetricCoaching(label: string, value: number) {
  if (value >= 0.8) {
    return `${label}: strong`;
  }

  if (value >= 0.6) {
    return `${label}: partially supported`;
  }

  if (label === 'Evidence Support') {
    return 'Evidence support: missing or weak support';
  }

  if (label === 'Owner Match') {
    return 'Owner match: likely wrong team or unclear owner';
  }

  if (label === 'System Connections') {
    return 'System connections: missing systems or wrong direction';
  }

  return 'Blast radius: missing impacts or too vague';
}

function getScenarioNarrative(scenario: ScenarioData) {
  const cueTitles = scenario.artifacts.slice(0, 3).map((artifact) => artifact.title);

  const problemByDomain: Record<string, string> = {
    'Catalog': 'Schema and dependency changes can look safe in isolation while still breaking downstream product and search behavior.',
    'Cart & Checkout': 'Checkout issues spread quickly across payment, order, and customer-facing flows, so a narrow fix can still create broad operational risk.',
    'Risk & Compliance': 'Risk and compliance work often depends on cross-system ownership and auditability, so unclear routing can delay the right response.',
  };

  const motivationByDomain: Record<string, string> = {
    'Catalog': 'A TPM needs to route the change correctly, trace impact direction, and avoid a rollout that damages customer discovery or storefront behavior.',
    'Cart & Checkout': 'A TPM needs to keep transaction flows safe under pressure and make sure mitigation actions do not create larger customer-facing failures.',
    'Risk & Compliance': 'A TPM needs to coordinate the right owners quickly while preserving evidence-backed reasoning and governance discipline.',
  };

  const defaultProblem = 'Complex service ecosystems make it easy for a new TPM to miss owner, dependency, or blast-radius details even when documentation exists.';
  const defaultMotivation = 'The point of the scenario is to turn scattered evidence into one safe, defensible next step rather than a vague summary.';

  return {
    problem: problemByDomain[scenario.domain] ?? defaultProblem,
    motivation: motivationByDomain[scenario.domain] ?? defaultMotivation,
    partialSolutions: cueTitles.length > 0
      ? `There are already useful clues in artifacts like ${cueTitles.join(', ')}, but none of them alone resolves owner, dependency direction, and safe action.`
      : 'There are partial signals available, but the TPM still has to combine them into one defensible decision.',
    proofTarget: 'A strong run identifies the right owner, shows one clear path of affected systems, names what could break, and supports the plan with both primary and corroborating evidence.',
    clueTitles: cueTitles,
  };
}

function buildDiagnostics(metrics: MetricsData | undefined, gatingPass: boolean, criticalErrors: string[]) {
  if (!metrics) return [] as Array<{ label: string; status: 'strong' | 'warning' | 'risk'; detail: string }>;

  const diagnostics: Array<{ label: string; status: 'strong' | 'warning' | 'risk'; detail: string }> = [];

  diagnostics.push({
    label: 'Owner routing',
    status: metrics.ownerAccuracy >= 0.8 ? 'strong' : metrics.ownerAccuracy >= 0.6 ? 'warning' : 'risk',
    detail: metrics.ownerAccuracy >= 0.8
      ? 'Owner identification is well supported.'
      : metrics.ownerAccuracy >= 0.6
        ? 'Owner selection is partially supported but still needs review.'
        : 'The likely owner is still wrong or too weakly supported.',
  });

  diagnostics.push({
    label: 'Dependency direction',
    status: metrics.directionCorrect && metrics.dependencyAccuracy >= 0.8 ? 'strong' : metrics.directionCorrect ? 'warning' : 'risk',
    detail: metrics.directionCorrect
      ? metrics.dependencyAccuracy >= 0.8
        ? 'System path direction is coherent and mostly complete.'
        : 'Direction is plausible, but the path is still incomplete.'
      : 'The dependency path still has directionality problems.',
  });

  diagnostics.push({
    label: 'Blast radius',
    status: metrics.blastRadiusCompleteness >= 0.8 ? 'strong' : metrics.blastRadiusCompleteness >= 0.6 ? 'warning' : 'risk',
    detail: metrics.blastRadiusCompleteness >= 0.8
      ? 'Operational impact coverage is strong.'
      : metrics.blastRadiusCompleteness >= 0.6
        ? 'Some impact is covered, but important consequences may still be missing.'
        : 'The blast-radius analysis is too thin for a defensible TPM answer.',
  });

  diagnostics.push({
    label: 'Evidence support',
    status: metrics.evidenceRelevance >= 0.8 && metrics.unsupportedClaimCount === 0 ? 'strong' : metrics.evidenceRelevance >= 0.6 ? 'warning' : 'risk',
    detail: metrics.unsupportedClaimCount > 0
      ? `There are still ${metrics.unsupportedClaimCount} unsupported claim(s) in the reasoning path.`
      : metrics.evidenceRelevance >= 0.8
        ? 'Claims are grounded in relevant evidence.'
        : 'Evidence is only partially aligned to the claims being made.',
  });

  diagnostics.push({
    label: 'Gating readiness',
    status: gatingPass ? 'strong' : criticalErrors.length > 0 || metrics.criticalErrorCount > 0 ? 'risk' : 'warning',
    detail: gatingPass
      ? 'This path currently clears the hard submission gate.'
      : criticalErrors.length > 0
        ? `Hard-stop issues remain: ${criticalErrors.join('; ')}`
        : 'The submission path still needs tightening before it is review-safe.',
  });

  return diagnostics;
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
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('Overview');
  const [viewMode, setViewMode] = useState<'guided' | 'advanced'>('guided');
  const [guidedStep, setGuidedStep] = useState<GuidedStep>('Brief');
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>('vector');
  const [dependencyTraceInput, setDependencyTraceInput] = useState('');
  const [blastRadiusInput, setBlastRadiusInput] = useState('');
  const [graphFilter, setGraphFilter] = useState('');
  const [focusedGraphNode, setFocusedGraphNode] = useState<string | null>(null);
  const [showOnlyFocusedGraphEdges, setShowOnlyFocusedGraphEdges] = useState(false);

  // Learning analytics state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasLoggedFirstEvidence, setHasLoggedFirstEvidence] = useState(false);

  // Survey state
  const [showSurvey, setShowSurvey] = useState<'pre' | 'post' | null>(null);
  const [surveyStatus, setSurveyStatus] = useState({ preCompleted: false, postCompleted: false });
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, number>>({});
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('omnimentor.theme') as 'light' | 'dark') || 'dark');
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('omnimentor.theme', theme); }, [theme]);
  const [exampleAnswer, setExampleAnswer] = useState<ExampleAnswerResponse | null>(null);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [exampleLoading, setExampleLoading] = useState(false);
  const [evaluationCompare, setEvaluationCompare] = useState<EvaluationCompareResponse | null>(null);
  const [evaluationCompareLoading, setEvaluationCompareLoading] = useState(false);
  const [evaluationCompareError, setEvaluationCompareError] = useState<string | null>(null);

  const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:9992';

  const getSelectedEvidenceRoleState = useCallback(() => {
    const selectedItems = evidenceItems.filter((item) => selectedEvidence.includes(item.id));
    return {
      hasPrimary: selectedItems.some((item) => item.role === 'primary'),
      hasCorroborating: selectedItems.some((item) => item.role === 'corroborating'),
    };
  }, [evidenceItems, selectedEvidence]);

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

  const fetchEvidence = useCallback(async (scenarioId: string, mode: RetrievalMode = retrievalMode) => {
    try {
      const res = await axios.get(`${API_URL}/evidence?scenarioId=${encodeURIComponent(scenarioId)}&mode=${mode}`);
      setEvidenceItems(res.data);
    } catch {
      setEvidenceItems([]);
    }
  }, [API_URL, retrievalMode]);

  useEffect(() => {
    fetchScenarios();
    checkSurveyStatus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasDismissedWalkthrough = window.localStorage.getItem(WALKTHROUGH_STORAGE_KEY) === 'true';
    if (!hasDismissedWalkthrough) {
      setShowWalkthrough(true);
    }
  }, []);

  useEffect(() => {
    if (!selectedScenario) return;
    if (viewMode !== 'advanced') return;
    if (activeTab !== 'Evidence' && activeTab !== 'System Graph') return;
    fetchEvidence(selectedScenario.id, retrievalMode);
  }, [selectedScenario, viewMode, activeTab, retrievalMode, fetchEvidence]);

  useEffect(() => {
    setGraphFilter('');
    setFocusedGraphNode(null);
    setShowOnlyFocusedGraphEdges(false);
  }, [selectedScenario?.id, retrievalMode]);

  const comparisonViewActive = viewMode === 'guided'
    ? guidedStep === 'Feedback'
    : activeTab === 'Evaluation' || activeTab === 'Check-in Export';
  const evaluationViewActive = viewMode === 'guided' ? guidedStep === 'Feedback' : activeTab === 'Evaluation';

  useEffect(() => {
    if (!selectedScenario || !comparisonViewActive) return;

    const fetchEvaluationCompare = async () => {
      setEvaluationCompareLoading(true);
      setEvaluationCompareError(null);
      try {
        const res = await axios.get(`${API_URL}/evaluation/compare?scenarioId=${encodeURIComponent(selectedScenario.id)}`);
        setEvaluationCompare(res.data);
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          setEvaluationCompareError(err.response?.data?.error || err.message || 'Failed to load mode comparison.');
        } else {
          setEvaluationCompareError('Failed to load mode comparison.');
        }
        setEvaluationCompare(null);
      } finally {
        setEvaluationCompareLoading(false);
      }
    };

    fetchEvaluationCompare();
  }, [API_URL, selectedScenario, comparisonViewActive]);

  const closeWalkthrough = (nextTab?: WorkspaceTab, nextGuidedStep?: GuidedStep) => {
    setShowWalkthrough(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, 'true');
    }
    if (nextTab) {
      setActiveTab(nextTab);
    }
    if (nextGuidedStep) {
      setGuidedStep(nextGuidedStep);
    }
  };

  const selectScenario = useCallback((next: ScenarioData | null, options?: { tab?: WorkspaceTab; step?: GuidedStep; reuseScore?: ScoreResponse | null }) => {
    setSelectedScenario(next);
    setSelectedEvidence([]);
    setScore(options?.reuseScore ?? null);
    setEvaluationCompare(null);
    setEvaluationCompareError(null);
    setEvaluationCompareLoading(false);
    setSubmitError(null);
    setDependencyTraceInput('');
    setBlastRadiusInput('');
    setFormData({ ownerRouting: '', actionPlan: '', evidenceNotes: '', dependencyTrace: [], blastRadius: [] });
    if (options?.tab) {
      setActiveTab(options.tab);
    }
    if (options?.step) {
      setGuidedStep(options.step);
    }
    if (next) {
      fetchEvidence(next.id);
      startSession(next.id);
    }
  }, [fetchEvidence, startSession]);

  const fetchScenarios = async () => {
    setBootLoading(true);
    setBootError(null);
    try {
      const res = await axios.get(`${API_URL}/scenarios`);
      setScenarios(res.data);
      if (res.data.length > 0) {
        selectScenario(res.data[0], { tab: 'Overview', step: 'Brief' });
        const surveyRes = await axios.get(`${API_URL}/surveys/status`).catch(() => null);
        if (surveyRes?.data && !surveyRes.data.preCompleted) {
          setSurveyStatus(surveyRes.data);
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
    const { hasPrimary, hasCorroborating } = getSelectedEvidenceRoleState();
    if (!hasPrimary || !hasCorroborating) {
      return 'Select at least one primary artifact and one corroborating artifact.';
    }
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

  const applyExampleAnswer = (example: ExampleAnswerResponse) => {
    setEvidenceItems((prev) => {
      const merged = new Map(prev.map((item) => [item.id, item]));
      example.selectedEvidence.forEach((item) => merged.set(item.id, item));
      return Array.from(merged.values());
    });
    setSelectedEvidence(example.selectedEvidenceIds);
    setFormData({
      ownerRouting: example.ownerRouting,
      dependencyTrace: example.dependencyTrace,
      actionPlan: example.actionPlan,
      blastRadius: example.blastRadius,
      evidenceNotes: example.evidenceNotes,
    });
    setDependencyTraceInput(
      example.dependencyTrace.map((edge) => `${edge.from} -> ${edge.to} (${edge.type})`).join('\n')
    );
    setBlastRadiusInput(example.blastRadius.join('\n'));
    setSubmitError(null);
    setShowExampleModal(false);
    setActiveTab('Scenario Workspace');
    setGuidedStep('Decide');
  };

  const fetchExampleAnswer = useCallback(async () => {
    if (!selectedScenario) return;
    setExampleLoading(true);
    try {
      const res = await axios.get(`${API_URL}/scenarios/${encodeURIComponent(selectedScenario.id)}/example-answer`);
      setExampleAnswer(res.data);
      setShowExampleModal(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setSubmitError(err.response?.data?.error || err.message || 'Failed to load example answer.');
      } else {
        setSubmitError('Failed to load example answer.');
      }
    } finally {
      setExampleLoading(false);
    }
  }, [API_URL, selectedScenario]);

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
      setActiveTab('Evaluation');
      setGuidedStep('Feedback');
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

  const showOverview = viewMode === 'guided' ? guidedStep === 'Brief' : activeTab === 'Overview';
  const showScenarioWorkspace = viewMode === 'guided'
    ? guidedStep === 'Investigate' || guidedStep === 'Decide'
    : activeTab === 'Scenario Workspace';
  const showSystemGraph = viewMode === 'advanced' && activeTab === 'System Graph';
  const showEvidence = viewMode === 'advanced' && activeTab === 'Evidence';
  const showEvaluation = evaluationViewActive;
  const showCheckInExport = viewMode === 'advanced' && activeTab === 'Check-in Export';

  const validationMsg = validateSubmission();
  const canSubmit = !loading && !validationMsg;
  const { hasPrimary, hasCorroborating } = getSelectedEvidenceRoleState();
  const hasTrace = formData.dependencyTrace.length > 0;
  const hasBlast = formData.blastRadius.length > 0;

  const selectedEvidenceItems = evidenceItems.filter((ev) => selectedEvidence.includes(ev.id));
  const graphSeedServices = Array.from(new Set(
    evidenceItems.flatMap((item) => item.metadata?.graphSeedServices ?? [])
  ));
  const graphConnectedServices = Array.from(new Set(
    evidenceItems.flatMap((item) => item.metadata?.graphConnectedServices ?? [])
  ));
  const graphMatchedServices = Array.from(new Set(
    selectedEvidenceItems.flatMap((item) => item.metadata?.graphMatchedServices ?? [])
  ));
  const retrievedGraphEdges = Array.from(
    new Map(
      evidenceItems
        .flatMap((item) => item.metadata?.graphTraversalEdges ?? [])
        .map((edge) => [`${edge.from}|${edge.to}|${edge.type}`, edge])
    ).values()
  );
  const displayGraphEdges = formData.dependencyTrace.length > 0 ? formData.dependencyTrace : retrievedGraphEdges;
  const graphNodes = Array.from(
    new Set([
      ...graphConnectedServices,
      ...displayGraphEdges.flatMap((edge) => [edge.from, edge.to]),
    ])
  ).sort((left, right) => left.localeCompare(right));
  const normalizedGraphFilter = graphFilter.trim().toLowerCase();
  const filteredGraphEdges = displayGraphEdges.filter((edge) => {
    const edgeMatchesFilter = !normalizedGraphFilter
      || edge.from.toLowerCase().includes(normalizedGraphFilter)
      || edge.to.toLowerCase().includes(normalizedGraphFilter);
    const edgeMatchesFocus = !focusedGraphNode
      || edge.from === focusedGraphNode
      || edge.to === focusedGraphNode;
    return edgeMatchesFilter && (!showOnlyFocusedGraphEdges || edgeMatchesFocus);
  });
  const visibleGraphNodes = Array.from(
    new Set([
      ...graphNodes.filter((node) => !normalizedGraphFilter || node.toLowerCase().includes(normalizedGraphFilter)),
      ...filteredGraphEdges.flatMap((edge) => [edge.from, edge.to]),
    ])
  );
  const graphEvidenceForNode = (node: string) => evidenceItems.filter((item) => {
    const relatedServices = new Set([
      ...(item.metadata?.graphSeedServices ?? []),
      ...(item.metadata?.graphConnectedServices ?? []),
      ...(item.metadata?.graphMatchedServices ?? []),
      ...((item.metadata?.graphTraversalEdges ?? []).flatMap((edge) => [edge.from, edge.to])),
    ]);
    return relatedServices.has(node) || item.title.includes(node) || item.body.includes(node);
  });
  const focusedNodeIncomingEdges = focusedGraphNode
    ? displayGraphEdges.filter((edge) => edge.to === focusedGraphNode)
    : [];
  const focusedNodeOutgoingEdges = focusedGraphNode
    ? displayGraphEdges.filter((edge) => edge.from === focusedGraphNode)
    : [];

  const extractNamedEntities = (texts: string[]) => {
    const matches = new Set<string>();

    texts.forEach((text) => {
      const found = text.match(SERVICE_NAME_PATTERN) ?? [];
      found.forEach((item) => matches.add(item.trim()));
    });

    return Array.from(matches);
  };

  const extractKeyFacts = (items: EvidenceItem[]) => {
    const owners = new Set<string>();
    const dependencies = new Set<string>();
    const impacts = new Set<string>();

    const addMatches = (set: Set<string>, text: string, regex: RegExp) => {
      const match = text.match(regex);
      if (match && match[1]) {
        set.add(match[1].trim());
      }
    };

    items.forEach((item) => {
      const text = `${item.title}. ${item.body}`;
      addMatches(owners, text, /owned by ([^.\n]+)/i);
      addMatches(owners, text, /owner(?:ship)?:? ([^.\n]+)/i);
      addMatches(owners, text, /escalation path: ([^.\n]+)/i);

      const depPatterns = [
        /depends on ([^.\n]+)/i,
        /consumes ([^.\n]+)/i,
        /publishes ([^.\n]+)/i,
        /calls ([^.\n]+)/i,
        /downstream impact: ([^.\n]+)/i,
      ];
      depPatterns.forEach((re) => addMatches(dependencies, text, re));

      const impactPatterns = [
        /impact: ([^.\n]+)/i,
        /failure mode: ([^.\n]+)/i,
        /rollback trigger: ([^.\n]+)/i,
        /risk: ([^.\n]+)/i,
        /stale ([^.\n]+)/i,
      ];
      impactPatterns.forEach((re) => addMatches(impacts, text, re));
    });

    return {
      owners: Array.from(owners),
      dependencies: Array.from(dependencies),
      impacts: Array.from(impacts),
    };
  };

  const keyFacts = extractKeyFacts(selectedEvidenceItems);

  const scenarioEntities = extractNamedEntities([
    selectedScenario.title,
    selectedScenario.prompt,
    ...selectedEvidenceItems.flatMap((item) => [item.title, item.body]),
  ]);

  const suggestedTeams = scenarioEntities.filter((entity) => entity.endsWith('Team'));
  const suggestedSystems = scenarioEntities.filter((entity) => !entity.endsWith('Team'));
  const focusSystem = suggestedSystems[0] ?? '[main system]';
  const upstreamSystem = suggestedSystems[1] ?? '[upstream system]';
  const downstreamSystem = suggestedSystems[2] ?? suggestedSystems[1] ?? '[downstream system]';
  const primaryEvidence = selectedEvidenceItems.find((item) => item.role === 'primary');
  const corroboratingEvidence = selectedEvidenceItems.find((item) => item.role === 'corroborating');

  const renderRetrievalModePicker = () => (
    <div className="flex flex-wrap gap-2">
      {RETRIEVAL_MODE_OPTIONS.map((option) => {
        const isActive = retrievalMode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setRetrievalMode(option.value)}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
              isActive
                ? 'border-[rgba(39,211,182,0.55)] bg-[rgba(39,211,182,0.12)] text-[var(--accent-2)]'
                : 'border-[color:var(--line)] bg-[var(--chip-bg)] text-[var(--text-1)] hover:border-[color:var(--line-strong)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            <span className="block text-[11px] font-semibold uppercase tracking-wide">{option.label}</span>
            <span className="block text-[10px] text-[var(--text-2)] mt-0.5">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
  const beginnerDependencyTemplate = [
    `${upstreamSystem} -> ${focusSystem} (upstream)`,
    `${focusSystem} -> ${downstreamSystem} (downstream)`,
  ].join('\n');
  const beginnerBlastTemplate = (keyFacts.impacts.length > 0
    ? keyFacts.impacts.slice(0, 3)
    : [
        '[customer-facing impact]',
        '[downstream system impact]',
        '[operational risk to monitor]',
      ]
  ).join('\n');
  const scoreStatusLabel = score ? getPerformanceLabel(score.overallScore) : null;
  const scoreStatusTone = score ? getPerformanceTone(score.overallScore) : '';
  const scoreSummary = score
    ? score.gatingPass
      ? score.overallScore >= 0.8
        ? 'Your answer is well supported and close to production-ready for this scenario.'
        : 'Your answer is supported, but it still misses some important TPM details.'
      : 'The app found unsupported reasoning. Tighten the answer using the evidence you selected.'
    : null;
  const beginnerMetrics = score?.metrics
    ? [
        { label: 'Owner Match', value: score.metrics.ownerAccuracy },
        { label: 'System Connections', value: score.metrics.dependencyAccuracy },
        { label: 'Blast Radius', value: score.metrics.blastRadiusCompleteness },
        { label: 'Evidence Support', value: score.metrics.evidenceRelevance },
      ]
    : [];
  const modeLabels = new Map(RETRIEVAL_MODE_OPTIONS.map((option) => [option.value, option.label]));
  const comparisonForSelectedScenario = evaluationCompare?.scenarioId === selectedScenario.id ? evaluationCompare : null;
  const vectorBaseline = comparisonForSelectedScenario?.results.find((result) => result.mode === 'vector') ?? null;
  const scenarioNarrative = getScenarioNarrative(selectedScenario);
  const currentDiagnostics = buildDiagnostics(score?.metrics, score?.gatingPass ?? false, score?.criticalErrors ?? []);
  const bestCompareResult = comparisonForSelectedScenario?.results.find((result) => result.mode === comparisonForSelectedScenario.bestMode) ?? null;
  const bestModeDiagnostics = buildDiagnostics(bestCompareResult?.metrics, bestCompareResult?.gatingPass ?? false, bestCompareResult?.criticalErrors ?? []);

  const currentScoreLabel = score ? `${Math.round(score.overallScore * 100)}%` : '--';
  const bestModeLabel = comparisonForSelectedScenario
    ? modeLabels.get(comparisonForSelectedScenario.bestMode) ?? comparisonForSelectedScenario.bestMode
    : 'Pending';

  const fillBeginnerDraft = () => {
    const ownerGuess = keyFacts.owners[0] ?? '';
    const ownerLine = ownerGuess || suggestedTeams[0] || '[owner team]';

    setFormData({
      ownerRouting: ownerLine,
      dependencyTrace: parseDependencyTrace(beginnerDependencyTemplate),
      actionPlan: [
        `Confirm the risk and current state using ${primaryEvidence?.id ?? '[primary artifact id]'}.`,
        `Notify ${ownerLine} and align with ${suggestedTeams[1] ?? '[dependent team]'}.`,
        `Verify ${downstreamSystem} before rollout or recovery.`,
        'Monitor the key metric and rollback if customer impact appears.'
      ].join('\n'),
      blastRadius: beginnerBlastTemplate.split('\n'),
      evidenceNotes: [
        `Owner evidence: ${primaryEvidence?.id ?? '[primary artifact id]'}.`,
        `Dependency evidence: ${corroboratingEvidence?.id ?? '[corroborating artifact id]'}.`,
        'Why this matters: the selected evidence names the owner, affected systems, and likely impact.',
      ].join('\n'),
    });

    setDependencyTraceInput(beginnerDependencyTemplate);
    setBlastRadiusInput(beginnerBlastTemplate);

    if (viewMode === 'guided' && guidedStep !== 'Decide') {
      setGuidedStep('Decide');
    }
  };

  return (
    <div className="min-h-screen text-[var(--text-0)] font-sans" data-testid="app-root">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[var(--header-bg)] shadow-[0_18px_46px_rgba(2,6,23,0.12)] backdrop-blur-xl reveal-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1db8a2] via-[#83ebd6] to-[#f0b45a] flex items-center justify-center shadow-[0_12px_28px_rgba(0,0,0,0.32)] ring-1 ring-white/20 shrink-0">
              <span className="text-base select-none leading-none">🎓</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold text-[var(--text-0)] tracking-tight">OmniMentor</span>
              <span className="text-[11px] tracking-[0.18em] uppercase text-[var(--text-2)] font-medium">From Architecture Blindness to Fluency</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="p-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface-1)] transition-colors text-[var(--text-1)]"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75 9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25 9.75 9.75 0 0 0 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>
              )}
            </button>
            <button
              onClick={() => setShowWalkthrough(true)}
              data-testid="open-walkthrough"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[rgba(39,211,182,0.35)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.18)] transition-colors"
            >
              How It Works
            </button>
            {sessionStartTime && (
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-2)]">
                <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[var(--text-1)]">{formatTime(elapsedSeconds)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* ── Compact scenario bar ── */}
        <div className="mb-3 reveal-up" style={{ animationDelay: '20ms' }}>
          <div className="card px-4 py-3">
            {/* Row 1: scenario selector + mode + status chips */}
            <div className="flex flex-wrap items-center gap-2.5">
              <DomainBadge domain={selectedScenario.domain} />
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <select
                  value={selectedScenario.id}
                  aria-label="Active Scenario"
                  data-testid="scenario-select"
                  onChange={(e) => {
                    const next = scenarios.find((s) => s.id === e.target.value) ?? null;
                    selectScenario(next, { tab: viewMode === 'advanced' ? activeTab : 'Overview', step: 'Brief' });
                  }}
                  className="form-input py-1.5 pr-8 text-sm appearance-none cursor-pointer"
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.domain ? `[${s.domain}] ` : ''}{s.title}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-2)]">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setViewMode('guided')}
                  data-testid="guided-mode-toggle"
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors ${
                    viewMode === 'guided'
                      ? 'bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)] border border-[rgba(39,211,182,0.42)]'
                      : 'border border-[color:var(--line)] text-[var(--text-2)] hover:bg-[var(--hover-bg)]'
                  }`}
                >
                  Guided
                </button>
                <button
                  onClick={() => setViewMode('advanced')}
                  data-testid="advanced-mode-toggle"
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors ${
                    viewMode === 'advanced'
                      ? 'bg-[rgba(240,180,90,0.12)] text-[var(--warn-text)] border border-[rgba(240,180,90,0.35)]'
                      : 'border border-[color:var(--line)] text-[var(--text-2)] hover:bg-[var(--hover-bg)]'
                  }`}
                >
                  Advanced
                </button>
              </div>
            </div>
            {/* Row 2: step/tab nav + compact status */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {viewMode === 'guided' ? (
                <>
                  {(['Brief', 'Investigate', 'Decide', 'Feedback'] as const).map((step, index) => (
                    <button
                      key={step}
                      onClick={() => setGuidedStep(step)}
                      data-testid={`guided-step-${step.toLowerCase()}`}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        guidedStep === step
                          ? 'bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)] border border-[rgba(39,211,182,0.42)]'
                          : 'text-[var(--text-2)] border border-transparent hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      {index + 1}. {step}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {(['Overview', 'Scenario Workspace', 'System Graph', 'Evidence', 'Evaluation', 'Check-in Export'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      data-testid={`advanced-tab-${tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        activeTab === tab
                          ? 'bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)] border border-[rgba(39,211,182,0.42)]'
                          : 'text-[var(--text-2)] border border-transparent hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </>
              )}
              <div className="ml-auto flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-2)]">
                <span><span className="text-[var(--text-1)] font-semibold">{completedScenarios.size}/{scenarios.length}</span> done</span>
                <span className="opacity-30">|</span>
                <span><span className="text-[var(--text-1)] font-semibold">{selectedEvidence.length}</span> evidence</span>
                <span className="opacity-30">|</span>
                <span className={score ? getPerformanceTone(score.overallScore) : ''}>{currentScoreLabel}</span>
                <span className="opacity-30">|</span>
                <span>{bestModeLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'advanced' && (
          <div className="mb-3 reveal-up" style={{ animationDelay: '30ms' }}>
            <div className="rounded-xl border border-[rgba(240,180,90,0.35)] bg-[var(--chip-bg)] px-4 py-2.5 text-xs text-[var(--text-1)]">
              Advanced mode supports reviewer-focused inspection: verify retrieved evidence, compare retrieval modes, and export a mentor snapshot. Guided mode remains the recommended path for new TPMs.
            </div>
          </div>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/50 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm max-w-xl reveal-up">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm0-10.5a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
            {submitError}
          </div>
        )}

        {showOverview && (
          <div className="space-y-3 reveal-up">
            {viewMode === 'guided' && (
              <>
                {/* Compact mission brief */}
                <div className="card p-4 border-[rgba(39,211,182,0.35)] bg-[rgba(39,211,182,0.06)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 max-w-3xl">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-2)]">Mission Brief</p>
                      <h2 className="text-xl font-bold text-[var(--text-0)] mt-1">{selectedScenario.title}</h2>
                      <p className="text-sm text-[var(--text-1)] mt-2 leading-relaxed">{selectedScenario.prompt}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-bold text-[var(--text-0)]">{completedScenarios.size}/{scenarios.length}</p>
                      <p className="text-[10px] text-[var(--text-2)]">complete</p>
                      <div className="mt-1 w-20 bg-[var(--track-bg)] rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[#4bd79e] transition-all duration-500" style={{ width: `${scenarios.length > 0 ? Math.max((completedScenarios.size / scenarios.length) * 100, completedScenarios.size > 0 ? 8 : 0) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[rgba(240,180,90,0.28)] bg-[rgba(240,180,90,0.06)] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--warn-text)]">Why this scenario matters</p>
                      <p className="text-xs text-[var(--text-0)] mt-1.5 leading-relaxed">{scenarioNarrative.problem}</p>
                      <p className="text-xs text-[var(--text-1)] mt-1.5 leading-relaxed">{scenarioNarrative.motivation}</p>
                    </div>
                    <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)]">What a strong answer proves</p>
                      <p className="text-xs text-[var(--text-0)] mt-1.5 leading-relaxed">{scenarioNarrative.proofTarget}</p>
                      {scenarioNarrative.clueTitles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {scenarioNarrative.clueTitles.map((title) => (
                            <span key={title} className="rounded-full border border-[color:var(--line)] bg-[var(--tag-bg)] px-2 py-0.5 text-[10px] text-[var(--text-1)]">
                              {title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setGuidedStep('Investigate')}
                      data-testid="start-with-evidence"
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--accent)] text-slate-950 hover:bg-[#27d3b6]"
                    >
                      Start With Evidence
                    </button>
                    <button
                      onClick={() => setShowWalkthrough(true)}
                      data-testid="replay-walkthrough"
                      className="px-3 py-2 rounded-lg text-xs font-semibold border border-[color:var(--line)] text-[var(--text-1)] hover:bg-[var(--hover-bg)]"
                    >
                      Replay Walkthrough
                    </button>
                    <span className="ml-auto text-[10px] text-[var(--text-2)]">
                      {['Name the right owner', 'Show one system path', 'State what could break', 'Support with evidence'].join(' · ')}
                    </span>
                  </div>
                </div>

                {/* Compact scenario queue */}
                <div className="card p-4">
                  <p className="label mb-2">Scenario Queue</p>
                  <div className="space-y-1.5">
                    {scenarios.map((s) => {
                      const result = completedScenarios.get(s.id);
                      const isActive = selectedScenario?.id === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            selectScenario(s, { reuseScore: result ?? null, tab: 'Overview', step: 'Brief' });
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                            isActive
                              ? 'border-[rgba(39,211,182,0.5)] bg-[rgba(39,211,182,0.06)]'
                              : 'border-[color:var(--line)] hover:bg-[var(--hover-bg)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {s.domain && <DomainBadge domain={s.domain} size="xs" />}
                            <p className="text-xs font-medium text-[var(--text-0)] truncate">{s.title}</p>
                          </div>
                          <span className="text-[10px] text-[var(--text-2)] shrink-0 ml-2">{result ? `${Math.round(result.overallScore * 100)}%` : 'Not started'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            {viewMode === 'advanced' && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card p-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)]">Progress</p>
                <p className="text-xl font-bold mt-1">{completedScenarios.size}/{scenarios.length}</p>
                <div className="mt-2 w-full bg-[var(--track-bg)] rounded-full h-1.5 overflow-hidden">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[#4bd79e] transition-all duration-500" style={{ width: `${scenarios.length > 0 ? Math.max((completedScenarios.size / scenarios.length) * 100, completedScenarios.size > 0 ? 8 : 0) : 0}%` }} />
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {scenarios.map((s) => (
                    <div key={s.id} className={`w-2 h-2 rounded-sm transition-colors ${
                      completedScenarios.has(s.id) ? 'bg-[var(--ok)]' : selectedScenario?.id === s.id ? 'bg-[var(--accent)] opacity-50' : 'bg-[rgba(124,152,182,0.25)]'
                    }`} title={s.title} />
                  ))}
                </div>
              </div>
              <div className="card p-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)]">Quality</p>
                {completedScenarios.size > 0 ? (() => {
                  const scores = Array.from(completedScenarios.values()).map((s) => s.overallScore);
                  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                  const pct = Math.round(avg * 100);
                  return <p className={`text-xl font-bold mt-1 ${pct >= 80 ? 'text-[var(--ok)]' : pct >= 60 ? 'text-[var(--warn)]' : 'text-[var(--danger)]'}`}>{pct}%</p>;
                })() : <p className="text-xl font-bold mt-1 text-[var(--text-2)]">--</p>}
              </div>
              <div className="card p-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)]">Evidence</p>
                <p className="text-xl font-bold mt-1">{selectedEvidence.length}</p>
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => setActiveTab('Scenario Workspace')} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[var(--accent)] text-slate-950">Practice</button>
                  <button onClick={() => setActiveTab('Evaluation')} className="text-[10px] font-semibold px-2 py-1 rounded-md border border-[rgba(240,180,90,0.45)] text-[var(--warn-text)]">Feedback</button>
                </div>
              </div>
              <div className="card p-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)]">Actions</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  <button
                    onClick={() => { const next = !surveyStatus.preCompleted ? 'pre' as const : (!surveyStatus.postCompleted ? 'post' as const : null); if (next) setShowSurvey(next); }}
                    className="text-[10px] font-semibold px-2 py-1 rounded-md border border-[rgba(39,211,182,0.35)] text-[var(--accent-2)] disabled:text-[var(--text-2)]"
                    disabled={surveyStatus.preCompleted && surveyStatus.postCompleted}
                  >
                    Self-assess
                  </button>
                  <button onClick={() => setShowWalkthrough(true)} className="text-[10px] font-semibold px-2 py-1 rounded-md border border-[color:var(--line)] text-[var(--text-1)]">Walkthrough</button>
                </div>
              </div>
            </div>}

            {viewMode === 'advanced' && <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="card p-4 border-[rgba(240,180,90,0.35)] bg-[rgba(240,180,90,0.08)]">
                <p className="label">Problem Framing</p>
                <p className="text-xs text-[var(--text-0)] mt-2 leading-relaxed">{scenarioNarrative.problem}</p>
                <p className="text-xs text-[var(--text-1)] mt-2 leading-relaxed">{scenarioNarrative.motivation}</p>
              </div>
              <div className="card p-4">
                <p className="label">Review Framing</p>
                <p className="text-xs text-[var(--text-1)] mt-2 leading-relaxed">{scenarioNarrative.partialSolutions}</p>
                <p className="text-xs text-[var(--text-0)] mt-2 leading-relaxed">{scenarioNarrative.proofTarget}</p>
                {scenarioNarrative.clueTitles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {scenarioNarrative.clueTitles.map((title) => (
                      <span key={`advanced-${title}`} className="rounded-full border border-[color:var(--line)] bg-[var(--tag-bg)] px-2 py-0.5 text-[10px] text-[var(--text-1)]">{title}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>}

            {viewMode === 'advanced' && <div className="card p-4">
              <p className="label mb-2">All Scenarios</p>
              <div className="space-y-1.5">
                {scenarios.map((s) => {
                  const result = completedScenarios.get(s.id);
                  const isActive = selectedScenario?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => { selectScenario(s, { reuseScore: result ?? null, tab: 'Scenario Workspace', step: 'Decide' }); }}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                        isActive
                          ? 'border-[rgba(39,211,182,0.5)] bg-[rgba(39,211,182,0.06)]'
                          : 'border-[color:var(--line)] hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${result ? 'bg-[var(--ok)]' : isActive ? 'border border-[var(--accent)]' : 'border border-[rgba(124,152,182,0.35)]'}`} />
                        <span className="text-xs truncate text-[var(--text-1)]">{s.title}</span>
                        {s.domain && <DomainBadge domain={s.domain} size="xs" />}
                      </div>
                      {result ? (
                        <span className={`text-[10px] font-bold mono-kicker ${Math.round(result.overallScore * 100) >= 80 ? 'text-[var(--ok)]' : 'text-[var(--warn)]'}`}>{Math.round(result.overallScore * 100)}%</span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-2)]">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>}
          </div>
        )}

        {showScenarioWorkspace && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(340px,420px)] gap-4 items-start">
          {/* Left: Evidence + inline guidance */}
          <div className="space-y-3 reveal-up" style={{ animationDelay: '60ms' }}>
            {/* Compact guidance strip */}
            {viewMode === 'guided' && (
              <div className="rounded-xl border-l-[3px] border-l-[var(--accent)] border border-[rgba(39,211,182,0.25)] bg-[rgba(39,211,182,0.06)] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[var(--text-0)]">
                      {guidedStep === 'Investigate' ? 'Investigate the situation first.' : 'Make your call and justify it.'}
                    </h2>
                    <p className="text-xs text-[var(--text-1)] mt-1 leading-relaxed">
                      {guidedStep === 'Investigate'
                        ? 'Open evidence, identify the likely owner, and note the systems and risks that keep appearing. Do not rush to fill every field yet.'
                        : 'Use the evidence you selected to write one clear owner, one critical path, one safe plan, and one explicit blast radius.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-[10px] text-[var(--text-2)]">
                    <span className={hasPrimary ? 'text-[var(--ok)]' : ''}>Primary</span>
                    <span className={hasCorroborating ? 'text-[var(--ok)]' : ''}>Corroborating</span>
                    <span className={hasTrace ? 'text-[var(--ok)]' : ''}>Trace</span>
                    <span className={hasBlast ? 'text-[var(--ok)]' : ''}>Blast</span>
                  </div>
                </div>
                {guidedStep === 'Investigate' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setViewMode('advanced');
                        setActiveTab('System Graph');
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[color:var(--line)] text-[var(--text-2)] hover:bg-[var(--hover-bg)]"
                    >
                      Open Graph View
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Evidence card — primary workspace surface */}
            <div className="card card-primary p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Evidence Artifacts
                </h3>
                {selectedEvidence.length > 0 && (
                  <span className="text-[10px] font-semibold bg-[rgba(39,211,182,0.16)] border border-[rgba(39,211,182,0.36)] text-[var(--accent-2)] px-2 py-0.5 rounded-full mono-kicker">
                    {selectedEvidence.length} selected
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-2)] mb-2">Pick at least one primary artifact and one corroborating artifact before you submit.</p>
              <div className="space-y-1.5">
                {evidenceItems.map((ev) => {
                  const checked = selectedEvidence.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      data-testid={`evidence-card-${ev.id}`}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                        checked
                          ? 'bg-[rgba(39,211,182,0.12)] border-[rgba(39,211,182,0.5)]'
                          : 'bg-[var(--chip-bg)] border-[color:var(--line)] hover:bg-[var(--hover-bg)] hover:border-[color:var(--line-strong)]'
                      }`}
                    >
                      <div
                        className={`mt-0.5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                          checked ? 'bg-[#1db8a2] border-[#1db8a2]' : 'border-[color:var(--line)] bg-[var(--input-bg)]'
                        }`}
                        style={{ width: '1rem', height: '1rem' }}
                      >
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        data-testid={`evidence-toggle-${ev.id}`}
                        aria-label={`Select evidence ${ev.id}`}
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
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-[var(--text-0)] truncate">{ev.title}</p>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                            ev.role === 'primary'
                              ? 'bg-[rgba(75,215,158,0.12)] text-[var(--ok-text)] border-[rgba(75,215,158,0.35)]'
                              : 'bg-[rgba(240,180,90,0.12)] text-[var(--warn-text)] border-[rgba(240,180,90,0.35)]'
                          }`}>
                            {ev.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-2)] mt-0.5 line-clamp-1">
                          {ev.body.substring(0, 80)}…
                        </p>
                        {viewMode === 'advanced' && ev.metadata?.retrievalScore !== undefined && (
                          <p className="text-[10px] text-[var(--text-2)] mt-0.5 font-mono">
                            relevance: {(ev.metadata.retrievalScore * 100).toFixed(0)}%
                            {ev.metadata.source && <> · {ev.metadata.source}</>}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
                {evidenceItems.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-xs text-[var(--text-2)]">No evidence retrieved for this scenario yet.</p>
                    <button
                      onClick={() => fetchEvidence(selectedScenario.id, retrievalMode)}
                      className="mt-2 text-[11px] px-3 py-1 rounded-md bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.3)] transition-colors"
                    >
                      Refresh evidence
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible: Key Facts + Hints */}
            {selectedEvidenceItems.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-[var(--text-2)] hover:text-[var(--text-1)] py-1 flex items-center gap-1.5">
                  <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                  Extracted hints from {selectedEvidenceItems.length} evidence
                </summary>
                <div className="mt-1.5 rounded-lg bg-[var(--chip-bg)] border border-[color:var(--line)] p-3 space-y-2 text-xs text-[var(--text-1)]">
                  {keyFacts.owners.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)] mb-0.5">Owner / Escalation</p>
                      {keyFacts.owners.map((item) => <p key={item}>• {item}</p>)}
                    </div>
                  )}
                  {keyFacts.dependencies.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)] mb-0.5">Dependencies</p>
                      {keyFacts.dependencies.map((item) => <p key={item}>• {item}</p>)}
                    </div>
                  )}
                  {keyFacts.impacts.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)] mb-0.5">Impacts / Risks</p>
                      {keyFacts.impacts.map((item) => <p key={item}>• {item}</p>)}
                    </div>
                  )}
                  {suggestedSystems.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)] mb-0.5">Systems</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedSystems.slice(0, 6).map((item) => (
                          <span key={item} className="rounded-full border border-[color:var(--line)] bg-[var(--tag-bg)] px-2 py-0.5 text-[10px]">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* Right: Form + Score — sticky */}
          <div className="space-y-3 reveal-up lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto" style={{ animationDelay: '80ms' }}>
            {viewMode === 'guided' && guidedStep === 'Investigate' ? (
              <div className="card card-primary p-4">
                <h3 className="text-sm font-semibold text-[var(--text-1)] mb-3">What to extract before answering</h3>
                <div className="space-y-2.5 text-xs text-[var(--text-1)]">
                  <div className="rounded-lg border border-[color:var(--line)] bg-[var(--chip-bg)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)] mb-1">1. Likely Owner</p>
                    <p>{keyFacts.owners[0] ?? suggestedTeams[0] ?? 'Find the team or escalation path in the ownership or runbook artifact.'}</p>
                  </div>
                  <div className="rounded-lg border border-[color:var(--line)] bg-[var(--chip-bg)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)] mb-1">2. Connected Systems</p>
                    <p>{suggestedSystems.length > 0 ? suggestedSystems.slice(0, 4).join(', ') : 'Look for service names repeated across the selected artifacts.'}</p>
                  </div>
                  <div className="rounded-lg border border-[color:var(--line)] bg-[var(--chip-bg)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-2)] mb-1">3. Risk To Watch</p>
                    <p>{keyFacts.impacts[0] ?? 'Look for impact, failure mode, rollback trigger, or stale-result wording in the evidence.'}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={fillBeginnerDraft}
                    disabled={selectedEvidenceItems.length === 0}
                    data-testid="build-starter-draft"
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--accent)] text-slate-950 hover:bg-[#27d3b6] disabled:bg-[var(--disabled-bg)] disabled:text-[var(--text-2)]"
                  >
                    Build My Starter Draft
                  </button>
                  <button
                    onClick={() => setGuidedStep('Decide')}
                    data-testid="continue-to-decision"
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-[color:var(--line)] text-[var(--text-1)] hover:bg-[var(--hover-bg)]"
                  >
                    Continue To Decision
                  </button>
                </div>
              </div>
            ) : (
            <div className="card card-primary p-4">
              <h3 className="text-xs font-semibold text-[var(--text-1)] flex items-center gap-2 mb-3">
                <svg className="w-3.5 h-3.5 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Your Submission
              </h3>
              <div className="mb-3 flex gap-2">
                <button
                  onClick={fillBeginnerDraft}
                  disabled={selectedEvidenceItems.length === 0}
                  data-testid="fill-beginner-template"
                  className="flex-1 text-[11px] font-semibold px-2 py-1.5 rounded-md border border-[rgba(39,211,182,0.35)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.18)] disabled:text-[var(--text-2)] disabled:border-[color:var(--line)] disabled:cursor-not-allowed transition-colors"
                >
                  Fill Template
                </button>
                <button
                  onClick={fetchExampleAnswer}
                  disabled={exampleLoading}
                  data-testid="show-example-answer"
                  className="flex-1 text-[11px] font-semibold px-2 py-1.5 rounded-md border border-[rgba(240,180,90,0.35)] text-[var(--warn-text)] hover:bg-[rgba(240,180,90,0.12)] disabled:text-[var(--text-2)] disabled:border-[color:var(--line)] disabled:cursor-not-allowed transition-colors"
                >
                  {exampleLoading ? 'Loading…' : 'Show Good Answer'}
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="label">Who Should Own This?</label>
                  <input
                    type="text"
                    placeholder="e.g., Checkout Platform Team"
                    aria-label="Who Should Own This?"
                    data-testid="owner-routing-input"
                    value={formData.ownerRouting}
                    onChange={(e) => {
                      setSubmitError(null);
                      setFormData({ ...formData, ownerRouting: e.target.value });
                    }}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="label">What Should Happen Next?</label>
                  <textarea
                    placeholder="e.g., Pause rollout, notify owner team, verify error rate"
                    aria-label="What Should Happen Next?"
                    data-testid="action-plan-input"
                    value={formData.actionPlan}
                    onChange={(e) => {
                      setSubmitError(null);
                      setFormData({ ...formData, actionPlan: e.target.value });
                    }}
                    className="form-input resize-none h-20"
                  />
                </div>

                <div>
                  <label className="label">Which Systems Are Connected?</label>
                  <textarea
                    placeholder={'One edge per line, e.g.\nCheckout API -> Payments (downstream)\nCatalog -> Checkout API (upstream)'}
                    aria-label="Which Systems Are Connected?"
                    data-testid="dependency-trace-input"
                    value={dependencyTraceInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSubmitError(null);
                      setDependencyTraceInput(value);
                      setFormData({ ...formData, dependencyTrace: parseDependencyTrace(value) });
                    }}
                    className="form-input resize-none h-16"
                  />
                </div>

                <div>
                  <label className="label">What Could Break?</label>
                  <textarea
                    placeholder={'One downstream impact per line, e.g.\nPayment failures for new orders\nCustomer support spike'}
                    aria-label="What Could Break?"
                    data-testid="blast-radius-input"
                    value={blastRadiusInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSubmitError(null);
                      setBlastRadiusInput(value);
                      setFormData({ ...formData, blastRadius: parseBlastRadius(value) });
                    }}
                    className="form-input resize-none h-16"
                  />
                </div>

                <div>
                  <label className="label">Why Do You Believe This?</label>
                  <textarea
                    placeholder="e.g., Runbook lists owner; incident note confirms dependency"
                    aria-label="Why Do You Believe This?"
                    data-testid="evidence-notes-input"
                    value={formData.evidenceNotes}
                    onChange={(e) => {
                      setSubmitError(null);
                      setFormData({ ...formData, evidenceNotes: e.target.value });
                    }}
                    className="form-input resize-none h-20"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  data-testid="submit-and-score"
                  className="w-full flex items-center justify-center gap-2 bg-[#1db8a2] hover:bg-[#27d3b6] active:bg-[#17a08d] disabled:bg-[var(--disabled-bg)] disabled:text-[var(--text-2)] disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 rounded-lg transition-colors text-sm mt-1"
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
            )}

            {/* Score result */}
            {score && (
              <div data-testid="score-result-card" className={`card p-6 ${score.gatingPass ? 'border-[rgba(75,215,158,0.45)]' : 'border-[rgba(240,180,90,0.55)]'}`}>
                <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2 mb-5">
                  <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  Evaluation Result
                </h3>
                <div className="mb-5 rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--text-2)]">Quick Read</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span data-testid="score-status-label" className={`text-lg font-bold ${scoreStatusTone}`}>{scoreStatusLabel}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      score.gatingPass
                        ? 'bg-[rgba(75,215,158,0.14)] text-[var(--ok-text)] border-[rgba(75,215,158,0.45)]'
                        : 'bg-[rgba(255,124,124,0.16)] text-[var(--danger-text)] border-[rgba(255,124,124,0.5)]'
                    }`}>
                      {score.gatingPass ? 'Evidence support passed' : 'Missing evidence support'}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-1)] mt-2 leading-relaxed">{scoreSummary}</p>
                </div>
                <div className="flex items-center gap-6">
                  <ScoreRing score={score.overallScore} />
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)] mb-1.5">Gating</p>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          score.gatingPass
                            ? 'bg-[rgba(75,215,158,0.14)] text-[var(--ok-text)] border-[rgba(75,215,158,0.45)]'
                            : 'bg-[rgba(255,124,124,0.16)] text-[var(--danger-text)] border-[rgba(255,124,124,0.5)]'
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
                            <li key={idx} className="text-xs text-[var(--danger-text)] flex items-start gap-1.5">
                              <span className="mt-0.5 text-red-500 shrink-0">•</span>
                              <span>{err}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--ok-text)]">No critical issues detected.</p>
                    )}
                  </div>
                </div>
                {beginnerMetrics.length > 0 && (
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {beginnerMetrics.map((metric) => (
                      <div key={metric.label} className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-[var(--text-0)]">{metric.label}</span>
                          <span className={`text-xs font-semibold ${getPerformanceTone(metric.value)}`}>{getPerformanceLabel(metric.value)}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-2)] mt-1">{getMetricCoaching(metric.label, metric.value)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {showSystemGraph && (
          <div className="space-y-4 reveal-up">
            <div className="card p-6">
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    Dependency Graph — {selectedScenario.title}
                  </h3>
                  <span className="text-xs font-semibold text-[var(--text-2)] mono-kicker">mode: {retrievalMode}</span>
                </div>
                {renderRetrievalModePicker()}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 max-w-xl">
                    <label className="text-[10px] uppercase tracking-wider text-[var(--text-2)] block mb-1">Filter services or paths</label>
                    <input
                      value={graphFilter}
                      onChange={(event) => setGraphFilter(event.target.value)}
                      placeholder="Search by service name"
                      data-testid="graph-filter-input"
                      className="form-input h-10 text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOnlyFocusedGraphEdges((value) => !value)}
                      className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                        showOnlyFocusedGraphEdges
                          ? 'border-[rgba(39,211,182,0.45)] bg-[rgba(39,211,182,0.12)] text-[var(--accent-2)]'
                          : 'border-[color:var(--line)] text-[var(--text-1)] hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      {showOnlyFocusedGraphEdges ? 'Showing focused edges' : 'Focus selected node path'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGraphFilter('');
                        setFocusedGraphNode(null);
                        setShowOnlyFocusedGraphEdges(false);
                      }}
                      className="text-xs font-semibold px-3 py-2 rounded-lg border border-[color:var(--line)] text-[var(--text-1)] hover:bg-[var(--hover-bg)]"
                    >
                      Reset graph review
                    </button>
                  </div>
                </div>
              </div>
              {graphConnectedServices.length > 0 && (
                <div className="mb-4 rounded-xl border border-[rgba(39,211,182,0.28)] bg-[rgba(39,211,182,0.08)] p-4">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--accent-2)] mb-2">Retrieved graph context</p>
                  {graphSeedServices.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-[var(--text-2)] mb-1">Seed services from the current scenario prompt</p>
                      <div className="flex flex-wrap gap-2">
                        {graphSeedServices.map((service) => (
                          <span key={service} className="rounded-full border border-[rgba(39,211,182,0.45)] bg-[rgba(39,211,182,0.14)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-2)]">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-[var(--text-2)] mb-1">Connected services surfaced by graph traversal</p>
                    <div className="flex flex-wrap gap-2">
                      {graphConnectedServices.map((service) => (
                        <span key={service} className="rounded-full border border-[color:var(--line)] bg-[var(--chip-bg)] px-2.5 py-1 text-[11px] text-[var(--text-1)]">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                  {graphMatchedServices.length > 0 && (
                    <p className="text-[11px] text-[var(--text-1)] mt-3">Selected evidence currently matches: {graphMatchedServices.join(', ')}</p>
                  )}
                </div>
              )}
              {displayGraphEdges.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[var(--text-2)] mb-2">
                    {graphConnectedServices.length > 0 ? 'Graph context is available. Add explicit edges in the workspace when you are ready to commit your answer.' : 'No dependency edges captured yet.'}
                  </p>
                  <button onClick={() => setActiveTab('Scenario Workspace')} className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)]">
                    Add edges in Scenario Workspace
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-4">
                  <div className="space-y-3">
                  {retrievedGraphEdges.length > 0 && formData.dependencyTrace.length === 0 && (
                    <div className="rounded-xl border border-[rgba(39,211,182,0.24)] bg-[rgba(39,211,182,0.06)] p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-xs font-semibold text-[var(--accent-2)]">Retrieved graph edges</p>
                        <span className="text-[10px] text-[var(--text-2)]">review mode only</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-1)] mb-3">These edges come from graph-aware retrieval context. Add the final edges you want to defend in the Scenario Workspace form.</p>
                      <div className="space-y-2">
                        {retrievedGraphEdges.map((edge, idx) => (
                          <div key={`${edge.from}-${edge.to}-${edge.type}-${idx}`} className="flex items-center gap-3 rounded-lg border border-[color:var(--line)] bg-[var(--chip-bg)] p-3">
                            <span className="text-sm font-medium text-[var(--text-0)] bg-[var(--node-bg)] px-2 py-1 rounded">{edge.from}</span>
                            <div className="flex items-center gap-1">
                              <div className={`w-8 h-px ${edge.type === 'downstream' ? 'bg-[var(--accent)]' : 'bg-[var(--warn)]'}`} />
                              <svg className={`w-3 h-3 ${edge.type === 'downstream' ? 'text-[var(--accent)]' : 'text-[var(--warn)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-[var(--text-0)] bg-[var(--node-bg)] px-2 py-1 rounded">{edge.to}</span>
                            <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              edge.type === 'downstream'
                                ? 'bg-[rgba(39,211,182,0.12)] text-[var(--accent-2)] border-[rgba(39,211,182,0.35)]'
                                : 'bg-[rgba(240,180,90,0.12)] text-[var(--warn-text)] border-[rgba(240,180,90,0.35)]'
                            }`}>
                              {edge.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                    <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-xs font-semibold text-[var(--text-1)]">Interactive node review</p>
                        <span className="text-[10px] text-[var(--text-2)]">click a node to inspect incoming and outgoing paths</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {visibleGraphNodes.map((node) => {
                          const isFocused = focusedGraphNode === node;
                          const incomingCount = displayGraphEdges.filter((edge) => edge.to === node).length;
                          const outgoingCount = displayGraphEdges.filter((edge) => edge.from === node).length;
                          const relatedEvidenceCount = graphEvidenceForNode(node).length;
                          return (
                            <button
                              key={node}
                              type="button"
                              onClick={() => setFocusedGraphNode((current) => current === node ? null : node)}
                              className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                                isFocused
                                  ? 'border-[rgba(39,211,182,0.5)] bg-[rgba(39,211,182,0.12)]'
                                  : 'border-[color:var(--line)] bg-[var(--tag-bg)] hover:border-[color:var(--line-strong)]'
                              }`}
                            >
                              <span className="block text-xs font-semibold text-[var(--text-0)]">{node}</span>
                              <span className="block text-[10px] text-[var(--text-2)] mt-1">{incomingCount} in · {outgoingCount} out · {relatedEvidenceCount} evidence</span>
                            </button>
                          );
                        })}
                        {visibleGraphNodes.length === 0 && (
                          <p className="text-xs text-[var(--text-2)]">No graph nodes match the current filter.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-xs font-semibold text-[var(--text-1)]">Path review</p>
                        <span className="text-[10px] text-[var(--text-2)]">{filteredGraphEdges.length} visible edges</span>
                      </div>
                      <div className="space-y-2">
                  {filteredGraphEdges.map((edge, idx) => {
                    const isFocusedEdge = focusedGraphNode ? edge.from === focusedGraphNode || edge.to === focusedGraphNode : false;
                    return (
                    <div key={`${edge.from}-${edge.to}-${idx}`} className={`flex items-center gap-3 rounded-lg border p-3 ${
                      isFocusedEdge
                        ? 'border-[rgba(39,211,182,0.4)] bg-[rgba(39,211,182,0.08)]'
                        : 'border-[color:var(--line)]'
                    }`}>
                      <span className="text-sm font-medium text-[var(--text-0)] bg-[var(--node-bg)] px-2 py-1 rounded">{edge.from}</span>
                      <div className="flex items-center gap-1">
                        <div className={`w-8 h-px ${edge.type === 'downstream' ? 'bg-[var(--accent)]' : 'bg-[var(--warn)]'}`} />
                        <svg className={`w-3 h-3 ${edge.type === 'downstream' ? 'text-[var(--accent)]' : 'text-[var(--warn)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[var(--text-0)] bg-[var(--node-bg)] px-2 py-1 rounded">{edge.to}</span>
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        edge.type === 'downstream'
                          ? 'bg-[rgba(39,211,182,0.12)] text-[var(--accent-2)] border-[rgba(39,211,182,0.35)]'
                          : 'bg-[rgba(240,180,90,0.12)] text-[var(--warn-text)] border-[rgba(240,180,90,0.35)]'
                      }`}>
                        {edge.type}
                      </span>
                    </div>
                    );
                  })}
                      </div>
                      {filteredGraphEdges.length === 0 && (
                        <p className="text-xs text-[var(--text-2)] mt-3">No graph edges match the current review filter.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-xs font-semibold text-[var(--text-1)]">Node detail</p>
                        <span className="text-[10px] text-[var(--text-2)]">{focusedGraphNode ? 'focused' : 'select a node'}</span>
                      </div>
                      {focusedGraphNode ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-0)]">{focusedGraphNode}</p>
                            <p className="text-[11px] text-[var(--text-2)] mt-1">Use this panel to inspect how one service participates in the current reasoning path.</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-[color:var(--line)] bg-[var(--tag-bg)] p-3">
                              <p className="text-[10px] uppercase tracking-wide text-[var(--text-2)]">Incoming edges</p>
                              <p className="text-lg font-semibold text-[var(--text-0)] mt-1">{focusedNodeIncomingEdges.length}</p>
                            </div>
                            <div className="rounded-lg border border-[color:var(--line)] bg-[var(--tag-bg)] p-3">
                              <p className="text-[10px] uppercase tracking-wide text-[var(--text-2)]">Outgoing edges</p>
                              <p className="text-lg font-semibold text-[var(--text-0)] mt-1">{focusedNodeOutgoingEdges.length}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-[var(--text-2)] mb-2">Incoming from</p>
                            <div className="flex flex-wrap gap-2">
                              {focusedNodeIncomingEdges.map((edge, idx) => (
                                <span key={`${edge.from}-${idx}`} className="rounded-full border border-[rgba(240,180,90,0.35)] bg-[rgba(240,180,90,0.12)] px-2 py-0.5 text-[10px] text-[var(--warn-text)]">{edge.from}</span>
                              ))}
                              {focusedNodeIncomingEdges.length === 0 && <span className="text-[11px] text-[var(--text-2)]">No incoming edges in the current view.</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-[var(--text-2)] mb-2">Outgoing to</p>
                            <div className="flex flex-wrap gap-2">
                              {focusedNodeOutgoingEdges.map((edge, idx) => (
                                <span key={`${edge.to}-${idx}`} className="rounded-full border border-[rgba(39,211,182,0.35)] bg-[rgba(39,211,182,0.12)] px-2 py-0.5 text-[10px] text-[var(--accent-2)]">{edge.to}</span>
                              ))}
                              {focusedNodeOutgoingEdges.length === 0 && <span className="text-[11px] text-[var(--text-2)]">No outgoing edges in the current view.</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-[var(--text-2)] mb-2">Related evidence</p>
                            <div className="space-y-2">
                              {graphEvidenceForNode(focusedGraphNode).slice(0, 4).map((item) => (
                                <div key={item.id} className="rounded-lg border border-[color:var(--line)] bg-[var(--tag-bg)] p-3">
                                  <p className="text-xs font-semibold text-[var(--text-0)]">{item.title}</p>
                                  <p className="text-[11px] text-[var(--text-2)] mt-1">{item.id} · {item.role}</p>
                                </div>
                              ))}
                              {graphEvidenceForNode(focusedGraphNode).length === 0 && (
                                <p className="text-[11px] text-[var(--text-2)]">No directly linked evidence was found for this node in the current evidence set.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-2)]">Select a node from the interactive node review panel to inspect incoming paths, outgoing paths, and related evidence.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showEvidence && (
          <div className="space-y-4 reveal-up">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--text-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Evidence Artifacts — {selectedScenario.title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-2)] mt-1">Switch retrieval modes to compare plain ranking against graph-aware evidence context.</p>
                </div>
                <span className="text-xs font-semibold text-[var(--text-2)] mono-kicker">{evidenceItems.length} retrieved · {retrievalMode}</span>
              </div>
              <div className="mb-4">{renderRetrievalModePicker()}</div>
              <div className="space-y-3">
                {evidenceItems.map((ev) => {
                  const isSelected = selectedEvidence.includes(ev.id);
                  return (
                    <div key={ev.id} className={`rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? 'border-[rgba(39,211,182,0.5)] bg-[rgba(39,211,182,0.06)]'
                        : 'border-[color:var(--line)] bg-[var(--chip-bg)]'
                    }`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text-0)]">{ev.title}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                            ev.role === 'primary'
                              ? 'bg-[rgba(75,215,158,0.12)] text-[var(--ok-text)] border-[rgba(75,215,158,0.35)]'
                              : 'bg-[rgba(240,180,90,0.12)] text-[var(--warn-text)] border-[rgba(240,180,90,0.35)]'
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
                            <div className="w-16 bg-[var(--track-bg)] rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-[var(--accent)]" style={{ width: `${Math.round(ev.metadata.retrievalScore * 100)}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-[var(--text-2)]">{(ev.metadata.retrievalScore * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-1)] leading-relaxed">{ev.body}</p>
                      {ev.metadata && (
                        <div className="flex flex-wrap gap-3 mt-2">
                          {ev.metadata.source && <span className="text-[10px] font-mono text-[var(--text-2)]">source: {ev.metadata.source}</span>}
                          {ev.metadata.type && <span className="text-[10px] font-mono text-[var(--text-2)]">type: {ev.metadata.type}</span>}
                          {ev.metadata.selectionPolicy && <span className="text-[10px] font-mono text-[var(--warn-text)]">policy: {ev.metadata.selectionPolicy}</span>}
                          {ev.metadata.graphMatchedServices && ev.metadata.graphMatchedServices.length > 0 && (
                            <span className="text-[10px] font-mono text-[var(--accent-2)]">matched: {ev.metadata.graphMatchedServices.join(', ')}</span>
                          )}
                        </div>
                      )}
                      {ev.metadata?.graphConnectedServices && ev.metadata.graphConnectedServices.length > 0 && (
                        <div className="mt-3 rounded-lg border border-[rgba(39,211,182,0.22)] bg-[rgba(39,211,182,0.06)] p-3">
                          <p className="text-[10px] uppercase tracking-wide text-[var(--accent-2)] mb-2">Graph provenance</p>
                          {ev.metadata.graphSeedServices && ev.metadata.graphSeedServices.length > 0 && (
                            <p className="text-[11px] text-[var(--text-1)] mb-2">Seed services: {ev.metadata.graphSeedServices.join(', ')}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {ev.metadata.graphConnectedServices.map((service) => (
                              <span key={`${ev.id}-${service}`} className="rounded-full border border-[color:var(--line)] bg-[var(--chip-bg)] px-2 py-0.5 text-[10px] text-[var(--text-1)]">
                                {service}
                              </span>
                            ))}
                          </div>
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

        {showEvaluation && (
          <div className="space-y-4 reveal-up">
            {score ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Overall score */}
                  <div data-testid="evaluation-overall-score" className="card p-6 flex items-center gap-6">
                    <ScoreRing score={score.overallScore} />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-1)] mb-2">Overall Score</p>
                      <p data-testid="evaluation-score-status" className={`text-lg font-bold ${scoreStatusTone}`}>{scoreStatusLabel}</p>
                      <p className="text-xs text-[var(--text-2)] mt-1 max-w-sm">{scoreSummary}</p>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        score.gatingPass
                          ? 'bg-[rgba(75,215,158,0.14)] text-[var(--ok-text)] border-[rgba(75,215,158,0.45)]'
                          : 'bg-[rgba(255,124,124,0.16)] text-[var(--danger-text)] border-[rgba(255,124,124,0.5)]'
                      }`}>
                        {score.gatingPass ? '✓ Gating Passed' : '✗ Gating Not Passed'}
                      </span>
                      {score.criticalErrors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-[var(--text-2)] mb-1">Critical Issues:</p>
                          {score.criticalErrors.map((err, i) => (
                            <p key={i} className="text-xs text-[var(--danger-text)]">• {err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metrics breakdown */}
                  {score.metrics && (
                    <div className="card p-6">
                      <p className="text-sm font-semibold text-[var(--text-1)] mb-1">What the app is checking</p>
                      <p className="text-xs text-[var(--text-2)] mb-3">These are the four things that matter most for a new TPM answer.</p>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Owner Match', value: score.metrics.ownerAccuracy },
                          { label: 'System Connections', value: score.metrics.dependencyAccuracy },
                          { label: 'Blast Radius', value: score.metrics.blastRadiusCompleteness },
                          { label: 'Evidence Support', value: score.metrics.evidenceRelevance },
                        ].map((m) => (
                          <div key={m.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[var(--text-2)]">{m.label}</span>
                              <span className="font-mono text-[var(--text-1)]">{(m.value * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-[var(--track-bg)] rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full transition-all ${
                                m.value >= 0.8 ? 'bg-[var(--ok)]' : m.value >= 0.6 ? 'bg-[var(--warn)]' : 'bg-[var(--danger)]'
                              }`} style={{ width: `${Math.round(m.value * 100)}%` }} />
                            </div>
                            <p className="text-[11px] text-[var(--text-2)] mt-1">{getMetricCoaching(m.label, m.value)}</p>
                          </div>
                        ))}
                        <div className="flex gap-4 mt-2 pt-2 border-t border-[color:var(--line)]">
                          <span className="text-xs text-[var(--text-2)]">Direction: <span className={score.metrics.directionCorrect ? 'text-[var(--ok)]' : 'text-[var(--danger)]'}>{score.metrics.directionCorrect ? 'Clear' : 'Needs fixing'}</span></span>
                          <span className="text-xs text-[var(--text-2)]">Unsupported claims: <span className="text-[var(--text-1)]">{score.metrics.unsupportedClaimCount}</span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card p-6">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-1)]">Mode Comparison</p>
                      <p className="text-xs text-[var(--text-2)] mt-1">Compares retrieval modes (vector, graph, GraphRAG, GraphRAG+gating) and surfaces the best mode, evidence counts, and differences to help reviewers verify claims quickly.</p>
                    </div>
                    {comparisonForSelectedScenario && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-[rgba(39,211,182,0.12)] text-[var(--accent-2)] border-[rgba(39,211,182,0.35)]">
                        Best current mode: {modeLabels.get(comparisonForSelectedScenario.bestMode) ?? comparisonForSelectedScenario.bestMode}
                      </span>
                    )}
                  </div>

                  {evaluationCompareLoading ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                      <Spinner />
                      Comparing modes for this scenario...
                    </div>
                  ) : evaluationCompareError ? (
                    <p className="text-sm text-[var(--danger-text)]">{evaluationCompareError}</p>
                  ) : comparisonForSelectedScenario ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {comparisonForSelectedScenario.results.map((result) => {
                          const scorePct = Math.round(result.overallScore * 100);
                          const deltaVsVector = vectorBaseline
                            ? Math.round((result.overallScore - vectorBaseline.overallScore) * 100)
                            : 0;
                          const isBest = result.mode === comparisonForSelectedScenario.bestMode;
                          return (
                            <div key={result.mode} className={`rounded-xl border p-4 ${
                              isBest
                                ? 'border-[rgba(39,211,182,0.45)] bg-[rgba(39,211,182,0.08)]'
                                : 'border-[color:var(--line)] bg-[var(--chip-bg)]'
                            }`}>
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                  <p className="text-sm font-semibold text-[var(--text-0)]">{modeLabels.get(result.mode) ?? result.mode}</p>
                                  <p className="text-[11px] text-[var(--text-2)] mt-1">{result.evidenceCount} evidence selected</p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-lg font-bold ${result.overallScore >= 0.8 ? 'text-[var(--ok)]' : result.overallScore >= 0.6 ? 'text-[var(--warn)]' : 'text-[var(--danger)]'}`}>{scorePct}%</p>
                                  <p className="text-[10px] text-[var(--text-2)]">{result.mode === 'vector' ? 'baseline' : `${deltaVsVector >= 0 ? '+' : ''}${deltaVsVector} vs vector`}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  result.gatingPass
                                    ? 'bg-[rgba(75,215,158,0.12)] text-[var(--ok-text)] border-[rgba(75,215,158,0.35)]'
                                    : 'bg-[rgba(255,124,124,0.16)] text-[var(--danger-text)] border-[rgba(255,124,124,0.4)]'
                                }`}>
                                  {result.gatingPass ? 'gating passed' : 'gating failed'}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[color:var(--line)] text-[var(--text-2)]">
                                  unsupported claims: {result.metrics.unsupportedClaimCount}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[color:var(--line)] text-[var(--text-2)]">
                                  critical errors: {result.metrics.criticalErrorCount}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                                <div className="rounded-lg border border-[color:var(--line)] bg-[var(--tag-bg)] p-2">
                                  <p className="text-[var(--text-2)]">Owner</p>
                                  <p className="text-[var(--text-0)] font-semibold mt-1">{Math.round(result.metrics.ownerAccuracy * 100)}%</p>
                                </div>
                                <div className="rounded-lg border border-[color:var(--line)] bg-[var(--tag-bg)] p-2">
                                  <p className="text-[var(--text-2)]">Dependencies</p>
                                  <p className="text-[var(--text-0)] font-semibold mt-1">{Math.round(result.metrics.dependencyAccuracy * 100)}%</p>
                                </div>
                                <div className="rounded-lg border border-[color:var(--line)] bg-[var(--tag-bg)] p-2">
                                  <p className="text-[var(--text-2)]">Blast radius</p>
                                  <p className="text-[var(--text-0)] font-semibold mt-1">{Math.round(result.metrics.blastRadiusCompleteness * 100)}%</p>
                                </div>
                                <div className="rounded-lg border border-[color:var(--line)] bg-[var(--tag-bg)] p-2">
                                  <p className="text-[var(--text-2)]">Evidence relevance</p>
                                  <p className="text-[var(--text-0)] font-semibold mt-1">{Math.round(result.metrics.evidenceRelevance * 100)}%</p>
                                </div>
                              </div>
                              <p className="text-[11px] text-[var(--text-1)]">
                                {result.gatingPass
                                  ? 'This mode currently produces a defensible evidence mix for the scenario.'
                                  : result.metrics.unsupportedClaimCount > 0
                                    ? 'This mode still leaves unsupported reasoning in the generated submission path.'
                                    : 'This mode still misses at least one hard submission requirement.'}
                              </p>
                              {result.selectedEvidenceTitles.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-2)] mb-2">Selected evidence mix</p>
                                  <div className="flex flex-wrap gap-2">
                                    {result.selectedEvidenceTitles.slice(0, 3).map((title) => (
                                      <span key={`${result.mode}-${title}`} className="rounded-full border border-[color:var(--line)] bg-[var(--tag-bg)] px-2 py-0.5 text-[10px] text-[var(--text-1)]">{title}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {vectorBaseline && (() => {
                        const bestModeResult = comparisonForSelectedScenario.results.find((result) => result.mode === comparisonForSelectedScenario.bestMode) ?? vectorBaseline;
                        const scoreDelta = Math.round((bestModeResult.overallScore - vectorBaseline.overallScore) * 100);
                        return (
                          <div className="rounded-xl border border-[rgba(240,180,90,0.35)] bg-[rgba(240,180,90,0.08)] p-4">
                            <p className="text-xs font-semibold text-[var(--warn-text)] mb-2">How to explain this result</p>
                            <p className="text-sm text-[var(--text-1)] leading-relaxed">
                              Compared with the vector baseline, <span className="font-semibold text-[var(--text-0)]">{modeLabels.get(bestModeResult.mode) ?? bestModeResult.mode}</span>
                              {' '}currently changes the scenario outcome by <span className="font-semibold text-[var(--text-0)]">{scoreDelta >= 0 ? '+' : ''}{scoreDelta} points</span>.
                              {' '}The most important review signal is whether the mode improves evidence relevance and reduces unsupported claims without hurting gating.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-2)]">Mode comparison will appear here when scenario comparison data is available.</p>
                  )}
                </div>

                <div className="card p-6">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-1)]">Diagnostics Panel</p>
                      <p className="text-xs text-[var(--text-2)] mt-1">This breaks the evaluation into error categories so it is clearer where the current answer is weak and where the strongest retrieval mode helps.</p>
                    </div>
                    {bestCompareResult && (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full border border-[rgba(39,211,182,0.35)] bg-[rgba(39,211,182,0.12)] text-[var(--accent-2)]">
                        Retrieval benchmark: {modeLabels.get(bestCompareResult.mode) ?? bestCompareResult.mode}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)] mb-3">Current answer diagnostics</p>
                      <div className="space-y-3">
                        {currentDiagnostics.map((item) => (
                          <div key={`current-${item.label}`} className="rounded-lg border border-[color:var(--line)] bg-[var(--tag-bg)] p-3">
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <p className="text-sm font-semibold text-[var(--text-0)]">{item.label}</p>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                item.status === 'strong'
                                  ? 'bg-[rgba(75,215,158,0.12)] text-[var(--ok-text)] border-[rgba(75,215,158,0.35)]'
                                  : item.status === 'warning'
                                    ? 'bg-[rgba(240,180,90,0.12)] text-[var(--warn-text)] border-[rgba(240,180,90,0.35)]'
                                    : 'bg-[rgba(255,124,124,0.16)] text-[var(--danger-text)] border-[rgba(255,124,124,0.4)]'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-2)] leading-relaxed">{item.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[rgba(39,211,182,0.24)] bg-[rgba(39,211,182,0.06)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-2)] mb-3">Best-mode diagnostics</p>
                      {bestCompareResult ? (
                        <div className="space-y-3">
                          {bestModeDiagnostics.map((item) => (
                            <div key={`best-${item.label}`} className="rounded-lg border border-[rgba(39,211,182,0.22)] bg-[var(--tag-bg)] p-3">
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <p className="text-sm font-semibold text-[var(--text-0)]">{item.label}</p>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  item.status === 'strong'
                                    ? 'bg-[rgba(75,215,158,0.12)] text-[var(--ok-text)] border-[rgba(75,215,158,0.35)]'
                                    : item.status === 'warning'
                                      ? 'bg-[rgba(240,180,90,0.12)] text-[var(--warn-text)] border-[rgba(240,180,90,0.35)]'
                                      : 'bg-[rgba(255,124,124,0.16)] text-[var(--danger-text)] border-[rgba(255,124,124,0.4)]'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-2)] leading-relaxed">{item.detail}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-2)]">Best-mode diagnostics will appear here when comparison data is available.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rubric scores */}
                {score.rubricScores && score.rubricScores.length > 0 && (
                  <div className="card p-6">
                    <p className="text-sm font-semibold text-[var(--text-1)] mb-3">Rubric Breakdown</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {score.rubricScores.map((rs) => (
                        <div key={rs.criterion} className="rounded-xl border border-[color:var(--line)] p-3 bg-[var(--chip-bg)]">
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
                <p className="text-xs text-[var(--text-2)] mb-4">Complete a submission to see rubric feedback and metrics.</p>
                <button onClick={() => { if (viewMode === 'guided') { setGuidedStep('Investigate'); } else { setActiveTab('Scenario Workspace'); } }} className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)]">
                  Go to Scenario Workspace
                </button>
              </div>
            )}
          </div>
        )}

        {showCheckInExport && (() => {
          const completedArr = Array.from(completedScenarios.entries());
          const avgScore = completedArr.length > 0
            ? completedArr.reduce((s, [, r]) => s + r.overallScore, 0) / completedArr.length
            : 0;
          const gatingPassCount = completedArr.filter(([, result]) => result.gatingPass).length;
          const bestModeResult = comparisonForSelectedScenario
            ? comparisonForSelectedScenario.results.find((result) => result.mode === comparisonForSelectedScenario.bestMode) ?? null
            : null;
          const comparisonDelta = bestModeResult && vectorBaseline
            ? Math.round((bestModeResult.overallScore - vectorBaseline.overallScore) * 100)
            : null;
          const selectedEvidenceTitles = selectedEvidenceItems.map((item) => item.title);
          const selectedPrimaryTitles = selectedEvidenceItems.filter((item) => item.role === 'primary').map((item) => item.title);
          const selectedCorroboratingTitles = selectedEvidenceItems.filter((item) => item.role === 'corroborating').map((item) => item.title);
          const metricSummary = score?.metrics
            ? [
                { label: 'Owner match', value: score.metrics.ownerAccuracy },
                { label: 'System connections', value: score.metrics.dependencyAccuracy },
                { label: 'Blast radius', value: score.metrics.blastRadiusCompleteness },
                { label: 'Evidence support', value: score.metrics.evidenceRelevance },
              ]
            : [];
          const strongestMetric = metricSummary.length > 0
            ? [...metricSummary].sort((left, right) => right.value - left.value)[0]
            : null;
          const weakestMetric = metricSummary.length > 0
            ? [...metricSummary].sort((left, right) => left.value - right.value)[0]
            : null;
          const currentActionHeadline = formData.actionPlan
            .split('\n')
            .map((line) => line.trim())
            .find(Boolean);
          const nextReviewFocus = !score
            ? 'Score the current scenario so the export can capture concrete feedback.'
            : !score.gatingPass
              ? 'Tighten unsupported claims and make sure every decision point is backed by named evidence.'
              : weakestMetric && weakestMetric.value < 0.8
                ? `Strengthen ${weakestMetric.label.toLowerCase()} before presenting this scenario as complete.`
                : 'This scenario is in a presentable state; use the comparison summary to explain why the current evidence strategy is defensible.';
          const downloadExport = () => {
            const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            const safeTitle = selectedScenario.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            anchor.href = url;
            anchor.download = `omnimentor-checkin-${safeTitle || 'scenario'}.txt`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
          };
          const exportText = [
            `OmniMentor — Mentor Check-in Snapshot`,
            `Generated: ${new Date().toISOString()}`,
            ``,
            `## Progress Summary`,
            `Scenarios completed: ${completedScenarios.size} / ${scenarios.length}`,
            `Average decision quality: ${completedArr.length > 0 ? `${Math.round(avgScore * 100)}%` : 'N/A'}`,
            `Gating passes across completed scenarios: ${completedArr.length > 0 ? `${gatingPassCount} / ${completedArr.length}` : 'N/A'}`,
            ``,
            `## Current Scenario`,
            `Title: ${selectedScenario.title}`,
            `Domain: ${selectedScenario.domain}`,
            `Owner routing: ${formData.ownerRouting || 'N/A'}`,
            `Dependency edges: ${formData.dependencyTrace.length}`,
            `Blast-radius items: ${formData.blastRadius.length}`,
            `Selected evidence: ${selectedEvidence.length}`,
            `Primary evidence selected: ${selectedPrimaryTitles.length > 0 ? selectedPrimaryTitles.join('; ') : 'None yet'}`,
            `Corroborating evidence selected: ${selectedCorroboratingTitles.length > 0 ? selectedCorroboratingTitles.join('; ') : 'None yet'}`,
            `Action headline: ${currentActionHeadline || 'N/A'}`,
            `Score: ${score ? `${Math.round(score.overallScore * 100)}%` : 'Not scored yet'}`,
            `Gating: ${score ? (score.gatingPass ? 'Passed' : 'Not Passed') : 'N/A'}`,
            `Critical errors: ${score?.criticalErrors.length ?? 0}`,
            ``,
            `## Evaluation Readout`,
            `Status summary: ${scoreSummary ?? 'No score summary yet.'}`,
            `Strongest signal: ${strongestMetric ? `${strongestMetric.label} at ${Math.round(strongestMetric.value * 100)}%` : 'N/A'}`,
            `Weakest signal: ${weakestMetric ? `${weakestMetric.label} at ${Math.round(weakestMetric.value * 100)}%` : 'N/A'}`,
            `Unsupported claims: ${score?.metrics?.unsupportedClaimCount ?? 'N/A'}`,
            `Direction correctness: ${score?.metrics ? (score.metrics.directionCorrect ? 'Clear' : 'Needs fixing') : 'N/A'}`,
            ``,
            `## Retrieval Comparison`,
            `Best current mode: ${bestModeResult ? (modeLabels.get(bestModeResult.mode) ?? bestModeResult.mode) : 'Not available yet'}`,
            `Best-mode score: ${bestModeResult ? `${Math.round(bestModeResult.overallScore * 100)}%` : 'N/A'}`,
            `Best-mode gating: ${bestModeResult ? (bestModeResult.gatingPass ? 'Passed' : 'Not Passed') : 'N/A'}`,
            `Delta vs vector baseline: ${comparisonDelta !== null ? `${comparisonDelta >= 0 ? '+' : ''}${comparisonDelta} points` : 'N/A'}`,
            `Comparison takeaway: ${bestModeResult
              ? bestModeResult.gatingPass
                ? `${modeLabels.get(bestModeResult.mode) ?? bestModeResult.mode} currently provides the most defensible evidence mix for this scenario.`
                : `${modeLabels.get(bestModeResult.mode) ?? bestModeResult.mode} is the highest-scoring mode right now, but the scenario still needs stronger support to clear gating.`
              : 'Mode comparison is not available yet.'}`,
            `Evidence mix driving the current write-up: ${selectedEvidenceTitles.length > 0 ? selectedEvidenceTitles.join('; ') : 'None selected yet'}`,
            ``,
            `## Completed Scenarios`,
            ...completedArr.map(([id, r]) => {
              const s = scenarios.find((sc) => sc.id === id);
              return `- ${s?.title ?? id}: ${Math.round(r.overallScore * 100)}% (gating: ${r.gatingPass ? 'pass' : 'fail'})`;
            }),
            completedArr.length === 0 ? '(none yet)' : '',
            ``,
            `## Next Review Focus`,
            nextReviewFocus,
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exportText);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.3)] transition-colors"
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={downloadExport}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(240,180,90,0.35)] bg-[rgba(240,180,90,0.12)] text-[var(--warn-text)] hover:bg-[rgba(240,180,90,0.22)] transition-colors"
                    >
                      Download .txt
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--text-2)]">Progress</p>
                    <p className="text-xl font-bold text-[var(--text-0)] mt-2">{completedScenarios.size} / {scenarios.length}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-1">completed scenarios</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--text-2)]">Current score</p>
                    <p className="text-xl font-bold text-[var(--text-0)] mt-2">{score ? `${Math.round(score.overallScore * 100)}%` : 'N/A'}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-1">{score ? (score.gatingPass ? 'gating passed' : 'gating not passed') : 'not scored yet'}</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--text-2)]">Best mode</p>
                    <p className="text-base font-bold text-[var(--text-0)] mt-2">{bestModeResult ? (modeLabels.get(bestModeResult.mode) ?? bestModeResult.mode) : 'N/A'}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-1">{comparisonDelta !== null ? `${comparisonDelta >= 0 ? '+' : ''}${comparisonDelta} vs vector` : 'comparison pending'}</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--text-2)]">Evidence mix</p>
                    <p className="text-xl font-bold text-[var(--text-0)] mt-2">{selectedEvidence.length}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-1">{hasPrimary && hasCorroborating ? 'primary + corroborating covered' : 'needs both evidence roles'}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[rgba(240,180,90,0.35)] bg-[rgba(240,180,90,0.08)] p-4 mb-4">
                  <p className="text-xs font-semibold text-[var(--warn-text)] mb-2">Export guidance</p>
                  <p className="text-sm text-[var(--text-1)] leading-relaxed">
                    Use this as a mentor-facing snapshot. It is structured to explain current progress, what evidence supports the scenario write-up, and what retrieval mode currently gives the strongest result.
                  </p>
                </div>
                <textarea
                  readOnly
                  value={exportText}
                  data-testid="checkin-export-text"
                  className="form-input h-64 resize-none font-mono text-xs"
                />
              </div>
            </div>
          );
        })()}
      </main>

      {/* First-run walkthrough modal */}
      {showWalkthrough && !showSurvey && (
        <div data-testid="walkthrough-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card max-w-4xl w-full p-6 shadow-2xl reveal-up">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-2)]">First Run Walkthrough</p>
                <h2 className="text-xl font-bold text-[var(--text-0)] mt-1">How a new TPM should use OmniMentor</h2>
                <p className="text-sm text-[var(--text-1)] mt-2 max-w-2xl leading-relaxed">
                  You do not need to know the whole system upfront. The goal is to make one defensible decision using evidence, system connections, and a safe next step.
                </p>
              </div>
              <button
                onClick={() => closeWalkthrough()}
                data-testid="close-walkthrough"
                className="px-3 py-2 rounded-lg text-sm text-[var(--text-2)] border border-[color:var(--line)] hover:bg-[var(--hover-bg)]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                {
                  step: '1',
                  title: 'Pick A Scenario',
                  text: 'Start in Overview. Choose one scenario and read the prompt. You are answering one architecture decision, not solving everything.',
                },
                {
                  step: '2',
                  title: 'Open Evidence',
                  text: 'Select at least one primary artifact and one corroborating artifact. Look for owner names, system names, risks, and deployment clues.',
                },
                {
                  step: '3',
                  title: 'Fill Five Answers',
                  text: 'Answer: who owns it, what happens next, which systems are connected, what could break, and why you believe it.',
                },
                {
                  step: '4',
                  title: 'Submit And Learn',
                  text: 'Submit once your answer is grounded in evidence. The score tells you where your reasoning is strong and where support is missing.',
                },
              ].map((item) => (
                <div key={item.step} className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                  <div className="w-8 h-8 rounded-full bg-[rgba(39,211,182,0.14)] border border-[rgba(39,211,182,0.34)] text-[var(--accent-2)] flex items-center justify-center text-sm font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-0)] mt-3">{item.title}</h3>
                  <p className="text-xs text-[var(--text-1)] mt-2 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[rgba(39,211,182,0.3)] bg-[rgba(39,211,182,0.08)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-2)]">What Good Looks Like</p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--text-1)]">
                  <li>Use the exact team and system names you saw in the evidence.</li>
                  <li>Write short, concrete action steps like verify, notify, coordinate, monitor, or rollback.</li>
                  <li>List downstream impacts, not vague concerns.</li>
                  <li>Name the artifact IDs that support your answer.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[rgba(240,180,90,0.35)] bg-[rgba(240,180,90,0.08)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--warn-text)]">What To Avoid</p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--text-1)]">
                  <li>Do not use placeholders like Service A or Team X.</li>
                  <li>Do not invent systems, owners, or risks that are not supported by evidence.</li>
                  <li>Do not skip the corroborating artifact; the app requires both evidence roles.</li>
                  <li>Do not over-explain. Short, evidence-backed answers score better here.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => closeWalkthrough('Overview', 'Brief')}
                data-testid="walkthrough-start-overview"
                className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-[color:var(--line)] text-[var(--text-1)] hover:bg-[var(--hover-bg)]"
              >
                Start In Overview
              </button>
              <button
                onClick={() => closeWalkthrough('Scenario Workspace', 'Investigate')}
                data-testid="walkthrough-start-practice"
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--accent)] text-slate-950 hover:bg-[#27d3b6]"
              >
                Take Me To Practice
              </button>
            </div>
          </div>
        </div>
      )}

      {showExampleModal && exampleAnswer && !showSurvey && !showWalkthrough && (
        <div data-testid="example-answer-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card max-w-4xl w-full p-6 shadow-2xl reveal-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--warn-text)]">Good Answer Example</p>
                <h2 className="text-xl font-bold text-[var(--text-0)] mt-1">{selectedScenario.title}</h2>
                <p className="text-sm text-[var(--text-1)] mt-2 max-w-2xl leading-relaxed">{exampleAnswer.whyItWorks}</p>
              </div>
              <button
                onClick={() => setShowExampleModal(false)}
                className="px-3 py-2 rounded-lg text-sm text-[var(--text-2)] border border-[color:var(--line)] hover:bg-[var(--hover-bg)]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-2)] mb-2">Who Should Own This?</p>
                <p className="text-sm text-[var(--text-0)]">{exampleAnswer.ownerRouting}</p>
                <p className="text-[11px] text-[var(--text-2)] mt-2 leading-relaxed">Why this scores well: {exampleAnswer.fieldGuidance.ownerRouting}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-2)] mb-2">Evidence Used</p>
                <div className="flex flex-wrap gap-2">
                  {exampleAnswer.selectedEvidence.map((item) => (
                    <span key={item.id} className="rounded-full border border-[color:var(--line)] px-2.5 py-1 text-[11px] text-[var(--text-1)]">
                      {item.id}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-2)] mb-2">What Should Happen Next?</p>
                <pre className="whitespace-pre-wrap text-xs text-[var(--text-1)] font-sans">{exampleAnswer.actionPlan}</pre>
                <p className="text-[11px] text-[var(--text-2)] mt-2 leading-relaxed">Why this scores well: {exampleAnswer.fieldGuidance.actionPlan}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-2)] mb-2">Why Do You Believe This?</p>
                <pre className="whitespace-pre-wrap text-xs text-[var(--text-1)] font-sans">{exampleAnswer.evidenceNotes}</pre>
                <p className="text-[11px] text-[var(--text-2)] mt-2 leading-relaxed">Why this scores well: {exampleAnswer.fieldGuidance.evidenceNotes}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-2)] mb-2">Which Systems Are Connected?</p>
                <pre className="whitespace-pre-wrap text-xs text-[var(--text-1)] font-sans">{exampleAnswer.dependencyTrace.map((edge) => `${edge.from} -> ${edge.to} (${edge.type})`).join('\n')}</pre>
                <p className="text-[11px] text-[var(--text-2)] mt-2 leading-relaxed">Why this scores well: {exampleAnswer.fieldGuidance.dependencyTrace}</p>
              </div>
              <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-2)] mb-2">What Could Break?</p>
                <pre className="whitespace-pre-wrap text-xs text-[var(--text-1)] font-sans">{exampleAnswer.blastRadius.join('\n')}</pre>
                <p className="text-[11px] text-[var(--text-2)] mt-2 leading-relaxed">Why this scores well: {exampleAnswer.fieldGuidance.blastRadius}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => applyExampleAnswer(exampleAnswer)}
                data-testid="use-example-answer"
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--accent)] text-slate-950 hover:bg-[#27d3b6]"
              >
                Use This Example In The Form
              </button>
              <button
                onClick={() => setShowExampleModal(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-[color:var(--line)] text-[var(--text-1)] hover:bg-[var(--hover-bg)]"
              >
                Keep My Current Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre/Post Confidence Survey Modal */}
      {showSurvey && (
        <div data-testid="survey-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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
                        data-testid={`survey-${showSurvey}-${q.key}-${v}`}
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
                data-testid="submit-survey"
                className="flex-1 bg-[var(--accent)] hover:bg-[#27d3b6] disabled:bg-[var(--disabled-bg)] disabled:text-[var(--text-2)] disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Submit Survey
              </button>
              <button
                onClick={() => { setShowSurvey(null); setSurveyAnswers({}); }}
                data-testid="skip-survey"
                className="px-4 py-2.5 rounded-lg text-sm text-[var(--text-2)] border border-[color:var(--line)] hover:bg-[var(--hover-bg)]"
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
