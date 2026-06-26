import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, CheckCircle, Edit3, MapPin, Car, X, GraduationCap,
  Briefcase, Languages, Award, Shield, ChevronDown, ChevronUp,
} from "lucide-react";
import type { WorkerProfile } from "~backend/workers/profile_get";
import type { UpdateWorkerProfileRequest } from "~backend/workers/profile_update";
import type { WorkHistoryEntry, QualificationEntry, TrainingEntry, CheckEntry } from "~backend/workers/profile_get";
import { LocationAutocomplete } from "../LocationAutocomplete";
import { emailError, phoneError } from "../../lib/validation";

interface Props {
  profile: WorkerProfile | null;
  editing: boolean;
  onEdit: () => void;
  onSave: (req: UpdateWorkerProfileRequest) => Promise<WorkerProfile>;
  onCancel: () => void;
}

function SectionAccordion({ title, icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

export function ProfileSection({ profile, editing, onEdit, onSave, onCancel }: Props) {
  const [form, setForm] = useState<UpdateWorkerProfileRequest>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name,
        phone: profile.phone,
        email: profile.email ?? "",
        fullName: profile.fullName ?? "",
        location: profile.location ?? "",
        suburb: profile.suburb ?? "",
        postcode: profile.postcode ?? "",
        latitude: profile.latitude ?? undefined,
        longitude: profile.longitude ?? undefined,
        travelRadiusKm: profile.travelRadiusKm ?? undefined,
        driversLicense: profile.driversLicense,
        vehicleAccess: profile.vehicleAccess,
        bio: profile.bio ?? "",
        experienceYears: profile.experienceYears ?? undefined,
        experienceLevel: profile.experienceLevel ?? "",
        targetRole: profile.targetRole ?? "",
        previousEmployers: profile.previousEmployers ?? "",
        qualifications: profile.qualifications ?? "",
        ndisScreeningNumber: profile.ndisScreeningNumber ?? "",
        seekingPlacement: profile.seekingPlacement ?? false,
        supportSettings: profile.supportSettings ?? [],
        supportTasks: profile.supportTasks ?? [],
        supportStyle: profile.supportStyle ?? "",
        languages: profile.languages ?? [],
        workHistory: profile.workHistory ?? [],
        qualificationsJson: profile.qualificationsJson ?? [],
        training: profile.training ?? [],
        checks: profile.checks ?? [],
        capabilityStories: profile.capabilityStories ?? [],
      });
      setEmailTouched(false);
      setPhoneTouched(false);
    }
  }, [profile]);

  const [submitted, setSubmitted] = useState(false);

  const emailErr = emailTouched ? emailError(form.email as string ?? "") : null;
  const phoneErr = phoneTouched ? phoneError(form.phone as string ?? "") : null;
  const fullNameErr = submitted && !(form.fullName as string ?? "").trim() ? "Full legal name is required" : null;
  const locationErr = submitted && !(form.location as string ?? "").trim() ? "Location is required" : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPhoneTouched(true);
    setSubmitted(true);
    const eErr = emailError(form.email as string ?? "");
    const pErr = phoneError(form.phone as string ?? "");
    const hasRequired =
      (form.fullName as string ?? "").trim() &&
      (form.location as string ?? "").trim();
    if (eErr || pErr || !hasRequired) {
      setError("Please fill in all required fields");
      return;
    }
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

  const checkbox = (label: string, key: "driversLicense" | "vehicleAccess" | "seekingPlacement") => (
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

  const ReadView = () => (
    <div className="space-y-5">
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

      {profile?.targetRole && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Target Role</p>
          <p className="text-sm text-gray-900">{profile.targetRole}</p>
        </div>
      )}

      {profile?.bio && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Bio</p>
          <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
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
          <span className="text-sm text-gray-500">Travel up to {profile.travelRadiusKm}km</span>
        )}
      </div>

      {profile?.experienceYears != null && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
          <p className="text-sm text-gray-900">
            {profile.experienceYears} year{profile.experienceYears !== 1 ? "s" : ""} in disability support
            {profile.experienceLevel && ` · ${profile.experienceLevel}`}
          </p>
        </div>
      )}

      {profile?.languages && profile.languages.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Languages</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.languages.map((l) => (
              <span key={l} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{l}</span>
            ))}
          </div>
        </div>
      )}

      {profile?.supportSettings && profile.supportSettings.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Support Settings</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.supportSettings.map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">{s}</span>
            ))}
          </div>
        </div>
      )}

      {profile?.supportTasks && profile.supportTasks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Support Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.supportTasks.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">{t}</span>
            ))}
          </div>
        </div>
      )}

      {profile?.workHistory && profile.workHistory.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Work History</p>
          <div className="space-y-3">
            {profile.workHistory.map((w, i) => (
              <div key={i} className="pl-3 border-l-2 border-blue-200">
                <p className="text-sm font-semibold text-gray-900">{w.role}</p>
                <p className="text-xs text-gray-500">{w.employer}</p>
                <p className="text-xs text-gray-400">
                  {w.startDate} – {w.current ? "Present" : (w.endDate ?? "")}
                </p>
                {w.responsibilities && (
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{w.responsibilities}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {profile?.qualificationsJson && profile.qualificationsJson.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Qualifications</p>
          <div className="space-y-2">
            {profile.qualificationsJson.map((q, i) => (
              <div key={i} className="flex items-start gap-2">
                <Award className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{q.name}</p>
                  <p className="text-xs text-gray-500">{q.institution}{q.yearCompleted ? ` · ${q.yearCompleted}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile?.training && profile.training.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Training</p>
          <div className="space-y-1.5">
            {profile.training.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.provider}{t.completionDate ? ` · ${t.completionDate}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile?.ndisScreeningNumber && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">NDIS Worker Screening Number</p>
          <p className="text-sm text-gray-900 font-mono">{profile.ndisScreeningNumber}</p>
        </div>
      )}

      {profile?.seekingPlacement && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700">
          <GraduationCap className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Seeking Work Placement</span>
        </div>
      )}
    </div>
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
          <ReadView />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("Display Name", "name")}

              <div className="space-y-1.5">
                <Label className="text-gray-600 text-xs font-medium">Full Legal Name <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  value={(form.fullName as string) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className={`bg-gray-50 text-gray-900 text-sm rounded-lg ${fullNameErr ? "border-red-400" : "border-gray-200"}`}
                />
                {fullNameErr && <p className="text-xs text-red-600">{fullNameErr}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-600 text-xs font-medium">Email Address</Label>
                <Input
                  type="email"
                  value={(form.email as string) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  onBlur={() => setEmailTouched(true)}
                  className={`bg-gray-50 text-gray-900 text-sm rounded-lg ${emailErr ? "border-red-400" : "border-gray-200"}`}
                />
                {emailErr && <p className="text-xs text-red-600">{emailErr}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-600 text-xs font-medium">Phone</Label>
                <Input
                  type="tel"
                  value={(form.phone as string) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="04XX XXX XXX"
                  className={`bg-gray-50 text-gray-900 text-sm rounded-lg ${phoneErr ? "border-red-400" : "border-gray-200"}`}
                />
                {phoneErr && <p className="text-xs text-red-600">{phoneErr}</p>}
              </div>

              <div className="space-y-1.5">
                <LocationAutocomplete
                  label="Location / Suburb *"
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
                {locationErr && <p className="text-xs text-red-600">{locationErr}</p>}
              </div>

              {field("Postcode", "postcode")}
              {field("Travel Radius (km)", "travelRadiusKm", "number")}
              {field("Years of Experience", "experienceYears", "number")}

              <div className="space-y-1.5">
                <Label className="text-gray-600 text-xs font-medium">Experience Level</Label>
                <select
                  value={(form.experienceLevel as string) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select level</option>
                  <option value="entry">Entry level</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="experienced">Experienced</option>
                  <option value="senior">Senior</option>
                </select>
              </div>

              {field("Target Role", "targetRole")}
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
              <Label className="text-gray-600 text-xs font-medium">Qualifications (summary)</Label>
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
              {checkbox("Seeking Work Placement (uni student)", "seekingPlacement")}
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
                onClick={() => { setSubmitted(false); onCancel(); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {!editing && profile && (
        <div className="px-5 pb-5 space-y-2">
          {(profile.workHistory?.length > 0 || profile.qualificationsJson?.length > 0 || profile.training?.length > 0) && (
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider pt-1">From Resume Builder</p>
          )}

          {profile.workHistory?.length > 0 && (
            <SectionAccordion title={`Work History (${profile.workHistory.length})`} icon={<Briefcase className="h-3.5 w-3.5 text-blue-500" />}>
              <div className="space-y-3">
                {profile.workHistory.map((w, i) => (
                  <div key={i} className="pl-3 border-l-2 border-blue-100">
                    <p className="text-sm font-semibold text-gray-800">{w.role}</p>
                    <p className="text-xs text-gray-500">{w.employer}</p>
                    <p className="text-xs text-gray-400">{w.startDate} – {w.current ? "Present" : (w.endDate ?? "")}</p>
                    {w.clientGroups?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {w.clientGroups.map((g) => (
                          <span key={g} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{g}</span>
                        ))}
                      </div>
                    )}
                    {w.responsibilities && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{w.responsibilities}</p>}
                  </div>
                ))}
              </div>
            </SectionAccordion>
          )}

          {profile.qualificationsJson?.length > 0 && (
            <SectionAccordion title={`Qualifications (${profile.qualificationsJson.length})`} icon={<Award className="h-3.5 w-3.5 text-amber-500" />}>
              <div className="space-y-2">
                {profile.qualificationsJson.map((q, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Award className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{q.name}</p>
                      <p className="text-xs text-gray-500">{q.institution}{q.yearCompleted ? ` · ${q.yearCompleted}` : ""}</p>
                      {q.level && <p className="text-xs text-gray-400">{q.level}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </SectionAccordion>
          )}

          {profile.training?.length > 0 && (
            <SectionAccordion title={`Training (${profile.training.length})`} icon={<Shield className="h-3.5 w-3.5 text-green-500" />}>
              <div className="space-y-2">
                {profile.training.map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Shield className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.provider}{t.completionDate ? ` · ${t.completionDate}` : ""}</p>
                      {t.expiryDate && <p className="text-xs text-amber-600">Expires: {t.expiryDate}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </SectionAccordion>
          )}

          {profile.capabilityStories?.length > 0 && (
            <SectionAccordion title={`Capability Stories (${profile.capabilityStories.length})`} icon={<GraduationCap className="h-3.5 w-3.5 text-purple-500" />}>
              <div className="space-y-4">
                {profile.capabilityStories.map((s, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">{s.skill}</p>
                    <p className="text-xs text-gray-600"><span className="font-medium">Situation:</span> {s.situation}</p>
                    <p className="text-xs text-gray-600"><span className="font-medium">Action:</span> {s.action}</p>
                    <p className="text-xs text-gray-600"><span className="font-medium">Outcome:</span> {s.outcome}</p>
                  </div>
                ))}
              </div>
            </SectionAccordion>
          )}

          {profile.languages?.length > 0 && (
            <SectionAccordion title={`Languages (${profile.languages.length})`} icon={<Languages className="h-3.5 w-3.5 text-teal-500" />}>
              <div className="flex flex-wrap gap-1.5">
                {profile.languages.map((l) => (
                  <span key={l} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">{l}</span>
                ))}
              </div>
            </SectionAccordion>
          )}
        </div>
      )}
    </div>
  );
}
