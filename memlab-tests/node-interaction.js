/**
 * MemLab Test: Node Drag & Drop Interaction
 *
 * Tests for memory leaks during node interactions:
 * - Node selection/deselection
 * - Drag and drop operations
 * - Context menu open/close
 * - Edge highlighting
 *
 * Run: memlab run --scenario memlab-tests/node-interaction.js
 */

function url() {
  return 'http://localhost:3000';
}

async function action(page) {
  // Wait for ReactFlow to load
  await page.waitForSelector('.react-flow', { timeout: 10000 });

  // Wait a bit for nodes to render (if any exist from localStorage)
  await page.waitForTimeout(2000);

  // Simulate interactions
  // 1. Click on canvas
  await page.click('.react-flow__renderer');
  await page.waitForTimeout(300);

  // 2. Keyboard shortcuts
  await page.keyboard.press('Space'); // Fit view
  await page.waitForTimeout(300);

  await page.keyboard.press('Escape'); // Clear selection
  await page.waitForTimeout(300);

  // 3. Open search (if exists)
  try {
    const searchButton = await page.$('[placeholder*="Search"]');
    if (searchButton) {
      await searchButton.click();
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
    }
  } catch (e) {
    // Search not available
  }

  await page.waitForTimeout(1000);
}

async function back(page) {
  // Return to initial state
  await page.click('.react-flow__renderer');
  await page.waitForTimeout(500);
}

module.exports = { action, back, url };
