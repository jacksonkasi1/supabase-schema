/**
 * localStorage Cleanup and Validation
 * Runs on app initialization to prevent memory bloat from corrupted cache
 */

const MAX_SAFE_ITEM_SIZE = 1024 * 1024; // 1MB per item
const MAX_TOTAL_SIZE = 3 * 1024 * 1024; // 3MB total
const CORRUPTION_THRESHOLD = 500 * 1024; // 500KB for a single table list

export function validateAndCleanLocalStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    console.log('[Storage Validator] Checking localStorage health...');

    let totalSize = 0;
    const itemsToRemove: string[] = [];
    const itemSizes: Record<string, number> = {};

    // Analyze all items
    for (let key in localStorage) {
      if (!localStorage.hasOwnProperty(key)) continue;

      const value = localStorage[key];
      const size = value.length + key.length;
      itemSizes[key] = size;
      totalSize += size;

      // Flag oversized items
      if (size > MAX_SAFE_ITEM_SIZE) {
        console.warn(`[Storage Validator] Oversized item: ${key} (${(size / 1024).toFixed(2)}KB)`);
        itemsToRemove.push(key);
      }

      // Validate JSON items
      if (key.startsWith('table') || key.startsWith('edge') || key.startsWith('visible') || key.startsWith('collapsed')) {
        try {
          JSON.parse(value);
        } catch (e) {
          console.error(`[Storage Validator] Corrupted JSON: ${key}`);
          itemsToRemove.push(key);
        }
      }
    }

    // Log storage usage
    console.log(`[Storage Validator] Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log('[Storage Validator] Breakdown:');
    Object.entries(itemSizes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([key, size]) => {
        console.log(`  ${key}: ${(size / 1024).toFixed(2)}KB`);
      });

    // Check for corruption indicators
    const tableList = localStorage.getItem('table-list');
    if (tableList && tableList.length > CORRUPTION_THRESHOLD) {
      // Validate table data structure
      try {
        const tables = JSON.parse(tableList);
        const tableCount = Object.keys(tables).length;
        const avgTableSize = tableList.length / tableCount;

        if (avgTableSize > 50000) {
          // Each table averages > 50KB - likely corrupted
          console.error('[Storage Validator] Table data appears corrupted (excessive size per table)');
          itemsToRemove.push('table-list');
        }
      } catch (e) {
        console.error('[Storage Validator] Cannot parse table-list');
        itemsToRemove.push('table-list');
      }
    }

    // Clear corrupted/oversized items
    if (itemsToRemove.length > 0) {
      console.warn(`[Storage Validator] Removing ${itemsToRemove.length} corrupted items`);
      itemsToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`  Removed: ${key}`);
      });

      // Recalculate total after removal
      totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
    }

    // If still over limit, clear all schema data
    if (totalSize > MAX_TOTAL_SIZE) {
      console.error(`[Storage Validator] Storage still oversized (${(totalSize / 1024 / 1024).toFixed(2)}MB). Clearing all schema data...`);
      localStorage.removeItem('table-list');
      localStorage.removeItem('edge-relationships');
      localStorage.removeItem('visible-schemas');
      localStorage.removeItem('collapsed-schemas');

      totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      console.log(`[Storage Validator] After cleanup: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    }

    // Final report
    if (itemsToRemove.length === 0 && totalSize < MAX_TOTAL_SIZE) {
      console.log('[Storage Validator] ✅ Storage is healthy');
    } else {
      console.log('[Storage Validator] ✅ Storage cleaned up');
    }

  } catch (error) {
    console.error('[Storage Validator] Validation failed, clearing all:', error);
    // Nuclear option: clear everything
    try {
      localStorage.clear();
      console.log('[Storage Validator] Emergency clear completed');
    } catch (e) {
      console.error('[Storage Validator] Cannot clear localStorage:', e);
    }
  }
}

/**
 * Quick check if localStorage needs cleanup
 */
export function needsCleanup(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    return totalSize > MAX_TOTAL_SIZE;
  } catch {
    return true;
  }
}

/**
 * Get total localStorage size
 */
export function getStorageSize(): number {
  if (typeof window === 'undefined') return 0;

  let total = 0;
  try {
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
  } catch {
    return 0;
  }
  return total;
}
