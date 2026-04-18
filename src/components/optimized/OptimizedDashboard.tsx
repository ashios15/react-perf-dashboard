import React, {
  useState,
  useMemo,
  useCallback,
  useTransition,
  memo,
} from "react";

/**
 * ✅ OPTIMIZED VERSION — Same functionality, dramatically better performance.
 *
 * Optimizations applied:
 * 1. React.memo on list items — prevents unnecessary re-renders
 * 2. useMemo for filtered data — no recalc unless dependencies change
 * 3. useCallback for event handlers — stable references
 * 4. Virtualized list — only renders visible items
 * 5. Expensive computation moved to useMemo with caching
 * 6. useTransition for non-urgent updates (search)
 * 7. CSS classes instead of inline style objects
 * 8. Removed unnecessary re-render counter interval
 */

// ✅ Computed once and cached
const fibCache = new Map<number, number>();
function fibonacci(n: number): number {
  if (fibCache.has(n)) return fibCache.get(n)!;
  const result = n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);
  fibCache.set(n, result);
  return result;
}

interface Item {
  id: number;
  name: string;
  value: number;
}

// ✅ React.memo — only re-renders when props actually change
const OptimizedListItem = memo(function OptimizedListItem({
  item,
  onClick,
}: {
  item: Item;
  onClick: (id: number) => void;
}) {
  // ✅ Expensive computation cached per item
  const expensiveValue = useMemo(
    () => fibonacci(30 + (item.id % 5)),
    [item.id],
  );

  return (
    <div className="perf-list-item" onClick={() => onClick(item.id)}>
      <span className="perf-item-name">{item.name}</span>
      <span className="perf-item-value">Value: {item.value}</span>
      <span className="perf-item-computed">Computed: {expensiveValue}</span>
    </div>
  );
});

// ✅ Generate once, outside render
function generateItems(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: Math.floor(Math.random() * 1000),
  }));
}

// ✅ Simple virtualization — only render visible items
function useVirtualList(
  items: Item[],
  containerHeight: number,
  itemHeight: number,
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount, items.length);

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return { visibleItems, totalHeight, offsetY, setScrollTop };
}

const ITEM_HEIGHT = 44;
const CONTAINER_HEIGHT = 500;

export function OptimizedDashboard() {
  const [items] = useState(() => generateItems(10000));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // ✅ useMemo — only recompute when searchTerm or items change
  const filteredItems = useMemo(
    () =>
      searchTerm
        ? items.filter((item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()),
          )
        : items,
    [items, searchTerm],
  );

  const { visibleItems, totalHeight, offsetY, setScrollTop } = useVirtualList(
    filteredItems,
    CONTAINER_HEIGHT,
    ITEM_HEIGHT,
  );

  // ✅ useCallback — stable reference, won't cause child re-renders
  const handleClick = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  // ✅ useTransition — search input stays responsive
  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      startTransition(() => {
        setSearchTerm(e.target.value);
      });
    },
    [startTransition],
  );

  return (
    <div className="perf-dashboard">
      <div className="perf-header">
        <h2>
          ✅ Optimized Dashboard ({filteredItems.length} items)
          {isPending && <span className="perf-pending"> Filtering...</span>}
        </h2>
      </div>

      <input
        type="text"
        placeholder="Search items..."
        onChange={handleSearch}
        className="perf-search"
      />

      {/* ✅ Virtualized — only renders ~13 visible items, not 10,000 */}
      <div
        className="perf-list-container"
        style={{ height: CONTAINER_HEIGHT }}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((item) => (
              <OptimizedListItem
                key={item.id}
                item={item}
                onClick={handleClick}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedId !== null && (
        <div className="perf-selected">Selected: Item {selectedId}</div>
      )}
    </div>
  );
}
