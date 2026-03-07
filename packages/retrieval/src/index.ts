import type { ContextBuilder, Evidence, Retriever } from '@omnimentor/core';

export class VectorRetriever implements Retriever {
  async retrieve(input: {
    scenarioId: string;
    query: string;
    topK: number;
  }): Promise<Evidence[]> {
    // Phase 1 deterministic stub. Retrieval implementations land in Phase 2+.
    void input;
    return [];
  }
}

export class GraphRetriever implements Retriever {
  async retrieve(input: {
    scenarioId: string;
    query: string;
    topK: number;
  }): Promise<Evidence[]> {
    void input;
    return [];
  }
}

export class GraphRAGRetriever implements Retriever {
  async retrieve(input: {
    scenarioId: string;
    query: string;
    topK: number;
  }): Promise<Evidence[]> {
    void input;
    return [];
  }
}

export class SimpleContextBuilder implements ContextBuilder {
  async buildContext(input: {
    scenarioId: string;
    evidence: Evidence[];
  }): Promise<string> {
    const evidenceSection = input.evidence
      .map((item) => `- [${item.id}] ${item.title}: ${item.body}`)
      .join('\n');

    return [`Scenario: ${input.scenarioId}`, 'Evidence:', evidenceSection].join('\n');
  }
}

export type RetrievalMode = 'vector' | 'graph' | 'graphrag' | 'graphrag_gating';
