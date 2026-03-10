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

/**
 * Corpus-backed retriever that loads evidence from a pre-indexed map
 * and ranks by deterministic keyword overlap with the query.
 */
export interface CorpusStore {
  getEvidenceForScenario(scenarioId: string): Evidence[];
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

    // Graph heuristic: boost evidence that mentions dependency keywords
    const depTerms = ['upstream', 'downstream', 'dependency', 'depends', 'impact', 'blast radius', 'outage'];
    const scored = candidates.map((ev) => {
      const base = keywordScore(input.query, `${ev.title} ${ev.body}`);
      const textLower = `${ev.title} ${ev.body}`.toLowerCase();
      const depBoost = depTerms.filter((t) => textLower.includes(t)).length * 0.05;
      const roleBoost = ev.role === 'primary' ? 0.1 : 0;
      return { evidence: ev, score: Math.min(1, base + depBoost + roleBoost) };
    });

    scored.sort((a, b) => b.score - a.score || a.evidence.id.localeCompare(b.evidence.id));

    return scored.slice(0, input.topK).map((s) => ({
      ...s.evidence,
      metadata: {
        ...s.evidence.metadata,
        retrievalScore: Math.round(s.score * 1000) / 1000,
        source: 'graph',
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

    const depTerms = ['upstream', 'downstream', 'dependency', 'depends', 'impact', 'blast radius', 'outage'];
    const provTerms = ['owner', 'owned', 'on-call', 'runbook', 'pir', 'incident', 'review', 'resolution'];

    const scored = candidates.map((ev) => {
      const base = keywordScore(input.query, `${ev.title} ${ev.body}`);
      const textLower = `${ev.title} ${ev.body}`.toLowerCase();
      const depBoost = depTerms.filter((t) => textLower.includes(t)).length * 0.04;
      const provBoost = provTerms.filter((t) => textLower.includes(t)).length * 0.03;
      const roleBoost = ev.role === 'primary' ? 0.08 : 0;
      return {
        evidence: ev,
        score: Math.min(1, base + depBoost + provBoost + roleBoost),
      };
    });

    scored.sort((a, b) => b.score - a.score || a.evidence.id.localeCompare(b.evidence.id));

    return scored.slice(0, input.topK).map((s) => ({
      ...s.evidence,
      metadata: {
        ...s.evidence.metadata,
        retrievalScore: Math.round(s.score * 1000) / 1000,
        source: 'graphrag',
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
