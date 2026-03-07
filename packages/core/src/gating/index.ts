import {
  ClaimUnit,
  GatingPolicy,
  GatingResult,
  Evidence,
  DEFAULT_GATING_POLICY,
} from '../types';

/**
 * Parse submission text into claim units (sentence-level claims)
 * Phase 1: Simple sentence splitting; Phase 2+ can be more sophisticated
 */
export function parseClaimUnits(text: string): ClaimUnit[] {
  // Split by sentence-ending punctuation and keep trailing text if punctuation is omitted.
  const sentences = text.match(/[^.!?]+[.!?]?/g)?.filter((s) => s.trim().length > 0) || [];
  return sentences.map((sentence, idx) => {
    const trimmed = sentence.trim();
    return {
      id: `claim-${idx}`,
      text: trimmed,
      startIdx: text.indexOf(trimmed),
      endIdx: text.indexOf(trimmed) + trimmed.length,
    };
  });
}

/**
 * Check if a single claim is supported by evidence
 * Phase 1: Basic string matching; Phase 2+ can use embeddings/semantic similarity
 */
export function checkClaimSupport(
  claim: ClaimUnit,
  selectedEvidenceIds: string[],
  evidenceMap: Map<string, Evidence>,
  goldEvidenceIds: string[] = [],
  policy: GatingPolicy = DEFAULT_GATING_POLICY
): GatingResult {
  const citedIds: string[] = [];
  let supportsInPrimary = false;
  let supportsInCorroborating = false;

  // Check if claim text appears in selected evidence
  for (const evidenceId of selectedEvidenceIds) {
    const evidence = evidenceMap.get(evidenceId);
    if (!evidence) continue;

    const combinedText = `${evidence.title} ${evidence.body}`.toLowerCase();
    const claimKeywords = extractKeywords(claim.text);

    // Simple matching: check if any significant keyword appears in evidence
    const matchScore = claimKeywords.filter((kw) =>
      combinedText.includes(kw.toLowerCase())
    ).length / Math.max(claimKeywords.length, 1);

    if (matchScore > 0.5) {
      citedIds.push(evidenceId);
      if (evidence.role === 'primary') {
        supportsInPrimary = true;
      } else if (evidence.role === 'corroborating') {
        supportsInCorroborating = true;
      }
    }
  }

  // Gating logic: check support requirement
  const isSupportedByPolicy =
    (policy.requirePrimaryEvidence && supportsInPrimary) ||
    (policy.allowCorroboratingOnly && (supportsInPrimary || supportsInCorroborating)) ||
    (!policy.requirePrimaryEvidence &&(supportsInPrimary || supportsInCorroborating));

  // Check against gold standard
  const matchesGold = goldEvidenceIds.some((goldId) => citedIds.includes(goldId));

  const supported = isSupportedByPolicy || matchesGold;

  return {
    claimId: claim.id,
    supported,
    citedEvidenceIds: citedIds,
    matchesGold,
    reason: supported
      ? `Claim supported by ${supportsInPrimary ? 'primary' : 'corroborating'} evidence`
      : 'Claim not adequately supported by selected evidence',
  };
}

/**
 * Extract significant keywords from text
 * Phase 1: Split on spaces, remove common words
 */
function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'and',
    'or', 'but', 'on', 'at', 'by', 'for', 'with', 'from', 'as', 'if', 'that',
  ]);

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !commonWords.has(word));
}

/**
 * Gate entire submission against evidence
 */
export function gateSubmission(
  submissionText: string,
  selectedEvidenceIds: string[],
  evidenceMap: Map<string, Evidence>,
  goldEvidenceIds: string[] = [],
  policy: GatingPolicy = DEFAULT_GATING_POLICY
): {
  gatingPass: boolean;
  gatingResults: GatingResult[];
  criticalErrors: string[];
} {
  const claims = parseClaimUnits(submissionText);
  const gatingResults = claims.map((claim) =>
    checkClaimSupport(claim, selectedEvidenceIds, evidenceMap, goldEvidenceIds, policy)
  );

  const unsupportedClaims = gatingResults.filter((r) => !r.supported);
  const criticalErrors: string[] = [];

  if (policy.criticalErrorOnUnsupported && unsupportedClaims.length > 0) {
    criticalErrors.push(
      `${unsupportedClaims.length} claim(s) not sufficiently supported by evidence`
    );
  }

  const gatingPass = unsupportedClaims.length === 0 || !policy.criticalErrorOnUnsupported;

  return {
    gatingPass,
    gatingResults,
    criticalErrors,
  };
}
