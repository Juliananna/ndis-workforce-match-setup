import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Edit3, MapPin, Car, X } from "lucide-react";
import type { WorkerProfile } from "~backend/workers/profile_get";
import type { UpdateWorkerProfileRequest } from "~backend/workers/profile_update";
import { LocationAutocomplete } from "../LocationAutocomplete";

interface Props {
  profile: WorkerProfile | null;
  editing: boolean;
  onEdit: () => void;
  onSave: (req: UpdateWorkerProfileRequest) => Promise<WorkerProfile>;
  onCancel: () => void;
}

export function ProfileSection({ profile, editing, onEdit, onSave, onCancel }: Props) {
  const [form, setForm] = useState<UpdateWorkerProfileRequest>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name,
        phone: profile.phone,
        email: profile.email ?? "",
        fullName: profile.fullName ?? "",
        location: profile.location ?? "",
        travelRadiusKm: profile.travelRadiusKm ?? undefined,
        driversLicense: profile.driversLicense,
        vehicleAccess: profile.vehicleAccess,
        bio: profile.bio ?? "",
        experienceYears: profile.experienceYears ?? undefined,
        previousEmployers: profile.previousEmployers ?? "",
        qualifications: profile.qualifications ?? "",
        ndisScreeningNumber: profile.ndisScreeningNumber ?? "",
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof UpdateWorkerProfileRequest, type = "text") => (
    <div className="space-y-1.5">
      <Label className="text-gray-600 text-xs font-medium">{label}</Label>
      <Input
        type={type}
        value={(form[key] as string | number | undefined) ?? ""}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            [key]: type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value,
          }))
        }
        className="bg-gray-50 border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );

  const checkbox = (label: string, key: "driversLicense" | "vehicleAccess") => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={!!form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
        className="h-4 w-4 rounded border-gray-300 accent-blue-600"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">Personal Details</h3>
        </div>
        {!editing && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      <div className="p-5">
        {!editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-sm text-gray-900 font-medium">{profile?.fullName || profile?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                <p className="text-sm text-gray-900 font-medium">{profile?.phone || "—"}</p>
              </div>
            </div>

            {profile?.bio && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Bio</p>
                <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {profile?.qualifications && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Qualifications</p>
                <p className="text-sm text-gray-700 leading-relaxed">{profile.qualifications}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
              {profile?.location && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile?.driversLicense && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Car className="h-3.5 w-3.5 text-gray-400" />
                  <span>Driver's Licence</span>
                </div>
              )}
              {profile?.vehicleAccess && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Car className="h-3.5 w-3.5 text-gray-400" />
                  <span>Own Vehicle</span>
                </div>
              )}
              {profile?.travelRadiusKm && (
                <span className="text-sm text-gray-500">
                  Travel up to {profile.travelRadiusKm}km
                </span>
              )}
            </div>

            {profile?.experienceYears && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
                <p className="text-sm text-gray-900">{profile.experienceYears} years in disability support</p>
              </div>
            )}

            {profile?.ndisScreeningNumber && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">NDIS Worker Screening Number</p>
                <p className="text-sm text-gray-900 font-mono">{profile.ndisScreeningNumber}</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("Display Name", "name")}
              {field("Full Legal Name", "fullName")}
              {field("Email Address", "email", "email")}
              {field("Phone", "phone")}
              <LocationAutocomplete
                label="Location / Suburb"
                value={(form.location as string) ?? ""}
                onChange={(result) =>
                  setForm((f) => ({
                    ...f,
                    location: result.address,
                    latitude: result.latitude,
                    longitude: result.longitude,
                  }))
                }
              />
              {field("Travel Radius (km)", "travelRadiusKm", "number")}
              {field("Years of Experience", "experienceYears", "number")}
            {field("NDIS Worker Screening Number", "ndisScreeningNumber")}
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-600 text-xs font-medium">Bio</Label>
              <textarea
                value={(form.bio as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell participants and employers about yourself..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-600 text-xs font-medium">Qualifications</Label>
              <textarea
                value={(form.qualifications as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, qualifications: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Certificates, diplomas, nursing registration..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-600 text-xs font-medium">Previous Employers</Label>
              <textarea
                value={(form.previousEmployers as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, previousEmployers: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Previous NDIS employers or support roles..."
              />
            </div>

            <div className="flex flex-wrap gap-4">
              {checkbox("Driver's Licence", "driversLicense")}
              {checkbox("Own Vehicle", "vehicleAccess")}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                {saved ? "Saved!" : "Save Profile"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
