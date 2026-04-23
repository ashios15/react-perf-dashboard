/**
 * Pure, environment-agnostic perf-budget logic.
 *
 * The workflow mirrors the a11y-baseline ratchet:
 *
 *   1. Run the Profiler harness and capture a {@link PerfResult}.
 *   2. Compare against committed budgets in `perf-budgets.json`.
 *   3. CI fails if any metric exceeds its budget (with tolerance).
 *
 * Metrics are per-variant (slow / optimized) and per-scenario (mount, scroll,
 * filter) so you can track improvements independently and avoid the
 * "optimized dashboard silently regressed" class of bug.
 */

export type Variant = "slow" | "optimized";

export interface PerfSample {
  /** Scenario name, e.g. "mount", "scroll-100", "filter-10k". */
  scenario: string;
  /** Which version of the dashboard produced this sample. */
  variant: Variant;
  /** Sum of React commit durations for the scenario in ms. */
  totalMs: number;
  /** Number of commits observed. */
  commits: number;
  /** p95 commit duration in ms (0 if `commits < 20`). */
  p95Ms: number;
  /** Maximum single-commit duration in ms. */
  maxMs: number;
}

export interface PerfResult {
  capturedAt: string;
  /** React major version used for the capture. */
  react: string;
  samples: PerfSample[];
}

export interface BudgetEntry {
  scenario: string;
  variant: Variant;
  /** Pass if measured <= budget. Units: ms. */
  totalMs?: number;
  p95Ms?: number;
  maxMs?: number;
}

export interface PerfBudgets {
  /** Allow measurements to exceed budgets by this fraction (0.1 = 10%). */
  tolerance: number;
  entries: BudgetEntry[];
}

export type CheckStatus = "pass" | "fail" | "missing-sample" | "missing-budget";

export interface CheckRow {
  scenario: string;
  variant: Variant;
  metric: "totalMs" | "p95Ms" | "maxMs";
  measured: number | null;
  budget: number | null;
  /** Effective budget after tolerance (budget * (1 + tolerance)). */
  effectiveBudget: number | null;
  status: CheckStatus;
}

export interface CheckReport {
  rows: CheckRow[];
  passed: boolean;
  failures: CheckRow[];
}

/**
 * Compare a fresh {@link PerfResult} against {@link PerfBudgets}. Deterministic.
 */
export function checkAgainstBudgets(
  budgets: PerfBudgets,
  result: PerfResult
): CheckReport {
  const rows: CheckRow[] = [];
  const sampleMap = new Map<string, PerfSample>();
  for (const s of result.samples) {
    sampleMap.set(key(s.scenario, s.variant), s);
  }

  for (const entry of budgets.entries) {
    const sample = sampleMap.get(key(entry.scenario, entry.variant));
    const metrics: Array<"totalMs" | "p95Ms" | "maxMs"> = [
      "totalMs",
      "p95Ms",
      "maxMs",
    ];
    for (const metric of metrics) {
      const budget = entry[metric];
      if (budget === undefined) continue;
      if (!sample) {
        rows.push({
          scenario: entry.scenario,
          variant: entry.variant,
          metric,
          measured: null,
          budget,
          effectiveBudget: applyTolerance(budget, budgets.tolerance),
          status: "missing-sample",
        });
        continue;
      }
      const measured = sample[metric];
      const effective = applyTolerance(budget, budgets.tolerance);
      rows.push({
        scenario: entry.scenario,
        variant: entry.variant,
        metric,
        measured,
        budget,
        effectiveBudget: effective,
        status: measured <= effective ? "pass" : "fail",
      });
    }
  }

  // Surface samples that have no matching budget (information, not failure).
  const coveredKeys = new Set(
    budgets.entries.map((e) => key(e.scenario, e.variant))
  );
  for (const [k, sample] of sampleMap) {
    if (coveredKeys.has(k)) continue;
    rows.push({
      scenario: sample.scenario,
      variant: sample.variant,
      metric: "totalMs",
      measured: sample.totalMs,
      budget: null,
      effectiveBudget: null,
      status: "missing-budget",
    });
  }

  const failures = rows.filter((r) => r.status === "fail" || r.status === "missing-sample");
  return { rows, failures, passed: failures.length === 0 };
}

