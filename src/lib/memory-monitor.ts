/**
 * Memory monitoring utilities for debugging memory leaks
 */

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceMemory {
  memory?: MemoryInfo;
}

declare global {
  interface Performance extends PerformanceMemory {}
}

export class MemoryMonitor {
  private measurements: number[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: number = 0;

  /**
   * Start monitoring memory usage
   */
  start(intervalMs: number = 1000): void {
    if (typeof window === 'undefined' || !performance.memory) {
      console.warn('Memory monitoring not available in this browser');
      return;
    }

    this.startTime = Date.now();
    this.measurements = [];

    this.intervalId = setInterval(() => {
      const { memory } = performance;
      if (memory) {
        this.measurements.push(memory.usedJSHeapSize);

        const elapsed = Date.now() - this.startTime;
        const currentMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);

        console.log(
          `[Memory] ${elapsed}ms: ${currentMB}MB / ${limitMB}MB (${this.getGrowthRate().toFixed(2)}MB/sec)`
        );
      }
    }, intervalMs);

    console.log('[Memory Monitor] Started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.logSummary();
    console.log('[Memory Monitor] Stopped');
  }

  /**
   * Get current memory usage in MB
   */
  getCurrentUsage(): number {
    if (typeof window === 'undefined' || !performance.memory) {
      return 0;
    }
    return performance.memory.usedJSHeapSize / 1024 / 1024;
  }

  /**
   * Get memory growth rate in MB/sec
   */
  getGrowthRate(): number {
    if (this.measurements.length < 2) return 0;

    const first = this.measurements[0];
    const last = this.measurements[this.measurements.length - 1];
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;

    if (elapsedSeconds === 0) return 0;

    return ((last - first) / 1024 / 1024) / elapsedSeconds;
  }

  /**
   * Log memory usage summary
   */
  logSummary(): void {
    if (this.measurements.length === 0) {
      console.log('[Memory] No measurements taken');
      return;
    }

    const first = this.measurements[0];
    const last = this.measurements[this.measurements.length - 1];
    const peak = Math.max(...this.measurements);
    const growth = last - first;
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;

    console.log(`
[Memory Summary]
  Duration: ${elapsedSeconds.toFixed(1)}s
  Initial: ${(first / 1024 / 1024).toFixed(2)}MB
  Final: ${(last / 1024 / 1024).toFixed(2)}MB
  Peak: ${(peak / 1024 / 1024).toFixed(2)}MB
  Growth: ${(growth / 1024 / 1024).toFixed(2)}MB
  Rate: ${this.getGrowthRate().toFixed(2)}MB/sec
    `);
  }

  /**
   * Force garbage collection (if available)
   */
  static forceGC(): void {
    if (typeof window !== 'undefined' && (window as any).gc) {
      console.log('[Memory] Forcing garbage collection...');
      (window as any).gc();
    } else {
      console.warn('[Memory] GC not available. Run Chrome with --expose-gc flag');
    }
  }

  /**
   * Get localStorage size
   */
  static getLocalStorageSize(): number {
    if (typeof window === 'undefined') return 0;

    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  /**
   * Log localStorage usage
   */
  static logLocalStorageUsage(): void {
    if (typeof window === 'undefined') return;

    const items: Record<string, number> = {};
    let total = 0;

    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = localStorage[key].length;
        items[key] = size;
        total += size + key.length;
      }
    }

    console.log(`[localStorage] Total: ${(total / 1024 / 1024).toFixed(2)}MB`);

    // Sort by size
    const sorted = Object.entries(items)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10

    sorted.forEach(([key, size]) => {
      console.log(`  ${key}: ${(size / 1024).toFixed(2)}KB`);
    });
  }
}

// Global instance for convenience
let globalMonitor: MemoryMonitor | null = null;

export const memoryMonitor = {
  start: () => {
    if (!globalMonitor) {
      globalMonitor = new MemoryMonitor();
    }
    globalMonitor.start();
  },
  stop: () => {
    if (globalMonitor) {
      globalMonitor.stop();
      globalMonitor = null;
    }
  },
  getCurrentUsage: () => {
    if (!globalMonitor) {
      globalMonitor = new MemoryMonitor();
    }
    return globalMonitor.getCurrentUsage();
  },
  forceGC: MemoryMonitor.forceGC,
  logLocalStorage: MemoryMonitor.logLocalStorageUsage,
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).memoryMonitor = memoryMonitor;
}
