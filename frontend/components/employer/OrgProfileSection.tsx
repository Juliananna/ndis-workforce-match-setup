import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Pencil, Check, X, Plus, Camera, Loader2 } from "lucide-react";
import type { EmployerProfile } from "~backend/employers/profile_get";
import type { UpdateEmployerProfileRequest } from "~backend/employers/profile_update";
import { RatingBadge } from "../reviews/RatingBadge";
import { LocationAutocomplete } from "../LocationAutocomplete";

interface Props {
  profile: EmployerProfile | null;
  onSave: (req: UpdateEmployerProfileRequest) => Promise<EmployerProfile>;
  onUploadLogo?: (file: File) => Promise<void>;
}

const SERVICE_AREAS_SUGGESTIONS = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export function OrgProfileSection({ profile, onSave, onUploadLogo }: Props) {
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadLogo) return;
    setLogoUploading(true);
    try {
      await onUploadLogo(file);
    } finally {
      setLogoUploading(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateEmployerProfileRequest>({});
  const [newArea, setNewArea] = useState("");

  const startEdit = () => {
    setForm({
      organisationName: profile?.organisationName ?? "",
      abn: profile?.abn ?? "",
      location: profile?.location ?? "",
      latitude: profile?.latitude ?? undefined,
      longitude: profile?.longitude ?? undefined,
      serviceAreas: profile?.serviceAreas ?? [],
      contactPerson: profile?.contactPerson ?? "",
      email: profile?.email ?? "",
      phone: profile?.phone ?? "",
      organisationSize: profile?.organisationSize ?? "",
      servicesProvided: profile?.servicesProvided ?? [],
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
      await onSave(form);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const addArea = (area: string) => {
    const current = form.serviceAreas ?? [];
    if (!current.includes(area)) {
      setForm((f) => ({ ...f, serviceAreas: [...current, area] }));
    }
  };

  const removeArea = (area: string) => {
    setForm((f) => ({ ...f, serviceAreas: (f.serviceAreas ?? []).filter((a) => a !== area) }));
  };

  if (!editing) {
    return (
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group shrink-0">
              {profile?.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt="Organisation logo"
                  className="h-12 w-12 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              {onUploadLogo && (
                <button
                  onClick={() => logoFileRef.current?.click()}
                  disabled={logoUploading}
                  className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  {logoUploading ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </button>
              )}
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground">Organisation Profile</h2>
                {profile && <RatingBadge userId={profile.userId} />}
              </div>
              {profile?.organisationName && (
                <p className="text-sm text-muted-foreground">{profile.organisationName}</p>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        </div>

        {profile ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Field label="Organisation Name" value={profile.organisationName} />
            <Field label="ABN" value={profile.abn} />
            <Field label="Contact Person" value={profile.contactPerson} />
            <Field label="Email" value={profile.email} />
            <Field label="Phone" value={profile.phone} />
            <Field label="Location" value={profile.location} />
            <Field label="Organisation Size" value={profile.organisationSize} />
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Service Areas</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.serviceAreas.length > 0
                  ? profile.serviceAreas.map((a) => <Badge key={a} variant="outline" className="text-xs">{a}</Badge>)
                  : <span className="text-muted-foreground">Not set</span>}
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Services Provided</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.servicesProvided.length > 0
                  ? profile.servicesProvided.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)
                  : <span className="text-muted-foreground">Not set</span>}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No profile data yet. Click Edit to fill in your organisation details.</p>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Organisation Profile</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
            <X className="h-3.5 w-3.5 mr-1" />Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            <Check className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Organisation Name" value={form.organisationName ?? ""} onChange={(v) => setForm((f) => ({ ...f, organisationName: v }))} />
        <FormField label="ABN" value={form.abn ?? ""} onChange={(v) => setForm((f) => ({ ...f, abn: v }))} />
        <FormField label="Contact Person" value={form.contactPerson ?? ""} onChange={(v) => setForm((f) => ({ ...f, contactPerson: v }))} />
        <FormField label="Email" type="email" value={form.email ?? ""} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
        <FormField label="Phone" type="tel" value={form.phone ?? ""} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
        <div className="space-y-1">
          <LocationAutocomplete
            label="Location (suburb/city)"
            value={form.location ?? ""}
            onChange={(r) => setForm((f) => ({ ...f, location: r.address, latitude: r.latitude, longitude: r.longitude }))}
            placeholder="Search suburb or address…"
          />
        </div>
        <FormField label="Organisation Size (optional)" value={form.organisationSize ?? ""} onChange={(v) => setForm((f) => ({ ...f, organisationSize: v }))} placeholder="e.g. 1-10, 11-50" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Service Areas</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SERVICE_AREAS_SUGGESTIONS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => (form.serviceAreas ?? []).includes(a) ? removeArea(a) : addArea(a)}
              className={`px-2.5 py-0.5 rounded text-xs border transition-colors ${
                (form.serviceAreas ?? []).includes(a)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Other area…"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newArea.trim()) { addArea(newArea.trim()); setNewArea(""); } }}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => { if (newArea.trim()) { addArea(newArea.trim()); setNewArea(""); } }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Services Provided (optional, one per line)</Label>
        <textarea
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={"e.g.\nComplex care\nCommunity access"}
          value={(form.servicesProvided ?? []).join("\n")}
          onChange={(e) => setForm((f) => ({ ...f, servicesProvided: e.target.value.split("\n").filter((s) => s.trim()) }))}
        />
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );
}
