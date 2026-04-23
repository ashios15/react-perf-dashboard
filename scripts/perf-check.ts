#!/usr/bin/env node
/**
 * perf-check — compare a perf-results JSON (on stdin) against perf-budgets.json.
 *
 *   node scripts/perf-check.mjs < .perf-results.json
 *   node scripts/perf-check.mjs --save < .perf-results.json   # write new budgets
 *
 * Exit codes:
 *   0 — all budgets satisfied
 *   1 — usage / IO error
 *   2 — one or more budgets exceeded
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  budgetFromResult,
  checkAgainstBudgets,
  formatReport,
  parseBudgets,
  parseResult,
  serializeBudgets,
} from "../src/harness/budget";

const BUDGET_PATH = resolve(process.cwd(), "perf-budgets.json");

async function readStdin() {
  if (process.stdin.isTTY) {
    throw new Error(
      "Expected PerfResult JSON on stdin. Example:\n  node scripts/run-bench.mjs | node scripts/perf-check.mjs"
    );
  }
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const save = process.argv.includes("--save");
  const raw = await readStdin();
  const result = parseResult(raw);
  if (!result) {
    process.stderr.write("Invalid PerfResult JSON on stdin.\n");
    return 1;
  }

  if (save) {
    const budgets = budgetFromResult(result);
    writeFileSync(BUDGET_PATH, serializeBudgets(budgets), "utf8");
    process.stdout.write(
      `Wrote ${budgets.entries.length} entries to ${BUDGET_PATH}.\n`
    );
    return 0;
  }

  if (!existsSync(BUDGET_PATH)) {
    process.stderr.write(
      `No perf-budgets.json at ${BUDGET_PATH}. Run with --save to create one.\n`
    );
    return 1;
  }
  const budgets = parseBudgets(readFileSync(BUDGET_PATH, "utf8"));
  if (!budgets) {
    process.stderr.write(`perf-budgets.json is corrupt.\n`);
    return 1;
  }

  const report = checkAgainstBudgets(budgets, result);
  process.stdout.write(formatReport(report) + "\n");
  return report.passed ? 0 : 2;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`[perf-check] ${err?.message ?? err}\n`);
    process.exit(1);
  });
