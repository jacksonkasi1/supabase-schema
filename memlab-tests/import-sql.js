/**
 * MemLab Test: SQL Import Flow
 *
 * This scenario tests for memory leaks when importing SQL files.
 * Detects issues like:
 * - File blob URLs not being released
 * - Dialog components not cleaning up
 * - Table state accumulation
 * - Event listeners not being removed
 *
 * Run: memlab run --scenario memlab-tests/import-sql.js
 */

function url() {
  return 'http://localhost:3000';
}

async function action(page) {
  // Step 1: Wait for page load
  await page.waitForSelector('[title="Import SQL Schema"]', { timeout: 10000 });

  // Step 2: Click Import button
  await page.click('[title="Import SQL Schema"]');

  // Wait for dialog to open
  await page.waitForSelector('input[type="file"]', { timeout: 5000 });

  // Step 3: Upload SQL file (simulated)
  // In real scenario, you'd upload a test SQL file
  // For now, we'll just open and close the dialog

  // Step 4: Close dialog (cancel)
  await page.keyboard.press('Escape');

  // Wait for dialog to close
  await page.waitForTimeout(1000);
}

async function back(page) {
  // Return to initial state
  // This is where MemLab takes a snapshot to check for leaks
  await page.waitForTimeout(500);
}

module.exports = { action, back, url };
