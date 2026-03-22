/**
 * Capture guided-flow screenshots for milestone packaging and reviewer-visible artifacts.
 */
import { expect, test, type Page } from '@playwright/test';

const OUT = '/tmp/im1-screenshots';

async function completePreSurveyIfNeeded(page: Page) {
  const surveyModal = page.getByTestId('survey-modal');
  if (!(await surveyModal.isVisible().catch(() => false))) return;
  for (const q of ['q1', 'q2', 'q3', 'q4', 'q5']) {
    await page.getByTestId(`survey-pre-${q}-3`).click();
  }
  await page.getByTestId('submit-survey').click();
  await expect(surveyModal).toBeHidden();
}

test('capture guided flow screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await expect(page.getByTestId('app-root')).toBeVisible();
  await completePreSurveyIfNeeded(page);

  await expect(page.getByTestId('walkthrough-modal')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/01-walkthrough.png`, fullPage: false });

  await page.getByTestId('walkthrough-start-practice').click();
  await expect(page.getByTestId('walkthrough-modal')).toBeHidden();

  await expect(page.getByTestId('guided-step-investigate')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/02-investigate.png`, fullPage: false });

  await page.getByTestId('continue-to-decision').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/03-decide.png`, fullPage: false });

  await expect(page.getByTestId('show-example-answer')).toBeVisible();
  await page.getByTestId('show-example-answer').click();
  await expect(page.getByTestId('example-answer-modal')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-example-answer.png`, fullPage: false });

  await page.getByTestId('use-example-answer').click();
  await expect(page.getByTestId('example-answer-modal')).toBeHidden();

  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/05-decide-filled.png`, fullPage: false });

  await expect(page.getByTestId('submit-and-score')).toBeEnabled();
  await page.getByTestId('submit-and-score').click();
  await expect(page.getByTestId('evaluation-overall-score')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/06-feedback.png`, fullPage: false });
});