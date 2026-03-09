import type { ContextBuilder, Evidence, Retriever } from '@omnimentor/core';

/**
 * Phase 1 deterministic vector retriever stub.
 * Simulates vector similarity search with deterministic scoring.
 */
export class VectorRetriever implements Retriever {
  async retrieve(input: {
    scenarioId: string;
    query: string;
    topK: number;
  }): Promise<Evidence[]> {
    // Deterministic stub: returns empty array but could be extended
    // to use vector embeddings from Qdrant in future phases
    void input;
    return [];
  }
}

/**
 * Phase 1 deterministic graph retriever stub.
 * Simulates graph traversal with deterministic node ranking.
 */
export class GraphRetriever implements Retriever {
  async retrieve(input: {
    scenarioId: string;
    query: string;
    topK: number;
  }): Promise<Evidence[]> {
    // Deterministic stub: returns empty array but could be extended
    // to use Neo4j graph queries in future phases
    void input;
    return [];
  }
}

/**
 * Phase 1 deterministic Graph-RAG retriever stub.
 * Simulates hybrid graph + vector retrieval with evidence tracing.
 */
export class GraphRAGRetriever implements Retriever {
  async retrieve(input: {
    scenarioId: string;
    query: string;
    topK: number;
  }): Promise<Evidence[]> {
    // Deterministic stub: returns empty array but could be extended
    // to combine graph structure and vector embeddings in future phases
    void input;
    return [];
  }
}

/**
 * Simple context builder that formats evidence for LLM consumption.
 * Produces deterministic output by sorting evidence by ID.
 */
export class SimpleContextBuilder implements ContextBuilder {
  async buildContext(input: {
    scenarioId: string;
    evidence: Evidence[];
  }): Promise<string> {
    // Sort evidence by ID for deterministic output
    const sortedEvidence = [...input.evidence].sort((a, b) => a.id.localeCompare(b.id));
    
    const evidenceSection = sortedEvidence
      .map((item) => {
        const metadata = item.metadata 
          ? ` [score: ${item.metadata.retrievalScore ?? 'N/A'}]`
          : '';
        return `- [${item.id}] ${item.title}: ${item.body}${metadata}`;
      })
      .join('\n');

    return [`Scenario: ${input.scenarioId}`, 'Evidence:', evidenceSection].join('\n');
  }
}

export type RetrievalMode = 'vector' | 'graph' | 'graphrag' | 'graphrag_gating';
