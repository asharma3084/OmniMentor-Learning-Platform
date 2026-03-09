import { describe, it, expect } from 'vitest';
import { SimpleContextBuilder, VectorRetriever, GraphRetriever, GraphRAGRetriever } from '../index';
import type { Evidence } from '@omnimentor/core';

describe('SimpleContextBuilder', () => {
  it('should produce deterministic output by sorting evidence by ID', async () => {
    const builder = new SimpleContextBuilder();
    const evidence: Evidence[] = [
      { id: 'ev-3', title: 'Third', body: 'Content 3', role: 'primary' },
      { id: 'ev-1', title: 'First', body: 'Content 1', role: 'corroborating' },
      { id: 'ev-2', title: 'Second', body: 'Content 2', role: 'primary' },
    ];

    const context = await builder.buildContext({
      scenarioId: 'test-scenario',
      evidence,
    });

    // Should be sorted by ID: ev-1, ev-2, ev-3
    expect(context).toContain('ev-1');
    expect(context).toContain('ev-2');
    expect(context).toContain('ev-3');
    expect(context.indexOf('ev-1')).toBeLessThan(context.indexOf('ev-2'));
    expect(context.indexOf('ev-2')).toBeLessThan(context.indexOf('ev-3'));
  });

  it('should include metadata in context when present', async () => {
    const builder = new SimpleContextBuilder();
    const evidence: Evidence[] = [
      {
        id: 'ev-1',
        title: 'Test',
        body: 'Content',
        role: 'primary',
        metadata: {
          retrievalScore: 0.95,
          source: 'vector',
        },
      },
    ];

    const context = await builder.buildContext({
      scenarioId: 'test-scenario',
      evidence,
    });

    expect(context).toContain('score: 0.95');
  });

  it('should handle empty evidence list', async () => {
    const builder = new SimpleContextBuilder();
    const context = await builder.buildContext({
      scenarioId: 'test-scenario',
      evidence: [],
    });

    expect(context).toContain('Scenario: test-scenario');
    expect(context).toContain('Evidence:');
  });
});

describe('VectorRetriever', () => {
  it('should return empty array in Phase 1 stub', async () => {
    const retriever = new VectorRetriever();
    const result = await retriever.retrieve({
      scenarioId: 'test-scenario',
      query: 'test query',
      topK: 5,
    });

    expect(result).toEqual([]);
  });
});

describe('GraphRetriever', () => {
  it('should return empty array in Phase 1 stub', async () => {
    const retriever = new GraphRetriever();
    const result = await retriever.retrieve({
      scenarioId: 'test-scenario',
      query: 'test query',
      topK: 5,
    });

    expect(result).toEqual([]);
  });
});

describe('GraphRAGRetriever', () => {
  it('should return empty array in Phase 1 stub', async () => {
    const retriever = new GraphRAGRetriever();
    const result = await retriever.retrieve({
      scenarioId: 'test-scenario',
      query: 'test query',
      topK: 5,
    });

    expect(result).toEqual([]);
  });
});
