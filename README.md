# react-perf-dashboard

[![CI](https://github.com/ashios15/react-perf-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/ashios15/react-perf-dashboard/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A **before/after React performance demo** — the same 10,000-item dashboard built two ways: intentionally slow vs. fully optimized. See the difference side by side.

<!-- 🔗 [Live Demo →](https://react-perf-dashboard.vercel.app) -->
<!-- ![Demo](./docs/compare.gif) -->

## Optimizations Demonstrated

| Pattern | Before | After | Impact |
|---------|----------|---------|--------|
| List Rendering | Renders all 10,000 items | Virtualized — only ~13 visible | **99.9% fewer DOM nodes** |
| Memoization | None | `React.memo` + `useMemo` + `useCallback` | **Eliminates re-renders** |
| Computation | `fibonacci()` on every render | Cached with Map + useMemo | **O(1) vs O(2^n)** |
| Style Objects | Inline objects (new ref each render) | CSS classes | **Stable references** |
| Event Handlers | Arrow functions in JSX | `useCallback` | **Prevents child re-renders** |
| Search | Blocks UI thread | `useTransition` (concurrent) | **Non-blocking filtering** |
| Side Effects | Timer causing constant re-renders | Removed unnecessary updates | **Zero waste renders** |

## Quick Start

```bash
git clone https://github.com/ashios15/react-perf-dashboard.git
cd react-perf-dashboard
npm install
npm run dev    # http://localhost:5173
```

## Views

- **Compare** — Side-by-side with optimization breakdown table
- **Slow** — Try scrolling, searching, clicking. Feel the jank.
- **Optimized** — Same features, buttery smooth.

## Key Files

```
src/
├── components/
│   ├── slow/
│   │   └── SlowDashboard.tsx      # Every anti-pattern commented
│   └── optimized/
│       └── OptimizedDashboard.tsx  # Every optimization commented
├── utils/
│   └── vitals.ts                  # Core Web Vitals reporting
├── App.tsx                        # Side-by-side comparison UI
└── main.tsx
```

Every line of code is **heavily commented** explaining what's wrong (slow version) and what was fixed (optimized version).

## Measure It Yourself

```bash
# Build and run Lighthouse
npm run build
npm run preview
# Open Chrome DevTools → Lighthouse → Run audit
```

## License

MIT © [Ashish Joshi](https://github.com/ashios15)
