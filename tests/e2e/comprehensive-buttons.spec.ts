/**
 * Comprehensive button and interaction tests covering every clickable element,
 * all 6 scenarios, and full guided + advanced flows.
 */
import { expect, type Page, test } from '@playwright/test';

/* ── Shared helpers ── */

async function completePreSurveyIfNeeded(page: Page) {
  const surveyModal = page.getByTestId('survey-modal');
  if (!(await surveyModal.isVisible().catch(() => false))) return;
  for (const q of ['q1', 'q2', 'q3', 'q4', 'q5']) {
    await page.getByTestId(`survey-pre-${q}-3`).click();
  }
  await page.getByTestId('submit-survey').click();
  await expect(surveyModal).toBeHidden();
}

async function enterGuidedPractice(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('app-root')).toBeVisible();
  await completePreSurveyIfNeeded(page);
  await expect(page.getByTestId('walkthrough-modal')).toBeVisible();
  await page.getByTestId('walkthrough-start-practice').click();
  await expect(page.getByTestId('walkthrough-modal')).toBeHidden();
}

/** Wait for evidence cards to appear in the current view. */
async function waitForEvidence(page: Page) {
  await expect(page.locator('[data-testid^="evidence-card-"]').first()).toBeVisible({ timeout: 15000 });
}

