/**
 * MemLab Configuration
 * Memory leak detection for supabase-schema visualizer
 *
 * Run tests:
 *   npm run memlab:import     - Test SQL import flow
 *   npm run memlab:interact   - Test node interactions
 *   npm run memlab:dialog     - Test dialog mount/unmount
 */

module.exports = {
  // Target URL (update if running on different port)
  targetUrl: 'http://localhost:3000',

  // Memory leak threshold
  leakThreshold: 1024 * 1024, // 1MB

  // Snapshot options
  snapshotOptions: {
    // Delay between snapshots
    delay: 1000,
  },
};
