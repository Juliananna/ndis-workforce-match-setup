import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Trash2, AlertTriangle, ChevronDown, ChevronUp,
  Upload, CheckCircle2, XCircle, FileText, ExternalLink
} from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { useToast } from "@/components/ui/use-toast";
import type { SchadRate } from "~backend/admin/schads_rates";

function toEffectiveDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}

const STREAM_COLORS: Record<string, string> = {
  SACS_DISABILITY: "bg-blue-50 text-blue-700 border-blue-200",
  HOME_CARE_DISABILITY: "bg-purple-50 text-purple-700 border-purple-200",
  HOME_CARE_AGED: "bg-orange-50 text-orange-700 border-orange-200",
};

const BASIS_COLORS: Record<string, string> = {
  PERMANENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CASUAL: "bg-amber-50 text-amber-700 border-amber-200",
};

const RATE_COLS = [
  { key: "ordinaryHourlyRate" as const, label: "Ordinary" },
  { key: "saturdayRate" as const,       label: "Saturday" },
  { key: "sundayRate" as const,         label: "Sunday" },
  { key: "publicHolidayRate" as const,  label: "Public Holiday" },
  { key: "afternoonShiftRate" as const, label: "Afternoon Shift" },
  { key: "nightShiftRate" as const,     label: "Night Shift" },
];

interface RateRowProps {
  rate: SchadRate;
  onDelete: () => void;
  expanded: boolean;
  onToggle: () => void;
}