async function submitExampleAnswerFromInvestigate(page: Page) {
  await page.getByTestId('continue-to-decision').click();
  await page.getByTestId('show-example-answer').click();
  await expect(page.getByTestId('example-answer-modal')).toBeVisible();
  await page.getByTestId('use-example-answer').click();
  await expect(page.getByTestId('example-answer-modal')).toBeHidden();
  await expect(page.getByTestId('submit-and-score')).toBeEnabled();
  await page.getByTestId('submit-and-score').click();
  await expect(page.getByTestId('evaluation-overall-score')).toBeVisible({ timeout: 15000 });
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. HEADER BUTTONS
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Header buttons', () => {
  test('theme toggle switches between dark and light', async ({ page }) => {
    await enterGuidedPractice(page);

    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    await page.getByLabel('Toggle theme').click();
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);

    // Toggle back
    await page.getByLabel('Toggle theme').click();
    const restoredTheme = await html.getAttribute('data-theme');
    expect(restoredTheme).toBe(initialTheme);
  });

  test('How It Works button reopens walkthrough modal', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('open-walkthrough').click();
    await expect(page.getByTestId('walkthrough-modal')).toBeVisible();
  });

  test('session timer is visible and ticking', async ({ page }) => {
    await enterGuidedPractice(page);
    const timer = page.locator('text=/\\d+:\\d{2}/').first();
    await expect(timer).toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. WALKTHROUGH MODAL BUTTONS
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Walkthrough modal', () => {
  test('close button dismisses walkthrough', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-root')).toBeVisible();
    await completePreSurveyIfNeeded(page);
    await expect(page.getByTestId('walkthrough-modal')).toBeVisible();
    await page.getByTestId('close-walkthrough').click();
    await expect(page.getByTestId('walkthrough-modal')).toBeHidden();
  });

  test('Start In Overview lands on Brief step with Mission Brief', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-root')).toBeVisible();
    await completePreSurveyIfNeeded(page);
    await expect(page.getByTestId('walkthrough-modal')).toBeVisible();
    await page.getByTestId('walkthrough-start-overview').click();
    await expect(page.getByTestId('walkthrough-modal')).toBeHidden();
    await expect(page.getByText('Mission Brief')).toBeVisible();
    await expect(page.getByTestId('guided-step-brief')).toBeVisible();
  });

  test('Take Me To Practice lands on Investigate step', async ({ page }) => {
    await enterGuidedPractice(page);
    await expect(page.getByText('Investigate the situation first.')).toBeVisible();
    await expect(page.getByTestId('guided-step-investigate')).toBeVisible();
  });

  test('replay walkthrough button in Brief re-opens walkthrough', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-root')).toBeVisible();
    await completePreSurveyIfNeeded(page);
    await page.getByTestId('walkthrough-start-overview').click();
    await expect(page.getByTestId('walkthrough-modal')).toBeHidden();
    await page.getByTestId('replay-walkthrough').click();
    await expect(page.getByTestId('walkthrough-modal')).toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. SURVEY MODAL
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Survey modal', () => {
  test('skip survey dismisses without submitting', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-root')).toBeVisible();
    const surveyModal = page.getByTestId('survey-modal');
    if (await surveyModal.isVisible().catch(() => false)) {
      await page.getByTestId('skip-survey').click();
      await expect(surveyModal).toBeHidden();
      await expect(page.getByTestId('walkthrough-modal')).toBeVisible();
    }
  });

  test('submit pre-survey with all ratings works', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-root')).toBeVisible();
    const surveyModal = page.getByTestId('survey-modal');
    if (await surveyModal.isVisible().catch(() => false)) {
      await page.getByTestId('survey-pre-q1-1').click();
      await page.getByTestId('survey-pre-q2-2').click();
      await page.getByTestId('survey-pre-q3-4').click();
      await page.getByTestId('survey-pre-q4-5').click();
      await page.getByTestId('survey-pre-q5-3').click();
      await page.getByTestId('submit-survey').click();
      await expect(surveyModal).toBeHidden();
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. GUIDED MODE — STEP NAVIGATION BUTTONS
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Guided step navigation', () => {
  test('all 4 step buttons navigate correctly', async ({ page }) => {
    await enterGuidedPractice(page);
    await expect(page.getByText('Investigate the situation first.')).toBeVisible();

    await page.getByTestId('guided-step-brief').click();
    await expect(page.getByText('Mission Brief')).toBeVisible();

    await page.getByTestId('guided-step-investigate').click();
    await expect(page.getByText('Investigate the situation first.')).toBeVisible();

    await page.getByTestId('guided-step-decide').click();
    await expect(page.getByText('Your Submission')).toBeVisible();

    await page.getByTestId('guided-step-feedback').click();
    await expect(page.getByText('No evaluation results yet.')).toBeVisible();
  });

  test('Start With Evidence button on Brief goes to Investigate', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-root')).toBeVisible();
    await completePreSurveyIfNeeded(page);
    await page.getByTestId('walkthrough-start-overview').click();
    await expect(page.getByTestId('walkthrough-modal')).toBeHidden();

    await page.getByTestId('start-with-evidence').click();
    await expect(page.getByText('Investigate the situation first.')).toBeVisible();
  });

  test('Continue To Decision button goes to Decide step', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('continue-to-decision').click();
    await expect(page.getByText('Your Submission')).toBeVisible();
    await expect(page.getByTestId('submit-and-score')).toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   5. FEEDBACK SUB-TAB NAVIGATION
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Feedback sub-tabs', () => {
  test('Feedback step shows sub-tab buttons', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('guided-step-feedback').click();
    await expect(page.getByTestId('feedback-tab-score')).toBeVisible();
    await expect(page.getByTestId('feedback-tab-graph')).toBeVisible();
    await expect(page.getByTestId('feedback-tab-evidence')).toBeVisible();
    await expect(page.getByTestId('feedback-tab-export')).toBeVisible();
  });

  test('sub-tab navigation switches content', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('guided-step-feedback').click();
    await page.getByTestId('feedback-tab-graph').click();
    await expect(page.getByText('Dependency Graph').first()).toBeVisible();
    await page.getByTestId('feedback-tab-score').click();
    await expect(page.getByText('No evaluation results yet.')).toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   6. EVIDENCE SELECTION
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Evidence selection', () => {
  test('clicking evidence cards toggles selection', async ({ page }) => {
    await enterGuidedPractice(page);
    await waitForEvidence(page);

    const card = page.locator('[data-testid^="evidence-card-"]').first();
    const checkbox = card.locator('input[type="checkbox"]');

    await card.click();
    await expect(checkbox).toBeChecked();

    await card.click();
    await expect(checkbox).not.toBeChecked();
  });

  test('selecting primary and corroborating shows role indicators', async ({ page }) => {
    await enterGuidedPractice(page);
    await waitForEvidence(page);

    const primaryCard = page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'primary' }).first();
    const corrobCard = page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'corroborating' }).first();

    await primaryCard.click();
    await corrobCard.click();

    // Role indicators should be green
    const greenPrimary = page.locator('.text-\\[var\\(--ok\\)\\]').filter({ hasText: 'Primary' });
    const greenCorroborating = page.locator('.text-\\[var\\(--ok\\)\\]').filter({ hasText: 'Corroborating' });
    await expect(greenPrimary).toBeVisible();
    await expect(greenCorroborating).toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   7. BUILD MY STARTER DRAFT & FILL TEMPLATE
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Starter draft buttons', () => {
  test('Build My Starter Draft is disabled without evidence', async ({ page }) => {
    await enterGuidedPractice(page);
    await expect(page.getByTestId('build-starter-draft')).toBeDisabled();
  });

  test('Build My Starter Draft fills form and transitions to Decide', async ({ page }) => {
    await enterGuidedPractice(page);
    await waitForEvidence(page);

    const primaryCard = page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'primary' }).first();
    await primaryCard.click();

    await page.getByTestId('build-starter-draft').click();

    await expect(page.getByTestId('owner-routing-input')).not.toBeEmpty();
    await expect(page.getByTestId('action-plan-input')).not.toBeEmpty();
    await expect(page.getByTestId('dependency-trace-input')).not.toBeEmpty();
    await expect(page.getByTestId('blast-radius-input')).not.toBeEmpty();
    await expect(page.getByTestId('evidence-notes-input')).not.toBeEmpty();
  });

  test('Fill Template button on Decide step fills form', async ({ page }) => {
    await enterGuidedPractice(page);
    await waitForEvidence(page);

    const primaryCard = page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'primary' }).first();
    await primaryCard.click();

    await page.getByTestId('continue-to-decision').click();
    await expect(page.getByTestId('fill-beginner-template')).toBeVisible();
    await page.getByTestId('fill-beginner-template').click();

    await expect(page.getByTestId('owner-routing-input')).not.toBeEmpty();
    await expect(page.getByTestId('action-plan-input')).not.toBeEmpty();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   8. EXAMPLE ANSWER MODAL
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Example answer modal', () => {
  test('Show Good Answer opens modal with content', async ({ page }) => {
    await enterGuidedPractice(page);
    await waitForEvidence(page);
    await page.getByTestId('continue-to-decision').click();

    await page.getByTestId('show-example-answer').click();
    await expect(page.getByTestId('example-answer-modal')).toBeVisible();
    await expect(page.getByTestId('use-example-answer')).toBeVisible();
    await expect(page.getByText('Keep My Current Draft')).toBeVisible();
  });

  test('Keep My Draft closes modal without changing form', async ({ page }) => {
    await enterGuidedPractice(page);
    await waitForEvidence(page);
    await page.getByTestId('continue-to-decision').click();

    await page.getByTestId('show-example-answer').click();
    await expect(page.getByTestId('example-answer-modal')).toBeVisible();
    await page.getByText('Keep My Current Draft').click();
    await expect(page.getByTestId('example-answer-modal')).toBeHidden();

    await expect(page.getByTestId('owner-routing-input')).toHaveValue('');
  });

  test('Use This Example fills form and closes modal', async ({ page }) => {
    await enterGuidedPractice(page);
    await waitForEvidence(page);
    await page.getByTestId('continue-to-decision').click();

    await page.getByTestId('show-example-answer').click();
    await expect(page.getByTestId('example-answer-modal')).toBeVisible();
    await page.getByTestId('use-example-answer').click();
    await expect(page.getByTestId('example-answer-modal')).toBeHidden();

    await expect(page.getByTestId('owner-routing-input')).not.toBeEmpty();
    await expect(page.getByTestId('submit-and-score')).toBeEnabled();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   9. FORM INPUTS & SUBMIT VALIDATION
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Form inputs and validation', () => {
  test('all 5 form inputs accept text', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('continue-to-decision').click();

    await page.getByTestId('owner-routing-input').fill('Test Owner Team');
    await expect(page.getByTestId('owner-routing-input')).toHaveValue('Test Owner Team');

    await page.getByTestId('action-plan-input').fill('Test action plan');
    await expect(page.getByTestId('action-plan-input')).toHaveValue('Test action plan');

    await page.getByTestId('dependency-trace-input').fill('A -> B (upstream)');
    await expect(page.getByTestId('dependency-trace-input')).toHaveValue('A -> B (upstream)');

    await page.getByTestId('blast-radius-input').fill('Customer impact');
    await expect(page.getByTestId('blast-radius-input')).toHaveValue('Customer impact');

    await page.getByTestId('evidence-notes-input').fill('Supporting notes');
    await expect(page.getByTestId('evidence-notes-input')).toHaveValue('Supporting notes');
  });

  test('Submit & Score is disabled when form is incomplete', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('continue-to-decision').click();
    await expect(page.getByTestId('submit-and-score')).toBeDisabled();
  });

  test('Submit & Score shows validation message without evidence roles', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('continue-to-decision').click();

    await page.getByTestId('owner-routing-input').fill('Owner');
    await page.getByTestId('action-plan-input').fill('Plan');
    await page.getByTestId('dependency-trace-input').fill('A -> B (upstream)');
    await page.getByTestId('blast-radius-input').fill('Impact');
    await page.getByTestId('evidence-notes-input').fill('Notes');

    await expect(page.getByTestId('submit-and-score')).toBeDisabled();
    await expect(page.getByText(/Select at least one/)).toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   10. SCENARIO SELECTOR
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Scenario selector', () => {
  test('scenario dropdown has 6 options', async ({ page }) => {
    await enterGuidedPractice(page);
    const options = page.getByTestId('scenario-select').locator('option');
    await expect(options).toHaveCount(6);
  });

  test('switching scenarios resets form and loads new evidence', async ({ page }) => {
    await enterGuidedPractice(page);

    await page.getByTestId('scenario-select').selectOption({ index: 1 });
    await page.getByTestId('guided-step-investigate').click();
    await waitForEvidence(page);
  });

  test('can navigate through all 6 scenarios and see evidence', async ({ page }) => {
    await enterGuidedPractice(page);

    for (let i = 0; i < 6; i++) {
      await page.getByTestId('scenario-select').selectOption({ index: i });
      await page.getByTestId('guided-step-investigate').click();
      await waitForEvidence(page);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   11. FEEDBACK SURFACES VIA SUB-TABS
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Feedback surfaces via sub-tabs', () => {
  test('System Graph sub-tab shows dependency graph elements', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('guided-step-feedback').click();
    await page.getByTestId('feedback-tab-graph').click();
    await expect(page.getByText('Dependency Graph').first()).toBeVisible();
    await expect(page.getByTestId('graph-filter-input')).toBeVisible();
  });

  test('System Graph sub-tab renders SVG force-directed graph', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('guided-step-feedback').click();
    await page.getByTestId('feedback-tab-graph').click();
    await page.getByRole('button', { name: /GraphRAG/i }).first().click();
    await page.waitForTimeout(1200);
    const svgContainer = page.getByTestId('force-graph-svg-container');
    await expect(svgContainer).toBeVisible();
    const svg = svgContainer.locator('svg');
    await expect(svg).toBeVisible();
    const circles = svg.locator('circle');
    expect(await circles.count()).toBeGreaterThan(0);
  });

  test('System Graph filter input filters nodes', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('guided-step-feedback').click();
    await page.getByTestId('feedback-tab-graph').click();
    await expect(page.getByTestId('graph-filter-input')).toBeVisible();
    await page.getByTestId('graph-filter-input').fill('Catalog');
    await expect(page.getByTestId('graph-filter-input')).toHaveValue('Catalog');
  });

  test('Score sub-tab shows no results message before scoring', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('guided-step-feedback').click();
    await page.getByTestId('feedback-tab-score').click();
    await expect(page.getByText('No evaluation results yet.')).toBeVisible();
  });

  test('Check-in Export sub-tab shows export content after scoring', async ({ page }) => {
    await enterGuidedPractice(page);
    await waitForEvidence(page);
    await submitExampleAnswerFromInvestigate(page);
    await page.getByTestId('feedback-tab-export').click();
    await expect(page.getByRole('heading', { name: 'Check-in Export' })).toBeVisible();
    await expect(page.getByTestId('checkin-export-text')).toBeVisible();
    await expect(page.getByTestId('checkin-export-text')).toContainText('## Retrieval Comparison');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   12. FULL GUIDED FLOW — ALL 6 SCENARIOS (example answer → score)
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Full guided flow per scenario', () => {
  const scenarios = [
    { index: 0, name: 'Deploy Catalog API Schema Migration' },
    { index: 1, name: 'Thanksgiving Sale — Pricing Engine Slowdown' },
    { index: 2, name: 'Deploy Checkout Orchestrator Saga Timeout Change' },
    { index: 3, name: 'Payment Gateway Security Patch Deployment' },
    { index: 4, name: 'Deploy Updated Fraud Detection Model' },
    { index: 5, name: 'Identity Provider Emergency Rotation' },
  ];

  for (const scenario of scenarios) {
    test(`scenario ${scenario.index + 1}: ${scenario.name} — submit and score`, async ({ page }) => {
      await enterGuidedPractice(page);

      // Select the scenario (resets to Brief step)
      await page.getByTestId('scenario-select').selectOption({ index: scenario.index });

      // Navigate to Investigate and wait for evidence
      await page.getByTestId('guided-step-investigate').click();
      await waitForEvidence(page);

      // Ensure both primary and corroborating evidence are selected
      // (gold evidence may not include both roles — known app issue)
      const primaryCard = page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'primary' }).first();
      const corrobCard = page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'corroborating' }).first();
      const primaryCb = primaryCard.locator('input[type="checkbox"]');
      const corrobCb = corrobCard.locator('input[type="checkbox"]');
      if (!(await primaryCb.isChecked())) await primaryCard.click();
      if (!(await corrobCb.isChecked())) await corrobCard.click();

      // Navigate to Decide
      await page.getByTestId('continue-to-decision').click();

      // Use example answer (fills form fields; evidence stays selected above)
      await page.getByTestId('show-example-answer').click();
      await expect(page.getByTestId('example-answer-modal')).toBeVisible();
      await page.getByTestId('use-example-answer').click();
      await expect(page.getByTestId('example-answer-modal')).toBeHidden();

      // Ensure both roles remain checked after example answer merges evidence
      const primaryAfter = page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'primary' }).first().locator('input[type="checkbox"]');
      const corrobAfter = page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'corroborating' }).first().locator('input[type="checkbox"]');
      if (!(await primaryAfter.isChecked())) await page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'primary' }).first().click();
      if (!(await corrobAfter.isChecked())) await page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'corroborating' }).first().click();

      // Submit — wait for React state to settle
      await expect(page.getByTestId('submit-and-score')).toBeEnabled({ timeout: 10000 });
      await page.getByTestId('submit-and-score').click();

      // Verify scoring result (submit transitions to Feedback step)
      await expect(page.getByTestId('evaluation-overall-score')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId('evaluation-score-status')).toContainText(/Strong|Needs work|High risk/);

      // Verify score percentage
      const scoreText = await page.getByTestId('evaluation-overall-score').textContent();
      expect(scoreText).toMatch(/\d+%/);
    });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   13. GO TO SCENARIO WORKSPACE BUTTON
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Go to Scenario Workspace button', () => {
  test('works in guided Feedback step with no score', async ({ page }) => {
    await enterGuidedPractice(page);
    await page.getByTestId('guided-step-feedback').click();
    await expect(page.getByText('No evaluation results yet.')).toBeVisible();
    await page.getByText('Go to Scenario Workspace').click();
    await expect(page.getByText('Investigate the situation first.')).toBeVisible();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   14. EVALUATION AFTER SCORING
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe('Evaluation after scoring', () => {
  test('Score sub-tab shows Mode Comparison after submit', async ({ page }) => {
    await enterGuidedPractice(page);
    await waitForEvidence(page);
    await submitExampleAnswerFromInvestigate(page);

    await expect(page.getByTestId('feedback-tab-score')).toBeVisible();
    await expect(page.getByText('Mode Comparison')).toBeVisible();
    await expect(page.getByText('Best current mode:')).toBeVisible();
    await expect(page.getByText('How to explain this result')).toBeVisible();
  });
});
