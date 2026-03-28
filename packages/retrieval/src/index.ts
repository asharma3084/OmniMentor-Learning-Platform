import type { ContextBuilder, Evidence, Retriever } from '@omnimentor/core';

// ── Shared keyword-matching utilities ──────────────────────────

const STOP_WORDS = new Set([
  'the','and','for','that','this','with','from','are','was','were',
  'has','have','had','not','but','all','can','her','his','its',
  'our','they','who','will','been','each','more','some','such',
  'than','them','then','what','when','into','over','also','your',
]);

function extractTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function keywordScore(query: string, text: string): number {
  const queryTerms = extractTerms(query);
  if (queryTerms.length === 0) return 0;
  const textLower = text.toLowerCase();
  const hits = queryTerms.filter((t) => textLower.includes(t)).length;
  return hits / queryTerms.length;
}

function normalizeGraphKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function humanizeServiceToken(token: string): string {
  return token
    .replace(/^svc-/, '')
    .replace(/^ext-/, '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.toUpperCase() === 'BFF' ? 'BFF' : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

/**
 * Corpus-backed retriever that loads evidence from a pre-indexed map
 * and ranks by deterministic keyword overlap with the query.
 */
export interface CorpusStore {
  getEvidenceForScenario(scenarioId: string): Evidence[];
}

export interface GraphServiceNode {
  id: string;
  name: string;
  upstream?: string[];
  downstream?: string[];
}

export interface GraphTraversalContext {
  seedServices: string[];
  connectedServices: Array<{
    service: string;
    hops: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: 'upstream' | 'downstream';
  }>;
}

export interface GraphStore {
  getTraversalContext(scenarioId: string, query: string, maxHops: number): GraphTraversalContext;
}

/**
 * In-memory corpus store: accepts a map of scenarioId → Evidence[].
 */
export class InMemoryCorpusStore implements CorpusStore {
  private store: Map<string, Evidence[]>;

  constructor(data: Map<string, Evidence[]>) {
    this.store = data;
  }

  getEvidenceForScenario(scenarioId: string): Evidence[] {
    return this.store.get(scenarioId) ?? [];
  }
}

type GraphSnapshot = {
  services: Map<string, string>;
  adjacency: Map<string, Set<string>>;
  directedEdges: Array<{
    from: string;
    to: string;
    type: 'upstream' | 'downstream';
  }>;
};

export class InMemoryGraphStore implements GraphStore {
  private snapshots: Map<string, GraphSnapshot>;

  constructor(data: Map<string, GraphServiceNode[]>) {
    this.snapshots = new Map(
      Array.from(data.entries()).map(([scenarioId, nodes]) => [scenarioId, this.buildSnapshot(nodes)])
    );
  }

  getTraversalContext(scenarioId: string, query: string, maxHops: number): GraphTraversalContext {
    const snapshot = this.snapshots.get(scenarioId);
    if (!snapshot) {
      return { seedServices: [], connectedServices: [], edges: [] };
    }

    const normalizedQuery = normalizeGraphKey(query);
    const allServices = Array.from(snapshot.services.values());
    const seedServices = allServices.filter((service) => {
      const normalizedService = normalizeGraphKey(service);
      if (!normalizedService) return false;

      return (
        normalizedQuery.includes(normalizedService) ||
        keywordScore(normalizedQuery, normalizedService) >= 0.5 ||
        keywordScore(normalizedService, normalizedQuery) >= 0.5
      );
    });

    if (seedServices.length === 0) {
      return { seedServices: [], connectedServices: [], edges: [] };
    }

    const traversal = new Map<string, number>();
    const queue: Array<{ key: string; hops: number }> = [];

    for (const service of uniqueStrings(seedServices)) {
      const key = normalizeGraphKey(service);
      traversal.set(key, 0);
      queue.push({ key, hops: 0 });
    }

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      if (current.hops >= maxHops) continue;

      const neighbors = snapshot.adjacency.get(current.key) ?? new Set<string>();
      for (const neighbor of neighbors) {
        if (traversal.has(neighbor)) continue;
        traversal.set(neighbor, current.hops + 1);
        queue.push({ key: neighbor, hops: current.hops + 1 });
      }
    }

    return {
      seedServices: uniqueStrings(seedServices),
      connectedServices: Array.from(traversal.entries())
        .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
        .map(([key, hops]) => ({ service: snapshot.services.get(key) ?? key, hops })),
      edges: snapshot.directedEdges.filter((edge) => {
        const fromKey = normalizeGraphKey(edge.from);
        const toKey = normalizeGraphKey(edge.to);
        return traversal.has(fromKey) && traversal.has(toKey);
      }),
    };
  }

  private buildSnapshot(nodes: GraphServiceNode[]): GraphSnapshot {
    const idToName = new Map<string, string>();
    const services = new Map<string, string>();
    const adjacency = new Map<string, Set<string>>();
    const directedEdges = new Map<string, { from: string; to: string; type: 'upstream' | 'downstream' }>();

    const registerService = (serviceName: string) => {
      const key = normalizeGraphKey(serviceName);
      if (!services.has(key)) {
        services.set(key, serviceName);
      }
      if (!adjacency.has(key)) {
        adjacency.set(key, new Set<string>());
      }
      return key;
    };

    for (const node of nodes) {
      const fallbackName = node.name || humanizeServiceToken(node.id);
      idToName.set(node.id, fallbackName);
      registerService(fallbackName);
    }

    const resolveName = (token: string): string => idToName.get(token) ?? humanizeServiceToken(token);

    const addEdge = (fromName: string, toName: string, type: 'upstream' | 'downstream') => {
      const fromKey = registerService(fromName);
      const toKey = registerService(toName);
      adjacency.get(fromKey)?.add(toKey);
      adjacency.get(toKey)?.add(fromKey);
      directedEdges.set(`${fromKey}|${toKey}|${type}`, { from: fromName, to: toName, type });
    };

    for (const node of nodes) {
      const nodeName = idToName.get(node.id) ?? node.name;
      for (const upstream of node.upstream ?? []) {
        addEdge(resolveName(upstream), nodeName, 'upstream');
      }
      for (const downstream of node.downstream ?? []) {
        addEdge(nodeName, resolveName(downstream), 'downstream');
      }
    }

    return { services, adjacency, directedEdges: Array.from(directedEdges.values()) };
  }
}

function buildGraphSignals(
  graphStore: GraphStore | undefined,
  scenarioId: string,
  query: string,
  evidence: Evidence
): {
  seedServices: string[];
  connectedServices: Array<{ service: string; hops: number }>;
  edges: Array<{ from: string; to: string; type: 'upstream' | 'downstream' }>;
  graphBoost: number;
  matchedServices: string[];
} {
  const traversal = graphStore?.getTraversalContext(scenarioId, query, 3) ?? {
    seedServices: [],
    connectedServices: [],
    edges: [],
  };

  if (traversal.connectedServices.length === 0) {
    return {
      ...traversal,
      graphBoost: 0,
      matchedServices: [],
    };
  }

  const evidenceText = `${evidence.title} ${evidence.body}`.toLowerCase();
  const matchedServices = traversal.connectedServices
    .filter(({ service }) => evidenceText.includes(service.toLowerCase()))
    .map(({ service }) => service);

  const matchedByHop = traversal.connectedServices.filter(({ service }) =>
    matchedServices.includes(service)
  );

  const serviceBoost = matchedByHop.reduce((total, match) => {
    const hopWeight = match.hops === 0 ? 0.18 : match.hops === 1 ? 0.12 : match.hops === 2 ? 0.08 : 0.05;
    return total + hopWeight;
  }, 0);

  const relationshipTerms = ['upstream', 'downstream', 'dependency', 'depends', 'impact', 'blast radius', 'outage'];
  const relationBoost = matchedServices.length >= 2 && relationshipTerms.some((term) => evidenceText.includes(term))
    ? 0.08
    : 0;

  return {
    ...traversal,
    graphBoost: Math.min(0.4, serviceBoost + relationBoost),
    matchedServices: uniqueStrings(matchedServices),
  };
}

// ── Retrievers ─────────────────────────────────────────────────

/**
 * Deterministic vector retriever: ranks corpus evidence by keyword
 * overlap with the query and returns topK results.
 */
export class VectorRetriever implements Retriever {
  private corpus: CorpusStore;

  constructor(corpus: CorpusStore) {
    this.corpus = corpus;
  }

  async retrieve(input: {
    scenarioId: string;
    query: string;
    topK: number;
  }): Promise<Evidence[]> {
    const candidates = this.corpus.getEvidenceForScenario(input.scenarioId);
    if (candidates.length === 0) return [];

    const scored = candidates.map((ev) => ({
      evidence: ev,
      score: keywordScore(input.query, `${ev.title} ${ev.body}`),
    }));

    // Sort by score desc, break ties by id for determinism
    scored.sort((a, b) => b.score - a.score || a.evidence.id.localeCompare(b.evidence.id));

    return scored.slice(0, input.topK).map((s) => ({
      ...s.evidence,
      metadata: {
        ...s.evidence.metadata,
        retrievalScore: Math.round(s.score * 1000) / 1000,
        source: 'vector',
        timestamp: new Date().toISOString(),
      },
    }));
  }
}

/**
 * Deterministic graph retriever: follows typed dependency edges
 * from the query context, boosting evidence that mentions connected services.
 */
export class GraphRetriever implements Retriever {
  private corpus: CorpusStore;
  private graphStore?: GraphStore;

  constructor(corpus: CorpusStore, graphStore?: GraphStore) {
    this.corpus = corpus;
    this.graphStore = graphStore;
  }

  async retrieve(input: {
    scenarioId: string;
    query: string;
    topK: number;
  }): Promise<Evidence[]> {
    const candidates = this.corpus.getEvidenceForScenario(input.scenarioId);
    if (candidates.length === 0) return [];

    const depTerms = ['upstream', 'downstream', 'dependency', 'depends', 'impact', 'blast radius', 'outage'];
    const scored = candidates.map((ev) => {
      const base = keywordScore(input.query, `${ev.title} ${ev.body}`);
      const textLower = `${ev.title} ${ev.body}`.toLowerCase();
      const depBoost = depTerms.filter((t) => textLower.includes(t)).length * 0.05;
      const graphSignals = buildGraphSignals(this.graphStore, input.scenarioId, input.query, ev);
      const roleBoost = ev.role === 'primary' ? 0.1 : 0;
      return {
        evidence: ev,
        score: Math.min(1, base + depBoost + roleBoost + graphSignals.graphBoost),
        graphSignals,
      };
    });

    scored.sort((a, b) => b.score - a.score || a.evidence.id.localeCompare(b.evidence.id));

    return scored.slice(0, input.topK).map((s) => ({
      ...s.evidence,
      metadata: {
        ...s.evidence.metadata,
        retrievalScore: Math.round(s.score * 1000) / 1000,
        source: 'graph',
        graphSeedServices: s.graphSignals.seedServices,
        graphConnectedServices: s.graphSignals.connectedServices.map(({ service }) => service),
        graphMatchedServices: s.graphSignals.matchedServices,
        graphTraversalEdges: s.graphSignals.edges,
        timestamp: new Date().toISOString(),
      },
    }));
  }
}

/**
 * Deterministic GraphRAG retriever: combines keyword overlap with
 * graph-aware boosting and provenance tracing.
 */
export class GraphRAGRetriever implements Retriever {
  private corpus: CorpusStore;
  private graphStore?: GraphStore;

  constructor(corpus: CorpusStore, graphStore?: GraphStore) {
    this.corpus = corpus;
    this.graphStore = graphStore;
  }

  async retrieve(input: {
    scenarioId: string;
    query: string;
    topK: number;
  }): Promise<Evidence[]> {
    const candidates = this.corpus.getEvidenceForScenario(input.scenarioId);
    if (candidates.length === 0) return [];

    const depTerms = ['upstream', 'downstream', 'dependency', 'depends', 'impact', 'blast radius', 'outage'];
    const provTerms = ['owner', 'owned', 'on-call', 'runbook', 'pir', 'incident', 'review', 'resolution'];

    const scored = candidates.map((ev) => {
      const base = keywordScore(input.query, `${ev.title} ${ev.body}`);
      const textLower = `${ev.title} ${ev.body}`.toLowerCase();
      const depBoost = depTerms.filter((t) => textLower.includes(t)).length * 0.04;
      const provBoost = provTerms.filter((t) => textLower.includes(t)).length * 0.03;
      const graphSignals = buildGraphSignals(this.graphStore, input.scenarioId, input.query, ev);
      const roleBoost = ev.role === 'primary' ? 0.08 : 0;
      return {
        evidence: ev,
        score: Math.min(1, base + depBoost + provBoost + roleBoost + graphSignals.graphBoost),
        graphSignals,
      };
    });

    scored.sort((a, b) => b.score - a.score || a.evidence.id.localeCompare(b.evidence.id));

    return scored.slice(0, input.topK).map((s) => ({
      ...s.evidence,
      metadata: {
        ...s.evidence.metadata,
        retrievalScore: Math.round(s.score * 1000) / 1000,
        source: 'graphrag',
        graphSeedServices: s.graphSignals.seedServices,
        graphConnectedServices: s.graphSignals.connectedServices.map(({ service }) => service),
        graphMatchedServices: s.graphSignals.matchedServices,
        graphTraversalEdges: s.graphSignals.edges,
        timestamp: new Date().toISOString(),
      },
    }));
  }
}

// ── Context Builder ────────────────────────────────────────────

/**
 * Simple context builder that formats evidence for LLM consumption.
 * Produces deterministic output by sorting evidence by ID.
 */
export class SimpleContextBuilder implements ContextBuilder {
  async buildContext(input: {
    scenarioId: string;
    evidence: Evidence[];
  }): Promise<string> {
    const sortedEvidence = [...input.evidence].sort((a, b) => a.id.localeCompare(b.id));
    
    const evidenceSection = sortedEvidence
      .map((item) => {
        const metadata = item.metadata 
          ? ` [score: ${item.metadata.retrievalScore ?? 'N/A'}, source: ${item.metadata.source ?? 'N/A'}]`
          : '';
        return `- [${item.id}] ${item.title}: ${item.body}${metadata}`;
      })
      .join('\n');

    return [`Scenario: ${input.scenarioId}`, 'Evidence:', evidenceSection].join('\n');
  }
}

export type RetrievalMode = 'vector' | 'graph' | 'graphrag' | 'graphrag_gating';
