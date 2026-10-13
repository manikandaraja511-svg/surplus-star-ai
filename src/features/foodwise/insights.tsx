import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, SlidersHorizontal, ArrowUpRight, Bell, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFood } from "./store";
import {
  estimate,
  historicalDemand,
  generateAlerts,
  errorMessage,
  settingsSchema,
  units,
  format,
  type Alert,
  type FoodRecord,
} from "./domain";
import { Workspace, PageHeading } from "./shell";
import { Modal, Field } from "./inventory";
function SettingsForm({ close }: { close: () => void }) {
  const s = useFood(),
    [error, setError] = useState("");
  return (
    <Modal title="Demonstration alert settings" close={close}>
      <p className="notice mb-5">
        These configurable thresholds demonstrate potential-surplus alerts. They are not official
        food safety standards, and do not determine whether food is safe.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          try {
            s.saveSettings(
              settingsSchema.parse({
                moderate: Number(d.get("moderate")),
                high: Number(d.get("high")),
                expiryHours: Number(d.get("expiryHours")),
              }),
            );
            close();
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        <div className="form-grid">
          <Field label="Moderate surplus begins at (%)">
            <input
              aria-label="Moderate threshold"
              name="moderate"
              type="number"
              min="0"
              max="99"
              step="any"
              required
              defaultValue={s.settings.moderate}
            />
          </Field>
          <Field label="High surplus begins at (%)">
            <input
              aria-label="High threshold"
              name="high"
              type="number"
              min="1"
              max="100"
              step="any"
              required
              defaultValue={s.settings.high}
            />
          </Field>
          <Field full label="Approaching use-by window (hours)">
            <input
              aria-label="Use-by alert window"
              name="expiryHours"
              type="number"
              min="1"
              max="72"
              required
              defaultValue={s.settings.expiryHours}
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check />
            Save demo settings
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function Insights() {
  const s = useFood(),
    [settings, setSettings] = useState(false),
    [unit, setUnit] = useState<FoodRecord["unit"]>("portions"),
    [filter, setFilter] = useState("All");
  const rows = s.records
    .filter(
      (r) => r.unit === unit && (filter === "All" || estimate(r, s.settings).level === filter),
    )
    .sort((a, b) => Date.parse(b.preparedAt) - Date.parse(a.preparedAt));
  return (
    <Workspace>
      <PageHeading
        eyebrow="Transparent by design"
        title="AI-Assisted Insights"
        description="Simple, explainable calculations and historical averages—not a trained machine-learning model. Every estimate shows its reasoning."
        actions={
          <Button variant="outline" onClick={() => setSettings(true)}>
            <SlidersHorizontal />
            Demo settings
          </Button>
        }
      />
      <div className="notice mb-6">
        <strong>How this prototype works:</strong> Remaining = prepared − served. Potential surplus
        = max(0, prepared − estimated demand). Percentage = surplus ÷ prepared × 100 only when
        prepared is greater than zero. Historical demand requires 3 earlier records for the same
        food and unit; otherwise an explicit estimate is required.
      </div>
      <div className="toolbar">
        <select
          aria-label="Insights unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value as FoodRecord["unit"])}
        >
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <select
          aria-label="Insights level"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="All">All alert levels</option>
          {["Low", "Moderate", "High"].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Demo thresholds: low &lt; {s.settings.moderate}% · moderate ≥ {s.settings.moderate}% ·
          high ≥ {s.settings.high}%
        </span>
      </div>
      {rows.length ? (
        <div className="insight-grid">
          {rows.map((r) => {
            const e = estimate(r, s.settings),
              h = historicalDemand(r.name, r.unit, s.records, r.preparedAt, r.id);
            return (
              <article className="insight-card" key={r.id}>
                <div className="flex items-center justify-between gap-2">
                  <Sparkles size={18} className="text-sage" />
                  <span className={`badge ${e.level.toLowerCase()}`}>
                    {e.level} potential surplus
                  </span>
                </div>
                <h2>{r.name}</h2>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(r.preparedAt).toLocaleDateString()} ·{" "}
                  {r.simulated ? "Simulated record" : "Your record"}
                </span>
                <div className="insight-values">
                  <span>
                    Estimated demand<strong>{format(r.demand)}</strong>
                    {r.unit}
                  </span>
                  <span>
                    Potential surplus<strong>{format(e.surplus)}</strong>
                    {r.unit} · {format(e.percentage)}%
                  </span>
                </div>
                <p>{e.explanation}</p>
                <p>
                  {h.demand === null
                    ? `Only ${h.count} earlier matching records; using the explicitly entered demand of ${format(r.demand)} ${r.unit}.`
                    : `Historical reference: average ${format(h.demand)} ${r.unit} across ${h.count} earlier records. This calculation uses the saved estimate ${format(r.demand)}; apply the average when editing a record if appropriate.`}
                </p>
                <p className="action">
                  <strong>Next action</strong>
                  <br />
                  {e.action}
                </p>
                <Button asChild variant="link" className="px-0">
                  <Link to="/inventory">
                    Review inventory <ArrowUpRight />
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Sparkles size={32} />
          <h2>No estimates to show yet.</h2>
          <p>
            Add food records with prepared quantities and explicit demand estimates. Try changing
            filters if you already have records.
          </p>
          <Button asChild>
            <Link to="/inventory">
              Open inventory <ArrowUpRight />
            </Link>
          </Button>
        </div>
      )}
      {settings && <SettingsForm close={() => setSettings(false)} />}
    </Workspace>
  );
}
function AlertCard({ alert }: { alert: Alert }) {
  const s = useFood(),
    r = s.records.find((r) => r.id === alert.recordId),
    saved = s.reviews[alert.id],
    [notes, setNotes] = useState(saved?.notes ?? ""),
    [error, setError] = useState("");
  return (
    <article className="alert-card">
      <div className="flex items-center justify-between">
        <span className={`badge ${alert.severity.toLowerCase()}`}>{alert.severity} severity</span>
        <span className={`badge ${saved?.reviewed ? "low" : ""}`}>
          {saved?.reviewed ? "Reviewed" : "Needs review"}
        </span>
      </div>
      <h2>{alert.title}</h2>
      <strong className="text-xs">
        {r?.name} · {r?.simulated ? "Simulated" : "Recorded"} ·{" "}
        {r ? new Date(r.preparedAt).toLocaleDateString() : ""}
      </strong>
      <p>
        <strong>Reason:</strong> {alert.reason}
      </p>
      <p>
        <strong>Recommended action:</strong> {alert.action}
      </p>
      <label htmlFor={`note-${alert.id}`}>Review notes</label>
      <textarea
        id={`note-${alert.id}`}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Record your human review…"
      />
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={saved?.reviewed ? "outline" : "default"}
          size="sm"
          onClick={() => {
            try {
              s.review(alert.id, !saved?.reviewed, notes);
              setError("");
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          <Check />
          {saved?.reviewed ? "Mark unreviewed" : "Mark reviewed"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            try {
              s.review(alert.id, saved?.reviewed ?? false, notes);
              setError("");
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          Save notes
        </Button>
      </div>
    </article>
  );
}
export function Alerts() {
  const s = useFood(),
    [filter, setFilter] = useState("Unreviewed"),
    [severity, setSeverity] = useState("All"),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const all = generateAlerts(s.records, s.settings, now),
    alerts = all.filter(
      (a) =>
        (severity === "All" || a.severity === severity) &&
        (filter === "All" ||
          (filter === "Reviewed" ? s.reviews[a.id]?.reviewed : !s.reviews[a.id]?.reviewed)),
    );
  return (
    <Workspace>
      <PageHeading
        eyebrow="A little attention goes a long way"
        title="Alert Center"
        description="Review potential surplus, unusual quantities, missing information and recorded use-by times. Alerts support human decisions; they never guarantee food safety."
        actions={
          <Button asChild variant="outline">
            <Link to="/insights">
              <SlidersHorizontal />
              Estimate settings
            </Link>
          </Button>
        }
      />
      <div className="toolbar">
        <select
          aria-label="Review status filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["Unreviewed", "Reviewed", "All"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Severity filter"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="All">All severities</option>
          {["High", "Moderate", "Low"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {alerts.length} matching alerts · use-by checks refresh every minute
        </span>
      </div>
      {alerts.length ? (
        <div className="alert-list">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ShieldCheck size={32} />
          <h2>
            {all.length ? "No alerts match these filters." : "Nothing needs attention here yet."}
          </h2>
          <p>
            {s.records.length
              ? "No matching alerts. Reviewed alerts remain available under the Reviewed filter."
              : "Add food records to check for surplus and recorded use-by dates."}
          </p>
          <Button asChild variant="outline">
            <Link to="/inventory">
              Review inventory <ArrowUpRight />
            </Link>
          </Button>
        </div>
      )}
      <div className="notice mt-8">
        <Bell size={16} className="inline mr-2" />
        Invalid quantities, inconsistent units and dates are blocked at entry. Missing optional
        use-by information is flagged for applicability review, not assumed unsafe.
      </div>
    </Workspace>
  );
}
