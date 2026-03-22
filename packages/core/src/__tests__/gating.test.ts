/**
 * Regression coverage for evidence-gating and unsupported-claim behavior.
 */
import { describe, it, expect } from 'vitest';
import {
  parseClaimUnits,
  checkClaimSupport,
  gateSubmission,
} from '../gating/index';
import { Evidence, DEFAULT_GATING_POLICY } from '../types';

describe('Evidence Gating', () => {
  const mockEvidenceMap = new Map<string, Evidence>([
    [
      'evidence-1',
      {
        id: 'evidence-1',
        title: 'Service Ownership',
        body: 'Platform Team owns the Authentication Service.',
        role: 'primary',
      },
    ],
    [
      'evidence-2',
      {
        id: 'evidence-2',
        title: 'Dependencies',
        body: 'Auth Service depends on Database and API Gateway.',
        role: 'primary',
      },
    ],
  ]);

  it('should parse claim units from text', () => {
    const text = 'Platform Team owns the service. API Gateway is a dependency.';
    const claims = parseClaimUnits(text);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].text).toContain('Platform Team');
  });

  it('should detect supported claims', () => {
    const claim = {
      id: 'claim-1',
      text: 'Platform Team owns the service',
      startIdx: 0,
      endIdx: 30,
    };

    const result = checkClaimSupport(
      claim,
      ['evidence-1'],
      mockEvidenceMap,
      [],
      DEFAULT_GATING_POLICY
    );

    expect(result.supported).toBe(true);
    expect(result.citedEvidenceIds.length).toBeGreaterThan(0);
  });

  it('should detect unsupported claims', () => {
    const claim = {
      id: 'claim-2',
      text: 'Unknown team X owns the service',
      startIdx: 0,
      endIdx: 30,
    };

    const result = checkClaimSupport(
      claim,
      [],
      mockEvidenceMap,
      [],
      DEFAULT_GATING_POLICY
    );

    expect(result.supported).toBe(false);
  });

  it('should gate full submission', () => {
    const submissionText =
      'Platform Team owns the service. Auth Service depends on Database and API Gateway.';
    const selectedEvidenceIds = ['evidence-1', 'evidence-2'];

    const { gatingPass, gatingResults, criticalErrors } = gateSubmission(
      submissionText,
      selectedEvidenceIds,
      mockEvidenceMap,
      [],
      DEFAULT_GATING_POLICY
    );

    // With adequate evidence, should pass
    expect(gatingPass).toBe(true);
    expect(gatingResults.length).toBeGreaterThan(0);
    expect(criticalErrors.length).toBe(0);
  });

  it('should not clear unsupported claims just because gold evidence ids are selected', () => {
    const submissionText = 'Redis cache saturation requires paging the SRE incident commander.';

    const { gatingPass, gatingResults, criticalErrors } = gateSubmission(
      submissionText,
      ['evidence-1'],
      mockEvidenceMap,
      ['evidence-1'],
      DEFAULT_GATING_POLICY
    );

    expect(gatingPass).toBe(false);
    expect(gatingResults).toHaveLength(1);
    expect(gatingResults[0].supported).toBe(false);
    expect(criticalErrors).toContain('1 claim(s) not sufficiently supported by evidence');
  });
});
