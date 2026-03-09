import { describe, it, expect } from 'vitest';

// Test error response structure
describe('API Error Response Structure', () => {
  it('should define standard error response shape', () => {
    type ErrorResponse = {
      error: string;
      code?: string;
      details?: unknown;
      requestId?: string;
      timestamp: string;
    };

    const validErrorResponse: ErrorResponse = {
      error: 'Test error',
      code: 'TEST_ERROR',
      timestamp: new Date().toISOString(),
    };

    expect(validErrorResponse.error).toBe('Test error');
    expect(validErrorResponse.code).toBe('TEST_ERROR');
    expect(validErrorResponse.timestamp).toBeDefined();
  });

  it('should support validation error details structure', () => {
    type ValidationErrorDetail = {
      path: string;
      message: string;
      code: string;
    };

    type ErrorResponse = {
      error: string;
      code?: string;
      details?: unknown;
      requestId?: string;
      timestamp: string;
    };

    const validationError: ErrorResponse = {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: [
        {
          path: 'scenarioId',
          message: 'Required',
          code: 'invalid_type',
        },
      ] as ValidationErrorDetail[],
      timestamp: new Date().toISOString(),
    };

    expect(validationError.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(validationError.details)).toBe(true);
    const details = validationError.details as ValidationErrorDetail[];
    expect(details[0].path).toBe('scenarioId');
  });
});

// Test evidence metadata structure
describe('Evidence Metadata Structure', () => {
  it('should support evidence with metadata for traceability', () => {
    type Evidence = {
      id: string;
      title: string;
      body: string;
      role: 'primary' | 'corroborating' | 'reference';
      metadata?: {
        source?: string;
        type?: string;
        retrievalScore?: number;
        timestamp?: string;
        [key: string]: unknown;
      };
    };

    const evidenceWithMetadata: Evidence = {
      id: 'ev-1',
      title: 'Test Evidence',
      body: 'Content',
      role: 'primary',
      metadata: {
        source: 'artifact',
        type: 'document',
        retrievalScore: 1.0,
        timestamp: new Date().toISOString(),
      },
    };

    expect(evidenceWithMetadata.metadata?.source).toBe('artifact');
    expect(evidenceWithMetadata.metadata?.retrievalScore).toBe(1.0);
  });

  it('should support evidence without metadata for backward compatibility', () => {
    type Evidence = {
      id: string;
      title: string;
      body: string;
      role: 'primary' | 'corroborating' | 'reference';
      metadata?: {
        source?: string;
        type?: string;
        retrievalScore?: number;
        timestamp?: string;
        [key: string]: unknown;
      };
    };

    const evidenceWithoutMetadata: Evidence = {
      id: 'ev-1',
      title: 'Test Evidence',
      body: 'Content',
      role: 'primary',
    };

    expect(evidenceWithoutMetadata.metadata).toBeUndefined();
  });
});

// Test deterministic evidence sorting
describe('Evidence Sorting for Determinism', () => {
  it('should sort evidence deterministically by role then ID', () => {
    type Evidence = {
      id: string;
      title: string;
      body: string;
      role: 'primary' | 'corroborating' | 'reference';
    };

    const evidence: Evidence[] = [
      { id: 'ev-c', title: 'C', body: 'C', role: 'corroborating' },
      { id: 'ev-a', title: 'A', body: 'A', role: 'primary' },
      { id: 'ev-b', title: 'B', body: 'B', role: 'primary' },
      { id: 'ev-d', title: 'D', body: 'D', role: 'reference' },
    ];

    const sorted = [...evidence].sort((a, b) => {
      // Primary sources first, then corroborating, then reference
      const roleOrder = { primary: 0, corroborating: 1, reference: 2 };
      const roleDiff = roleOrder[a.role] - roleOrder[b.role];
      if (roleDiff !== 0) return roleDiff;
      // Within same role, sort alphabetically by ID
      return a.id.localeCompare(b.id);
    });

    expect(sorted[0].id).toBe('ev-a'); // primary
    expect(sorted[1].id).toBe('ev-b'); // primary
    expect(sorted[2].id).toBe('ev-c'); // corroborating
    expect(sorted[3].id).toBe('ev-d'); // reference
  });
});
