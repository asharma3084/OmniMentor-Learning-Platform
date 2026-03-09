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
    if (!formData.actionPlan.trim()) return 'Action Plan is required.';
    if (!formData.evidenceNotes.trim()) return 'Evidence Notes are required.';
    if (selectedEvidence.length === 0) return 'Select at least one evidence artifact.';
    return null;
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
    return <div className="flex items-center justify-center h-screen">Loading scenarios...</div>;
  }

  if (bootError && !selectedScenario) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-lg w-full bg-white border border-red-200 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-red-700 mb-2">Unable to load app data</h2>
          <p className="text-sm text-gray-700 mb-4">{bootError}</p>
          <button
            onClick={fetchScenarios}
            className="bg-blue-600 text-white font-bold px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!selectedScenario) {
    return <div className="flex items-center justify-center h-screen">No scenario selected.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">🎓 OmniMentor</h1>
          <p className="text-lg font-medium text-gray-500 mt-1">The Intelligence Platform for Better Decisions.</p>
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-6 text-sm">
            {submitError}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <label className="block text-sm font-bold mb-2">Scenario</label>
          <select
            value={selectedScenario.id}
            onChange={(e) => {
              const next = scenarios.find((s) => s.id === e.target.value) ?? null;
              setSelectedScenario(next);
              setSelectedEvidence([]);
              setScore(null);
              setSubmitError(null);
            }}
            className="w-full border rounded px-3 py-2"
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Left: Scenario & Evidence */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">{selectedScenario.title}</h2>
              <p className="text-gray-700 mb-4">{selectedScenario.prompt}</p>

              <div className="mt-6">
                <h3 className="text-lg font-bold mb-3">📄 Evidence</h3>
                <p className="text-xs text-gray-500 mb-2">Selected: {selectedEvidence.length}</p>
                <div className="space-y-2">
                  {selectedScenario.artifacts.map((artifact) => (
                    <label key={artifact.id} className="flex items-start p-2 border rounded hover:bg-gray-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvidence.includes(artifact.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvidence((prev) => [...prev, artifact.id]);
                          } else {
                            setSelectedEvidence((prev) => prev.filter((id) => id !== artifact.id));
                          }
                        }}
                        className="mt-1 mr-3 w-4 h-4"
                      />
                      <div>
                        <div className="font-bold">{artifact.title}</div>
                        <div className="text-sm text-gray-600">{artifact.content.substring(0, 100)}...</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form & Score */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">📝 Submission</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Owner Routing</label>
                  <input
                    type="text"
                    placeholder="e.g., Platform Team"
                    value={formData.ownerRouting}
                    onChange={(e) => {
                      setSubmitError(null);
                      setFormData({ ...formData, ownerRouting: e.target.value });
                    }}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Action Plan</label>
                  <textarea
                    placeholder="What actions should be taken?"
                    value={formData.actionPlan}
                    onChange={(e) => {
                      setSubmitError(null);
                      setFormData({ ...formData, actionPlan: e.target.value });
                    }}
                    className="w-full border rounded px-3 py-2 h-20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Evidence Notes</label>
                  <textarea
                    placeholder="Explain how your evidence supports your submission"
                    value={formData.evidenceNotes}
                    onChange={(e) => {
                      setSubmitError(null);
                      setFormData({ ...formData, evidenceNotes: e.target.value });
                    }}
                    className="w-full border rounded px-3 py-2 h-20"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !!validateSubmission()}
                  className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit & Score'}
                </button>
              </div>
            </div>

            {score && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">✅ Score Result</h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-bold">Overall Score</div>
                    <div className="text-3xl font-bold text-green-600">{Math.round(score.overallScore * 100)}%</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold">Gating Passed</div>
                    <div className="text-lg">{score.gatingPass ? '✅ Yes' : '❌ No'}</div>
                  </div>
                  {score.criticalErrors.length > 0 && (
                    <div>
                      <div className="text-sm font-bold text-red-600">Critical Errors</div>
                      <ul className="text-sm">
                        {score.criticalErrors.map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
