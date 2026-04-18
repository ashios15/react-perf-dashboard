import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

/**
 * Report Core Web Vitals to console or analytics.
 * Call this in your app entry point.
 */
export function reportWebVitals() {
  onCLS(console.log);
  onFCP(console.log);
  onLCP(console.log);
  onTTFB(console.log);
  onINP(console.log);
}
