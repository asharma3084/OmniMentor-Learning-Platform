/**
 * Browser verification for the advanced surfaces.
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

test.describe('feedback surfaces', () => {
  test('covers graph inspection, evaluation comparison, and check-in export via Feedback sub-tabs', async ({ page }) => {
    await reachEvaluationWithExampleAnswer(page);

    const firstScenarioLabel = await page.getByTestId('scenario-select').locator('option:checked').textContent();

    // Score sub-tab is active after submit — verify evaluation content
    await expect(page.getByTestId('feedback-tab-score')).toBeVisible();
    await expect(page.getByText('Mode Comparison')).toBeVisible();
    await expect(page.getByText('Best current mode:')).toBeVisible();
    await expect(page.getByText('How to explain this result')).toBeVisible();

    // System Graph sub-tab
    await page.getByTestId('feedback-tab-graph').click();
    await expect(page.getByText('Dependency Graph').first()).toBeVisible();
    await expect(page.getByText('Interactive node review').first()).toBeVisible();
    await expect(page.getByText('Path review')).toBeVisible();
    await expect(page.getByTestId('graph-filter-input')).toBeVisible();
    await page.getByTestId('graph-filter-input').fill('Catalog');
    await expect(page.getByText('Node detail')).toBeVisible();

    // Switch scenario
    await page.getByTestId('scenario-select').selectOption({ index: 1 });
    const secondScenarioLabel = await page.getByTestId('scenario-select').locator('option:checked').textContent();
    expect(secondScenarioLabel).not.toBe(firstScenarioLabel);

    // Check-in Export sub-tab
    await page.getByTestId('guided-step-feedback').click();
    await page.getByTestId('feedback-tab-export').click();
    await expect(page.getByRole('heading', { name: 'Check-in Export' })).toBeVisible();
    await expect(page.getByTestId('checkin-export-text')).toContainText('## Retrieval Comparison');
    await expect(page.getByTestId('checkin-export-text')).toContainText('## Next Review Focus');
    await expect(page.getByTestId('checkin-export-text')).toContainText(`Title: ${secondScenarioLabel?.replace(/^\[[^\]]+\]\s*/, '') ?? ''}`);
    await expect(page.getByTestId('checkin-export-text')).not.toContainText('Best current mode: Not available yet');
  });
});