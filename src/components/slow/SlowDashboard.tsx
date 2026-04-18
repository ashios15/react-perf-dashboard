import React, { useState, useEffect } from "react";

/**
 * ❌ SLOW VERSION — Intentionally bad patterns for demonstration.
 *
 * Anti-patterns included:
 * 1. Renders all 10,000 items at once (no virtualization)
 * 2. Inline objects in JSX (breaks memoization)
 * 3. No React.memo on list items
 * 4. Expensive computation in render
 * 5. Unnecessary re-renders via parent state
 * 6. Synchronous large import
 * 7. No image optimization
 */

// ❌ Heavy computation done inline during render
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// ❌ No React.memo — re-renders every time parent state changes
function SlowListItem({
  item,
  onClick,
}: {
  item: { id: number; name: string; value: number };
  onClick: (id: number) => void;
}) {
  // ❌ Expensive computation on every render
  const expensiveValue = fibonacci(30 + (item.id % 5));

  return (
    // ❌ Inline style object — new object every render
    <div
      style={{
        padding: "12px",
        borderBottom: "1px solid #eee",
        cursor: "pointer",
      }}
      onClick={() => onClick(item.id)}
    >
      <span style={{ fontWeight: "bold" }}>{item.name}</span>
      <span style={{ marginLeft: "8px", color: "#666" }}>
        Value: {item.value}
      </span>
      <span style={{ marginLeft: "8px", color: "#999", fontSize: "12px" }}>
        Computed: {expensiveValue}
      </span>
    </div>
  );
}

// ❌ Generate all data upfront in the component
function generateItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: Math.floor(Math.random() * 1000),
  }));
}

export function SlowDashboard() {
  const [items] = useState(() => generateItems(10000));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [counter, setCounter] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // ❌ Filtering without useMemo — recalculates on every render
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ❌ Unnecessary interval causing constant re-renders
  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((c) => c + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h2>❌ Slow Dashboard ({filteredItems.length} items)</h2>
        <span style={{ color: "#999" }}>Re-render counter: {counter}</span>
      </div>

      <input
        type="text"
        placeholder="Search items..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        // ❌ Inline style object
        style={{
          width: "100%",
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          marginBottom: "16px",
        }}
      />

      {/* ❌ Renders ALL items — no virtualization, no pagination */}
      <div
        style={{
          maxHeight: "500px",
          overflow: "auto",
          border: "1px solid #eee",
          borderRadius: "4px",
        }}
      >
        {filteredItems.map((item) => (
          <SlowListItem
            key={item.id}
            // ❌ New object created every render
            item={{ ...item }}
            // ❌ New function created every render
            onClick={(id) => setSelectedId(id)}
          />
        ))}
      </div>

      {selectedId !== null && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "#f5f5f5",
            borderRadius: "4px",
          }}
        >
          Selected: Item {selectedId}
        </div>
      )}
    </div>
  );
}
