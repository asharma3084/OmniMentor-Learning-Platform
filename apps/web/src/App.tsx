/**
 * Guided-first TPM practice UI with onboarding help, evidence-backed decisions, and feedback review.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
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
  gatingResults?: Array<{ claimId: string; supported: boolean; citedEvidenceIds: string[]; reason: string }>;
  claims?: Array<{ id: string; text: string }>;
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

type GuidedStep = 'Brief' | 'Investigate' | 'Decide' | 'Feedback';
type FeedbackTab = 'score' | 'graph' | 'evidence' | 'export';

const RETRIEVAL_MODE_OPTIONS: Array<{ value: RetrievalMode; label: string; description: string }> = [
  { value: 'vector', label: 'Keyword Search', description: 'Finds documents that match your scenario by keyword.' },
  { value: 'graph', label: 'Connected Systems', description: 'Also pulls in documents from upstream and downstream services.' },
  { value: 'graphrag', label: 'Deep Search', description: 'Follows system connections and boosts documents with stronger provenance.' },
  { value: 'graphrag_gating', label: 'Deep Search + Validation', description: 'Best coverage — also checks that every claim is backed by evidence.' },
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

function getPerformanceLabel(score: number, gatingPass?: boolean) {
  if (!gatingPass) return score >= 0.8 ? 'Almost there' : score >= 0.6 ? 'Needs work' : 'Significant gaps';
  if (score >= 0.9) return 'Strong';
  if (score >= 0.8) return 'Almost there';
  if (score >= 0.6) return 'Solid start';
  if (score >= 0.4) return 'Needs work';
  return 'Significant gaps';
}

function getPerformanceTone(score: number, gatingPass?: boolean) {
  if (!gatingPass) return score >= 0.8 ? 'text-[var(--warn)]' : 'text-[var(--danger)]';
  if (score >= 0.9) return 'text-[var(--ok)]';
  if (score >= 0.8) return 'text-[var(--ok)]';
  if (score >= 0.6) return 'text-[var(--warn)]';
  return 'text-[var(--danger)]';
}

function getMetricCoaching(label: string, value: number) {
  if (value >= 0.8) {
    return `${label}: looks good — well supported by evidence.`;
  }

  if (value >= 0.6) {
    if (label === 'Owner Match') return 'Owner match: you identified a plausible owner, but the evidence doesn\'t fully confirm it yet.';
    if (label === 'System Connections') return 'System connections: some dependencies are captured, but the path is incomplete — check for missing upstream or downstream hops.';
    if (label === 'Evidence Support') return 'Evidence support: you have some backing, but at least one claim isn\'t tied to an artifact.';
    return 'Blast radius: partially covered — think about which customers or teams are still unaccounted for.';
  }

  if (label === 'Evidence Support') {
    return 'Evidence support: key claims in your answer aren\'t backed by any selected artifact. Re-read your evidence and link each claim to a specific document.';
  }
  if (label === 'Owner Match') {
    return 'Owner match: the identified owner doesn\'t match the evidence. Look at which team\'s artifacts describe the failing system.';
  }
  if (label === 'System Connections') {
    return 'System connections: the dependency path is missing critical systems or has the wrong direction. Trace the data flow from the evidence artifacts.';
  }
  return 'Blast radius: too vague or missing — spell out the specific customer, revenue, or operational impacts from the evidence.';
}

function getScenarioNarrative(scenario: ScenarioData) {
  const cueTitles = scenario.artifacts.slice(0, 3).map((artifact) => artifact.title);

  // Scenario-specific narratives first, then domain fallbacks
  const problemByScenario: Record<string, string> = {
    'scenario-1': 'Schema and dependency changes can look safe in isolation while still breaking downstream product and search behavior.',
    'scenario-2': 'On the biggest shopping day of the year, a pricing slowdown doesn\'t just frustrate customers — it costs real revenue every minute it goes unresolved.',
    'scenario-3': 'Checkout timeout changes seem straightforward, but they touch payment authorization, inventory reservation, and fulfillment in a single transaction flow.',
    'scenario-4': 'Fraud model updates can block legitimate customers or leak actual fraud, so one wrong threshold ripples across the entire order pipeline.',
    'scenario-5': 'Compliance controls involve multiple service owners and audit requirements, making it easy to miss a dependency that a regulator would catch.',
  };

  const motivationByScenario: Record<string, string> = {
    'scenario-1': 'A TPM needs to route the change correctly, trace impact direction, and avoid a rollout that damages customer discovery or storefront behavior.',
    'scenario-2': 'A TPM on call during Thanksgiving needs to quickly identify who owns the Pricing Engine, understand which downstream systems are showing stale prices to customers, and recommend actions that protect revenue without causing a wider outage.',
    'scenario-3': 'A TPM needs to keep transaction flows safe under pressure and make sure mitigation actions do not create larger customer-facing failures.',
    'scenario-4': 'A TPM needs to balance fraud prevention with customer experience and coordinate across risk, payments, and product teams.',
    'scenario-5': 'A TPM needs to coordinate the right owners quickly while preserving evidence-backed reasoning and governance discipline.',
  };

  const defaultProblem = 'Complex service ecosystems make it easy for a new TPM to miss owner, dependency, or blast-radius details even when documentation exists.';
  const defaultMotivation = 'The point of the scenario is to turn scattered evidence into one safe, defensible next step rather than a vague summary.';

  const lessonByScenario: Record<string, string> = {
    'scenario-1': 'Adding a "variants" field to the Catalog API changes the CDC event schema consumed by Search Indexer. If the indexer mapping isn\'t updated first, product search silently returns stale or missing results on the storefront — an invisible break that customers notice before dashboards do.',
    'scenario-2': 'The Pricing Engine feeds real-time prices to Storefront BFF, Cart, and Checkout. A slowdown doesn\'t just show stale prices — it cascades into incorrect cart totals and failed checkouts at the exact moment traffic peaks on Thanksgiving.',
    'scenario-3': 'Checkout timeout changes touch payment authorization, inventory hold, and fulfillment simultaneously. A timeout that\'s too short fails legitimate transactions; too long holds inventory away from other customers. The TPM must trace all three paths before changing any threshold.',
    'scenario-4': 'Fraud model thresholds sit between the customer and the entire order pipeline. Tightening a threshold blocks real customers from purchasing; loosening it lets fraud through to payments and fulfillment. The TPM must understand both directions of the blast radius.',
    'scenario-5': 'Compliance controls span multiple service owners with audit requirements. Missing one dependency means a regulator finds it for you — and that comes with remediation timelines, not just engineering tickets.',
  };
  const defaultLesson = 'Each scenario in this platform represents a real pattern where scattered documentation hides the critical path. The architectural lesson is to never deploy or respond based on a single artifact — always trace the full dependency chain.';

  const actionsByScenario: Record<string, string[]> = {
    'scenario-1': [
      'Notify the Search Platform Team that a CDC schema change is incoming — they need to update their Elasticsearch mapping before you deploy.',
      'Schedule a joint review with Catalog Team and Search Platform Team to validate the new "variants" field doesn\'t break downstream consumers.',
      'Set up a staged rollout: deploy the schema change to a canary first, monitor Search Indexer lag and error rates for 15 minutes before full rollout.',
      'Confirm Storefront BFF product-detail pages render correctly post-deploy. If error rate exceeds 1% on /products, trigger the rollback runbook.',
      'Document the dependency in the team wiki so the next TPM on this team doesn\'t repeat the discovery process.',
    ],
    'scenario-2': [
      'Page the Pricing Team on-call immediately and confirm they are aware of the slowdown — every minute of stale prices during Thanksgiving costs revenue.',
      'Open a bridge call with Pricing Team, Storefront BFF, and Cart Service owners to coordinate a live response.',
      'Direct the Pricing Team to investigate cache staleness and Promo Service latency while you track downstream symptoms across Checkout and Cart.',
      'Communicate blast radius to leadership: stale prices → incorrect cart totals → checkout failures → lost Thanksgiving revenue. Give a clear timeline for update.',
      'After resolution, drive a post-incident review to document what happened, update the runbook, and add monitoring alerts for Pricing Engine response time.',
    ],
    'scenario-3': [
      'Convene Payment, Inventory, and Fulfillment team leads before changing any timeout value — all three are affected by a single transaction flow.',
      'Run load tests with the proposed timeout changes against a staging environment that mirrors production payment and inventory volumes.',
      'Implement the change behind a feature flag so it can be rolled back instantly if checkout failure rates spike.',
      'Set up real-time dashboards tracking payment authorization success rate, inventory hold duration, and fulfillment queue depth during the rollout window.',
      'After rollout, validate with Finance that order completion rates stayed within expected range and document the safe timeout boundaries.',
    ],
    'scenario-4': [
      'Coordinate a three-way review with Risk, Payments, and Product teams before adjusting any fraud model threshold.',
      'Analyze both sides of the blast radius: too tight blocks legitimate customers, too loose lets fraud through to fulfillment.',
      'Deploy threshold changes with a gradual ramp (1% → 5% → 25% → 100%) and monitor false-positive rate and fraud-through rate at each stage.',
      'Set up automated alerts: if legitimate transaction block rate exceeds baseline by 2%, auto-revert to previous threshold.',
      'Share the analysis and rollout plan with leadership so they understand the customer experience vs. fraud protection tradeoff.',
    ],
    'scenario-5': [
      'Map all service owners affected by the compliance control change and notify each one — missed dependencies become audit findings.',
      'Schedule a compliance review with the governance team to confirm requirements are met before deployment.',
      'Create an evidence trail: document which services are affected, what changes are needed, and who approved them.',
      'Coordinate deployment sequencing across all affected teams — compliance changes often require a specific rollout order.',
      'After deployment, run the compliance validation checklist and preserve audit artifacts for the next regulatory review cycle.',
    ],
  };
  const defaultActions = [
    'Identify and notify all affected team owners based on the dependency path you traced.',
    'Coordinate a joint review with upstream and downstream service owners before taking action.',
    'Implement changes behind a feature flag or staged rollout to limit blast radius.',
    'Set up monitoring and alerting for the specific metrics that would indicate a problem.',
    'Document the decision, the evidence that supported it, and the outcome for the next TPM who inherits this.',
  ];

  return {
    problem: problemByScenario[scenario.id] ?? defaultProblem,
    motivation: motivationByScenario[scenario.id] ?? defaultMotivation,
    architecturalLesson: lessonByScenario[scenario.id] ?? defaultLesson,
    tpmActions: actionsByScenario[scenario.id] ?? defaultActions,
    partialSolutions: cueTitles.length > 0
      ? `There are already useful clues in artifacts like ${cueTitles.join(', ')}, but none of them alone resolves owner, dependency direction, and safe action.`
      : 'There are partial signals available, but the TPM still has to combine them into one defensible decision.',
    proofTarget: 'A strong answer identifies the right owner, traces one clear path through the affected systems, names what could break for customers, and backs every claim with evidence from the retrieved artifacts.',
    clueTitles: cueTitles,
  };
}

interface ForceGraphProps {
  nodes: string[];
  edges: Array<{ from: string; to: string; type: string }>;
  seedServices: string[];
  focusedNode: string | null;
  onNodeClick: (node: string) => void;
}

function ForceGraph({ nodes, edges, seedServices, focusedNode, onNodeClick }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const WIDTH = 720;
  const HEIGHT = 420;

  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{ node: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const didDragRef = useRef(false);

  // Stable content key — only recompute layout when actual data changes, not on reference identity
  const layoutKey = nodes.slice().sort().join(',') + '|' + edges.map((e) => `${e.from}>${e.to}`).sort().join(',');
  const prevLayoutKeyRef = useRef('');

  // Compute initial force-directed layout only when node/edge content actually changes
  useEffect(() => {
    if (layoutKey === prevLayoutKeyRef.current) return;
    prevLayoutKeyRef.current = layoutKey;

    if (nodes.length === 0) { setPositions(new Map()); return; }

    const pos = new Map<string, { x: number; y: number }>();
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const r = Math.min(WIDTH, HEIGHT) * 0.32;
      pos.set(n, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    });

    for (let iter = 0; iter < 120; iter++) {
      const forces = new Map<string, { fx: number; fy: number }>();
      nodes.forEach((n) => forces.set(n, { fx: 0, fy: 0 }));

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = pos.get(nodes[i])!;
          const b = pos.get(nodes[j])!;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const repulsion = 12000 / (dist * dist);
          dx = (dx / dist) * repulsion;
          dy = (dy / dist) * repulsion;
          forces.get(nodes[i])!.fx -= dx;
          forces.get(nodes[i])!.fy -= dy;
          forces.get(nodes[j])!.fx += dx;
          forces.get(nodes[j])!.fy += dy;
        }
      }

      edges.forEach((edge) => {
        const a = pos.get(edge.from);
        const b = pos.get(edge.to);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const attraction = dist * 0.012;
        const fx = (dx / dist) * attraction;
        const fy = (dy / dist) * attraction;
        forces.get(edge.from)!.fx += fx;
        forces.get(edge.from)!.fy += fy;
        forces.get(edge.to)!.fx -= fx;
        forces.get(edge.to)!.fy -= fy;
      });

      nodes.forEach((n) => {
        const p = pos.get(n)!;
        const f = forces.get(n)!;
        p.x += (cx - p.x) * 0.01;
        p.y += (cy - p.y) * 0.01;
        const damping = 0.4;
        p.x += f.fx * damping;
        p.y += f.fy * damping;
        p.x = Math.max(60, Math.min(WIDTH - 60, p.x));
        p.y = Math.max(30, Math.min(HEIGHT - 30, p.y));
      });
    }

    setPositions(pos);
  }, [layoutKey, nodes, edges]);

  // Convert a mouse/pointer event to SVG coordinates
  const toSvgCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }, []);

  const handleNodePointerDown = useCallback((node: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const svgPt = toSvgCoords(e);
    const p = positions.get(node);
    if (!p) return;
    didDragRef.current = false;
    dragRef.current = { node, startX: svgPt.x, startY: svgPt.y, origX: p.x, origY: p.y };
  }, [positions, toSvgCoords]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const svgPt = toSvgCoords(e);
      const dx = svgPt.x - drag.startX;
      const dy = svgPt.y - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;
      setPositions((prev) => {
        const next = new Map(prev);
        next.set(drag.node, {
          x: Math.max(60, Math.min(WIDTH - 60, drag.origX + dx)),
          y: Math.max(30, Math.min(HEIGHT - 30, drag.origY + dy)),
        });
        return next;
      });
    };
    const handleUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [toSvgCoords]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-6 text-center">
        <p className="text-xs text-[var(--text-2)]">No graph nodes to visualize yet.</p>
      </div>
    );
  }

  const seedSet = new Set(seedServices);

  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] overflow-hidden" data-testid="force-graph-svg-container">
      <div className="flex items-center justify-between px-3 pt-2">
        <p className="text-[10px] text-[var(--text-2)] opacity-60">Drag nodes to rearrange</p>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ minHeight: 320, userSelect: 'none' }}>
        <defs>
          <marker id="arrow-downstream" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="var(--accent, #27d3b6)" />
          </marker>
          <marker id="arrow-upstream" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="var(--warn, #f0b45a)" />
          </marker>
        </defs>

        {edges.map((edge, idx) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) return null;
          const nodeR = 22;
          const sx = from.x + (dx / dist) * nodeR;
          const sy = from.y + (dy / dist) * nodeR;
          const ex = to.x - (dx / dist) * (nodeR + 10);
          const ey = to.y - (dy / dist) * (nodeR + 10);
          const isHighlighted = focusedNode === edge.from || focusedNode === edge.to;
          const color = edge.type === 'downstream' ? 'var(--accent, #27d3b6)' : 'var(--warn, #f0b45a)';
          return (
            <line
              key={`edge-${idx}`}
              x1={sx} y1={sy} x2={ex} y2={ey}
              stroke={color}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              strokeOpacity={isHighlighted ? 1 : 0.55}
              markerEnd={edge.type === 'downstream' ? 'url(#arrow-downstream)' : 'url(#arrow-upstream)'}
            />
          );
        })}

        {nodes.map((node) => {
          const p = positions.get(node);
          if (!p) return null;
          const isSeed = seedSet.has(node);
          const isFocused = focusedNode === node;
          const isDragging = dragRef.current?.node === node;
          const r = isSeed ? 26 : 22;
          return (
            <g
              key={node}
              onMouseDown={(e) => handleNodePointerDown(node, e)}
              onClick={() => { if (!didDragRef.current) onNodeClick(node); }}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <circle
                cx={p.x} cy={p.y} r={r}
                fill={isFocused ? 'rgba(39,211,182,0.25)' : isSeed ? 'rgba(39,211,182,0.14)' : 'rgba(148,163,184,0.12)'}
                stroke={isFocused ? 'var(--accent, #27d3b6)' : isSeed ? 'rgba(39,211,182,0.55)' : 'rgba(148,163,184,0.35)'}
                strokeWidth={isFocused ? 2.5 : 1.5}
              />
              <text
                x={p.x} y={p.y + 1}
                textAnchor="middle" dominantBaseline="central"
                fontSize={node.length > 18 ? 8 : 10}
                fill="var(--text-0, #e8edf3)"
                fontWeight={isFocused || isSeed ? 600 : 400}
                style={{ pointerEvents: 'none' }}
              >
                {node.length > 22 ? node.slice(0, 20) + '…' : node}
              </text>
            </g>
          );
        })}
      </svg>
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
  const [guidedStep, setGuidedStep] = useState<GuidedStep>('Brief');
  const [feedbackTab, setFeedbackTab] = useState<FeedbackTab>('score');
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>('vector');
  const [dependencyTraceInput, setDependencyTraceInput] = useState('');
  const [blastRadiusInput, setBlastRadiusInput] = useState('');
  const [graphFilter, setGraphFilter] = useState('');
  const [focusedGraphNode, setFocusedGraphNode] = useState<string | null>(null);
  const [showOnlyFocusedGraphEdges, setShowOnlyFocusedGraphEdges] = useState(false);

  // Learning analytics state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [, setSessionStartTime] = useState<number | null>(null);
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
  const [_evaluationCompareLoading, setEvaluationCompareLoading] = useState(false);
  const [_evaluationCompareError, setEvaluationCompareError] = useState<string | null>(null);

  const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:9992';

  const getSelectedEvidenceRoleState = useCallback(() => {
    const selectedItems = evidenceItems.filter((item) => selectedEvidence.includes(item.id));
    return {
      hasPrimary: selectedItems.some((item) => item.role === 'primary'),
      hasCorroborating: selectedItems.some((item) => item.role === 'corroborating'),
    };
  }, [evidenceItems, selectedEvidence]);

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
    if (guidedStep !== 'Feedback') return;
    if (feedbackTab !== 'evidence' && feedbackTab !== 'graph') return;
    fetchEvidence(selectedScenario.id, retrievalMode);
  }, [selectedScenario, guidedStep, feedbackTab, retrievalMode, fetchEvidence]);

  useEffect(() => {
    setGraphFilter('');
    setFocusedGraphNode(null);
    setShowOnlyFocusedGraphEdges(false);
  }, [selectedScenario?.id, retrievalMode]);

  const comparisonViewActive = guidedStep === 'Feedback';

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

  const closeWalkthrough = (nextGuidedStep?: GuidedStep) => {
    setShowWalkthrough(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, 'true');
    }
    if (nextGuidedStep) {
      setGuidedStep(nextGuidedStep);
    }
  };

  const selectScenario = useCallback((next: ScenarioData | null, options?: { step?: GuidedStep; reuseScore?: ScoreResponse | null }) => {
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
        selectScenario(res.data[0], { step: 'Brief' });
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

  const applyExampleAnswer = async (example: ExampleAnswerResponse) => {
    // Switch to best strategy and fetch all evidence for this scenario
    setRetrievalMode('graphrag_gating');
    if (selectedScenario) {
      try {
        const res = await axios.get(
          `${API_URL}/evidence?scenarioId=${encodeURIComponent(selectedScenario.id)}&mode=graphrag_gating`
        );
        const freshEvidence: EvidenceItem[] = res.data;
        setEvidenceItems(freshEvidence);
        // Select ALL artifacts — the good answer uses everything available
        setSelectedEvidence(freshEvidence.map((item) => item.id));
      } catch {
        // Fallback: merge example evidence into current items
        setEvidenceItems((prev) => {
          const merged = new Map(prev.map((item) => [item.id, item]));
          example.selectedEvidence.forEach((item) => merged.set(item.id, item));
          return Array.from(merged.values());
        });
        setSelectedEvidence(example.selectedEvidenceIds);
      }
    } else {
      setEvidenceItems((prev) => {
        const merged = new Map(prev.map((item) => [item.id, item]));
        example.selectedEvidence.forEach((item) => merged.set(item.id, item));
        return Array.from(merged.values());
      });
      setSelectedEvidence(example.selectedEvidenceIds);
    }
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
      setGuidedStep('Feedback');
      setFeedbackTab('score');
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

  const showOverview = guidedStep === 'Brief';
  const showScenarioWorkspace = guidedStep === 'Investigate' || guidedStep === 'Decide';
  const showSystemGraph = guidedStep === 'Feedback' && feedbackTab === 'graph';
  const showEvidence = guidedStep === 'Feedback' && feedbackTab === 'evidence';
  const showEvaluation = guidedStep === 'Feedback' && feedbackTab === 'score';
  const showCheckInExport = guidedStep === 'Feedback' && feedbackTab === 'export';

  const validationMsg = validateSubmission();
  const canSubmit = !loading && !validationMsg;
  const { hasPrimary, hasCorroborating } = getSelectedEvidenceRoleState();
  const hasTrace = formData.dependencyTrace.length > 0;
  const hasBlast = formData.blastRadius.length > 0;

  const selectedEvidenceItems = evidenceItems.filter((ev) => selectedEvidence.includes(ev.id));
  const graphSeedServices = Array.from(new Set(
    evidenceItems.flatMap((item) => item.metadata?.graphSeedServices ?? [])
  ));
  const retrievedGraphEdges = Array.from(
    new Map(
      evidenceItems
        .flatMap((item) => item.metadata?.graphTraversalEdges ?? [])
        .map((edge) => [`${edge.from}|${edge.to}|${edge.type}`, edge])
    ).values()
  );
  const graphConnectedServices = (() => {
    const edgeServices = new Set(retrievedGraphEdges.flatMap((edge) => [edge.from, edge.to]));
    return Array.from(new Set(
      evidenceItems.flatMap((item) => item.metadata?.graphConnectedServices ?? [])
    )).filter((service) => edgeServices.has(service));
  })();
  const graphMatchedServices = Array.from(new Set(
    selectedEvidenceItems.flatMap((item) => item.metadata?.graphMatchedServices ?? [])
  ));
  const displayGraphEdges = formData.dependencyTrace.length > 0 ? formData.dependencyTrace : retrievedGraphEdges;
  const graphNodes = Array.from(
    new Set([
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
  const scoreStatusLabel = score ? getPerformanceLabel(score.overallScore, score.gatingPass) : null;
  const scoreStatusTone = score ? getPerformanceTone(score.overallScore, score.gatingPass) : '';

  // Find the weakest metric and build a specific next-step instruction
  const scoreNextStep: { text: string; destination: GuidedStep; buttonLabel: string } | null = (() => {
    if (!score || !score.metrics) return null;
    if (score.overallScore >= 0.9 && score.gatingPass) return null;

    if (!score.gatingPass) {
      return { text: 'At least one sentence in your answer has no matching artifact.', destination: 'Investigate', buttonLabel: 'Select better evidence →' };
    }

    const metrics = [
      { key: 'owner', label: 'Owner', value: score.metrics.ownerAccuracy, dest: 'Decide' as GuidedStep, action: 'Change the owner in your answer to match what the artifacts say.' },
      { key: 'deps', label: 'Dependencies', value: score.metrics.dependencyAccuracy, dest: 'Decide' as GuidedStep, action: 'Your dependency path is missing systems. Check the System Graph, then fix the path in your answer.' },
      { key: 'blast', label: 'Blast Radius', value: score.metrics.blastRadiusCompleteness, dest: 'Decide' as GuidedStep, action: 'Your blast radius is too vague. Add specific customer, revenue, or system impacts from the artifacts.' },
      { key: 'evidence', label: 'Evidence', value: score.metrics.evidenceRelevance, dest: 'Investigate' as GuidedStep, action: 'Your evidence doesn\'t cover your claims. Go back and select artifacts that mention the systems and teams in your answer.' },
    ];
    const weakest = metrics.reduce((a, b) => a.value <= b.value ? a : b);
    if (weakest.value >= 0.8) return null;
    return { text: weakest.action, destination: weakest.dest, buttonLabel: weakest.dest === 'Investigate' ? 'Go to Investigate →' : 'Go to Decide →' };
  })();

  const scoreIssues: Array<{ label: string; action: string; destination: GuidedStep }> = (() => {
    if (!score || !score.metrics) return [];
    if (score.overallScore >= 0.9 && score.gatingPass) return [];
    const issues: Array<{ label: string; action: string; destination: GuidedStep }> = [];
    if (score.metrics.ownerAccuracy < 0.8) {
      issues.push({ label: 'Owner', action: 'Change the owner to match what the artifacts say.', destination: 'Decide' });
    }
    if (score.metrics.dependencyAccuracy < 0.8) {
      issues.push({ label: 'Connections', action: 'Your dependency path is missing systems — check the System Graph.', destination: 'Decide' });
    }
    if (score.metrics.blastRadiusCompleteness < 0.8) {
      issues.push({ label: 'Blast Radius', action: 'Too vague — add specific customer, revenue, or system impacts.', destination: 'Decide' });
    }
    if (score.metrics.evidenceRelevance < 0.8) {
      issues.push({ label: 'Evidence', action: 'Select artifacts that mention the systems and teams in your answer.', destination: 'Investigate' });
    }
    return issues;
  })();

  const scoreSummary = score
    ? scoreIssues.length > 0
      ? `${scoreIssues.length} area${scoreIssues.length > 1 ? 's' : ''} to fix — see details below.`
      : scoreNextStep
        ? scoreNextStep.text
        : 'You nailed this scenario. Read the learning takeaways below to see what you just proved you can do.'
    : null;

  const scenarioNarrative = getScenarioNarrative(selectedScenario);

  // Connected learning summary — links scenario → evidence → answer → score
  const learningData = (() => {
    if (!score || score.overallScore < 0.8 || !score.gatingPass) return null;

    // Evidence the user actually selected, grouped by role
    const primaryArtifacts = selectedEvidenceItems.filter((e) => e.role === 'primary');
    const corroboratingArtifacts = selectedEvidenceItems.filter((e) => e.role === 'corroborating');

    // Rubric lookup helper
    const rubricScore = (criterion: string) => {
      const rs = score.rubricScores?.find((r) => r.criterion.toLowerCase().includes(criterion.toLowerCase()));
      return rs ? Math.round(rs.score * 100) : null;
    };

    // Decision chain — what the user did for each rubric dimension, linked to evidence
    const ownerScore = rubricScore('owner');
    const depScore = rubricScore('dependency');
    const blastScore = rubricScore('blast');
    const evidenceScore = rubricScore('evidence');

    const chain: Array<{ icon: string; dimension: string; evidence: string; answer: string; pct: number | null; tone: string }> = [];

    // Owner
    const ownerArtifact = primaryArtifacts.find((a) => /owner|registry|runbook/i.test(a.title)) ?? primaryArtifacts[0];
    chain.push({
      icon: '👤',
      dimension: 'Owner Routing',
      evidence: ownerArtifact ? `Read "${ownerArtifact.title}"` : 'Used selected primary artifacts',
      answer: formData.ownerRouting ? `Identified → ${formData.ownerRouting}` : 'Identified the owning team',
      pct: ownerScore,
      tone: (ownerScore ?? 0) >= 80 ? 'ok' : (ownerScore ?? 0) >= 60 ? 'warn' : 'danger',
    });

    // Dependencies
    const depArtifact = [...corroboratingArtifacts, ...primaryArtifacts].find((a) => /dependency|spec|integration|CDC|kafka/i.test(a.title)) ?? corroboratingArtifacts[0];
    const edgeCount = formData.dependencyTrace.length;
    chain.push({
      icon: '🔗',
      dimension: 'Dependency Trace',
      evidence: depArtifact ? `Read "${depArtifact.title}"` : 'Used selected artifacts',
      answer: edgeCount > 0 ? `Mapped ${edgeCount} connection${edgeCount > 1 ? 's' : ''} between services` : 'Traced service connections',
      pct: depScore,
      tone: (depScore ?? 0) >= 80 ? 'ok' : (depScore ?? 0) >= 60 ? 'warn' : 'danger',
    });

    // Blast radius
    const blastCount = formData.blastRadius.length;
    chain.push({
      icon: '💥',
      dimension: 'Blast Radius',
      evidence: `Cross-referenced ${selectedEvidenceItems.length} artifact${selectedEvidenceItems.length > 1 ? 's' : ''}`,
      answer: blastCount > 0 ? `Identified ${blastCount} impact${blastCount > 1 ? 's' : ''} on customers, revenue, or operations` : 'Assessed downstream impacts',
      pct: blastScore,
      tone: (blastScore ?? 0) >= 80 ? 'ok' : (blastScore ?? 0) >= 60 ? 'warn' : 'danger',
    });

    // Evidence gating
    const claimCount = score.claims?.length ?? 0;
    chain.push({
      icon: '📄',
      dimension: 'Evidence Gate',
      evidence: `${selectedEvidenceItems.length} artifact${selectedEvidenceItems.length > 1 ? 's' : ''} selected (${primaryArtifacts.length} primary, ${corroboratingArtifacts.length} corroborating)`,
      answer: `${claimCount} claim${claimCount !== 1 ? 's' : ''} in your answer — ${score.gatingPass ? 'all backed' : 'some unsupported'}`,
      pct: evidenceScore,
      tone: score.gatingPass ? 'ok' : 'danger',
    });

    return {
      primaryArtifacts,
      corroboratingArtifacts,
      chain,
    };
  })();

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

  const currentScoreLabel = score ? `${Math.round(score.overallScore * 100)}%` : '--';
  const fillBeginnerDraft = () => {
    const ownerGuess = keyFacts.owners[0] ?? '';
    const ownerLine = ownerGuess || suggestedTeams[0] || '[owner team]';
    const primaryTitle = primaryEvidence?.title ?? '[primary artifact]';
    const corrobTitle = corroboratingEvidence?.title ?? '[corroborating artifact]';
    const impactLine = keyFacts.impacts[0] ?? '[describe the customer or revenue impact]';
    const depLine = keyFacts.dependencies[0] ?? `${focusSystem} to ${downstreamSystem}`;

    setFormData({
      ownerRouting: ownerLine,
      dependencyTrace: parseDependencyTrace(beginnerDependencyTemplate),
      actionPlan: [
        `Confirm ${focusSystem} status and scope using ${primaryTitle}.`,
        `Notify ${ownerLine} and coordinate with ${suggestedTeams[1] ?? '[dependent team]'} on ${depLine}.`,
        `Verify ${downstreamSystem} is not impacted before proceeding with recovery.`,
        `Monitor for ${impactLine} and rollback if it worsens.`,
      ].join('\n'),
      blastRadius: beginnerBlastTemplate.split('\n'),
      evidenceNotes: [
        `${primaryTitle} identifies ${ownerLine} as the owner of ${focusSystem}.`,
        `${corrobTitle} shows the dependency path from ${upstreamSystem} through ${focusSystem} to ${downstreamSystem}.`,
      ].join('\n'),
    });

    setDependencyTraceInput(beginnerDependencyTemplate);
    setBlastRadiusInput(beginnerBlastTemplate);

    if (guidedStep !== 'Decide') {
      setGuidedStep('Decide');
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-[var(--text-0)] font-sans" data-testid="app-root">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[var(--header-bg)] shadow-[0_18px_46px_rgba(2,6,23,0.12)] backdrop-blur-xl">
        <div className="gradient-line" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#1db8a2] via-[#83ebd6] to-[#f0b45a] flex items-center justify-center shadow-[0_12px_28px_rgba(0,0,0,0.32),0_0_20px_rgba(39,211,182,0.15)] ring-1 ring-white/20 shrink-0">
              <span className="text-lg select-none leading-none">🎓</span>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--ok)] border-2 border-[var(--bg-0)] animate-pulse" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight" style={{ background: 'linear-gradient(135deg, var(--text-0) 0%, var(--accent-2) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>OmniMentor</span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-2)] font-medium">Architecture Fluency Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              {(['Brief', 'Investigate', 'Decide', 'Feedback'] as const).map((step, i) => (
                <span key={step} className={`progress-dot ${guidedStep === step ? 'progress-dot-active' : completedScenarios.size > 0 && i < ['Brief', 'Investigate', 'Decide', 'Feedback'].indexOf(guidedStep) ? 'progress-dot-done' : 'progress-dot-pending'}`} title={step} />
              ))}
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="p-2 rounded-xl border border-[var(--line)] hover:bg-[var(--surface-1)] hover:border-[var(--line-strong)] transition-all duration-200 text-[var(--text-1)]"
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
              className="text-xs font-semibold px-3.5 py-2 rounded-xl border border-[rgba(39,211,182,0.35)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.18)] hover:border-[rgba(39,211,182,0.55)] transition-all duration-200"
            >
              How It Works
            </button>
            <a
              href="https://github.com/asharma3084/OmniMentor-Learning-Platform/blob/main/docs/start-here/user-guide.md"
              target="_blank"
              rel="noopener noreferrer"
              title="Open help documentation"
              className="p-2 rounded-xl border border-[var(--line)] hover:bg-[var(--surface-1)] hover:border-[var(--line-strong)] transition-all duration-200 text-[var(--text-2)] hover:text-[var(--text-1)]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01" />
                <circle cx="12" cy="12" r="9.75" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 w-full">
        {/* ── Compact scenario bar ── */}
        <div className="mb-3 reveal-up" style={{ animationDelay: '20ms' }}>
          <div className="card px-0 py-0 overflow-hidden">
            {/* Tab bar: steps left, scenario right */}
            <div className="flex items-stretch justify-between border-b border-[color:var(--line)]">
              {/* Step tabs */}
              <div className="flex">
                {([
                  { step: 'Brief' as const, icon: '📋', label: 'Brief' },
                  { step: 'Investigate' as const, icon: '🔍', label: 'Investigate' },
                  { step: 'Decide' as const, icon: '✍️', label: 'Decide' },
                  { step: 'Feedback' as const, icon: '📊', label: 'Feedback' },
                ]).map(({ step, icon, label }, index) => (
                  <button
                    key={step}
                    onClick={() => { setGuidedStep(step); if (step === 'Feedback') setFeedbackTab('score'); }}
                    data-testid={`guided-step-${step.toLowerCase()}`}
                    className={`group relative px-4 py-3 text-xs font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                      guidedStep === step
                        ? 'text-[var(--accent-2)] bg-[rgba(39,211,182,0.08)]'
                        : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)]'
                    }`}
                  >
                    <span className={`step-icon ${guidedStep === step ? 'step-icon-active' : ''}`}>{icon}</span>
                    <span>{index + 1}. {label}</span>
                    {guidedStep === step && (
                      <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }} />
                    )}
                  </button>
                ))}
              </div>
              {/* Scenario selector — right side */}
              <div className="flex items-center gap-2 px-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-2)]">
                  <span><span className="text-[var(--text-1)] font-semibold">{completedScenarios.size}/{scenarios.length}</span> done</span>
                  <span className="opacity-30">·</span>
                  <span><span className="text-[var(--text-1)] font-semibold">{selectedEvidence.length}</span> evidence</span>
                  <span className="opacity-30">·</span>
                  <span className={score ? getPerformanceTone(score.overallScore) : ''}>{currentScoreLabel}</span>
                </div>
                <DomainBadge domain={selectedScenario.domain} size="xs" />
                <div className="relative min-w-[160px] max-w-[260px]">
                  <select
                    value={selectedScenario.id}
                    aria-label="Active Scenario"
                    data-testid="scenario-select"
                    onChange={(e) => {
                      const next = scenarios.find((s) => s.id === e.target.value) ?? null;
                      selectScenario(next, { step: 'Brief' });
                    }}
                    className="form-input py-1 pr-7 text-[11px] appearance-none cursor-pointer"
                  >
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id}>{s.domain ? `[${s.domain}] ` : ''}{s.title}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-2)]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            {/* Feedback sub-tabs — second row, always visible when on Feedback step */}
            {guidedStep === 'Feedback' && (
              <div className="flex flex-col gap-1 px-3 py-2 bg-[var(--chip-bg)] border-t border-[color:var(--line)]">
                <div className="flex items-center gap-2">
                {([
                  { key: 'score' as const, label: 'Score & Coaching', desc: 'See your rubric score, metric breakdown, and coaching tips to improve each dimension of your answer.' },
                  { key: 'graph' as const, label: 'System Graph', desc: 'Explore the live dependency map — see how services connect and which paths your answer traced correctly.' },
                  { key: 'evidence' as const, label: 'Evidence Explorer', desc: 'Review every artifact you selected and verify which claims each one supports in your answer.' },
                  { key: 'export' as const, label: 'Check-in Export', desc: 'Generate a structured summary of your completed scenarios for your weekly mentor check-in.' },
                ]).map(({ key, label, desc }) => (
                  <div key={key} className="relative group">
                    <button
                      onClick={() => setFeedbackTab(key)}
                      data-testid={`feedback-tab-${key}`}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                        feedbackTab === key
                          ? 'bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)] border border-[rgba(39,211,182,0.42)]'
                          : 'text-[var(--text-2)] border border-transparent hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      {label}
                    </button>
                    <div className="absolute left-0 top-full mt-1 z-30 w-56 px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[color:var(--line)] shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150">
                      <p className="text-[10px] text-[var(--text-1)] leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
                </div>
                {feedbackTab && (
                  <p className="text-[10px] text-[var(--text-2)] leading-relaxed pl-0.5">
                    {feedbackTab === 'score' && 'See your rubric score, metric breakdown, and specific coaching on each dimension of your answer.'}
                    {feedbackTab === 'graph' && 'Explore the dependency map showing how services connect — verify the paths you traced in your answer.'}
                    {feedbackTab === 'evidence' && 'Review every artifact you selected and check which of your claims each one supports.'}
                    {feedbackTab === 'export' && 'Generate a structured summary of your completed scenarios for your weekly mentor check-in.'}
                  </p>
                )}
                <div className="ml-auto">
                  <button
                    onClick={() => {
                      setScore(null);
                      setFormData({ ownerRouting: '', dependencyTrace: [], actionPlan: '', blastRadius: [], evidenceNotes: '' });
                      setDependencyTraceInput('');
                      setBlastRadiusInput('');
                      setSelectedEvidence([]);
                      setEvaluationCompare(null);
                      setExampleAnswer(null);
                      setGuidedStep('Brief');
                    }}
                    className="px-2.5 py-1 rounded-md text-[10px] font-semibold text-[var(--danger-text)] border border-[rgba(255,124,124,0.35)] hover:bg-[rgba(255,124,124,0.1)] transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

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
          <div className="space-y-4 reveal-up">
                {/* Incident-style mission brief */}
                <div className="hero-panel p-0 overflow-hidden">
                  {/* Top bar — severity + domain + live indicator */}
                  <div className="flex items-center justify-between px-5 py-3 bg-[rgba(39,211,182,0.08)] border-b border-[rgba(39,211,182,0.15)]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--warn)] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--warn)]" />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--warn-text)] mono-kicker">Incident Brief</span>
                      </span>
                      {selectedScenario.domain && <DomainBadge domain={selectedScenario.domain} size="xs" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tag-icon">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" /></svg>
                        {completedScenarios.size}/{scenarios.length} complete
                      </span>
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="px-6 py-6">
                    {/* Title + situation */}
                    <h2 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ background: 'linear-gradient(135deg, var(--text-0) 0%, var(--accent-2) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{selectedScenario.title}</h2>
                    <div className="mt-4 space-y-2">
                      {selectedScenario.prompt.split('\n\n').map((para, i) => (
                        <p key={i} className="text-sm text-[var(--text-1)] leading-relaxed">{para}</p>
                      ))}
                    </div>

                    {/* Your mission — the 4 deliverables with polished cards */}
                    <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-2)] mb-4 mono-kicker">Your Mission — Navigate the System & Respond</p>
                      <p className="text-xs text-[var(--text-2)] mb-4 leading-relaxed">You're a TPM onboarding onto a new team inside one of the world's largest retailers. These systems are massive, interconnected, and high-stakes. Your job: make sense of the complexity, trace the dependencies, and drive the right response.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { icon: '👤', label: 'Owner', desc: 'Identify which team owns the root cause across dozens of interconnected services.', accent: 'rgba(75,215,158,0.12)', border: 'rgba(75,215,158,0.25)' },
                          { icon: '🔗', label: 'Dependency path', desc: 'Trace how failures propagate through the retailer\'s complex distributed architecture.', accent: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)' },
                          { icon: '💥', label: 'Blast radius', desc: 'Assess impact on customers, revenue, stores, and partner teams at enterprise scale.', accent: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.25)' },
                          { icon: '🛡️', label: 'Safe actions', desc: 'Recommend immediate, safe mitigation steps that balance urgency with system stability.', accent: 'rgba(39,211,182,0.12)', border: 'rgba(39,211,182,0.25)' },
                        ].map((item, i) => (
                          <div key={item.label} className="flex items-start gap-3 rounded-xl border px-4 py-3.5 evidence-lift" style={{ backgroundColor: item.accent, borderColor: item.border, animationDelay: `${i * 60}ms` }}>
                            <span className="text-xl mt-0.5">{item.icon}</span>
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-0)]">{item.label}</p>
                              <p className="text-xs text-[var(--text-2)] mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stakes — one tight line */}
                    <div className="mt-5 rounded-xl border-l-[3px] border-l-[var(--warn)] border border-[rgba(240,180,90,0.2)] bg-[rgba(240,180,90,0.06)] px-4 py-3">
                      <p className="text-xs text-[var(--warn-text)] leading-relaxed">
                        {scenarioNarrative.problem}
                      </p>
                    </div>

                    {/* CTA */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setGuidedStep('Investigate')}
                        data-testid="start-with-evidence"
                        className="btn-accent px-6 py-3 text-sm rounded-xl"
                      >
                        Start Investigation →
                      </button>
                      <button
                        onClick={() => setShowWalkthrough(true)}
                        data-testid="replay-walkthrough"
                        className="px-5 py-3 rounded-xl text-xs font-semibold border border-[color:var(--line)] text-[var(--text-1)] hover:bg-[var(--hover-bg)] hover:border-[var(--line-strong)] transition-all duration-200"
                      >
                        How this works
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compact scenario queue */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-2)]">Scenario Queue</p>
                    <span className="tag-icon">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
                      {scenarios.length} scenarios
                    </span>
                  </div>
                  <div className="space-y-2">
                    {scenarios.map((s) => {
                      const result = completedScenarios.get(s.id);
                      const isActive = selectedScenario?.id === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            selectScenario(s, { reuseScore: result ?? null, step: 'Brief' });
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer evidence-lift ${
                            isActive
                              ? 'border-[rgba(39,211,182,0.5)] bg-[rgba(39,211,182,0.06)]'
                              : 'border-[color:var(--line)] hover:bg-[var(--hover-bg)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {s.domain && <DomainBadge domain={s.domain} size="xs" />}
                            <p className="text-xs font-medium text-[var(--text-0)] truncate">{s.title}</p>
                          </div>
                          <span className={`text-[10px] font-semibold shrink-0 ml-2 px-2.5 py-0.5 rounded-full border ${
                            result
                              ? result.overallScore >= 0.8
                                ? 'bg-[rgba(75,215,158,0.12)] text-[var(--ok-text)] border-[rgba(75,215,158,0.35)]'
                                : 'bg-[rgba(240,180,90,0.12)] text-[var(--warn-text)] border-[rgba(240,180,90,0.35)]'
                              : 'bg-[var(--chip-bg)] text-[var(--text-2)] border-[color:var(--line)]'
                          }`}>{result ? `${Math.round(result.overallScore * 100)}%` : 'Not started'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
          </div>
        )}

        {showScenarioWorkspace && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(340px,420px)] gap-4 items-start">
          {/* Left: Evidence + inline guidance */}
          <div className="space-y-3 reveal-up" style={{ animationDelay: '60ms' }}>
            {/* Compact guidance strip */}
              <div className="rounded-2xl border-l-[3px] border-l-[var(--accent)] border border-[rgba(39,211,182,0.25)] bg-[rgba(39,211,182,0.06)] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[var(--text-0)] flex items-center gap-2">
                      <span className="text-base">{guidedStep === 'Investigate' ? '🔍' : '✍️'}</span>
                      {guidedStep === 'Investigate' ? 'Read the evidence and spot the pattern.' : 'Write your decision and back it up.'}
                    </h2>
                    <p className="text-xs text-[var(--text-1)] mt-1 leading-relaxed">
                      {guidedStep === 'Investigate'
                        ? 'Open each artifact, look for who owns the problem, which systems talk to each other, and what could go wrong. Select the evidence that matters most before moving on.'
                        : 'Name the owner, draw the dependency path, list what breaks if this isn\'t fixed, and write a safe action plan — every claim should trace back to an artifact you selected.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {[
                      { ok: hasPrimary, label: 'Primary' },
                      { ok: hasCorroborating, label: 'Corroborating' },
                      { ok: hasTrace, label: 'Trace' },
                      { ok: hasBlast, label: 'Blast' },
                    ].map(({ ok, label }) => (
                      <span key={label} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                        ok
                          ? 'bg-[rgba(75,215,158,0.12)] text-[var(--ok-text)] border-[rgba(75,215,158,0.3)]'
                          : 'bg-[var(--chip-bg)] text-[var(--text-2)] border-[color:var(--line)]'
                      }`}>
                        {ok ? (
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-2)] opacity-40" />
                        )}
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                {guidedStep === 'Investigate' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setGuidedStep('Feedback');
                        setFeedbackTab('graph');
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[color:var(--line)] text-[var(--text-2)] hover:bg-[var(--hover-bg)]"
                    >
                      Open Graph View
                    </button>
                  </div>
                )}
              </div>

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
              <div className="flex items-center gap-3 mb-3">
                <label className="text-[11px] text-[var(--text-2)] shrink-0">Search strategy:</label>
                <select
                  value={retrievalMode}
                  onChange={(e) => setRetrievalMode(e.target.value as RetrievalMode)}
                  className="flex-1 text-[11px] rounded-lg border border-[color:var(--line)] bg-[var(--input-bg)] text-[var(--text-0)] px-2 py-1.5 focus:outline-none focus:border-[rgba(39,211,182,0.55)]"
                >
                  {RETRIEVAL_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label} — {option.description}</option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-[var(--text-2)] mb-3">Read each document and check the box if it supports your answer. Pick at least one primary and one corroborating.</p>
              <div className="space-y-1.5">
                {evidenceItems.map((ev) => {
                  const checked = selectedEvidence.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      data-testid={`evidence-card-${ev.id}`}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer evidence-lift ${
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
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-[var(--text-0)] truncate">{ev.title}</p>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                            ev.role === 'primary'
                              ? 'bg-[rgba(75,215,158,0.12)] text-[var(--ok-text)] border-[rgba(75,215,158,0.35)]'
                              : 'bg-[rgba(240,180,90,0.12)] text-[var(--warn-text)] border-[rgba(240,180,90,0.35)]'
                          }`}>
                            {ev.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-2)] mt-0.5 line-clamp-2">
                          {ev.body.substring(0, 120)}…
                        </p>
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
            {guidedStep === 'Investigate' ? (
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
                    disabled={!hasPrimary || !hasCorroborating}
                    title={!hasPrimary || !hasCorroborating ? 'Select at least one primary and one corroborating artifact first' : undefined}
                    data-testid="build-starter-draft"
                    className="btn-accent px-4 py-2.5 rounded-xl text-xs"
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
                  disabled={!hasPrimary || !hasCorroborating}
                  title={!hasPrimary || !hasCorroborating ? 'Select at least one primary and one corroborating artifact first' : undefined}
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
                  className="w-full btn-accent py-3 text-sm mt-1 rounded-xl"
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
              <div data-testid="score-result-card" className={`card p-6 ${score.gatingPass && score.overallScore >= 0.8 ? 'card-glow border-[rgba(75,215,158,0.45)]' : score.gatingPass ? 'border-[rgba(75,215,158,0.35)]' : 'border-[rgba(240,180,90,0.55)]'}`}>
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)] mb-1.5">What to fix</p>
                        {(() => {
                          const unsupportedClaims = (score.gatingResults ?? [])
                            .filter((r) => !r.supported)
                            .map((r) => {
                              const claim = (score.claims ?? []).find((c) => c.id === r.claimId);
                              return claim ? claim.text : null;
                            })
                            .filter(Boolean) as string[];

                          if (unsupportedClaims.length > 0) {
                            return (
                              <div className="space-y-2">
                                <div className="rounded-lg border border-[rgba(255,124,124,0.3)] bg-[rgba(255,124,124,0.06)] p-3">
                                  <p className="text-[11px] text-[var(--text-2)] mb-2">
                                    {unsupportedClaims.length === 1
                                      ? 'This sentence has no matching artifact:'
                                      : `These ${unsupportedClaims.length} sentences have no matching artifact:`}
                                  </p>
                                  <ol className="list-decimal list-inside space-y-1 mb-3">
                                    {unsupportedClaims.map((claim, idx) => (
                                      <li key={idx} className="text-xs text-[var(--text-0)] leading-relaxed">
                                        <span className="italic">"{claim}"</span>
                                      </li>
                                    ))}
                                  </ol>
                                  <p className="text-[11px] text-[var(--text-2)] mb-2">For each one, either select an artifact that covers this topic, or edit/remove the sentence.</p>
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setGuidedStep('Investigate')}
                                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[rgba(39,211,182,0.15)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.25)] transition-colors font-semibold">
                                      Go to Investigate &rarr;
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <ul className="space-y-1">
                              {score.criticalErrors.map((err, idx) => (
                                <li key={idx} className="text-xs text-[var(--danger-text)] flex items-start gap-1.5">
                                  <span className="mt-0.5 text-red-500 shrink-0">•</span>
                                  <span>{err}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--ok-text)]">Every claim in your answer is backed by evidence.</p>
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
                </div>
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

              {/* Interactive SVG graph visualization */}
              {visibleGraphNodes.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[var(--text-1)]">Service dependency map</p>
                    <span className="text-[10px] text-[var(--text-2)]">{visibleGraphNodes.length} nodes · {filteredGraphEdges.length} edges · click a node to focus</span>
                  </div>
                  <ForceGraph
                    nodes={visibleGraphNodes}
                    edges={filteredGraphEdges}
                    seedServices={graphSeedServices}
                    focusedNode={focusedGraphNode}
                    onNodeClick={(node) => setFocusedGraphNode((cur) => cur === node ? null : node)}
                  />
                </div>
              )}

              {displayGraphEdges.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[var(--text-2)] mb-2">
                    {graphConnectedServices.length > 0 ? 'Graph context is available. Add explicit edges in the workspace when you are ready to commit your answer.' : 'No dependency edges captured yet.'}
                  </p>
                  <button onClick={() => setGuidedStep('Decide')} className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)]">
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
                            {graphEvidenceForNode(focusedGraphNode).length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setFeedbackTab('evidence')}
                                className="text-xs font-semibold text-[var(--accent-2)] hover:underline"
                              >
                                {graphEvidenceForNode(focusedGraphNode).length} artifact{graphEvidenceForNode(focusedGraphNode).length !== 1 ? 's' : ''} linked — view in Evidence Explorer →
                              </button>
                            ) : (
                              <p className="text-[11px] text-[var(--text-2)]">No directly linked evidence for this node.</p>
                            )}
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
                  <p className="text-[11px] text-[var(--text-2)] mt-1">These are the documents the system found for this scenario. Try different search strategies to see how the evidence changes.</p>
                </div>
                <span className="text-xs font-semibold text-[var(--text-2)] mono-kicker">{evidenceItems.length} retrieved</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <label className="text-[11px] text-[var(--text-2)] shrink-0">Search strategy:</label>
                <select
                  value={retrievalMode}
                  onChange={(e) => setRetrievalMode(e.target.value as RetrievalMode)}
                  className="flex-1 text-[11px] rounded-lg border border-[color:var(--line)] bg-[var(--input-bg)] text-[var(--text-0)] px-2 py-1.5 focus:outline-none focus:border-[rgba(39,211,182,0.55)]"
                >
                  {RETRIEVAL_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label} — {option.description}</option>
                  ))}
                </select>
              </div>
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
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setFeedbackTab('graph')}
                            className="text-[10px] font-semibold text-[var(--accent-2)] hover:underline"
                          >
                            Graph linked: {ev.metadata.graphConnectedServices.join(', ')} — view in System Graph →
                          </button>
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
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          score.gatingPass
                            ? 'bg-[rgba(75,215,158,0.14)] text-[var(--ok-text)] border-[rgba(75,215,158,0.45)]'
                            : 'bg-[rgba(255,124,124,0.16)] text-[var(--danger-text)] border-[rgba(255,124,124,0.5)]'
                        }`}>
                          {score.gatingPass ? '✓ Evidence Gate: Passed' : '✗ Evidence Gate: Failed'}
                        </span>
                        <p className="text-[10px] text-[var(--text-2)] mt-1.5 max-w-sm leading-relaxed">
                          {score.gatingPass
                            ? 'Every sentence in your answer can be traced back to a specific artifact you selected. This is how TPMs build trust — no unsupported assertions.'
                            : 'Some sentences in your answer don\'t match any artifact you selected. In a real incident review, unsupported claims get challenged. Fix them below.'}
                        </p>
                      </div>
                      {!score.gatingPass && (() => {
                        const unsupported = (score.gatingResults ?? [])
                          .filter((r) => !r.supported)
                          .map((r) => (score.claims ?? []).find((c) => c.id === r.claimId)?.text)
                          .filter(Boolean) as string[];
                        return unsupported.length > 0 ? (
                          <div className="mt-3">
                            <div className="rounded-lg border border-[rgba(255,124,124,0.3)] bg-[rgba(255,124,124,0.06)] p-3">
                              <p className="text-[11px] text-[var(--text-2)] mb-2">
                                {unsupported.length === 1
                                  ? 'This sentence has no matching artifact — fix it to reach 100%:'
                                  : `These ${unsupported.length} sentences have no matching artifact — fix them to reach 100%:`}
                              </p>
                              <ol className="list-decimal list-inside space-y-1 mb-3">
                                {unsupported.map((claim, i) => (
                                  <li key={i} className="text-xs text-[var(--text-0)] leading-relaxed">
                                    <span className="italic">"{claim}"</span>
                                  </li>
                                ))}
                              </ol>
                              <p className="text-[11px] text-[var(--text-2)] mb-2">For each one, either select an artifact that covers this topic, or edit/remove the sentence.</p>
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => { setGuidedStep('Investigate'); }}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-[rgba(39,211,182,0.15)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.25)] transition-colors font-semibold">
                                  Go to Investigate &rarr;
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : score.criticalErrors.length > 0 ? (
                          <div className="mt-2">
                            {score.criticalErrors.map((err, i) => (
                              <p key={i} className="text-xs text-[var(--danger-text)]">• {err}</p>
                            ))}
                          </div>
                        ) : null;
                      })()}
                      {score.gatingPass && score.overallScore < 0.9 && scoreIssues.length > 0 && (
                        <div className="mt-3">
                          <div className="rounded-lg border border-[rgba(255,180,80,0.35)] bg-[rgba(255,180,80,0.06)] p-3">
                            <p className="text-[11px] text-[var(--text-2)] mb-2 font-semibold">
                              {scoreIssues.length === 1 ? '1 area needs work:' : `${scoreIssues.length} areas need work:`}
                            </p>
                            <ul className="space-y-1.5 mb-3">
                              {scoreIssues.map((issue, i) => (
                                <li key={i} className="text-xs text-[var(--text-0)] leading-relaxed flex items-start gap-2">
                                  <span className="font-semibold text-[var(--accent-1)] shrink-0">{issue.label}:</span>
                                  <span>{issue.action}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="flex flex-wrap gap-2">
                              {scoreIssues.some((i) => i.destination === 'Decide') && (
                                <button type="button" onClick={() => { setGuidedStep('Decide'); }}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-[rgba(39,211,182,0.15)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.25)] transition-colors font-semibold">
                                  Fix in Decide &rarr;
                                </button>
                              )}
                              {scoreIssues.some((i) => i.destination === 'Investigate') && (
                                <button type="button" onClick={() => { setGuidedStep('Investigate'); }}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-[rgba(39,211,182,0.15)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.25)] transition-colors font-semibold">
                                  Fix in Investigate &rarr;
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {score.gatingPass && score.overallScore < 0.9 && scoreIssues.length === 0 && scoreNextStep && (
                        <div className="mt-3">
                          <button type="button" onClick={() => { setGuidedStep(scoreNextStep.destination); }}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-[rgba(39,211,182,0.15)] text-[var(--accent-2)] hover:bg-[rgba(39,211,182,0.25)] transition-colors font-semibold">
                            {scoreNextStep.buttonLabel}
                          </button>
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

                {/* Connected learning summary — scenario → evidence → answer → score */}
                {learningData && (
                  <div className="card p-6 space-y-6">

                    {/* Section 1: The Challenge */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">🎯</span>
                        <p className="text-sm font-semibold text-[var(--text-0)]">The Challenge</p>
                      </div>
                      <p className="text-xs text-[var(--text-1)] leading-relaxed">{scenarioNarrative.problem}</p>
                      <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed italic">{scenarioNarrative.motivation}</p>
                    </div>

                    <div className="border-t border-[color:var(--line)]" />

                    {/* Section 2: Evidence You Used */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">📎</span>
                        <p className="text-sm font-semibold text-[var(--text-0)]">Evidence You Used</p>
                        <span className="text-[10px] text-[var(--text-2)] ml-1">{selectedEvidenceItems.length} artifact{selectedEvidenceItems.length !== 1 ? 's' : ''} selected</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedEvidenceItems.map((ev) => (
                          <div key={ev.id} className="flex items-start gap-2.5 rounded-lg border border-[color:var(--line)] bg-[var(--chip-bg)] px-3 py-2.5">
                            <span className={`shrink-0 mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              ev.role === 'primary'
                                ? 'bg-[rgba(75,215,158,0.15)] text-[var(--ok-text)] border border-[rgba(75,215,158,0.3)]'
                                : 'bg-[rgba(99,102,241,0.12)] text-[#818cf8] border border-[rgba(99,102,241,0.3)]'
                            }`}>{ev.role === 'primary' ? 'Primary' : 'Corr.'}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-[var(--text-0)] truncate">{ev.title}</p>
                              <p className="text-[10px] text-[var(--text-2)] mt-0.5 line-clamp-2 leading-relaxed">{ev.body.slice(0, 120)}{ev.body.length > 120 ? '…' : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedEvidenceItems.length === 0 && (
                        <p className="text-xs text-[var(--text-2)] italic">No evidence artifacts were selected for this scenario.</p>
                      )}
                    </div>

                    <div className="border-t border-[color:var(--line)]" />

                    {/* Section 3: Your Decision Chain */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">⛓️</span>
                        <p className="text-sm font-semibold text-[var(--text-0)]">Your Decision Chain</p>
                      </div>
                      <p className="text-[11px] text-[var(--text-2)] mb-3 leading-relaxed">Each row shows: which evidence you read → what you decided → how the rubric scored it.</p>
                      <div className="space-y-2.5">
                        {learningData.chain.map((c, i) => (
                          <div key={i} className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] px-4 py-3 evidence-lift" style={{ animationDelay: `${i * 60}ms` }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{c.icon}</span>
                                <span className="text-xs font-semibold text-[var(--text-0)]">{c.dimension}</span>
                              </div>
                              {c.pct !== null && (
                                <span className={`text-xs font-mono font-semibold ${
                                  c.tone === 'ok' ? 'text-[var(--ok)]' : c.tone === 'warn' ? 'text-[var(--warn)]' : 'text-[var(--danger)]'
                                }`}>{c.pct}%</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--text-2)] leading-relaxed">
                              <span className="shrink-0 text-[var(--accent-2)]">Evidence:</span>
                              <span>{c.evidence}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--text-1)] leading-relaxed mt-0.5">
                              <span className="shrink-0 text-[var(--accent-2)]">Your answer:</span>
                              <span>{c.answer}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[color:var(--line)]" />

                    {/* Section 4: What This Taught You */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">🧠</span>
                        <p className="text-sm font-semibold text-[var(--text-0)]">What This Taught You</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] px-4 py-3">
                        <p className="text-xs font-semibold text-[var(--accent-2)] uppercase tracking-wide mb-1">Architectural Insight</p>
                        <p className="text-xs text-[var(--text-1)] leading-relaxed">{scenarioNarrative.architecturalLesson}</p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] px-4 py-3 mt-2">
                        <p className="text-xs font-semibold text-[var(--accent-2)] uppercase tracking-wide mb-1">TPM Skill Practiced</p>
                        <p className="text-xs text-[var(--text-1)] leading-relaxed">{scenarioNarrative.motivation}</p>
                      </div>
                    </div>

                    {/* Section 5: Why This Matters callout */}
                    <div className="rounded-xl border-l-[3px] border-l-[var(--accent-2)] border border-[rgba(39,211,182,0.2)] bg-[rgba(39,211,182,0.06)] px-4 py-3">
                      <p className="text-xs text-[var(--text-1)] leading-relaxed">
                        <span className="font-semibold text-[var(--accent-2)]">Why this matters:</span> {scenarioNarrative.problem} You proved you can read the evidence, trace the system, and make a defensible decision — the core skill a TPM needs on day one with a new team.
                      </p>
                    </div>

                    <div className="border-t border-[color:var(--line)]" />

                    {/* Section 6: What a TPM Does Next — real-world actions */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">🚀</span>
                        <p className="text-sm font-semibold text-[var(--text-0)]">What a TPM Does Next</p>
                      </div>
                      <p className="text-[11px] text-[var(--text-2)] mb-3 leading-relaxed">You've identified the owner, traced the dependencies, and assessed the blast radius. In the real world, here's what you'd do with that analysis:</p>
                      <div className="space-y-2">
                        {scenarioNarrative.tpmActions.map((action, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-lg border border-[color:var(--line)] bg-[var(--chip-bg)] px-3.5 py-2.5">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-[rgba(39,211,182,0.15)] text-[var(--accent-2)] text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                            <p className="text-xs text-[var(--text-1)] leading-relaxed">{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[color:var(--line)]" />

                    {/* Section 7: Your Next Step in the platform */}
                    <div className="rounded-xl border border-[rgba(39,211,182,0.25)] bg-[rgba(39,211,182,0.06)] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">📋</span>
                        <p className="text-sm font-semibold text-[var(--text-0)]">Your Next Step</p>
                      </div>
                      {(() => {
                        const nextScenario = scenarios.find((s) => !completedScenarios.has(s.id) && s.id !== selectedScenario.id);
                        const allDone = scenarios.every((s) => completedScenarios.has(s.id));
                        return (
                          <div className="space-y-2">
                            {!allDone && nextScenario && (
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-[var(--text-1)]">
                                  You've completed <span className="font-semibold text-[var(--accent-2)]">{completedScenarios.size}</span> of <span className="font-semibold">{scenarios.length}</span> scenarios.
                                  Try a different domain to build broader architectural fluency.
                                </p>
                                <button
                                  onClick={() => { setSelectedScenario(nextScenario); setScore(null); setFormData({ ownerRouting: '', dependencyTrace: [], actionPlan: '', blastRadius: [], evidenceNotes: '' }); setDependencyTraceInput(''); setBlastRadiusInput(''); setSelectedEvidence([]); setEvaluationCompare(null); setExampleAnswer(null); setGuidedStep('Brief'); }}
                                  className="shrink-0 ml-3 btn-accent px-4 py-2 text-xs rounded-lg"
                                >
                                  Next: {nextScenario.title.length > 30 ? nextScenario.title.slice(0, 30) + '…' : nextScenario.title} →
                                </button>
                              </div>
                            )}
                            {allDone && (
                              <p className="text-xs text-[var(--text-1)]">
                                🎉 You've completed <span className="font-semibold text-[var(--ok-text)]">all {scenarios.length} scenarios</span>.
                                Head to <button onClick={() => { setGuidedStep('Feedback'); setFeedbackTab('export'); }} className="font-semibold text-[var(--accent-2)] underline underline-offset-2">Check-in Export</button> to generate your mentor summary, or revisit any scenario to try a different search strategy.
                              </p>
                            )}
                            {!allDone && !nextScenario && (
                              <p className="text-xs text-[var(--text-1)]">
                                Explore the <button onClick={() => { setGuidedStep('Feedback'); setFeedbackTab('graph'); }} className="font-semibold text-[var(--accent-2)] underline underline-offset-2">System Graph</button> to deepen your understanding, or head to <button onClick={() => { setGuidedStep('Feedback'); setFeedbackTab('export'); }} className="font-semibold text-[var(--accent-2)] underline underline-offset-2">Check-in Export</button> for your mentor summary.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

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
                <button onClick={() => { setGuidedStep('Investigate'); }} className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(39,211,182,0.18)] text-[var(--accent-2)]">
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
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-2)] mono-kicker">Progress</p>
                    <p className="stat-value mt-2">{completedScenarios.size} / {scenarios.length}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-1">completed scenarios</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-2)] mono-kicker">Current score</p>
                    <p className="stat-value mt-2">{score ? `${Math.round(score.overallScore * 100)}%` : 'N/A'}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-1">{score ? (score.gatingPass ? 'gating passed' : 'gating not passed') : 'not scored yet'}</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-2)] mono-kicker">Best mode</p>
                    <p className="text-base font-bold text-[var(--text-0)] mt-2">{bestModeResult ? (modeLabels.get(bestModeResult.mode) ?? bestModeResult.mode) : 'N/A'}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-1">{comparisonDelta !== null ? `${comparisonDelta >= 0 ? '+' : ''}${comparisonDelta} vs vector` : 'comparison pending'}</p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-2)] mono-kicker">Evidence mix</p>
                    <p className="stat-value mt-2">{selectedEvidence.length}</p>
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

      {/* Branded footer */}
      <footer className="footer-bar mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1db8a2] via-[#83ebd6] to-[#f0b45a] flex items-center justify-center ring-1 ring-white/10 shrink-0">
              <span className="text-xs select-none">🎓</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[var(--text-1)]">OmniMentor</span>
              <span className="text-[9px] text-[var(--text-2)] tracking-wide">Architecture Fluency Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-[var(--text-2)]">{scenarios.length} scenarios · {completedScenarios.size} completed</span>
            <span className="text-[10px] text-[var(--text-2)] opacity-50">•</span>
            <span className="text-[10px] text-[var(--text-2)]">Built for TPM learners</span>
          </div>
        </div>
        <div className="gradient-line" />
      </footer>

      {/* First-run walkthrough modal */}
      {showWalkthrough && !showSurvey && (
        <div data-testid="walkthrough-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="hero-panel max-w-4xl w-full p-6 shadow-2xl reveal-up">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-2)] mono-kicker">Getting Started</p>
                <h2 className="text-xl font-bold mt-1" style={{ background: 'linear-gradient(135deg, var(--text-0) 0%, var(--accent-2) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>How a new TPM should use OmniMentor</h2>
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
                <div key={item.step} className="rounded-xl border border-[color:var(--line)] bg-[var(--chip-bg)] p-4 evidence-lift">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, rgba(39,211,182,0.2), rgba(131,235,214,0.15))', border: '1px solid rgba(39,211,182,0.35)', color: 'var(--accent-2)', boxShadow: '0 4px 12px rgba(39,211,182,0.1)' }}>
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
                onClick={() => closeWalkthrough('Brief')}
                data-testid="walkthrough-start-overview"
                className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-[color:var(--line)] text-[var(--text-1)] hover:bg-[var(--hover-bg)]"
              >
                Start In Overview
              </button>
              <button
                onClick={() => closeWalkthrough('Investigate')}
                data-testid="walkthrough-start-practice"
                className="btn-accent px-5 py-2.5 rounded-xl text-sm"
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
                className="btn-accent px-5 py-2.5 rounded-xl text-sm"
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
                className="flex-1 btn-accent py-2.5 rounded-xl text-sm"
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
