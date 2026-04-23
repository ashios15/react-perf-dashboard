import { describe, it, expect } from "vitest";
import {
  budgetFromResult,
  checkAgainstBudgets,
  formatReport,
  parseBudgets,
  parseResult,
  serializeBudgets,
  type PerfBudgets,
  type PerfResult,
} from "../src/harness/budget";

function sampleResult(): PerfResult {
  return {
    capturedAt: "2026-04-23T00:00:00.000Z",
    react: "19.1.0",
    samples: [
      { scenario: "mount", variant: "slow", totalMs: 750, commits: 1, p95Ms: 0, maxMs: 750 },
      { scenario: "mount", variant: "optimized", totalMs: 40, commits: 1, p95Ms: 0, maxMs: 40 },
      { scenario: "scroll-100", variant: "optimized", totalMs: 20, commits: 100, p95Ms: 3, maxMs: 5 },
    ],
  };
}

describe("checkAgainstBudgets", () => {
  it("passes when all metrics are within tolerance", () => {
    const budgets: PerfBudgets = {
      tolerance: 0.2,
      entries: [
        { scenario: "mount", variant: "slow", totalMs: 800 },
        { scenario: "mount", variant: "optimized", totalMs: 60 },
      ],
    };
    const report = checkAgainstBudgets(budgets, sampleResult());
    expect(report.passed).toBe(true);
    expect(report.failures).toHaveLength(0);
  });

  it("fails when a metric exceeds budget * (1 + tolerance)", () => {
    const budgets: PerfBudgets = {
      tolerance: 0, // strict
      entries: [{ scenario: "mount", variant: "optimized", totalMs: 30 }],
    };
    const report = checkAgainstBudgets(budgets, sampleResult());
    expect(report.passed).toBe(false);
    expect(report.failures).toHaveLength(1);
    const f = report.failures[0];
    expect(f?.status).toBe("fail");
    expect(f?.metric).toBe("totalMs");
  });

  it("applies tolerance to grant headroom", () => {
    const budgets: PerfBudgets = {
      tolerance: 0.5, // +50%
      entries: [{ scenario: "mount", variant: "optimized", totalMs: 30 }],
    };
    // 30 * 1.5 = 45, measured 40 → pass
    expect(checkAgainstBudgets(budgets, sampleResult()).passed).toBe(true);
  });

  it("flags missing samples as failure", () => {
    const budgets: PerfBudgets = {
      tolerance: 0.2,
      entries: [{ scenario: "filter-10k", variant: "slow", totalMs: 500 }],
    };
    const report = checkAgainstBudgets(budgets, sampleResult());
    expect(report.passed).toBe(false);
    expect(report.failures[0]?.status).toBe("missing-sample");
  });

  it("surfaces orphan samples as missing-budget info rows (not failures)", () => {
    const budgets: PerfBudgets = { tolerance: 0.2, entries: [] };
    const report = checkAgainstBudgets(budgets, sampleResult());
    expect(report.passed).toBe(true);
    const missing = report.rows.filter((r) => r.status === "missing-budget");
    expect(missing.length).toBe(3);
  });

  it("checks multiple metrics per entry independently", () => {
    const budgets: PerfBudgets = {
      tolerance: 0,
      entries: [
        { scenario: "scroll-100", variant: "optimized", totalMs: 100, p95Ms: 2, maxMs: 10 },
      ],
    };
    const report = checkAgainstBudgets(budgets, sampleResult());
    // p95 budget is 2, measured is 3 → fail; totalMs and maxMs pass.
    expect(report.passed).toBe(false);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]?.metric).toBe("p95Ms");
  });
});

describe("budgetFromResult", () => {
  it("builds a budget entry per sample", () => {
    const b = budgetFromResult(sampleResult(), 0.1);
    expect(b.tolerance).toBe(0.1);
    expect(b.entries).toHaveLength(3);
    const mountSlow = b.entries.find(
      (e) => e.scenario === "mount" && e.variant === "slow"
    );
    expect(mountSlow?.totalMs).toBe(750);
  });
});

describe("formatReport", () => {
  it("renders a table with pass/fail rows", () => {
    const budgets: PerfBudgets = {
      tolerance: 0,
      entries: [{ scenario: "mount", variant: "optimized", totalMs: 30 }],
    };
    const out = formatReport(checkAgainstBudgets(budgets, sampleResult()));
    expect(out).toContain("Performance Budget Report");
    expect(out).toContain("mount");
    expect(out).toContain("fail");
  });
});

describe("serialize / parse", () => {
  it("round-trips a budget file", () => {
    const b = budgetFromResult(sampleResult());
    expect(parseBudgets(serializeBudgets(b))).toEqual(b);
  });

  it("rejects malformed budgets", () => {
    expect(parseBudgets("not json")).toBeNull();
    expect(parseBudgets("{}")).toBeNull();
    expect(
      parseBudgets(JSON.stringify({ tolerance: "x", entries: [] }))
    ).toBeNull();
  });

  it("rejects malformed results", () => {
    expect(parseResult("not json")).toBeNull();
    expect(
      parseResult(JSON.stringify({ capturedAt: "x", react: "19", samples: [{ bad: 1 }] }))
    ).toBeNull();
  });
});
