import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users, Plus, Trash2, Loader2, CheckCircle, Clock, X, PhoneCall, Pencil, Check,
} from "lucide-react";
import type { WorkerReference, CreateReferenceRequest, UpdateReferenceRequest } from "~backend/workers/references";

type ReferenceStatus = "Pending" | "Contacted" | "Verified" | "Declined";

interface Props {
  references: WorkerReference[];
  onCreate: (req: CreateReferenceRequest) => Promise<WorkerReference>;
  onUpdate: (req: UpdateReferenceRequest) => Promise<WorkerReference>;
  onDelete: (referenceId: string) => Promise<void>;
}

function StatusBadge({ status }: { status: ReferenceStatus }) {
  const cfg: Record<ReferenceStatus, { color: string; icon: React.ReactNode; label: string }> = {
    Pending:   { color: "border-amber-500/40 text-amber-400",   icon: <Clock className="h-3 w-3" />,       label: "Pending" },
    Contacted: { color: "border-blue-500/40 text-blue-400",     icon: <PhoneCall className="h-3 w-3" />,   label: "Contacted" },
    Verified:  { color: "border-green-500/40 text-green-400",   icon: <CheckCircle className="h-3 w-3" />, label: "Verified" },
    Declined:  { color: "border-red-500/40 text-red-400",       icon: <X className="h-3 w-3" />,           label: "Declined" },
  };
  const c = cfg[status] ?? cfg["Pending"];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
}

interface ReferenceFormData {
  refereeName: string;
  refereeTitle: string;
  refereeOrganisation: string;
  refereeEmail: string;
  refereePhone: string;
  relationship: string;
  notes: string;
}

const emptyForm: ReferenceFormData = {
  refereeName: "",
  refereeTitle: "",
  refereeOrganisation: "",
  refereeEmail: "",
  refereePhone: "",
  relationship: "",
  notes: "",
};

interface RefCardProps {
  ref_: WorkerReference;
  onUpdate: (req: UpdateReferenceRequest) => Promise<WorkerReference>;
  onDelete: (id: string) => Promise<void>;
}

function RefCard({ ref_, onUpdate, onDelete }: RefCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<ReferenceFormData>({
    refereeName: ref_.refereeName,
    refereeTitle: ref_.refereeTitle,
    refereeOrganisation: ref_.refereeOrganisation,
    refereeEmail: ref_.refereeEmail ?? "",
    refereePhone: ref_.refereePhone ?? "",
    relationship: ref_.relationship,
    notes: ref_.notes ?? "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        referenceId: ref_.id,
        refereeName: form.refereeName,
        refereeTitle: form.refereeTitle,
        refereeOrganisation: form.refereeOrganisation,
        refereeEmail: form.refereeEmail || undefined,
        refereePhone: form.refereePhone || undefined,
        relationship: form.relationship,
        notes: form.notes || undefined,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(ref_.id);
    } finally {
      setDeleting(false);
    }
  };

  const field = (label: string, key: keyof ReferenceFormData, placeholder?: string) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="h-7 text-xs bg-input border-border text-foreground"
      />
    </div>
  );

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-3">
      {!editing ? (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{ref_.refereeName}</p>
              <StatusBadge status={ref_.status as ReferenceStatus} />
            </div>
            <p className="text-xs text-muted-foreground">{ref_.refereeTitle} &bull; {ref_.refereeOrganisation}</p>
            <p className="text-xs text-muted-foreground/70">{ref_.relationship}</p>
            {(ref_.refereeEmail || ref_.refereePhone) && (
              <p className="text-xs text-muted-foreground/60">
                {[ref_.refereeEmail, ref_.refereePhone].filter(Boolean).join(" | ")}
              </p>
            )}
            {ref_.notes && (
              <p className="text-xs text-muted-foreground/60 italic mt-1">{ref_.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground p-1 h-7 w-7"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-7 w-7"
              title="Delete"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {field("Full Name", "refereeName", "Jane Smith")}
            {field("Job Title", "refereeTitle", "Team Leader")}
            {field("Organisation", "refereeOrganisation", "Acme Care")}
            {field("Relationship", "relationship", "e.g. Direct supervisor")}
            {field("Email", "refereeEmail", "jane@example.com")}
            {field("Phone", "refereePhone", "+61 4XX XXX XXX")}
          </div>
          {field("Notes (optional)", "notes", "Any additional context")}
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs px-3" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReferencesSection({ references, onCreate, onUpdate, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ReferenceFormData>(emptyForm);

  const handleAdd = async () => {
    if (!form.refereeName.trim() || !form.refereeTitle.trim() || !form.refereeOrganisation.trim() || !form.relationship.trim()) {
      setError("Name, title, organisation, and relationship are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        refereeName: form.refereeName.trim(),
        refereeTitle: form.refereeTitle.trim(),
        refereeOrganisation: form.refereeOrganisation.trim(),
        refereeEmail: form.refereeEmail.trim() || undefined,
        refereePhone: form.refereePhone.trim() || undefined,
        relationship: form.relationship.trim(),
        notes: form.notes.trim() || undefined,
      });
      setForm(emptyForm);
      setAdding(false);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to add reference");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof ReferenceFormData, placeholder?: string) => (
    <div className="space-y-1">
      <Label className="text-xs text-foreground">{label}</Label>
      <Input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="bg-input border-border text-foreground text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Add up to 5 professional references. Employers may contact them to verify your work history and character.
        </p>

        {references.length > 0 && (
          <div className="space-y-2">
            {references.map((ref) => (
              <RefCard key={ref.id} ref_={ref} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        )}

        {references.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground/60 italic">No references added yet.</p>
        )}

        {adding && (
          <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Reference</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("Full Name *", "refereeName", "Jane Smith")}
              {field("Job Title *", "refereeTitle", "Team Leader")}
              {field("Organisation *", "refereeOrganisation", "Acme Care")}
              {field("Relationship *", "relationship", "e.g. Direct supervisor")}
              {field("Email", "refereeEmail", "jane@example.com")}
              {field("Phone", "refereePhone", "+61 4XX XXX XXX")}
            </div>
            {field("Notes (optional)", "notes", "Any additional context")}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving} className="h-8 text-sm">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Add Reference
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setForm(emptyForm); setError(null); }} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!adding && references.length < 5 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
            className="border-border text-foreground hover:bg-muted"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Reference
          </Button>
        )}
    </div>
  );
}
