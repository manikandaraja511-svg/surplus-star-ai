import { useState, type FormEvent, type ReactNode } from "react";
import {
  Plus,
  Search,
  Download,
  Pencil,
  Trash2,
  Eye,
  X,
  Database,
  RotateCcw,
  ArrowRight,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFood } from "./store";
import {
  categories,
  units,
  outcomeTypes,
  estimate,
  historicalDemand,
  exportCSV,
  format,
  errorMessage,
  type FoodRecord,
  type Outcome,
} from "./domain";
import { Workspace, PageHeading } from "./shell";
export function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="dialog-panel" showCloseButton={false} aria-describedby={undefined}>
        <div className="dialog-heading">
          <DialogTitle className="font-display text-3xl font-medium">{title}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close dialog">
            <X />
          </Button>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
const localDate = (value: string) => {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function SampleControls() {
  const s = useFood(),
    [error, setError] = useState(""),
    [reset, setReset] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          try {
            s.loadSamples();
            setError("");
          } catch (e) {
            setError(errorMessage(e));
          }
        }}
        disabled={s.records.some((r) => r.simulated)}
      >
        <Database />
        Load sample data
      </Button>
      <Button
        variant="ghost"
        onClick={() => setReset(true)}
        disabled={!s.records.some((r) => r.simulated)}
      >
        <RotateCcw />
        Reset demo
      </Button>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {reset && (
        <Modal title="Reset demonstration data?" close={() => setReset(false)}>
          <p className="notice">
            Only records labelled simulated and their outcomes will be removed. Your own records
            will remain unchanged.
          </p>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setReset(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  s.resetSamples();
                  setReset(false);
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Reset demo data
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function FoodForm({ record, close }: { record?: FoodRecord | undefined; close: () => void }) {
  const s = useFood(),
    [error, setError] = useState(""),
    [name, setName] = useState(record?.name ?? ""),
    [unit, setUnit] = useState<FoodRecord["unit"]>(record?.unit ?? "portions"),
    [demand, setDemand] = useState(record ? String(record.demand) : ""),
    [preparedAt, setPreparedAt] = useState(
      localDate(record?.preparedAt ?? new Date().toISOString()),
    );
  const history = historicalDemand(name, unit, s.records, preparedAt, record?.id);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const num = (key: string) => {
      const raw = String(data.get(key) ?? "");
      return raw.trim() ? Number(raw) : NaN;
    };
    try {
      const preparedDate = String(data.get("preparedAt") ?? ""),
        useBy = String(data.get("useBy") ?? "");
      s.saveFood({
        id: record?.id ?? crypto.randomUUID(),
        name,
        category: String(data.get("category")) as FoodRecord["category"],
        unit,
        prepared: num("prepared"),
        served: num("served"),
        demand: Number(demand.trim() || NaN),
        preparedAt: preparedDate ? new Date(preparedDate).toISOString() : "",
        useBy: useBy ? new Date(useBy).toISOString() : "",
        attendance: String(data.get("attendance") ?? "").trim() ? num("attendance") : null,
        notes: String(data.get("notes") ?? ""),
        simulated: record?.simulated ?? false,
      });
      close();
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  return (
    <Modal title={record ? "Edit food record" : "Add food record"} close={close}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label="Food item name">
            <input
              aria-label="Food item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              placeholder="e.g. Rice"
            />
          </Field>
          <Field label="Food category">
            <select
              aria-label="Food category"
              name="category"
              defaultValue={record?.category ?? "Grains"}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity unit">
            <select
              aria-label="Quantity unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as FoodRecord["unit"])}
            >
              {units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Expected attendance (optional)">
            <input
              aria-label="Expected attendance"
              name="attendance"
              type="number"
              min="0"
              max="100000"
              step="1"
              defaultValue={record?.attendance ?? ""}
            />
          </Field>
          <Field label={`Quantity prepared (${unit})`}>
            <input
              aria-label="Quantity prepared"
              name="prepared"
              type="number"
              min="0"
              max="100000"
              step="any"
              required
              defaultValue={record?.prepared}
            />
          </Field>
          <Field label={`Quantity served (${unit})`}>
            <input
              aria-label="Quantity served"
              name="served"
              type="number"
              min="0"
              max="100000"
              step="any"
              required
              defaultValue={record?.served}
            />
          </Field>
          <Field label="Preparation date & time">
            <input
              aria-label="Preparation date and time"
              name="preparedAt"
              type="datetime-local"
              required
              value={preparedAt}
              onChange={(e) => setPreparedAt(e.target.value)}
            />
          </Field>
          <Field label="Use-by / best-before (if applicable)">
            <input
              aria-label="Use-by date and time"
              name="useBy"
              type="datetime-local"
              defaultValue={localDate(record?.useBy ?? "")}
            />
          </Field>
          <Field full label={`Estimated demand (${unit})`}>
            <div className="flex gap-2">
              <input
                aria-label="Estimated demand"
                type="number"
                min="0"
                max="100000"
                step="any"
                required
                value={demand}
                onChange={(e) => setDemand(e.target.value)}
              />
              {history.demand !== null && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDemand(String(Math.round((history.demand ?? 0) * 100) / 100))}
                >
                  Use average
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {history.demand === null
                ? `Only ${history.count} earlier same-item, same-unit records found. At least 3 are required; enter an explicit demand estimate.`
                : `Average demand from ${history.count} earlier same-item records: ${format(history.demand)} ${unit}. This is a historical mean, not a trained AI model.`}
            </p>
          </Field>
          <Field full label="Notes (optional)">
            <textarea
              aria-label="Notes"
              name="notes"
              maxLength={1000}
              rows={3}
              defaultValue={record?.notes}
            />
          </Field>
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check />
            Save food record
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function OutcomeForm({
  record,
  outcome,
  close,
}: {
  record: FoodRecord;
  outcome?: Outcome | undefined;
  close: () => void;
}) {
  const s = useFood(),
    [type, setType] = useState<Outcome["type"]>(outcome?.type ?? "Under Review"),
    [error, setError] = useState("");
  const allocated = s.outcomes
      .filter((o) => o.recordId === record.id && o.id !== outcome?.id)
      .reduce((sum, o) => sum + o.quantity, 0),
    available = estimate(record).remaining - allocated;
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      s.saveOutcome({
        id: outcome?.id ?? crypto.randomUUID(),
        recordId: record.id,
        type,
        quantity: Number(d.get("quantity")),
        unit: record.unit,
        confirmed: d.get("confirmed") === "on",
        notes: String(d.get("notes") ?? ""),
      });
      close();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal title={`${outcome ? "Edit" : "Record"} food outcome`} close={close}>
      <p className="notice">
        {record.name} · {format(available)} {record.unit} available for this entry. Estimated
        surplus is not counted as reused or redistributed.
      </p>
      <form onSubmit={submit} className="mt-5">
        <div className="form-grid">
          <Field label="Outcome">
            <select
              aria-label="Outcome type"
              value={type}
              onChange={(e) => setType(e.target.value as Outcome["type"])}
            >
              {outcomeTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label={`Quantity (${record.unit})`}>
            <input
              aria-label="Outcome quantity"
              name="quantity"
              type="number"
              min="0.001"
              max={available}
              step="any"
              required
              defaultValue={outcome?.quantity}
            />
          </Field>
          <Field full label="Outcome notes">
            <textarea
              aria-label="Outcome notes"
              name="notes"
              rows={3}
              maxLength={1000}
              defaultValue={outcome?.notes}
            />
          </Field>
          {type === "Redistributed" && (
            <div className="check-field field full">
              <input
                aria-label="Confirm human safety checks"
                id="safety-check"
                name="confirmed"
                type="checkbox"
                required
                defaultChecked={outcome?.confirmed}
              />
              <label htmlFor="safety-check">
                I confirm a responsible person has completed appropriate food safety checks and
                approved redistribution. FoodWise AI cannot determine or guarantee food safety.
              </label>
            </div>
          )}
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Check />
            Save outcome
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function RecordView({
  record,
  close,
  onEdit,
  onOutcome,
}: {
  record: FoodRecord;
  close: () => void;
  onEdit: () => void;
  onOutcome: (o?: Outcome) => void;
}) {
  const s = useFood(),
    [error, setError] = useState(""),
    [remove, setRemove] = useState<Outcome | null>(null),
    e = estimate(record, s.settings),
    outcomes = s.outcomes.filter((o) => o.recordId === record.id),
    allocated = outcomes.reduce((n, o) => n + o.quantity, 0);
  return (
    <Modal title={record.name} close={close}>
      <div className="flex gap-2">
        <span className="badge">
          {record.category} · {record.unit}
        </span>
        {record.simulated && <span className="badge">Simulated</span>}
        <span className={`badge ${e.level.toLowerCase()}`}>{e.level} potential surplus</span>
      </div>
      <dl className="record-details">
        {[
          ["Prepared", record.prepared],
          ["Served", record.served],
          ["Estimated demand", record.demand],
          ["Remaining", e.remaining],
          ["Potential surplus", e.surplus],
          ["Unallocated", e.remaining - allocated],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {format(Number(value))} {record.unit}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground leading-7">
        Prepared: {new Date(record.preparedAt).toLocaleString()}
        <br />
        Use-by: {record.useBy ? new Date(record.useBy).toLocaleString() : "Not recorded"}
        <br />
        Expected attendance: {record.attendance ?? "Not recorded"}
      </p>
      {record.notes && <p className="notice mt-3 whitespace-pre-wrap">{record.notes}</p>}
      <h3 className="text-2xl mt-6">Recorded outcomes</h3>
      <div className="outcome-list">
        {outcomes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No outcomes recorded yet.</p>
        ) : (
          outcomes.map((o) => (
            <div className="outcome-row" key={o.id}>
              <div className="outcome-text">
                <strong>
                  {o.type} · {format(o.quantity)} {o.unit}
                </strong>
                {o.type === "Redistributed" && (
                  <span className="text-positive"> · Human confirmed</span>
                )}
                {o.notes && <p className="mt-1 whitespace-pre-wrap">{o.notes}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${o.type} outcome`}
                onClick={() => onOutcome(o)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${o.type} outcome`}
                onClick={() => setRemove(o)}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </div>
      {remove && (
        <div className="notice">
          Delete the {remove.type.toLowerCase()} entry?{" "}
          <Button
            size="sm"
            onClick={() => {
              try {
                s.deleteOutcome(remove.id);
                setRemove(null);
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
          >
            Confirm delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRemove(null)}>
            Cancel
          </Button>
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button variant="outline" onClick={onEdit}>
          <Pencil />
          Edit record
        </Button>
        <Button onClick={() => onOutcome()} disabled={e.remaining - allocated <= 0}>
          <Plus />
          Record outcome
        </Button>
      </div>
    </Modal>
  );
}
export function Inventory() {
  const s = useFood(),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [unit, setUnit] = useState("All"),
    [status, setStatus] = useState("All"),
    [edit, setEdit] = useState<FoodRecord | undefined>(),
    [editing, setEditing] = useState(false),
    [viewId, setViewId] = useState<string | null>(null),
    [outcomeEdit, setOutcomeEdit] = useState<{
      record: FoodRecord;
      outcome?: Outcome | undefined;
    } | null>(null),
    [deleting, setDeleting] = useState<FoodRecord | null>(null),
    [error, setError] = useState("");
  const records = s.records
      .filter(
        (r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) &&
          (category === "All" || r.category === category) &&
          (unit === "All" || r.unit === unit) &&
          (status === "All" || estimate(r, s.settings).level === status),
      )
      .sort((a, b) => Date.parse(b.preparedAt) - Date.parse(a.preparedAt)),
    view = s.records.find((r) => r.id === viewId);
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + exportCSV(records, s.outcomes)], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "foodwise-records.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Workspace>
      <PageHeading
        eyebrow="From preparation to purpose"
        title="Food Inventory"
        description="A thoughtful record of every batch. Track quantities, estimate demand, and record what happens to remaining food."
        actions={
          <Button
            onClick={() => {
              setEdit(undefined);
              setEditing(true);
            }}
          >
            <Plus />
            Add food record
          </Button>
        }
      />
      <div className="toolbar">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-3.5 text-muted-foreground" />
          <input
            className="pl-9"
            aria-label="Search food records"
            placeholder="Search food items…"
            maxLength={100}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="All">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Filter unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="All">All units</option>
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <select
          aria-label="Filter alert level"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="All">All levels</option>
          {["Low", "Moderate", "High"].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <Button variant="outline" onClick={download} disabled={!records.length}>
          <Download />
          Export CSV
        </Button>
      </div>
      <div className="toolbar">
        <SampleControls />
        <span className="text-xs text-muted-foreground ml-auto">
          {records.length} of {s.records.length} records · stored on this device
        </span>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {records.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {[
                  "Food item",
                  "Prepared",
                  "Served",
                  "Demand",
                  "Remaining",
                  "Potential surplus",
                  "Prepared at",
                  "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const e = estimate(r, s.settings);
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="food-name">{r.name}</span>
                      <div className="text-muted-foreground text-[10px] mt-1">
                        {r.category} · {r.unit}
                        {r.simulated ? " · Simulated" : ""}
                      </div>
                    </td>
                    <td>{format(r.prepared)}</td>
                    <td>{format(r.served)}</td>
                    <td>{format(r.demand)}</td>
                    <td>{format(e.remaining)}</td>
                    <td>
                      <span className={`badge ${e.level.toLowerCase()}`}>
                        {format(e.surplus)} · {format(e.percentage)}%
                      </span>
                    </td>
                    <td>
                      {new Date(r.preparedAt).toLocaleDateString()}
                      <div className="text-muted-foreground text-[10px]">
                        {new Date(r.preparedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td>
                      <div className="flex">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`View ${r.name} record`}
                          title="View record and outcomes"
                          onClick={() => setViewId(r.id)}
                        >
                          <Eye />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit ${r.name} record`}
                          title="Edit record"
                          onClick={() => {
                            setEdit(r);
                            setEditing(true);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete ${r.name} record`}
                          title="Delete record"
                          onClick={() => setDeleting(r)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <Database size={32} />
          <h2>
            {s.records.length ? "No matching records" : "A fresh start for your food records."}
          </h2>
          <p>
            {s.records.length
              ? "Try another search or filter."
              : "Add your first batch, or load simulated records to explore demand estimates, charts and food outcomes."}
          </p>
          <Button
            onClick={() => {
              setEdit(undefined);
              setEditing(true);
            }}
          >
            <Plus />
            Add food record
          </Button>
        </div>
      )}
      {editing && <FoodForm record={edit} close={() => setEditing(false)} />}{" "}
      {view && !outcomeEdit && !editing && (
        <RecordView
          record={view}
          close={() => setViewId(null)}
          onEdit={() => {
            setEdit(view);
            setEditing(true);
          }}
          onOutcome={(outcome) => setOutcomeEdit({ record: view, outcome })}
        />
      )}{" "}
      {outcomeEdit && (
        <OutcomeForm
          record={outcomeEdit.record}
          outcome={outcomeEdit.outcome}
          close={() => setOutcomeEdit(null)}
        />
      )}{" "}
      {deleting && (
        <Modal title={`Delete ${deleting.name}?`} close={() => setDeleting(null)}>
          <p className="notice">
            This will permanently remove the food record and all its recorded outcomes. This cannot
            be undone.
          </p>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                try {
                  s.deleteFood(deleting.id);
                  setDeleting(null);
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              <Trash2 />
              Delete record
            </Button>
          </div>
        </Modal>
      )}
    </Workspace>
  );
}
