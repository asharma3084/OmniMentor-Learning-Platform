/**
 * Capture IM2 screenshots showing guided flow, SVG graph, evaluation forensics, and provenance badges.
 */
import { expect, test, type Page } from '@playwright/test';

const OUT = '/tmp/im2-screenshots';

async function completePreSurveyIfNeeded(page: Page) {
  const surveyModal = page.getByTestId('survey-modal');
  if (!(await surveyModal.isVisible().catch(() => false))) return;
  for (const q of ['q1', 'q2', 'q3', 'q4', 'q5']) {
    await page.getByTestId(`survey-pre-${q}-3`).click();
  }
  await page.getByTestId('submit-survey').click();
  await expect(surveyModal).toBeHidden();
}

test('capture IM2 demo screenshots', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('app-root')).toBeVisible();
  await completePreSurveyIfNeeded(page);

  // Reset walkthrough so we can capture it
  await page.evaluate(() => {
    localStorage.removeItem('omnimentor.walkthrough.dismissed.v1');
  });
  await page.reload();
  await expect(page.getByTestId('app-root')).toBeVisible();
  await completePreSurveyIfNeeded(page);

  // 01 - Walkthrough modal
  const walkthroughModal = page.getByTestId('walkthrough-modal');
  if (await walkthroughModal.isVisible().catch(() => false)) {
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/01-walkthrough.png`, fullPage: false });
    await page.getByTestId('walkthrough-start-practice').click();
    await expect(walkthroughModal).toBeHidden();
  } else {
    // No walkthrough, just screenshot the landing state
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/01-landing.png`, fullPage: false });
  }

  // 02 - Investigate step (shows evidence with provenance badges)
  await expect(page.getByTestId('guided-step-investigate')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/02-investigate-provenance.png`, fullPage: false });

  // Select evidence
  const evidenceCards = page.locator('[data-testid^="evidence-card-"]');
  const count = await evidenceCards.count();
  for (let i = 0; i < Math.min(count, 3); i++) {
    await evidenceCards.nth(i).click();
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/03-evidence-selected.png`, fullPage: false });

  // 04 - Show example answer
  await page.getByTestId('continue-to-decision').click();
  await page.waitForTimeout(300);
  await page.getByTestId('show-example-answer').click();
  await expect(page.getByTestId('example-answer-modal')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-example-answer.png`, fullPage: false });

  // Apply example and capture filled form
  await page.getByTestId('use-example-answer').click();
  await expect(page.getByTestId('example-answer-modal')).toBeHidden();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/05-decision-filled.png`, fullPage: false });

  // Submit and score
  await expect(page.getByTestId('submit-and-score')).toBeEnabled();
  await page.getByTestId('submit-and-score').click();
  await expect(page.getByTestId('evaluation-overall-score')).toBeVisible();
  await page.waitForTimeout(800);

  // 06 - Feedback with score ring and metrics
  await page.screenshot({ path: `${OUT}/06-feedback-score.png`, fullPage: false });

  // Scroll down to see mode comparison and forensics
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/07-evaluation-forensics.png`, fullPage: false });

  // Scroll further for diagnostics
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/08-diagnostics.png`, fullPage: false });

  // Switch to Advanced mode
  await page.getByTestId('advanced-mode-toggle').click();
  await page.waitForTimeout(300);

  // 09 - System Graph with SVG visualization
  await page.getByTestId('advanced-tab-system-graph').click();
  // Switch to GraphRAG mode for richer graph data
  await page.getByRole('button', { name: /GraphRAG/i }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/09-svg-graph.png`, fullPage: false });

  // Scroll to see node review
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/10-graph-nodes.png`, fullPage: false });

  // 11 - Evidence tab in advanced mode
  await page.getByTestId('advanced-tab-evidence').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/11-evidence-advanced.png`, fullPage: false });

  // 12 - Check-in Export
  await page.getByTestId('advanced-tab-check-in-export').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/12-checkin-export.png`, fullPage: false });
});
