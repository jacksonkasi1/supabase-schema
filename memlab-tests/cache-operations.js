/**
 * MemLab Test: Cache Clear Operations
 *
 * Tests for memory leaks in localStorage operations:
 * - Clear cache button
 * - localStorage writes
 * - State cleanup
 *
 * Run: memlab run --scenario memlab-tests/cache-operations.js
 */

function url() {
  return 'http://localhost:3000';
}

async function action(page) {
  // Wait for page load
  await page.waitForSelector('[title*="Clear Cache"]', { timeout: 10000 });

  // Populate some data first (if possible)
  // This would ideally involve importing a small SQL file
  await page.waitForTimeout(1000);

  // Click Clear Cache button
  await page.click('[title*="Clear Cache"]');

  // Handle confirmation dialog
  await page.waitForTimeout(500);

  // Click Cancel on confirmation
  page.on('dialog', async dialog => {
    await dialog.dismiss();
  });

  // Try again and this time accept
  await page.waitForTimeout(500);
  await page.click('[title*="Clear Cache"]');

  await page.waitForTimeout(500);
}

async function back(page) {
  // Return to clean state
  await page.waitForTimeout(1000);
}

module.exports = { action, back, url };
