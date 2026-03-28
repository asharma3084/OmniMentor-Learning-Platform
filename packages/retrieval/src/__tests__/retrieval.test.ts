import { describe, it, expect } from 'vitest';
import {
  SimpleContextBuilder,
  VectorRetriever,
  GraphRetriever,
  GraphRAGRetriever,
  InMemoryCorpusStore,
  InMemoryGraphStore,
} from '../index';
import type { Evidence } from '@omnimentor/core';

function makeCorpus(evidence: Evidence[]): InMemoryCorpusStore {
  return new InMemoryCorpusStore(new Map([['test-scenario', evidence]]));
}

function makeGraphStore(): InMemoryGraphStore {
  return new InMemoryGraphStore(
    new Map([
      [
        'test-scenario',
        [
          {
            id: 'svc-auth-service',
            name: 'Auth Service',
            upstream: ['svc-database-service'],
            downstream: ['svc-api-gateway', 'svc-web-app', 'svc-mobile-app'],
          },
          {
            id: 'svc-api-gateway',
            name: 'API Gateway',
            upstream: ['svc-auth-service'],
          },
          {
            id: 'svc-database-service',
            name: 'Database Service',
            downstream: ['svc-auth-service'],
          },
        ],
      ],
    ])
  );
}

const sampleEvidence: Evidence[] = [
  { id: 'ev-1', title: 'Service Ownership', body: 'Auth Service is owned by Platform Team. Dependencies include API Gateway.', role: 'primary' },
  { id: 'ev-2', title: 'Deployment Runbook', body: 'Deploy requires downstream notification and rollback plan.', role: 'primary' },
  { id: 'ev-3', title: 'Dependency Graph', body: 'Auth Service downstream: Web App, Mobile App. Upstream: Database Service.', role: 'corroborating' },
];

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
    expect(context).toContain('source: vector');
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
  it('should return ranked evidence based on keyword overlap', async () => {
    const retriever = new VectorRetriever(makeCorpus(sampleEvidence));
    const result = await retriever.retrieve({
      scenarioId: 'test-scenario',
      query: 'Auth Service ownership Platform Team',
      topK: 5,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].metadata?.source).toBe('vector');
    expect(result[0].metadata?.retrievalScore).toBeGreaterThan(0);
  });

  it('should return empty array for unknown scenario', async () => {
    const retriever = new VectorRetriever(makeCorpus(sampleEvidence));
    const result = await retriever.retrieve({
      scenarioId: 'nonexistent',
      query: 'test query',
      topK: 5,
    });

    expect(result).toEqual([]);
  });

  it('should respect topK limit', async () => {
    const retriever = new VectorRetriever(makeCorpus(sampleEvidence));
    const result = await retriever.retrieve({
      scenarioId: 'test-scenario',
      query: 'service deployment dependency',
      topK: 2,
    });

    expect(result.length).toBeLessThanOrEqual(2);
  });
});

describe('GraphRetriever', () => {
  it('should boost evidence mentioning dependency terms', async () => {
    const retriever = new GraphRetriever(makeCorpus(sampleEvidence));
    const result = await retriever.retrieve({
      scenarioId: 'test-scenario',
      query: 'downstream upstream dependency',
      topK: 5,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].metadata?.source).toBe('graph');
  });

  it('should return empty array for unknown scenario', async () => {
    const retriever = new GraphRetriever(makeCorpus(sampleEvidence));
    const result = await retriever.retrieve({
      scenarioId: 'nonexistent',
      query: 'test',
      topK: 5,
    });

    expect(result).toEqual([]);
  });

  it('should use connected services from the graph topology when available', async () => {
    const retriever = new GraphRetriever(makeCorpus(sampleEvidence), makeGraphStore());
    const result = await retriever.retrieve({
      scenarioId: 'test-scenario',
      query: 'Auth Service deployment risk',
      topK: 5,
    });

    expect(result[0].id).toBe('ev-3');
    expect(result[0].metadata?.graphSeedServices).toContain('Auth Service');
    expect(result[0].metadata?.graphConnectedServices).toContain('API Gateway');
    expect(result[0].metadata?.graphMatchedServices).toContain('Database Service');
    expect(result[0].metadata?.graphTraversalEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'Database Service', to: 'Auth Service', type: 'upstream' }),
        expect.objectContaining({ from: 'Auth Service', to: 'API Gateway', type: 'downstream' }),
      ])
    );
  });
});

describe('GraphRAGRetriever', () => {
  it('should boost evidence mentioning provenance and dependency terms', async () => {
    const retriever = new GraphRAGRetriever(makeCorpus(sampleEvidence));
    const result = await retriever.retrieve({
      scenarioId: 'test-scenario',
      query: 'owner dependency blast radius',
      topK: 5,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].metadata?.source).toBe('graphrag');
  });

  it('should return empty array for unknown scenario', async () => {
    const retriever = new GraphRAGRetriever(makeCorpus(sampleEvidence));
    const result = await retriever.retrieve({
      scenarioId: 'nonexistent',
      query: 'test',
      topK: 5,
    });

    expect(result).toEqual([]);
  });

  it('should carry graph metadata when topology is available', async () => {
    const retriever = new GraphRAGRetriever(makeCorpus(sampleEvidence), makeGraphStore());
    const result = await retriever.retrieve({
      scenarioId: 'test-scenario',
      query: 'Auth Service owner and dependency blast radius',
      topK: 5,
    });

    expect(result[0].metadata?.source).toBe('graphrag');
    expect(result[0].metadata?.graphConnectedServices).toContain('Auth Service');
    expect(result[0].metadata?.graphTraversalEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'Auth Service', to: 'API Gateway', type: 'downstream' }),
      ])
    );
  });
});
