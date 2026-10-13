import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Workspace, PageHeading, headFor } from "@/features/foodwise/shell";
import { testCases, errorMessage, format } from "@/features/foodwise/domain";
export const Route = createFileRoute("/testing")({
  head: () =>
    headFor(
      "Testing Center",
      "Execute isolated food-management test cases and inspect actual versus expected results.",
    ),
  component: Testing,
});
function Testing() {
  const [results, setResults] = useState<Record<number, { actual: string; pass: boolean }>>({});
  const execute = (i: number) => {
    const t = testCases[i];
    if (!t) return { actual: "Test not found", pass: false };
    try {
      const actual = t.run();
      return { actual, pass: actual === t.expected };
    } catch (e) {
      return { actual: errorMessage(e), pass: false };
    }
  };
  const count = Object.keys(results).length,
    passed = Object.values(results).filter((r) => r.pass).length;
  return (
    <Workspace>
      <PageHeading
        eyebrow="Trust, tested"
        title="Testing Center"
        description="Real tests, real results. These isolated fixtures exercise the same calculations and validation used by the app without changing your food records."
        actions={
          <>
            <Button variant="outline" onClick={() => setResults({})}>
              <RotateCcw />
              Clear results
            </Button>
            <Button
              onClick={() =>
                setResults(Object.fromEntries(testCases.map((_, i) => [i, execute(i)])))
              }
            >
              <Play />
              Run All Tests
            </Button>
          </>
        }
      />
      <div className="stat-grid mb-7">
        <article className="stat-card">
          <div className="stat-top">
            Available tests
            <FlaskConical size={18} />
          </div>
          <div className="stat-value">{testCases.length}</div>
        </article>
        <article className="stat-card">
          <div className="stat-top">Executed</div>
          <div className="stat-value">{count}</div>
        </article>
        <article className="stat-card">
          <div className="stat-top">Passed / Failed</div>
          <div className="stat-value">
            {passed} / {count - passed}
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">Pass rate</div>
          <div className="stat-value">{count ? `${format((passed / count) * 100)}%` : "—"}</div>
          <div className="stat-note">Calculated from executed tests only</div>
        </article>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {["Test case", "Expected output", "Actual output", "Status", "Execute"].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {testCases.map((t, i) => (
              <tr key={t.name}>
                <td className="food-name">{t.name}</td>
                <td>{t.expected}</td>
                <td>{results[i]?.actual ?? "Not executed"}</td>
                <td>
                  <span
                    className={`badge ${results[i] ? (results[i].pass ? "pass" : "fail") : ""}`}
                  >
                    {results[i] ? (results[i].pass ? "PASS" : "FAIL") : "NOT RUN"}
                  </span>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={`Run ${t.name}`}
                    aria-label={`Run ${t.name}`}
                    onClick={() => setResults((r) => ({ ...r, [i]: execute(i) }))}
                  >
                    <Play />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Workspace>
  );
}
