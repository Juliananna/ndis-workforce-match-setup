import { useState, useEffect, useCallback } from "react";

function toEffectiveDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, X, Check, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { useToast } from "@/components/ui/use-toast";
import type { SchadRate } from "~backend/admin/schads_rates";

const RATE_TYPES = [
  { key: "hourlyRate",        label: "Ordinary",      color: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "casualLoadingRate", label: "Casual",         color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "eveningRate",       label: "Evening",        color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "saturdayRate",      label: "Saturday",       color: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "sundayRate",        label: "Sunday",         color: "bg-red-50 text-red-700 border-red-200" },
  { key: "publicHolidayRate", label: "Public Holiday", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { key: "sleepooverRate",    label: "Sleepover",      color: "bg-slate-50 text-slate-700 border-slate-200" },
] as const;

interface RateFormData {
  level: string;
  payPoint: string;
  classification: string;
  hourlyRate: string;
  casualLoadingRate: string;
  saturdayRate: string;
  sundayRate: string;
  publicHolidayRate: string;
  eveningRate: string;
  sleepooverRate: string;
  notes: string;
  effectiveDate: string;
}

const emptyForm = (): RateFormData => ({
  level: "",
  payPoint: "",
  classification: "",
  hourlyRate: "",
  casualLoadingRate: "",
  saturdayRate: "",
  sundayRate: "",
  publicHolidayRate: "",
  eveningRate: "",
  sleepooverRate: "",
  notes: "",
  effectiveDate: new Date().toISOString().slice(0, 10),
});

function rateToForm(r: SchadRate): RateFormData {
  return {
    level: r.level,
    payPoint: r.payPoint,
    classification: r.classification,
    hourlyRate: r.hourlyRate.toFixed(4),
    casualLoadingRate: r.casualLoadingRate != null ? r.casualLoadingRate.toFixed(4) : "",
    saturdayRate: r.saturdayRate != null ? r.saturdayRate.toFixed(4) : "",
    sundayRate: r.sundayRate != null ? r.sundayRate.toFixed(4) : "",
    publicHolidayRate: r.publicHolidayRate != null ? r.publicHolidayRate.toFixed(4) : "",
    eveningRate: r.eveningRate != null ? r.eveningRate.toFixed(4) : "",
    sleepooverRate: r.sleepooverRate != null ? r.sleepooverRate.toFixed(4) : "",
    notes: r.notes ?? "",
    effectiveDate: toEffectiveDateStr(r.effectiveDate),
  };
}

function parseOpt(v: string): number | undefined {
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

interface RateFormProps {
  initial?: SchadRate;
  onSave: (data: RateFormData) => Promise<void>;
  onCancel: () => void;
}

function RateForm({ initial, onSave, onCancel }: RateFormProps) {
  const [form, setForm] = useState<RateFormData>(initial ? rateToForm(initial) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof RateFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.level.trim()) { setError("Level is required"); return; }
    if (!form.payPoint.trim()) { setError("Pay point is required"); return; }
    if (!form.classification.trim()) { setError("Classification is required"); return; }
    if (!form.hourlyRate || isNaN(parseFloat(form.hourlyRate))) { setError("Ordinary hourly rate is required"); return; }
    if (!form.effectiveDate) { setError("Effective date is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Level *</Label>
          <Input className="h-8 text-sm" value={form.level} onChange={(e) => set("level", e.target.value)} placeholder="e.g. 2" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Pay Point *</Label>
          <Input className="h-8 text-sm" value={form.payPoint} onChange={(e) => set("payPoint", e.target.value)} placeholder="e.g. 1" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Effective Date *</Label>
          <Input className="h-8 text-sm" type="date" value={form.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Classification *</Label>
        <Input className="h-8 text-sm" value={form.classification} onChange={(e) => set("classification", e.target.value)} placeholder="e.g. Social and Community Services Level 2 Pay Point 1" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {RATE_TYPES.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label} ($/hr){key === "hourlyRate" ? " *" : ""}</Label>
            <Input
              className="h-8 text-sm"
              type="number"
              step="0.0001"
              min={0}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder="0.00"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Input className="h-8 text-sm" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes about this pay level" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          {initial ? "Save changes" : "Add rate"}
        </Button>
      </div>
    </div>
  );
}

interface RateRowProps {
  rate: SchadRate;
  onEdit: () => void;
  onDelete: () => void;
  expanded: boolean;
  onToggle: () => void;
}

function RateRow({ rate, onEdit, onDelete, expanded, onToggle }: RateRowProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge variant="outline" className="text-xs font-mono shrink-0">L{rate.level}.{rate.payPoint}</Badge>
          <span className="text-sm font-medium text-foreground truncate">{rate.classification}</span>
          <span className="text-sm font-bold text-primary shrink-0">${rate.hourlyRate.toFixed(2)}/hr</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">eff. {toEffectiveDateStr(rate.effectiveDate)}</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border bg-muted/10">
          <div className="flex flex-wrap gap-2 mt-3">
            {RATE_TYPES.map(({ key, label, color }) => {
              const val = rate[key as keyof SchadRate] as number | null;
              if (val == null) return null;
              return (
                <span key={key} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border font-medium ${color}`}>
                  {label}: ${val.toFixed(2)}
                </span>
              );
            })}
          </div>
          {rate.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">{rate.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function SchadRatesTab({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const { toast } = useToast();
  const [rates, setRates] = useState<SchadRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.admin.adminListSchadRates();
      setRates(res.rates);
    } catch (e: unknown) {
      console.error(e);
      toast({ title: "Failed to load SCHADS rates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (data: RateFormData) => {
    if (!api) return;
    await api.admin.adminCreateSchadRate({
      level: data.level,
      payPoint: data.payPoint,
      classification: data.classification,
      hourlyRate: parseFloat(data.hourlyRate),
      casualLoadingRate: parseOpt(data.casualLoadingRate),
      saturdayRate: parseOpt(data.saturdayRate),
      sundayRate: parseOpt(data.sundayRate),
      publicHolidayRate: parseOpt(data.publicHolidayRate),
      eveningRate: parseOpt(data.eveningRate),
      sleepooverRate: parseOpt(data.sleepooverRate),
      notes: data.notes || undefined,
      effectiveDate: data.effectiveDate,
    });
    setShowAddForm(false);
    toast({ title: "SCHADS rate added" });
    await load();
  };

  const handleUpdate = async (id: string, data: RateFormData) => {
    if (!api) return;
    await api.admin.adminUpdateSchadRate({
      id,
      level: data.level,
      payPoint: data.payPoint,
      classification: data.classification,
      hourlyRate: parseFloat(data.hourlyRate),
      casualLoadingRate: parseOpt(data.casualLoadingRate) ?? null,
      saturdayRate: parseOpt(data.saturdayRate) ?? null,
      sundayRate: parseOpt(data.sundayRate) ?? null,
      publicHolidayRate: parseOpt(data.publicHolidayRate) ?? null,
      eveningRate: parseOpt(data.eveningRate) ?? null,
      sleepooverRate: parseOpt(data.sleepooverRate) ?? null,
      notes: data.notes || null,
      effectiveDate: data.effectiveDate,
    });
    setEditingId(null);
    toast({ title: "SCHADS rate updated" });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!api) return;
    setDeletingId(id);
    try {
      await api.admin.adminDeleteSchadRate({ id });
      toast({ title: "SCHADS rate deleted" });
      await load();
    } catch (e: unknown) {
      console.error(e);
      toast({ title: "Failed to delete rate", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const groupedByDate = rates.reduce<Record<string, SchadRate[]>>((acc, r) => {
    const key = toEffectiveDateStr(r.effectiveDate);
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">SCHADS Award Rates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage Social, Community, Home Care and Disability Services pay rates. Employers can reference these during offer negotiations.
          </p>
        </div>
        <Button size="sm" onClick={() => { setShowAddForm(true); setEditingId(null); }} className="shrink-0">
          <Plus className="h-3.5 w-3.5 mr-1" />Add rate
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">New SCHADS Rate</h3>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <RateForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : rates.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No SCHADS rates configured yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Add rate" to add the first award rate.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Effective {date}
                </span>
                {date === sortedDates[0] && (
                  <Badge className="text-xs bg-emerald-500/15 text-emerald-600 border-transparent">Current</Badge>
                )}
              </div>
              <div className="space-y-2">
                {groupedByDate[date].map((rate) =>
                  editingId === rate.id ? (
                    <Card key={rate.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground">Edit L{rate.level}.{rate.payPoint}</h3>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <RateForm
                        initial={rate}
                        onSave={(data) => handleUpdate(rate.id, data)}
                        onCancel={() => setEditingId(null)}
                      />
                    </Card>
                  ) : (
                    <div key={rate.id} className={deletingId === rate.id ? "opacity-50 pointer-events-none" : ""}>
                      <RateRow
                        rate={rate}
                        expanded={expandedId === rate.id}
                        onToggle={() => setExpandedId(expandedId === rate.id ? null : rate.id)}
                        onEdit={() => { setEditingId(rate.id); setShowAddForm(false); }}
                        onDelete={() => handleDelete(rate.id)}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
