import { useCallback, useState, type ReactNode } from "react";
import type { PerfResult } from "./harness/budget";
import {
  MeasuredDashboard,
  buildPerfResult,
  store,
} from "./harness/profiler";

interface BenchmarkViewProps {
  slow: ReactNode;
  optimized: ReactNode;
  reactVersion: string;
}

/**
 * Interactive benchmark runner. Mounts each variant inside a React <Profiler>
 * and captures commit timings. The user drives real interactions (scrolling,
 * filtering) — Profiler commits accumulate, and "Capture" freezes them into a
 * downloadable JSON suitable for `scripts/perf-check.ts`.
 */
export function BenchmarkView({ slow, optimized, reactVersion }: BenchmarkViewProps) {
  const [phase, setPhase] = useState<"idle" | "recording" | "done">("idle");
  const [scenario, setScenario] = useState("mount");
  const [variant, setVariant] = useState<"slow" | "optimized">("slow");
  const [result, setResult] = useState<PerfResult | null>(null);

  const start = useCallback(() => {
    store.reset();
    store.start(scenario, variant);
    setPhase("recording");
    setResult(null);
  }, [scenario, variant]);

  const stop = useCallback(() => {
    store.stop();
    setResult(buildPerfResult(reactVersion));
    setPhase("done");
  }, [reactVersion]);

  const download = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".perf-results.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <h3 style={{ marginTop: 0 }}>📊 Profiler Harness</h3>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Pick a scenario + variant, hit <b>Start</b>, drive the dashboard
          (scroll, type in the filter), then hit <b>Capture</b>. Download the
          JSON and pipe it into <code>npm run perf:check</code>.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 13 }}>
            Scenario:{" "}
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              disabled={phase === "recording"}
            >
              <option value="mount">mount</option>
              <option value="scroll-100">scroll-100</option>
              <option value="filter-10k">filter-10k</option>
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            Variant:{" "}
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as "slow" | "optimized")}
              disabled={phase === "recording"}
            >
              <option value="slow">slow</option>
              <option value="optimized">optimized</option>
            </select>
          </label>
          {phase !== "recording" ? (
            <button onClick={start} style={primaryBtn}>
              ▶ Start
            </button>
          ) : (
            <button onClick={stop} style={{ ...primaryBtn, background: "#dc2626" }}>
              ■ Capture
            </button>
          )}
          {result && (
            <button onClick={download} style={secondaryBtn}>
              ⬇ Download .perf-results.json
            </button>
          )}
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            React {reactVersion} · {store.snapshot().length} commits
          </span>
        </div>

        {result && (
          <table
            style={{
              width: "100%",
              marginTop: 12,
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={th}>Scenario</th>
                <th style={th}>Variant</th>
                <th style={th}>Commits</th>
                <th style={th}>Total (ms)</th>
                <th style={th}>p95 (ms)</th>
                <th style={th}>Max (ms)</th>
              </tr>
            </thead>
            <tbody>
              {result.samples.map((s) => (
                <tr key={`${s.variant}::${s.scenario}`}>
                  <td style={td}>{s.scenario}</td>
                  <td style={td}>{s.variant}</td>
                  <td style={td}>{s.commits}</td>
                  <td style={td}>{s.totalMs}</td>
                  <td style={td}>{s.p95Ms}</td>
                  <td style={td}>{s.maxMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 8,
          border: `2px solid ${variant === "slow" ? "#fca5a5" : "#86efac"}`,
          overflow: "hidden",
        }}
      >
        <MeasuredDashboard scenario={scenario} variant={variant}>
          {variant === "slow" ? slow : optimized}
        </MeasuredDashboard>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 6,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  ...primaryBtn,
  background: "#f3f4f6",
  color: "#374151",
};
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid #f3f4f6",
  fontFamily: "ui-monospace, monospace",
};
