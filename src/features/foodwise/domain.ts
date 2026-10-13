import { z } from 'zod';
export const units = ['portions', 'kg', 'litres'] as const;
export const categories = ['Grains', 'Breakfast', 'Breads', 'Vegetables', 'Soups & curries', 'Snacks', 'Other'] as const;
export const outcomeTypes = ['Reused', 'Redistributed', 'Discarded', 'Under Review'] as const;
const date = z.string().min(1, 'Preparation date is required').refine(v => Number.isFinite(Date.parse(v)), 'Enter a valid date');
const quantity = z.number({ required_error: 'Quantity is required', invalid_type_error: 'Enter a valid quantity' }).finite().min(0, 'Quantities cannot be negative').max(100000, 'Quantity must not exceed 100,000');
export const foodSchema = z.object({
 id: z.string().min(1), name: z.string().trim().min(1, 'Food name is required').max(100), category: z.enum(categories), unit: z.enum(units), prepared: quantity, served: quantity, demand: quantity,
 preparedAt: date, useBy: z.string().refine(v => !v || Number.isFinite(Date.parse(v)), 'Enter a valid use-by date'), attendance: z.number().int().min(0).max(100000).nullable(), notes: z.string().max(1000), simulated: z.boolean(),
}).superRefine((v, c) => {
 if (v.served > v.prepared) c.addIssue({ code: 'custom', path: ['served'], message: 'Served quantity cannot exceed prepared quantity' });
 if (v.useBy && Date.parse(v.useBy) <= Date.parse(v.preparedAt)) c.addIssue({ code: 'custom', path: ['useBy'], message: 'Use-by must be after preparation' });
});
export type FoodRecord = z.infer<typeof foodSchema>;
export const outcomeSchema = z.object({ id: z.string().min(1), recordId: z.string().min(1), type: z.enum(outcomeTypes), quantity: z.number().finite().positive('Outcome quantity must be greater than zero'), unit: z.enum(units), confirmed: z.boolean(), notes: z.string().max(1000) });
export type Outcome = z.infer<typeof outcomeSchema>;
export const settingsSchema = z.object({ moderate: z.number().min(0).max(99), high: z.number().min(1).max(100), expiryHours: z.number().min(1).max(72) }).refine(v => v.high > v.moderate, 'High threshold must exceed moderate threshold');
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings: Settings = { moderate: 10, high: 25, expiryHours: 24 };
export const keyFor = (r: FoodRecord) => `${r.name.trim().toLowerCase()}|${r.preparedAt}|${r.unit}`;
export function validateFood(input: unknown, records: FoodRecord[] = [], outcomes: Outcome[] = []): FoodRecord {
 const r = foodSchema.parse(input);
 if (records.some(x => x.id !== r.id && keyFor(x) === keyFor(r))) throw new Error('Duplicate record: this food, unit and preparation time already exist');
 const existing = outcomes.filter(o => o.recordId === r.id);
 if (existing.some(o => o.unit !== r.unit)) throw new Error('Cannot change unit while outcomes exist');
 if (existing.reduce((s, o) => s + o.quantity, 0) > r.prepared - r.served) throw new Error('Remaining food cannot be below recorded outcomes');
 return r;
}
export function validateOutcome(input: unknown, records: FoodRecord[], outcomes: Outcome[]): Outcome {
 const o = outcomeSchema.parse(input), r = records.find(x => x.id === o.recordId);
 if (!r) throw new Error('Food record does not exist');
 if (o.unit !== r.unit) throw new Error('Outcome unit must match the food record');
 if (o.type === 'Redistributed' && !o.confirmed) throw new Error('Human safety-check confirmation is required for redistribution');
 if (outcomes.some(x => x.id !== o.id && x.recordId === o.recordId && x.type === o.type)) throw new Error('Duplicate outcome: edit the existing entry for this outcome type');
 const allocated = outcomes.filter(x => x.recordId === o.recordId && x.id !== o.id).reduce((s,x) => s+x.quantity,0);
 if (o.quantity + allocated > r.prepared-r.served + 1e-9) throw new Error('Outcome quantity exceeds unallocated remaining food');
 return o;
}
export function estimate(r: FoodRecord, settings = defaultSettings) {
 const remaining = r.prepared - r.served, surplus = Math.max(0, r.prepared-r.demand), percentage = r.prepared > 0 ? surplus/r.prepared*100 : 0;
 const level = percentage >= settings.high ? 'High' : percentage >= settings.moderate ? 'Moderate' : 'Low';
 return { remaining, surplus, percentage, level, explanation: `max(0, ${r.prepared} − ${r.demand}) = ${format(surplus)} ${r.unit}. ${r.prepared > 0 ? `Surplus ÷ ${r.prepared} × 100 = ${format(percentage)}%.` : 'Percentage is not calculated because prepared quantity is zero.'}`, action: level === 'High' ? 'Review expected demand and reduce the next batch; assess remaining food with your safety team.' : level === 'Moderate' ? 'Monitor service and consider preparing a smaller next batch.' : 'Continue monitoring actual consumption and record final outcomes.' };
}
export function historicalDemand(name: string, unit: FoodRecord['unit'], records: FoodRecord[], before?: string, excludeId?: string) {
 const matching = records.filter(r => r.id !== excludeId && r.name.trim().toLowerCase() === name.trim().toLowerCase() && r.unit === unit && (!before || Date.parse(r.preparedAt) < Date.parse(before)));
 return { count: matching.length, demand: matching.length >= 3 ? matching.reduce((s,r) => s+r.demand,0)/matching.length : null };
}
export type Alert = { id: string; recordId: string; title: string; reason: string; severity: 'High'|'Moderate'|'Low'; action: string };
export function generateAlerts(records: FoodRecord[], settings: Settings, now = Date.now()): Alert[] {
 return records.flatMap(r => {
 const result: Alert[] = [], e = estimate(r,settings);
 const add = (kind: string,title: string,reason: string,severity: Alert['severity'],action: string) => result.push({id:`${r.id}:${kind}:${r.prepared}:${r.served}:${r.demand}:${r.useBy}:${settings.high}:${settings.expiryHours}`,recordId:r.id,title,reason,severity,action});
 if (e.level === 'High') add('surplus','High potential surplus',`${format(e.percentage)}% of prepared food exceeds estimated demand.`, 'High',e.action);
 if (r.demand > r.prepared*2 && r.demand > 0) add('unusual','Unusually high demand',`Estimated demand (${format(r.demand)}) is more than twice prepared food (${format(r.prepared)}).`,'Moderate','Verify demand, attendance and the unit before preparing more food.');
 if (r.prepared === 0) add('zero','No prepared quantity','This record contains zero prepared food.','Low','Confirm this is an intentional zero record or update preparation.');
 if (!r.useBy) add('missing','Use-by information not recorded','No use-by or best-before time is recorded; applicability needs human review.','Low','Record a date when applicable. Never infer food safety from this estimate.');
 if (r.useBy && Date.parse(r.useBy)-now <= settings.expiryHours*3600000 && e.remaining > 0) add('expiry',Date.parse(r.useBy)<now?'Use-by time has passed':'Approaching use-by time',`Recorded use-by: ${new Date(r.useBy).toLocaleString()}. Remaining: ${format(e.remaining)} ${r.unit}.`,Date.parse(r.useBy)<now?'High':'Moderate','Isolate and review the food with a responsible person; do not redistribute without safety checks.');
 return result;
 });
}
export const format = (n: number) => new Intl.NumberFormat('en', {maximumFractionDigits: 2}).format(n);
export function sampleRecords(now = Date.now()): FoodRecord[] {
 const names = ['Rice','Idli','Chapati','Vegetable curry','Sambar','Snacks'];
 return Array.from({length:4},(_,day) => names.map((name,i) => {
 const time = new Date(now - (3-day)*86400000); time.setHours(11,0,0,0);
 const prepared = ([120,180,160,100,100,80][i] ?? 100) + day*5, served = Math.round(prepared * ([0.78,0.9,0.85,0.7,0.92,0.8][i] ?? 0.8));
 return { id:`demo-${day}-${i}`,name, category: categories[i] ?? 'Other',unit:'portions' as const,prepared,served,demand:Math.round(prepared * ([0.8,0.95,0.9,0.72,0.94,0.86][i] ?? 0.8)),preparedAt:time.toISOString(),useBy:new Date(time.getTime()+8*3600000).toISOString(),attendance:180,notes:'Simulated demonstration record, not real operational data.',simulated:true };
 })).flat();
}
export function exportCSV(records: FoodRecord[], outcomes: Outcome[]) {
 const header = ['Food item','Category','Unit','Prepared','Served','Estimated demand','Remaining','Estimated surplus','Prepared at','Use by','Attendance','Notes','Simulated','Reused','Redistributed','Discarded','Under Review'];
 const escape = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replaceAll('"','""')}"`; };
 return [header,...records.map(r => [r.name,r.category,r.unit,r.prepared,r.served,r.demand,estimate(r).remaining,estimate(r).surplus,r.preparedAt,r.useBy,r.attendance,r.notes,r.simulated,...outcomeTypes.map(type=>outcomes.filter(o=>o.recordId===r.id&&o.type===type).reduce((s,o)=>s+o.quantity,0))])].map(row=>row.map(escape).join(',')).join('\r\n');
}
export function errorMessage(e: unknown) { return e instanceof z.ZodError ? e.issues.map(i=>i.message).join('. ') : e instanceof Error ? e.message : 'Something went wrong. Please try again.'; }
const fixture: FoodRecord = { id:'test',name:'Rice',category:'Grains',unit:'portions',prepared:100,served:70,demand:80,preparedAt:'2026-10-13T11:00:00Z',useBy:'2026-10-13T18:00:00Z',attendance:100,notes:'',simulated:true };
const out: Outcome = {id:'out',recordId:'test',type:'Reused',quantity:10,unit:'portions',confirmed:false,notes:''};
const rejected = (fn:()=>unknown) => {try{fn();return false;}catch{return true;}};
export type TestCase = {name:string;expected:string;run:()=>string};
export const testCases: TestCase[] = [
 {name:'Normal food preparation',expected:'Remaining 30; surplus 20; percentage 20',run:()=>{const e=estimate(fixture);return `Remaining ${e.remaining}; surplus ${e.surplus}; percentage ${e.percentage}`;}},
 {name:'High potential surplus',expected:'High',run:()=>estimate({...fixture,demand:50}).level},
 {name:'No leftovers',expected:'0',run:()=>String(estimate({...fixture,served:100}).remaining)},
 {name:'Missing quantities',expected:'Rejected',run:()=>rejected(()=>validateFood({...fixture,prepared:undefined}))?'Rejected':'Accepted'},
 {name:'Negative quantities',expected:'Rejected',run:()=>rejected(()=>validateFood({...fixture,served:-1}))?'Rejected':'Accepted'},
 {name:'Zero prepared quantity',expected:'Surplus 0; percentage 0',run:()=>{const e=estimate(validateFood({...fixture,prepared:0,served:0,demand:0}));return `Surplus ${e.surplus}; percentage ${e.percentage}`;}},
 {name:'Served exceeds prepared',expected:'Rejected',run:()=>rejected(()=>validateFood({...fixture,served:101}))?'Rejected':'Accepted'},
 {name:'Duplicate records',expected:'Rejected',run:()=>rejected(()=>validateFood({...fixture,id:'new'},[fixture]))?'Rejected':'Accepted'},
 {name:'Invalid dates',expected:'Rejected',run:()=>rejected(()=>validateFood({...fixture,preparedAt:'not-a-date'}))?'Rejected':'Accepted'},
 {name:'Approaching use-by dates',expected:'Approaching use-by time',run:()=>generateAlerts([fixture],defaultSettings,Date.parse('2026-10-13T16:00:00Z')).find(a=>a.title==='Approaching use-by time')?.title??'No alert'},
 {name:'Missing historical data',expected:'Explicit demand required',run:()=>historicalDemand('Rice','portions',[]).demand===null?'Explicit demand required':'Estimate supplied'},
 {name:'Historical average demand',expected:'80',run:()=>String(historicalDemand('Rice','portions',[60,80,100].map((demand,i)=>({...fixture,id:`history-${i}`,demand}))).demand)},
 {name:'Unusually high demand',expected:'Unusually high demand',run:()=>generateAlerts([{...fixture,demand:250}],defaultSettings).find(a=>a.title==='Unusually high demand')?.title??'No alert'},
 {name:'Invalid outcome quantity',expected:'Rejected',run:()=>rejected(()=>validateOutcome({...out,quantity:31},[fixture],[]))?'Rejected':'Accepted'},
 {name:'Duplicate outcome entries',expected:'Rejected',run:()=>rejected(()=>validateOutcome({...out,id:'second'},[fixture],[out]))?'Rejected':'Accepted'},
 {name:'Inconsistent units',expected:'Rejected',run:()=>rejected(()=>validateOutcome({...out,unit:'kg'},[fixture],[]))?'Rejected':'Accepted'},
 {name:'Redistribution human confirmation',expected:'Rejected',run:()=>rejected(()=>validateOutcome({...out,type:'Redistributed',confirmed:false},[fixture],[]))?'Rejected':'Accepted'},
 {name:'Use-by before preparation',expected:'Rejected',run:()=>rejected(()=>validateFood({...fixture,useBy:'2026-10-12T11:00:00Z'}))?'Rejected':'Accepted'},
 {name:'Outcome allocation across types',expected:'Rejected',run:()=>rejected(()=>validateOutcome({...out,id:'second',type:'Discarded',quantity:25},[fixture],[out]))?'Rejected':'Accepted'},
];
