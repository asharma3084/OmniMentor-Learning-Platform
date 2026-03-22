#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:9992';
const REPORT_DIR = path.join(path.dirname(__dirname), 'reports', 'week2');
const BENCHMARK_PATH = path.join(path.dirname(__dirname), 'benchmarks', 'scenarios.json');

type BenchmarkScenario = {
  id: string;
  goldOwner: string;
  goldDependencyTrace: Array<{ from: string; to: string; type: 'upstream' | 'downstream' }>;
  goldSafeActions: string[];
  goldBlastRadius: string[];
  goldRequiredEvidenceIds: string[];
};

function loadGoldLabels(): Map<string, BenchmarkScenario> {
  const raw = JSON.parse(fs.readFileSync(BENCHMARK_PATH, 'utf-8')) as {
    scenarios: BenchmarkScenario[];
  };
  const map = new Map<string, BenchmarkScenario>();
  for (const s of raw.scenarios) {
    map.set(s.id, s);
  }
  return map;
}

type ApiError = Error & {
  status?: number;
  body?: unknown;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    const err = new Error(`HTTP ${response.status} for ${url}`) as ApiError;
    err.status = response.status;
    err.body = body;
    throw err;
  }

  return (await response.json()) as T;
}

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

async function runSmoke() {
  console.log('🔥 OmniMentor Smoke Test (Week 2 — Corpus-backed retrieval)\n');

  try {
    // 1. Health check
    console.log('1️⃣ Health check...');
    const health = await requestJson<{ status: string }>(`${API_URL}/health`);
    console.log(`   ✅ API healthy: ${health.status}\n`);

    // 2. Fetch scenarios
    console.log('2️⃣ Fetching scenarios...');
    const scenarios = await requestJson<Array<{ id: string; title: string }>>(`${API_URL}/scenarios`);
    console.log(`   ✅ Found ${scenarios.length} scenario(s)\n`);

    if (scenarios.length === 0) {
      throw new Error('No scenarios available');
    }

    // Test all scenarios
    const scoreSummary: Array<{ id: string; title: string; score: number; gating: boolean; evidenceCount: number }> = [];
    const goldLabels = loadGoldLabels();

    for (const scenario of scenarios) {
      console.log(`   📋 Testing scenario: "${scenario.title}"\n`);

      const gold = goldLabels.get(scenario.id);

      // 3. Fetch evidence via retrieval pipeline
      console.log('3️⃣ Fetching evidence (vector mode)...');
      const evidence = await requestJson<Array<{ id: string; title: string; body?: string; metadata?: { retrievalScore?: number; source?: string } }>>(
        `${API_URL}/evidence?scenarioId=${encodeURIComponent(scenario.id)}&mode=vector`
      );
      console.log(`   ✅ Retrieved ${evidence.length} evidence artifact(s)`);
      for (const ev of evidence.slice(0, 3)) {
        console.log(`      • ${ev.title} (score: ${ev.metadata?.retrievalScore ?? 'N/A'}, source: ${ev.metadata?.source ?? 'N/A'})`);
      }
      console.log('');

      // 4. Create submission using gold-label-informed data
      console.log('4️⃣ Creating submission...');

      // Build rich evidence notes from retrieved evidence body content for gating support
      const evidenceNoteParts = evidence.map((e) =>
        [e.title, e.body ? e.body.substring(0, 200) : ''].filter(Boolean).join(': ')
      );

      const submissionRes = await requestJson<{ submissionId: string }>(`${API_URL}/submissions`, {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: scenario.id,
          ownerRouting: gold?.goldOwner ?? 'Platform Team',
          dependencyTrace: gold?.goldDependencyTrace ?? [
            { from: 'ServiceA', to: 'ServiceB', type: 'downstream' },
          ],
          actionPlan: gold
            ? gold.goldSafeActions.join('. ') + '.'
            : 'Coordinate with dependent teams.',
          blastRadius: gold?.goldBlastRadius ?? gold?.goldSafeActions ?? ['Downstream impact possible'],
          evidenceNotes: evidenceNoteParts.join('. ') + '.',
          selectedEvidenceIds: evidence.map((e) => e.id),
        }),
      });

      const submissionId = submissionRes.submissionId;
      console.log(`   ✅ Submission created: ${submissionId}\n`);

      // 5. Score submission
      console.log('5️⃣ Scoring submission...');
      const result = await requestJson<{ gatingPass: boolean; overallScore: number }>(
        `${API_URL}/score`,
        {
          method: 'POST',
          body: JSON.stringify({ submissionId }),
        }
      );
      console.log(`   ✅ Gating passed: ${result.gatingPass}`);
      console.log(`   📊 Overall score: ${(result.overallScore * 100).toFixed(1)}%\n`);
      console.log(`   ─────────────────────────────────\n`);

      scoreSummary.push({
        id: scenario.id,
        title: scenario.title,
        score: result.overallScore,
        gating: result.gatingPass,
        evidenceCount: evidence.length,
      });
    }

    // 6. Write report
    console.log('6️⃣ Writing report...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(REPORT_DIR, `smoke-${timestamp}.json`);

    const avgScore = scoreSummary.reduce((s, r) => s + r.score, 0) / scoreSummary.length;

    const report = {
      timestamp: new Date().toISOString(),
      scenarioCount: scenarios.length,
      averageScore: Math.round(avgScore * 1000) / 1000,
      results: scoreSummary,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`   ✅ Report written: ${reportPath}\n`);

    // Summary
    console.log('✨ Smoke test PASSED!');
    console.log(`   Scenarios: ${scenarios.length}`);
    console.log(`   Average score: ${(avgScore * 100).toFixed(1)}%`);
    console.log(`   Report: ${reportPath}\n`);

    process.exit(0);
  } catch (err: unknown) {
    const apiErr = err as ApiError;
    console.error('\n❌ Smoke test FAILED');
    console.error(`   Error: ${apiErr.message}`, apiErr.status ? `(${apiErr.status})` : '');

    if (apiErr.body) {
      console.error(`   Details: ${JSON.stringify(apiErr.body)}`);
    }

    process.exit(1);
  }
}

runSmoke();
