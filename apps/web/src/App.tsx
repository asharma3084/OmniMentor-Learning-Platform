import { useState, useEffect } from 'react';
import axios from 'axios';

interface Artifact {
  id: string;
  title: string;
  content: string;
}

interface ScenarioData {
  id: string;
  title: string;
  prompt: string;
  artifacts: Artifact[];
}

interface ScoreResponse {
  overallScore: number;
  gatingPass: boolean;
  criticalErrors: string[];
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
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    ownerRouting: '',
    dependencyTrace: [] as Array<{ from: string; to: string; type: string }>,
    actionPlan: '',
    blastRadius: [] as string[],
    evidenceNotes: '',
  });
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Scenario Workspace' | 'System Graph' | 'Evidence' | 'Evaluation' | 'Check-in Export'>('Overview');
  const [dependencyTraceInput, setDependencyTraceInput] = useState('');
  const [blastRadiusInput, setBlastRadiusInput] = useState('');

  const API_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    setBootLoading(true);
    setBootError(null);
    try {
      const res = await axios.get(`${API_URL}/scenarios`);
      setScenarios(res.data);
      if (res.data.length > 0) {
        setSelectedScenario(res.data[0]);
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
      // Create submission
      const submissionRes = await axios.post(`${API_URL}/submissions`, {
        scenarioId: scenario.id,
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

      setScore(scoreRes.data);
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
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1db8a2] to-[#f0b45a] flex items-center justify-center shadow-lg ring-1 ring-white/20 floating-mark">
              <span className="text-base select-none leading-none">🎓</span>
            </div>
            <div className="leading-tight">
              <span className="text-sm font-bold text-[var(--text-0)]">OmniMentor</span>
              <span className="hidden sm:inline text-xs text-[var(--text-2)] ml-2 mono-kicker">Architecture Fluency Platform</span>
            </div>
          </div>
          <p className="hidden md:block text-xs text-[var(--text-2)] italic">
            From Architecture Blindness to Architectural Fluency
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <section className="mb-6 reveal-up" style={{ animationDelay: '80ms' }}>
          <p className="text-xs mono-kicker text-[var(--accent)] mb-2">EVIDENCE-FIRST PRACTICE</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-0)] max-w-3xl">
            Train better architectural decisions with visible evidence, scored feedback, and fast iteration.
          </h1>
        </section>

        {/* Scenario selector */}
        <div className="mb-6 reveal-up" style={{ animationDelay: '130ms' }}>
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
                setFormData((prev) => ({ ...prev, dependencyTrace: [], blastRadius: [] }));
              }}
              className="form-input pr-10 appearance-none cursor-pointer"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 reveal-up">
            <div className="card p-5">
              <p className="label">Progress Snapshot</p>
              <p className="text-xl font-semibold">{score ? '1 / 12 complete' : '0 / 12 complete'}</p>
              <p className="text-xs text-[var(--text-2)] mt-2">Domain focus: {selectedScenario.title}</p>
            </div>
            <div className="card p-5">
              <p className="label">Decision Quality</p>
              <p className="text-xl font-semibold">{score ? `${Math.round(score.overallScore * 100)}%` : 'Pending score'}</p>
              <p className="text-xs text-[var(--text-2)] mt-2">Critical errors: {score?.criticalErrors.length ?? 0}</p>
            </div>
            <div className="card p-5">
              <p className="label">Readiness</p>
              <p className="text-xl font-semibold">{selectedEvidence.length} evidence selected</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setActiveTab('Scenario Workspace')} className="text-xs px-2 py-1 rounded bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)]">Resume</button>
                <button onClick={() => setActiveTab('Evaluation')} className="text-xs px-2 py-1 rounded bg-[rgba(240,180,90,0.18)] text-[#ffd9a0]">Run Evaluation</button>
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
                <h2 className="text-base font-semibold text-white">{selectedScenario.title}</h2>
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
                {selectedScenario.artifacts.map((artifact) => {
                  const checked = selectedEvidence.includes(artifact.id);
                  return (
                    <label
                      key={artifact.id}
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
                          if (e.target.checked) setSelectedEvidence((prev) => [...prev, artifact.id]);
                          else setSelectedEvidence((prev) => prev.filter((id) => id !== artifact.id));
                        }}
                        className="sr-only"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-0)]">{artifact.title}</p>
                        <p className="text-xs text-[var(--text-2)] mt-0.5 line-clamp-2">
                          {artifact.content.substring(0, 130)}…
                        </p>
                      </div>
                    </label>
                  );
                })}
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
          <div className="card p-6 reveal-up">
            <h3 className="text-sm font-semibold text-[var(--text-1)] mb-4">System Graph</h3>
            {formData.dependencyTrace.length === 0 ? (
              <p className="text-sm text-[var(--text-2)]">No dependency edges captured yet. Add edges in `Scenario Workspace`.</p>
            ) : (
              <div className="space-y-2">
                {formData.dependencyTrace.map((edge, idx) => (
                  <div key={`${edge.from}-${edge.to}-${idx}`} className="rounded-lg border border-[color:var(--line)] p-3 text-sm">
                    <span className="text-[var(--text-0)] font-medium">{edge.from}</span>
                    <span className="text-[var(--text-2)]"> {'->'} </span>
                    <span className="text-[var(--text-0)] font-medium">{edge.to}</span>
                    <span className="ml-2 text-xs text-[var(--accent-2)]">({edge.type})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Evidence' && (
          <div className="card p-6 reveal-up">
            <h3 className="text-sm font-semibold text-[var(--text-1)] mb-4">Evidence</h3>
            <div className="space-y-2">
              {selectedScenario.artifacts.map((artifact) => (
                <div key={artifact.id} className="rounded-lg border border-[color:var(--line)] p-3">
                  <p className="text-sm font-medium">{artifact.title}</p>
                  <p className="text-xs text-[var(--text-2)] mt-1">{artifact.content.substring(0, 180)}...</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Evaluation' && (
          <div className="card p-6 reveal-up">
            <h3 className="text-sm font-semibold text-[var(--text-1)] mb-4">Evaluation</h3>
            {score ? (
              <div className="space-y-3 text-sm">
                <p>Overall score: <span className="font-semibold">{Math.round(score.overallScore * 100)}%</span></p>
                <p>Gating: <span className="font-semibold">{score.gatingPass ? 'Passed' : 'Not Passed'}</span></p>
                <p>Critical errors: <span className="font-semibold">{score.criticalErrors.length}</span></p>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-2)]">Run `Submit & Score` from `Scenario Workspace` to generate evaluation output.</p>
            )}
          </div>
        )}

        {activeTab === 'Check-in Export' && (
          <div className="card p-6 reveal-up">
            <h3 className="text-sm font-semibold text-[var(--text-1)] mb-4">Check-in Export</h3>
            <textarea
              readOnly
              value={`Scenario: ${selectedScenario.title}\nOwner routing: ${formData.ownerRouting || 'N/A'}\nDependency edges: ${formData.dependencyTrace.length}\nBlast-radius items: ${formData.blastRadius.length}\nSelected evidence: ${selectedEvidence.length}\nScore: ${score ? `${Math.round(score.overallScore * 100)}%` : 'Not scored yet'}\nCritical errors: ${score?.criticalErrors.join(', ') || 'None'}`}
              className="form-input h-44 resize-none"
            />
          </div>
        )}
      </main>
    </div>
  );
}
