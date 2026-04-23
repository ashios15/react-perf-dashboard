import React, { useState, lazy, Suspense } from "react";
import { version as reactVersion } from "react";
import { BenchmarkView } from "./BenchmarkView";

const SlowDashboard = lazy(() =>
  import("./components/slow/SlowDashboard").then((m) => ({
    default: m.SlowDashboard,
  })),
);
const OptimizedDashboard = lazy(() =>
  import("./components/optimized/OptimizedDashboard").then((m) => ({
    default: m.OptimizedDashboard,
  })),
);

type View = "slow" | "optimized" | "compare" | "benchmark";

export default function App() {
  const [view, setView] = useState<View>("compare");

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        minHeight: "100vh",
        background: "#f9fafb",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 24px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
          ⚡ React Performance Patterns — Before / After
        </h1>
        <p style={{ margin: "4px 0 12px", color: "#6b7280", fontSize: "14px" }}>
          Same 10,000-item dashboard. Same features. Dramatically different
          performance.
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["slow", "optimized", "compare", "benchmark"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                border: "none",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                background: view === v ? "#2563eb" : "#f3f4f6",
                color: view === v ? "white" : "#374151",
              }}
            >
              {v === "slow"
                ? "❌ Slow"
                : v === "optimized"
                  ? "✅ Optimized"
                  : v === "compare"
                    ? "⚖️ Compare"
                    : "📊 Benchmark"}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: "24px" }}>
        {/* Optimization Guide */}
        {view === "compare" && (
          <div
            style={{
              marginBottom: "24px",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>🔬 Optimizations Applied</h3>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "8px" }}>Pattern</th>
                  <th style={{ textAlign: "left", padding: "8px" }}>
                    ❌ Before
                  </th>
                  <th style={{ textAlign: "left", padding: "8px" }}>
                    ✅ After
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "List Rendering",
                    "Renders all 10,000 items",
                    "Virtualized — renders ~13 visible items",
                  ],
                  [
                    "Memoization",
                    "No React.memo, no useMemo",
                    "React.memo + useMemo + useCallback",
                  ],
                  [
                    "Expensive Computation",
                    "fibonacci() on every render",
                    "Cached with Map + useMemo",
                  ],
                  [
                    "Style Objects",
                    "Inline objects (new ref each render)",
                    "CSS classes (stable refs)",
                  ],
                  [
                    "Event Handlers",
                    "Arrow functions inline in JSX",
                    "useCallback with stable references",
                  ],
                  [
                    "Search Filtering",
                    "Blocks main thread",
                    "useTransition (concurrent)",
                  ],
                  [
                    "Re-renders",
                    "Timer causes constant re-renders",
                    "Removed unnecessary state updates",
                  ],
                ].map(([pattern, before, after]) => (
                  <tr
                    key={pattern}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td style={{ padding: "8px", fontWeight: 500 }}>
                      {pattern}
                    </td>
                    <td style={{ padding: "8px", color: "#dc2626" }}>
                      {before}
                    </td>
                    <td style={{ padding: "8px", color: "#16a34a" }}>
                      {after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Suspense
          fallback={
            <div
              style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}
            >
              Loading...
            </div>
          }
        >
          {view === "benchmark" ? (
            <BenchmarkView
              slow={<SlowDashboard />}
              optimized={<OptimizedDashboard />}
              reactVersion={reactVersion}
            />
          ) : view === "compare" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
              }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #fca5a5",
                  overflow: "hidden",
                }}
              >
                <SlowDashboard />
              </div>
              <div
                style={{
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #86efac",
                  overflow: "hidden",
                }}
              >
                <OptimizedDashboard />
              </div>
            </div>
          ) : view === "slow" ? (
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            >
              <SlowDashboard />
            </div>
          ) : (
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            >
              <OptimizedDashboard />
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}
