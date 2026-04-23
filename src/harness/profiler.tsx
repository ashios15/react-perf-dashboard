import {
  Profiler,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ProfilerOnRenderCallback,
  type ReactNode,
} from "react";
import type { PerfResult, PerfSample, Variant } from "./budget";

interface Commit {
  scenario: string;
  variant: Variant;
  actualDuration: number;
  phase: "mount" | "update" | "nested-update";
}

/**
 * Lightweight store for commits recorded during a benchmark run. Intentionally
 * not a React context — we don't want the store itself to cause re-renders
 * during measurement.
 */
class ProfilerStore {
  private commits: Commit[] = [];
  private scenario = "idle";
  private variant: Variant = "slow";
  private capturing = false;

  start(scenario: string, variant: Variant): void {
    this.scenario = scenario;
    this.variant = variant;
    this.capturing = true;
  }

  stop(): void {
    this.capturing = false;
  }

  record(c: Omit<Commit, "scenario" | "variant">): void {
    if (!this.capturing) return;
    this.commits.push({
      scenario: this.scenario,
      variant: this.variant,
      ...c,
    });
  }

  reset(): void {
    this.commits = [];
  }

  snapshot(): Commit[] {
    return this.commits.slice();
  }
}

export const store = new ProfilerStore();

interface MeasuredProps {
  scenario: string;
  variant: Variant;
  children: ReactNode;
}

/**
 * Wraps children in a React <Profiler>, forwarding commits to the shared
 * {@link store}. Use inside a benchmark flow:
 *
 *     <MeasuredDashboard scenario="mount" variant="slow">
 *       <SlowDashboard />
 *     </MeasuredDashboard>
 */
export function MeasuredDashboard({ scenario, variant, children }: MeasuredProps) {
  const onRender = useCallback<ProfilerOnRenderCallback>(
    (_id, phase, actualDuration) => {
      store.record({ phase, actualDuration });
    },
    []
  );
  return (
    <Profiler id={`${variant}:${scenario}`} onRender={onRender}>
      {children}
    </Profiler>
  );
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (values.length < 20) return 0; // sample too small for a meaningful p95
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length)
  );
  return sorted[idx] ?? 0;
}

export function commitsToSamples(commits: Commit[]): PerfSample[] {
  const groups = new Map<string, Commit[]>();
  for (const c of commits) {
    const k = `${c.variant}::${c.scenario}`;
    const arr = groups.get(k) ?? [];
    arr.push(c);
    groups.set(k, arr);
  }
  const out: PerfSample[] = [];
  for (const [, group] of groups) {
    const first = group[0];
    if (!first) continue;
    const durations = group.map((c) => c.actualDuration);
    const total = durations.reduce((a, b) => a + b, 0);
    const max = durations.reduce((a, b) => (b > a ? b : a), 0);
    out.push({
      scenario: first.scenario,
      variant: first.variant,
      totalMs: round2(total),
      commits: group.length,
      p95Ms: round2(percentile(durations, 95)),
      maxMs: round2(max),
    });
  }
  return out.sort((a, b) => {
    if (a.variant !== b.variant) return a.variant < b.variant ? -1 : 1;
    return a.scenario < b.scenario ? -1 : 1;
  });
}

export function buildPerfResult(reactVersion: string): PerfResult {
  return {
    capturedAt: new Date().toISOString(),
    react: reactVersion,
    samples: commitsToSamples(store.snapshot()),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---- React hook for driving a benchmark run from the UI --------------------

export interface Scenario {
  name: string;
  /** Called immediately after mount. Use it to simulate user actions. */
  run(): Promise<void> | void;
}

export function useBenchmarkDriver() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PerfResult | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const run = useCallback(async (reactVersion: string) => {
    setRunning(true);
    store.reset();
    try {
      setResult(buildPerfResult(reactVersion));
    } finally {
      if (!cancelledRef.current) setRunning(false);
    }
  }, []);

  return { running, result, run };
}