/**
 * Generate a budget file from a fresh {@link PerfResult}. Useful after
 * legitimate wins: run, eyeball, save. Uses each metric's measured value as
 * the new budget.
 */
export function budgetFromResult(result: PerfResult, tolerance = 0.15): PerfBudgets {
  const entries: BudgetEntry[] = result.samples.map((s) => ({
    scenario: s.scenario,
    variant: s.variant,
    totalMs: round2(s.totalMs),
    p95Ms: round2(s.p95Ms),
    maxMs: round2(s.maxMs),
  }));
  return { tolerance, entries };
}

/**
 * Human-readable markdown report for CI logs or PR comments.
 */
export function formatReport(report: CheckReport): string {
  const lines: string[] = [];
  lines.push(`# Performance Budget Report`);
  lines.push("");
  lines.push(`- Total checks: **${report.rows.length}**`);
  lines.push(`- Failures: **${report.failures.length}**`);
  lines.push("");

  if (report.rows.length === 0) {
    lines.push("_No samples and no budgets — nothing to do._");
    return lines.join("\n");
  }

  lines.push("| Scenario | Variant | Metric | Measured | Budget (×tol.) | Status |");
  lines.push("|---|---|---|---|---|---|");
  for (const row of report.rows) {
    const measured = row.measured === null ? "—" : `${row.measured.toFixed(2)}ms`;
    const budget =
      row.effectiveBudget === null
        ? "—"
        : `${row.effectiveBudget.toFixed(2)}ms`;
    const status = statusIcon(row.status);
    lines.push(
      `| \`${row.scenario}\` | ${row.variant} | ${row.metric} | ${measured} | ${budget} | ${status} |`
    );
  }
  return lines.join("\n");
}

export function parseResult(raw: string): PerfResult | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.capturedAt !== "string") return null;
  if (typeof obj.react !== "string") return null;
  if (!Array.isArray(obj.samples)) return null;
  for (const s of obj.samples) {
    if (!s || typeof s !== "object") return null;
    const sm = s as Record<string, unknown>;
    if (typeof sm.scenario !== "string") return null;
    if (sm.variant !== "slow" && sm.variant !== "optimized") return null;
    if (typeof sm.totalMs !== "number") return null;
    if (typeof sm.commits !== "number") return null;
    if (typeof sm.p95Ms !== "number") return null;
    if (typeof sm.maxMs !== "number") return null;
  }
  return obj as unknown as PerfResult;
}

export function parseBudgets(raw: string): PerfBudgets | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.tolerance !== "number") return null;
  if (!Array.isArray(obj.entries)) return null;
  for (const e of obj.entries) {
    if (!e || typeof e !== "object") return null;
    const en = e as Record<string, unknown>;
    if (typeof en.scenario !== "string") return null;
    if (en.variant !== "slow" && en.variant !== "optimized") return null;
  }
  return obj as unknown as PerfBudgets;
}

export function serializeBudgets(b: PerfBudgets): string {
  return JSON.stringify(b, null, 2) + "\n";
}

// ---- internals --------------------------------------------------------------

function key(scenario: string, variant: Variant): string {
  return `${variant}::${scenario}`;
}

function applyTolerance(budget: number, tolerance: number): number {
  return round2(budget * (1 + Math.max(0, tolerance)));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function statusIcon(s: CheckStatus): string {
  switch (s) {
    case "pass":
      return "✅ pass";
    case "fail":
      return "❌ fail";
    case "missing-sample":
      return "⚠️ no sample";
    case "missing-budget":
      return "ℹ️ no budget";
  }
}
