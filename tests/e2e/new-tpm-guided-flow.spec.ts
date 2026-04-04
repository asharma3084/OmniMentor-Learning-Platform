/**
 * Guided new-TPM browser checks covering walkthrough, evidence gating, and feedback flow.
 */
import { expect, type Page, test } from '@playwright/test';

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

async function enterGuidedPractice(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('app-root')).toBeVisible();
  await completePreSurveyIfNeeded(page);
  await expect(page.getByTestId('walkthrough-modal')).toBeVisible();
  await page.getByTestId('walkthrough-start-practice').click();
  await expect(page.getByTestId('walkthrough-modal')).toBeHidden();
}

test.describe('New TPM guided GUI automation', () => {
  test('shows walkthrough and lands in guided investigate mode', async ({ page }) => {
    await enterGuidedPractice(page);

    await expect(page.getByText('Investigate the situation first.')).toBeVisible();
    await expect(page.getByTestId('guided-step-investigate')).toBeVisible();
    await expect(page.getByTestId('build-starter-draft')).toBeDisabled();
    await expect(page.getByText('Pick at least one primary artifact and one corroborating artifact before you submit.')).toBeVisible();
  });

  test('enforces primary and corroborating evidence for beginner draft path', async ({ page }) => {
    await enterGuidedPractice(page);

    const primaryEvidenceCard = page.locator('[data-testid^="evidence-card-"]').filter({ hasText: 'primary' }).first();
    await expect(primaryEvidenceCard).toBeVisible();
    await primaryEvidenceCard.click();

    await page.getByTestId('build-starter-draft').click();

    // Build My Starter Draft auto-transitions to Decide step
    await expect(page.getByTestId('submit-and-score')).toBeDisabled();
    await expect(page.getByText('Select at least one primary artifact and one corroborating artifact.')).toBeVisible();
  });

  test('submits a guided example answer and reaches evaluation feedback', async ({ page }) => {
    await enterGuidedPractice(page);

    await page.getByTestId('continue-to-decision').click();
    await expect(page.getByTestId('show-example-answer')).toBeVisible();

    await page.getByTestId('show-example-answer').click();
    await expect(page.getByTestId('example-answer-modal')).toBeVisible();
    await page.getByTestId('use-example-answer').click();

    await expect(page.getByTestId('example-answer-modal')).toBeHidden();
    await expect(page.getByTestId('submit-and-score')).toBeEnabled();

    await page.getByTestId('submit-and-score').click();

    await expect(page.getByTestId('evaluation-overall-score')).toBeVisible();
    await expect(page.getByTestId('evaluation-score-status')).toContainText(/Strong|Needs work|High risk/);
    await expect(page.getByText('Overall Score')).toBeVisible();
  });
});