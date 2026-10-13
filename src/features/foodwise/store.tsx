import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import {
  foodSchema,
  outcomeSchema,
  settingsSchema,
  defaultSettings,
  validateFood,
  validateOutcome,
  sampleRecords,
  errorMessage,
  type FoodRecord,
  type Outcome,
  type Settings,
} from "./domain";
const storageKey = "foodwise-ai:v1";
const reviewSchema = z.object({ reviewed: z.boolean(), notes: z.string().max(1000) });
const stateSchema = z.object({
  records: z.array(foodSchema),
  outcomes: z.array(outcomeSchema),
  settings: settingsSchema,
  reviews: z.record(reviewSchema),
});
type State = z.infer<typeof stateSchema>;
const empty: State = { records: [], outcomes: [], settings: defaultSettings, reviews: {} };
type Store = State & {
  ready: boolean;
  error: string;
  saveFood: (r: FoodRecord) => void;
  deleteFood: (id: string) => void;
  saveOutcome: (o: Outcome) => void;
  deleteOutcome: (id: string) => void;
  loadSamples: () => void;
  resetSamples: () => void;
  saveSettings: (s: Settings) => void;
  review: (id: string, reviewed: boolean, notes: string) => void;
};
// Keep one context instance across hot reloads so provider and consumers always match.
const contextHolder = globalThis as typeof globalThis & {
  __foodwiseContext?: React.Context<Store | null>;
};
const Context = (contextHolder.__foodwiseContext ??= createContext<Store | null>(null));
export function FoodProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(empty),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = stateSchema.parse(JSON.parse(raw));
        parsed.records.forEach((r) => validateFood(r, parsed.records, parsed.outcomes));
        parsed.outcomes.forEach((o) => validateOutcome(o, parsed.records, parsed.outcomes));
        setState(parsed);
      }
    } catch (e) {
      setError(`Saved data could not be loaded. It has not been overwritten. ${errorMessage(e)}`);
    } finally {
      setReady(true);
    }
  }, []);
  const commit = (next: State) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(stateSchema.parse(next)));
      setState(next);
      setError("");
    } catch (e) {
      const message = `Could not save changes. Check that browser storage is available. ${errorMessage(e)}`;
      setError(message);
      throw new Error(message);
    }
  };
  const value: Store = {
    ...state,
    ready,
    error,
    saveFood: (r) => {
      const validated = validateFood(r, state.records, state.outcomes);
      commit({ ...state, records: [...state.records.filter((x) => x.id !== r.id), validated] });
    },
    deleteFood: (id) =>
      commit({
        ...state,
        records: state.records.filter((r) => r.id !== id),
        outcomes: state.outcomes.filter((o) => o.recordId !== id),
      }),
    saveOutcome: (o) => {
      const validated = validateOutcome(o, state.records, state.outcomes);
      commit({ ...state, outcomes: [...state.outcomes.filter((x) => x.id !== o.id), validated] });
    },
    deleteOutcome: (id) =>
      commit({ ...state, outcomes: state.outcomes.filter((o) => o.id !== id) }),
    loadSamples: () => {
      const samples = sampleRecords().filter((s) => !state.records.some((r) => r.id === s.id));
      commit({ ...state, records: [...state.records, ...samples] });
    },
    resetSamples: () => {
      const ids = new Set(state.records.filter((r) => r.simulated).map((r) => r.id));
      commit({
        ...state,
        records: state.records.filter((r) => !r.simulated),
        outcomes: state.outcomes.filter((o) => !ids.has(o.recordId)),
        reviews: Object.fromEntries(
          Object.entries(state.reviews).filter(
            ([id]) => ![...ids].some((r) => id.startsWith(`${r}:`)),
          ),
        ),
      });
    },
    saveSettings: (settings) => commit({ ...state, settings: settingsSchema.parse(settings) }),
    review: (id, reviewed, notes) =>
      commit({
        ...state,
        reviews: { ...state.reviews, [id]: reviewSchema.parse({ reviewed, notes }) },
      }),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useFood() {
  const value = useContext(Context);
  if (!value) throw new Error("FoodProvider is required");
  return value;
}
