#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:3001';
const REPORT_DIR = path.join(path.dirname(__dirname), 'reports', 'week1');

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
  console.log('🔥 OmniMentor Smoke Test — Phase 1\n');

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

    const scenario = scenarios[0];
    console.log(`   📋 Using scenario: "${scenario.title}"\n`);

    // 3. Fetch evidence
    console.log('3️⃣ Fetching evidence...');
    const evidence = await requestJson<Array<{ id: string }>>(
      `${API_URL}/evidence?scenarioId=${encodeURIComponent(scenario.id)}`
    );
    console.log(`   ✅ Found ${evidence.length} artifact(s)\n`);

    // 4. Create submission
    console.log('4️⃣ Creating submission...');
    const submissionRes = await requestJson<{ submissionId: string }>(`${API_URL}/submissions`, {
      method: 'POST',
      body: JSON.stringify({
        scenarioId: scenario.id,
        ownerRouting: 'Platform Team',
        dependencyTrace: [
          { from: 'Auth Service', to: 'API Gateway', type: 'downstream' },
          { from: 'Auth Service', to: 'Web App', type: 'downstream' },
          { from: 'Database Service', to: 'Auth Service', type: 'upstream' },
        ],
        actionPlan: 'Coordinate with all dependent teams',
        blastRadius: [
          'Coordinate with API Gateway team',
          'Notify downstream app teams',
          'Plan rollback procedure',
        ],
        evidenceNotes:
          'Authentication Service is owned by Platform Team. Dependencies: User Service, API Gateway. ' +
          'Authentication Service deployments require API Gateway downtime awareness. ' +
          'Auth Service downstream: Web App, Mobile App. Upstream: Database Service.',
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

    // 6. Write report
    console.log('6️⃣ Writing report...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(REPORT_DIR, `smoke-${timestamp}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      scenario: {
        id: scenario.id,
        title: scenario.title,
      },
      submission: {
        id: submissionId,
      },
      score: result,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`   ✅ Report written: ${reportPath}\n`);

    // Summary
    console.log('✨ Smoke test PASSED!');
    console.log(`   Gate: ${result.gatingPass ? 'PASS' : 'FAIL'}`);
    console.log(`   Score: ${result.overallScore}`);
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
