#!/usr/bin/env node

const API_URL = process.env.API_URL || 'http://localhost:9992';

type EvalRunResponse = {
  runId: string;
  reportPath: string;
  csvPath: string;
  resultCount: number;
};

async function runEval(): Promise<void> {
  console.log('📈 OmniMentor Evaluation Runner (Phase 1 scaffold)');

  const response = await fetch(`${API_URL}/ablation/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      modes: ['vector', 'graph', 'graphrag', 'graphrag_gating'],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Evaluation failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as EvalRunResponse;
  console.log(`✅ runId: ${result.runId}`);
  console.log(`✅ report: ${result.reportPath}`);
  console.log(`✅ csv: ${result.csvPath}`);
  console.log(`✅ rows: ${result.resultCount}`);
}

runEval().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`❌ Evaluation run failed: ${message}`);
  process.exit(1);
});
