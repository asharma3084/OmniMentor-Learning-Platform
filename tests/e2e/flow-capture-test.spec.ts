/**
 * Capture screenshots and a reusable walkthrough video for the main flow.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ARTIFACT_DIR = path.resolve(__dirname, '../../personal/flow-capture-artifacts/screenshots');

test.use({ video: 'on' });

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

async function capture(page: Page, filename: string) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, filename), fullPage: false });
}

test('capture flow assets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('app-root')).toBeVisible();
  await completePreSurveyIfNeeded(page);

  await expect(page.getByTestId('walkthrough-modal')).toBeVisible();
  await capture(page, '01-walkthrough.png');

  await page.getByTestId('walkthrough-start-practice').click();
  await expect(page.getByTestId('walkthrough-modal')).toBeHidden();
  await expect(page.getByTestId('guided-step-investigate')).toBeVisible();
  await capture(page, '02-investigate.png');

  await page.getByTestId('continue-to-decision').click();
  await expect(page.getByTestId('show-example-answer')).toBeVisible();
  await page.getByTestId('show-example-answer').click();
  await expect(page.getByTestId('example-answer-modal')).toBeVisible();
  await capture(page, '03-example-answer.png');

  await page.getByTestId('use-example-answer').click();
  await expect(page.getByTestId('example-answer-modal')).toBeHidden();
  await expect(page.getByTestId('submit-and-score')).toBeEnabled();
  await capture(page, '04-decision-filled.png');

  await page.getByTestId('submit-and-score').click();
  await expect(page.getByTestId('evaluation-overall-score')).toBeVisible();
  await capture(page, '05-feedback.png');

  // Feedback sub-tabs — System Graph
  await page.getByTestId('feedback-tab-graph').click();
  await expect(page.getByTestId('graph-filter-input')).toBeVisible();
  await page.getByTestId('graph-filter-input').fill('Catalog');
  await expect(page.getByText('Node detail')).toBeVisible();
  await capture(page, '07-system-graph.png');

  // Feedback sub-tabs — Score (evaluation details)
  await page.getByTestId('feedback-tab-score').click();
  await expect(page.getByText('Overall Score')).toBeVisible();
  await expect(page.getByText('What the app is checking')).toBeVisible();
  await capture(page, '08-evaluation-compare.png');

  // Feedback sub-tabs — Check-in Export
  await page.getByTestId('feedback-tab-export').click();
  await expect(page.getByRole('heading', { name: 'Check-in Export' })).toBeVisible();
  await expect(page.getByTestId('checkin-export-text')).toContainText('## Retrieval Comparison');
  await capture(page, '09-checkin-export.png');
});