function RateRow({ rate, onDelete, expanded, onToggle }: RateRowProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {rate.level && rate.payPoint && (
            <Badge variant="outline" className="text-xs font-mono shrink-0">
              L{rate.level}{rate.payPoint ? `.${rate.payPoint}` : ""}
            </Badge>
          )}
          <span className="text-sm font-medium text-foreground truncate">{rate.classificationName}</span>
          <span className="text-sm font-bold text-primary shrink-0">${rate.ordinaryHourlyRate.toFixed(2)}/hr</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rate.streamCode && (
            <Badge variant="outline" className={`text-[10px] hidden md:inline-flex ${STREAM_COLORS[rate.streamCode] ?? ""}`}>
              {rate.streamCode.replace(/_/g, " ")}
            </Badge>
          )}
          <Badge variant="outline" className={`text-[10px] ${BASIS_COLORS[rate.employmentBasis] ?? ""}`}>
            {rate.employmentBasis}
          </Badge>
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border bg-muted/10">
          <div className="flex flex-wrap gap-2 mt-3">
            {rate.weeklyRate != null && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border font-medium bg-slate-50 text-slate-700 border-slate-200">
                Weekly: ${rate.weeklyRate.toFixed(2)}
              </span>
            )}
            {RATE_COLS.map(({ key, label }) => {
              const val = rate[key] as number | null;
              if (val == null) return null;
              return (
                <span key={key} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border font-medium bg-blue-50 text-blue-700 border-blue-200">
                  {label}: ${val.toFixed(2)}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-2">
            {rate.classificationCode && (
              <span className="text-xs text-muted-foreground font-mono">Code: {rate.classificationCode}</span>
            )}
            {rate.sourceUrl && (
              <a
                href={rate.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />Source
              </a>
            )}
          </div>
          {rate.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">{rate.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

interface CsvUploadResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function CsvUploadPanel({ api, onSuccess }: { api: ReturnType<typeof useAuthedBackend>; onSuccess: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CsvUploadResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    setUploading(true);
    try {
      if (!api) return;
      const text = await file.text();
      const res = await api.admin.adminUploadSchadRatesCsv({ csvContent: text });
      setResult(res);
      if (res.inserted > 0 || res.updated > 0) {
        toast({ title: `CSV imported: ${res.inserted} added, ${res.updated} updated` });
        onSuccess();
      }
    } catch (e: unknown) {
      console.error(e);
      toast({ title: "CSV upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Upload CSV Rate Sheet</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Upload a <code className="font-mono bg-muted px-1 rounded">01_pay_rates.csv</code> file (MA000100 format).
        Rows are upserted by <code className="font-mono bg-muted px-1 rounded">classification_code + employment_basis + effective_from</code>.
        Historical rates are preserved.
      </p>

      <div
        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Importing {fileName}…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">Drop CSV here or click to browse</p>
            {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {result && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />{result.inserted} inserted
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              {result.updated} updated
            </Badge>
            {result.skipped > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />{result.skipped} skipped
              </Badge>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                  <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{err}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

interface DeleteByDateButtonProps {
  date: string;
  api: ReturnType<typeof useAuthedBackend>;
  onSuccess: () => void;
}

function DeleteByDateButton({ date, api, onSuccess }: DeleteByDateButtonProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    if (!api) return;
    setDeleting(true);
    try {
      const res = await api.admin.adminDeleteSchadRatesByDate({ effectiveDate: date });
      toast({ title: `Deleted ${res.deleted} rates for ${date}` });
      onSuccess();
    } catch (e: unknown) {
      console.error(e);
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive">Delete all rates for {date}?</span>
        <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={handleDelete} disabled={deleting}>
          {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, delete"}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setConfirming(false)}>Cancel</Button>
      </div>
    );
  }

  return (
    <Button
      size="sm" variant="ghost"
      className="h-6 text-xs px-2 text-destructive hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-3 w-3 mr-1" />Delete all
    </Button>
  );
}

export function SchadRatesTab({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const { toast } = useToast();
  const [rates, setRates] = useState<SchadRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!api) return;
    setDeletingId(id);
    try {
      await api.admin.adminDeleteSchadRate({ id });
      toast({ title: "Rate deleted" });
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

  const displayDate = activeDate ?? sortedDates[0] ?? null;
  const displayRates = displayDate ? (groupedByDate[displayDate] ?? []) : [];

  const streamGroups = displayRates.reduce<Record<string, SchadRate[]>>((acc, r) => {
    const key = r.streamName ?? r.streamCode ?? "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">SCHADS Award Rates</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Social, Community, Home Care and Disability Services (MA000100) pay rates. Upload a CSV to add or update rates.
        </p>
      </div>

      <CsvUploadPanel api={api} onSuccess={() => { load(); setActiveDate(null); }} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : rates.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No SCHADS rates loaded yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Upload a CSV file above to import the award rates.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.length > 1 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground font-medium">Effective date:</span>
              {sortedDates.map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDate(d)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    (activeDate === d || (!activeDate && d === sortedDates[0]))
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {d}
                  {d === sortedDates[0] && <span className="ml-1 text-[10px] opacity-70">current</span>}
                </button>
              ))}
            </div>
          )}

          {displayDate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Effective {displayDate}
                </span>
                {displayDate === sortedDates[0] && (
                  <Badge className="text-xs bg-emerald-500/15 text-emerald-600 border-transparent">Current</Badge>
                )}
                <span className="text-xs text-muted-foreground">({displayRates.length} classifications)</span>
              </div>
              <DeleteByDateButton date={displayDate} api={api} onSuccess={() => { load(); setActiveDate(null); }} />
            </div>
          )}

          {Object.entries(streamGroups).map(([streamName, streamRates]) => (
            <div key={streamName} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{streamName}</span>
                <span className="text-xs text-muted-foreground">({streamRates.length})</span>
              </div>
              <div className="space-y-1.5">
                {streamRates.map((rate) => (
                  <div
                    key={rate.id}
                    className={deletingId === rate.id ? "opacity-50 pointer-events-none" : ""}
                  >
                    <RateRow
                      rate={rate}
                      expanded={expandedId === rate.id}
                      onToggle={() => setExpandedId(expandedId === rate.id ? null : rate.id)}
                      onDelete={() => handleDelete(rate.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
