/**
 * Debug logging utility
 * Only logs in development mode or when NEXT_PUBLIC_DEBUG_FLOW is enabled
 */

const isDebugEnabled =
  typeof process !== 'undefined' &&
  process.env &&
  (process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_DEBUG_FLOW === 'true');

export const debugLog = {
  log: (...args: any[]) => {
    if (isDebugEnabled) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDebugEnabled) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args);
  },
};
