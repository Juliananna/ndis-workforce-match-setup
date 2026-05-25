import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Pencil, Check, X, Plus } from "lucide-react";
import type { EmployerProfile } from "~backend/employers/profile_get";
import type { UpdateEmployerProfileRequest } from "~backend/employers/profile_update";

interface Props {
  profile: EmployerProfile | null;
  onSave: (req: UpdateEmployerProfileRequest) => Promise<EmployerProfile>;
}

interface PlacementForm {
  canHostStudents: boolean;
  placementSupervisionAvailable: boolean;
  placementServiceAreas: string[];
  maxStudentsPerMonth: number | null;
  openToEntryLevelWorkers: boolean;
}

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export function PlacementSettingsSection({ profile, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newArea, setNewArea] = useState("");

  const [form, setForm] = useState<PlacementForm>({
    canHostStudents: false,
    placementSupervisionAvailable: false,
    placementServiceAreas: [],
    maxStudentsPerMonth: null,
    openToEntryLevelWorkers: false,
  });

  const startEdit = () => {
    setForm({
      canHostStudents: profile?.canHostStudents ?? false,
      placementSupervisionAvailable: profile?.placementSupervisionAvailable ?? false,
      placementServiceAreas: profile?.placementServiceAreas ?? [],
      maxStudentsPerMonth: profile?.maxStudentsPerMonth ?? null,
      openToEntryLevelWorkers: profile?.openToEntryLevelWorkers ?? false,
    });
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        canHostStudents: form.canHostStudents,
        placementSupervisionAvailable: form.placementSupervisionAvailable,
        placementServiceAreas: form.placementServiceAreas,
        maxStudentsPerMonth: form.maxStudentsPerMonth ?? undefined,
        openToEntryLevelWorkers: form.openToEntryLevelWorkers,
      });
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleArea = (area: string) => {
    setForm((f) => ({
      ...f,
      placementServiceAreas: f.placementServiceAreas.includes(area)
        ? f.placementServiceAreas.filter((a) => a !== area)
        : [...f.placementServiceAreas, area],
    }));
  };

  const addCustomArea = () => {
    const t = newArea.trim();
    if (t && !form.placementServiceAreas.includes(t)) {
      setForm((f) => ({ ...f, placementServiceAreas: [...f.placementServiceAreas, t] }));
    }
    setNewArea("");
  };

  const activeProfile = profile;
  const canHost = activeProfile?.canHostStudents ?? false;
  const supervision = activeProfile?.placementSupervisionAvailable ?? false;
  const areas = activeProfile?.placementServiceAreas ?? [];
  const maxStudents = activeProfile?.maxStudentsPerMonth ?? null;
  const entryLevel = activeProfile?.openToEntryLevelWorkers ?? false;

  if (!editing) {
    return (
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-teal-600" />
            <h2 className="font-semibold text-foreground">Student Placement Settings</h2>
            {canHost && (
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                Open to students
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Indicate whether your organisation is open to hosting NDIS training students for work placement or entry-level workers. This information helps students preparing for placement find providers open to discussing opportunities.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <BoolField label="Can host placement students" value={canHost} />
          <BoolField label="Supervision available" value={supervision} />
          <BoolField label="Open to entry-level workers" value={entryLevel} />
          <div>
            <p className="text-xs text-muted-foreground">Max students per month</p>
            <p className="text-sm text-foreground">{maxStudents !== null ? maxStudents : <span className="text-muted-foreground italic">Not set</span>}</p>
          </div>
          {areas.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Placement service areas</p>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((a) => (
                  <span key={a} className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          This information is used to help connect placement-ready students with providers open to discussions. Formal placement arrangements remain between the student, their RTO, and your organisation.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-teal-600" />
          <h2 className="font-semibold text-foreground">Student Placement Settings</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
            <X className="h-3.5 w-3.5 mr-1" />Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Check className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-4">
        <CheckboxField
          id="can_host"
          label="We can host NDIS students for work placement"
          checked={form.canHostStudents}
          onChange={(v) => setForm((f) => ({ ...f, canHostStudents: v }))}
        />
        <CheckboxField
          id="supervision"
          label="We can provide placement supervision"
          checked={form.placementSupervisionAvailable}
          onChange={(v) => setForm((f) => ({ ...f, placementSupervisionAvailable: v }))}
        />
        <CheckboxField
          id="entry_level"
          label="Open to entry-level support workers"
          checked={form.openToEntryLevelWorkers}
          onChange={(v) => setForm((f) => ({ ...f, openToEntryLevelWorkers: v }))}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Maximum students per month <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="number"
            min={0}
            value={form.maxStudentsPerMonth ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, maxStudentsPerMonth: e.target.value ? Number(e.target.value) : null }))}
            placeholder="e.g. 2"
            className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Placement service areas</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {AU_STATES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleArea(a)}
                className={`px-2.5 py-0.5 rounded text-xs border transition-colors ${
                  form.placementServiceAreas.includes(a)
                    ? "bg-teal-600 text-white border-teal-600"
                    : "border-border text-muted-foreground hover:border-teal-500 hover:text-teal-700"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Other suburb/region…"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomArea(); } }}
              className="flex-1 h-8 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" variant="outline" type="button" onClick={addCustomArea}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Selecting these options does not commit your organisation to any placement agreement. Students will be able to indicate they're interested in connecting with you to discuss placement opportunities.
      </p>
    </Card>
  );
}

function BoolField({ label, value }: { label: string; value: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${value ? "text-teal-700" : "text-muted-foreground"}`}>
        {value ? "Yes" : "No"}
      </p>
    </div>
  );
}

function CheckboxField({
  id, label, checked, onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      />
      <label htmlFor={id} className="text-sm text-foreground">{label}</label>
    </div>
  );
}
