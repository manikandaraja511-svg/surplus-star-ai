import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Utensils,
  CookingPot,
  Soup,
  ChartNoAxesCombined,
  HeartHandshake,
  Recycle,
  Trash2,
  Bell,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFood } from "./store";
import { estimate, generateAlerts, units, format, type FoodRecord } from "./domain";
import { Workspace, PageHeading } from "./shell";
import { FoodCharts } from "./charts";
import { SampleControls } from "./inventory";
export function Dashboard({ analytics = false }: { analytics?: boolean }) {
  const s = useFood(),
    [unit, setUnit] = useState<FoodRecord["unit"]>("portions"),
    records = s.records.filter((r) => r.unit === unit),
    ids = new Set(records.map((r) => r.id)),
    outcomes = s.outcomes.filter((o) => ids.has(o.recordId));
  const sum = (key: "prepared" | "served") => records.reduce((total, r) => total + r[key], 0),
    sumOut = (type: string) =>
      outcomes.filter((o) => o.type === type).reduce((total, o) => total + o.quantity, 0);
  const alerts = generateAlerts(s.records, s.settings).filter((a) => !s.reviews[a.id]?.reviewed);
  const prepared = sum("prepared"),
    served = sum("served"),
    surplus = records.reduce((total, r) => total + estimate(r).surplus, 0);
  const stats = [
    {
      label: "Total Food Prepared",
      value: prepared,
      icon: CookingPot,
      note: "Recorded preparation",
    },
    { label: "Total Food Served", value: served, icon: Utensils, note: "Recorded service" },
    {
      label: "Remaining Food",
      value: prepared - served,
      icon: Soup,
      note: "Prepared minus served; includes outcomes",
    },
    {
      label: "Estimated Surplus",
      value: surplus,
      icon: ChartNoAxesCombined,
      note: "Potential only · not food saved",
    },
    {
      label: "Food Reused",
      value: sumOut("Reused"),
      icon: Recycle,
      note: "Actually recorded reuse",
    },
    {
      label: "Food Redistributed",
      value: sumOut("Redistributed"),
      icon: HeartHandshake,
      note: "Human-confirmed redistribution",
    },
    {
      label: "Food Discarded",
      value: sumOut("Discarded"),
      icon: Trash2,
      note: "Actually recorded discard",
    },
    {
      label: "Active Alerts",
      value: alerts.length,
      icon: Bell,
      note: "Unreviewed alerts · across all units",
    },
  ];
  return (
    <Workspace>
      <PageHeading
        eyebrow={analytics ? "The story in your records" : "Thoughtful food management"}
        title={analytics ? "Food Analytics" : "Your Food Dashboard"}
        description={
          analytics
            ? "Understand preparation, consumption and recorded outcomes. Every chart comes from your records—not invented impact figures."
            : "A clear view of what you prepared, what you served, and what happens next."
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/alerts">
                <Bell />
                Review alerts {alerts.length > 0 && `(${alerts.length})`}
              </Link>
            </Button>
            <Button asChild>
              <Link to="/inventory">
                <Plus />
                Track food
              </Link>
            </Button>
          </>
        }
      />
      <div className="toolbar">
        <label className="mb-0" htmlFor="summary-unit">
          Quantity unit
        </label>
        <select
          id="summary-unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value as FoodRecord["unit"])}
        >
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Quantities are never combined across different units.
        </span>
        <div className="flex flex-wrap gap-2 ml-auto">
          <SampleControls />
        </div>
      </div>
      <div className="stat-grid">
        {stats.map((stat, i) => (
          <article
            key={stat.label}
            className="stat-card"
            data-testid={`metric-${stat.label.toLowerCase().replaceAll(" ", "-")}`}
          >
            <div className="stat-top">
              <span>{stat.label}</span>
              <stat.icon size={18} />
            </div>
            <div className="stat-value">
              {format(stat.value)}
              <span className="stat-unit">{i === 7 ? "alerts" : unit}</span>
            </div>
            <div className="stat-note">{stat.note}</div>
          </article>
        ))}
      </div>
      {!records.length && (
        <div className="notice mt-6">
          No {unit} records yet. Add a food record or load labelled sample data. Zero values
          represent an empty inventory, not real-world results.
        </div>
      )}
      <FoodCharts records={records} outcomes={outcomes} analytics={analytics} />
      {analytics && records.length > 0 && (
        <section className="chart-panel mt-8">
          <h2>What your records tell us</h2>
          <p>
            {format(served)} of {format(prepared)} {unit} have been recorded as served
            {prepared > 0 ? ` (${format((served / prepared) * 100)}%)` : ""}. Estimated surplus is{" "}
            {format(surplus)} {unit}. Actual recorded reuse and redistribution total{" "}
            {format(sumOut("Reused") + sumOut("Redistributed"))} {unit}; these are separate from the
            estimate.
          </p>
          <p>
            {outcomes.length === 0
              ? "Record final food outcomes to understand how much remaining food was reused, redistributed or discarded."
              : "These are recorded quantities only. No carbon, water or financial impact is inferred."}
          </p>
        </section>
      )}
      <div className="notice mt-8 flex items-center justify-between gap-4">
        <span>
          Better estimates begin with better records. Review demand and record final food outcomes.
        </span>
        <Button asChild variant="ghost">
          <Link to="/insights">
            View estimates <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </Workspace>
  );
}
