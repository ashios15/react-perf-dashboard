# @ashios15/react-perf-dashboard

> **Before/after React perf — but measured, not claimed.** Same 10,000-item dashboard built two ways: intentionally slow vs. fully optimized. The difference isn't a screenshot or a gif — it's a set of committed perf budgets in `perf-budgets.json` that CI fails on regression.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)
![Tests](https://img.shields.io/badge/tests-11%20passing-green)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## The angle

Perf demos are a dime a dozen. They pick a number, show a gif, never revisit. Three months later, someone accidentally re-introduces an inline object prop and the "optimized" version silently regresses — nobody notices until a user complains.

This repo treats perf the way we treat tests: **committed budgets, automated checks, non-zero exit on regression.**

```
 ┌──────────────┐   commits   ┌───────────────┐   JSON    ┌───────────────┐
 │ <Profiler>   │────────────▶│ budget.ts     │──────────▶│ perf-check CLI│
 │  harness     │             │ (pure, tested)│           │  exit 0 / 2   │
 └──────────────┘             └───────────────┘           └───────────────┘
        ▲                             ▲
        │ user scrolls,               │ perf-budgets.json
        │ types, etc.                 │ (committed)
```

## What makes it real

| Asset | Path | Why it matters |
|---|---|---|
| Pure budget-diff core | [`src/harness/budget.ts`](src/harness/budget.ts) | No React, no DOM. 11 unit tests. |
| React Profiler harness | [`src/harness/profiler.tsx`](src/harness/profiler.tsx) | `<MeasuredDashboard>` + commit store + `buildPerfResult()`. |
| In-app benchmark runner | [`src/BenchmarkView.tsx`](src/BenchmarkView.tsx) | Start / Capture / Download JSON. |
| Committed budgets | [`perf-budgets.json`](perf-budgets.json) | The source of truth — PRs edit it deliberately. |
| CLI | [`scripts/perf-check.ts`](scripts/perf-check.ts) | `npm run perf:check < .perf-results.json`, exit 2 on regression. |

## Install & run

```bash
git clone https://github.com/ashios15/react-perf-dashboard.git
cd react-perf-dashboard
npm install
npm run dev     # http://localhost:5173
```

Open the **📊 Benchmark** tab, pick a scenario + variant, hit **Start**, drive the dashboard (scroll, filter, click), then **Capture**. Download `.perf-results.json` and:

```bash
cat .perf-results.json | npm run perf:check
```

You'll get a per-metric table:

```
# Performance Budget Report

- Total checks: 12
- Failures: 0

| Scenario      | Variant    | Metric  | Measured  | Budget (×tol.) | Status  |
|---------------|------------|---------|-----------|----------------|---------|
| mount         | slow       | totalMs | 750.00ms  | 1080.00ms      | ✅ pass |
| mount         | optimized  | totalMs | 45.00ms   | 72.00ms        | ✅ pass |
| scroll-100    | optimized  | p95Ms   | 3.00ms    | 4.80ms         | ✅ pass |
…
```

If anything's over budget, exit code `2`.

## Budget file format

```json
{
  "tolerance": 0.2,
  "entries": [
    { "scenario": "mount", "variant": "optimized", "totalMs": 60, "maxMs": 40 },
    { "scenario": "scroll-100", "variant": "optimized", "totalMs": 30, "p95Ms": 4 }
  ]
}
```

- **`tolerance`** — fractional headroom for noise (default `0.2` = +20%). A measured value passes if `measured <= budget * (1 + tolerance)`.
- **`entries[].variant`** — `"slow"` or `"optimized"`.
- **`entries[].totalMs` / `p95Ms` / `maxMs`** — any combination. Only provided metrics are checked.

### Ratcheting budgets down after real wins

After you actually make something faster, re-run the benchmark and:

```bash
cat .perf-results.json | npm run perf:save
git add perf-budgets.json && git commit -m "perf: ratchet budgets after <change>"
```

This writes a new `perf-budgets.json` with the current measurements as the new ceiling. Future PRs can't silently drift back.

## CI

```yaml
# .github/workflows/perf.yml
- run: npm ci
- run: npm test                          # pure budget-diff tests
# Drive the UI with Playwright, save .perf-results.json, then:
- run: cat .perf-results.json | npm run perf:check
```

Exit `0` = no regression, PR is free to land. Exit `2` = someone needs to explain themselves.

## Patterns demonstrated

The two dashboards are commented line-by-line. Anti-pattern + fix pairs:

| Pattern | Slow | Optimized |
|---|---|---|
| List rendering | All 10k items | Virtualized (~13 visible) |
| Memoization | None | `React.memo` + `useMemo` + `useCallback` |
| Expensive compute | `fibonacci()` every render | Cached with `Map` + `useMemo` |
| Style objects | Inline (new ref each render) | CSS classes (stable refs) |
| Event handlers | Inline arrows | `useCallback` |
| Search filter | Blocks main thread | `useTransition` (concurrent) |
| Stray updates | Timer re-rendering | Removed |

## Tests

```bash
npm test
# ✓ tests/budget.test.ts  (11 tests)
```

Covers: tolerance math, missing samples, multi-metric entries, orphan samples, round-trip serialization, malformed-input rejection.

## Architecture

```
src/
├── harness/
│   ├── budget.ts           # pure diff core (tested, no React)
│   └── profiler.tsx        # <MeasuredDashboard> + commit store
├── BenchmarkView.tsx       # in-app runner UI
├── components/
│   ├── slow/SlowDashboard.tsx
│   └── optimized/OptimizedDashboard.tsx
├── utils/vitals.ts         # Core Web Vitals reporting
├── App.tsx
└── main.tsx

scripts/
└── perf-check.ts           # CLI (runs under tsx)

perf-budgets.json           # the committed source of truth
tests/
└── budget.test.ts          # 11 tests
```

## Why this shape?

- **Budgets live with the code.** Not in a dashboard, not in someone's head. A PR that regresses perf edits `perf-budgets.json` — visible in review, or it fails CI.
- **Pure diff core.** All the logic a CI needs is a ~200 line file with no React dep. Deterministic, unit-tested, portable.
- **Human-driven capture.** No fragile headless automation in the critical path — use real browsers, real interactions, real numbers. CI just verifies what the harness produces.
- **Ratchet, don't freeze.** Wins are locked in (`perf:save`). Regressions are blocked. Budgets only go down over time.

## License

MIT © [ashios15](https://github.com/ashios15)
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
