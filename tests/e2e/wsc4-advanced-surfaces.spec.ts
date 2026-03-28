/**
 * WSC4 closeout browser verification for advanced review surfaces.
 */
import { expect, test, type Page } from '@playwright/test';

async function completePreSurveyIfNeeded(page: Page) {
  const surveyModal = page.getByTestId('survey-modal');
  if (!(await surveyModal.isVisible().catch(() => false))) {
    return;
  }

  for (const question of ['q1', 'q2', 'q3', 'q4', 'q5']) {
    await page.getByTestId(`survey-pre-${question}-3`).click();
  }

  await page.getByTestId('submit-survey').click();
  await expect(surveyModal).toBeHidden();
}

async function dismissWalkthroughIntoGuidedFlow(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('app-root')).toBeVisible();
  await completePreSurveyIfNeeded(page);
  await expect(page.getByTestId('walkthrough-modal')).toBeVisible();
  await page.getByTestId('walkthrough-start-practice').click();
  await expect(page.getByTestId('walkthrough-modal')).toBeHidden();
}

async function reachEvaluationWithExampleAnswer(page: Page) {
  await dismissWalkthroughIntoGuidedFlow(page);
  await page.getByTestId('continue-to-decision').click();
  await page.getByTestId('show-example-answer').click();
  await expect(page.getByTestId('example-answer-modal')).toBeVisible();
  await page.getByTestId('use-example-answer').click();
  await expect(page.getByTestId('example-answer-modal')).toBeHidden();
  await expect(page.getByTestId('submit-and-score')).toBeEnabled();
  await page.getByTestId('submit-and-score').click();
  await expect(page.getByTestId('evaluation-overall-score')).toBeVisible();
}

test.describe('WSC4 advanced review surfaces', () => {
  test('covers overview framing, graph review, evaluation comparison, and check-in export', async ({ page }) => {
    await reachEvaluationWithExampleAnswer(page);

    const firstScenarioLabel = await page.getByTestId('scenario-select').locator('option:checked').textContent();

    await page.getByTestId('advanced-mode-toggle').click();
    await expect(page.getByText('Advanced mode is for deeper graph, evidence, evaluation, and export review.')).toBeVisible();

    await page.getByTestId('advanced-tab-overview').click();
    await expect(page.getByText('Problem Framing')).toBeVisible();
    await expect(page.getByText('Review Framing')).toBeVisible();

    await page.getByTestId('advanced-tab-system-graph').click();
    await expect(page.getByText('Dependency Graph').first()).toBeVisible();
    await expect(page.getByText('Interactive node review').first()).toBeVisible();
    await expect(page.getByText('Path review')).toBeVisible();
    await expect(page.getByTestId('graph-filter-input')).toBeVisible();
    await page.getByTestId('graph-filter-input').fill('Catalog');
    await expect(page.getByText('Node detail')).toBeVisible();

    await page.getByTestId('advanced-tab-evaluation').click();
    await expect(page.getByText('Mode Comparison')).toBeVisible();
    await expect(page.getByText('Best current mode:')).toBeVisible();
    await expect(page.getByText('How to explain this result')).toBeVisible();

    await page.getByTestId('scenario-select').selectOption({ index: 1 });
    const secondScenarioLabel = await page.getByTestId('scenario-select').locator('option:checked').textContent();
    expect(secondScenarioLabel).not.toBe(firstScenarioLabel);

    await page.getByTestId('advanced-tab-check-in-export').click();
    await expect(page.getByRole('heading', { name: 'Check-in Export' })).toBeVisible();
    await expect(page.getByTestId('checkin-export-text')).toContainText('## Retrieval Comparison');
    await expect(page.getByTestId('checkin-export-text')).toContainText('## Next Review Focus');
    await expect(page.getByTestId('checkin-export-text')).toContainText(`Title: ${secondScenarioLabel?.replace(/^\[[^\]]+\]\s*/, '') ?? ''}`);
    await expect(page.getByTestId('checkin-export-text')).not.toContainText('Best current mode: Not available yet');
  });
});