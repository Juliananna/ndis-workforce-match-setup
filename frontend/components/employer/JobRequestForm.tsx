import { useState } from "react";
import { Briefcase, Calendar, Wallet, MapPin, Plus, X, Zap, Cloud, CheckCircle2, ChevronDown } from "lucide-react";
import type { CreateJobRequestRequest } from "~backend/jobs/create";
import { LocationAutocomplete } from "../LocationAutocomplete";

const SUPPORT_TYPE_TAGS = [
  "Autism support",
  "Intellectual disability",
  "Mobility support",
  "Personal care",
  "Behavioural support",
  "Community participation",
  "Medication administration",
  "Complex care",
  "PEG feeding",
  "Wound care",
  "Mental health support",
];

const SUPPORT_TYPE_LABELS: Record<string, string> = {
  "Autism support": "Autism Support",
  "Intellectual disability": "Intellectual Disability",
  "Mobility support": "Mobility Support",
  "Personal care": "Personal Care",
  "Behavioural support": "Behavioural Support",
  "Community participation": "Social & Civic Participation",
  "Medication administration": "Medication Admin",
  "Complex care": "Complex Care",
  "PEG feeding": "PEG Feeding",
  "Wound care": "Wound Care",
  "Mental health support": "Mental Health",
};

interface Props {
  onSubmit: (req: CreateJobRequestRequest) => Promise<void>;
  onCancel: () => void;
}

type JobType = "shift" | "general";

export function JobRequestForm({ onSubmit, onCancel }: Props) {
  const [jobType, setJobType] = useState<JobType>("shift");
  const [jobTitle, setJobTitle] = useState("");
  const [supportType, setSupportType] = useState("");
  const [description, setDescription] = useState("");
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [frequency, setFrequency] = useState<"one-off" | "recurring">("one-off");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState(false);
  const [hourlyRate, setHourlyRate] = useState("55.00");
  const [isEmergency, setIsEmergency] = useState(false);
  const [responseDeadline, setResponseDeadline] = useState("");
  const [genderPref, setGenderPref] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const removeSkill = (skill: string) => setSkills((s) => s.filter((x) => x !== skill));

  const addSkill = (tag: string) => {
    if (!skills.includes(tag)) setSkills((s) => [...s, tag]);
    setSkillInput(false);
  };

  const computeShiftDuration = (): number | undefined => {
    if (!startTime || !endTime) return undefined;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
    return diff > 0 ? diff : undefined;
  };

  const handleSubmit = async (status: "Draft" | "Open") => {
    setError(null);
    const duration = jobType === "shift" ? computeShiftDuration() : undefined;
    const rate = parseFloat(hourlyRate) || 0;
    const supportTags = skills.length > 0 ? skills : supportType ? [supportType] : [];

    if (!location.trim()) { setError("Location is required."); return; }
    if (supportTags.length === 0) { setError("At least one support type or skill is required."); return; }

    const req: CreateJobRequestRequest = {
      jobType,
      jobTitle: jobTitle || undefined,
      location,
      latitude,
      longitude,
      supportTypeTags: supportTags,
      clientNotes: description || undefined,
      weekdayRate: rate,
      weekendRate: rate,
      publicHolidayRate: rate,
      genderPreference: genderPref as CreateJobRequestRequest["genderPreference"] || undefined,
      status,
      isEmergency,
      responseDeadline: responseDeadline || undefined,
    };

    if (jobType === "shift") {
      req.shiftDate = shiftDate;
      req.shiftStartTime = startTime;
      req.shiftDurationHours = duration ?? 1;
    }

    setSaving(true);
    try {
      await onSubmit(req);
      setLastSaved("Just now");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save job request");
      setSaving(false);
    }
  };

  const availableSkills = SUPPORT_TYPE_TAGS.filter((t) => !skills.includes(t));

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Job Request</h2>
          <p className="text-gray-500 text-sm mt-1">Help us find the perfect match for your care needs.</p>
        </div>

        <div className="flex gap-3 mb-2">
          <button
            onClick={() => setJobType("shift")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
              jobType === "shift"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            Specific Shift
          </button>
          <button
            onClick={() => setJobType("general")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
              jobType === "general"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            General Job
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900">Job Basics</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Community Access Support"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Support Type</label>
              <div className="relative">
                <select
                  value={supportType}
                  onChange={(e) => setSupportType(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors bg-white"
                >
                  <option value="">Select support type…</option>
                  {SUPPORT_TYPE_TAGS.map((t) => (
                    <option key={t} value={t}>{SUPPORT_TYPE_LABELS[t] ?? t}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Describe the Role</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share specific details about daily activities and goals..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors resize-none"
            />
          </div>
        </section>

        {jobType === "shift" && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-violet-600" />
              </div>
              <h3 className="font-bold text-gray-900">Schedule &amp; Location</h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Frequency</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFrequency("one-off")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                      frequency === "one-off"
                        ? "border-blue-600 text-blue-700 bg-blue-50"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    One-off
                  </button>
                  <button
                    onClick={() => setFrequency("recurring")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                      frequency === "recurring"
                        ? "border-blue-600 text-blue-700 bg-blue-50"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    Recurring
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
                <LocationAutocomplete
                  value={location}
                  onChange={(result) => {
                    setLocation(result.address);
                    setLatitude(result.latitude);
                    setLongitude(result.longitude);
                  }}
                  placeholder="Enter suburb or postcode"
                />
              </div>
            </div>
          </section>
        )}

        {jobType === "general" && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-violet-600" />
              </div>
              <h3 className="font-bold text-gray-900">Location</h3>
            </div>
            <LocationAutocomplete
              value={location}
              onChange={(result) => {
                setLocation(result.address);
                setLatitude(result.latitude);
                setLongitude(result.longitude);
              }}
              placeholder="Enter suburb or postcode"
            />
          </section>
        )}

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-rose-500" />
            </div>
            <h3 className="font-bold text-gray-900">Requirements &amp; Budget</h3>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Specific Skills / Qualifications</label>
            <div className="flex flex-wrap gap-2 items-center">
              {skills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="text-gray-400 hover:text-gray-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <div className="relative">
                <button
                  onClick={() => setSkillInput(!skillInput)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-full text-sm font-medium hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Skill
                </button>
                {skillInput && availableSkills.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1 min-w-52">
                    {availableSkills.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => addSkill(tag)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Hourly Rate (AUD)</label>
            <div className="relative max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
            </div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mt-1.5 font-medium">Standard NDIS pricing caps apply</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Worker Gender Preference</label>
            <div className="flex gap-2">
              {["No preference", "Male", "Female"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGenderPref(genderPref === g ? "" : g)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                    genderPref === g
                      ? "border-blue-600 text-blue-700 bg-blue-50"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 flex items-center gap-3">
            <Zap className="h-4 w-4 text-orange-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-700">Emergency Shift</p>
              <p className="text-xs text-orange-600 mt-0.5">Workers will be notified immediately when published.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </label>
          </div>

          {isEmergency && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Response Deadline (optional)</label>
              <input
                type="datetime-local"
                value={responseDeadline}
                onChange={(e) => setResponseDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
            </div>
          )}
        </section>

        <div className="flex items-center justify-between pb-4">
          <button
            onClick={() => handleSubmit("Draft")}
            disabled={saving}
            className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit("Open")}
              disabled={saving}
              className="flex items-center gap-2 px-7 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-60"
            >
              Publish Job
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>

      <aside className="w-72 shrink-0 hidden lg:flex flex-col gap-4 sticky top-20">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h4 className="font-bold text-gray-900 text-sm">Finding the right Care Partner</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            A clear description helps support workers understand not just the tasks, but the person behind the care. This increases your match rate by up to 45%.
          </p>
          <ul className="space-y-2">
            {[
              "Highlight personality traits you value",
              "Be specific about shift boundaries",
              "Mention hobbies or interests",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-600">{tip}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-center py-4">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-100 to-purple-200 flex items-center justify-center">
              <div className="flex gap-1 items-end">
                <div className="w-6 h-10 rounded-t-full bg-amber-300" />
                <div className="w-6 h-14 rounded-t-full bg-indigo-400" />
                <div className="w-6 h-10 rounded-t-full bg-rose-300" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 rounded-full bg-rose-100 flex items-center justify-center">
              <span className="text-rose-500 text-xs font-bold">!</span>
            </div>
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">Quick Tip</p>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {jobType === "shift"
              ? 'Use "Recurring" to build a consistent routine with one support worker. This promotes continuity of care.'
              : 'General jobs attract workers looking for ongoing roles. Be clear about expected hours per week.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400 font-medium">Last saved</p>
            <p className="text-sm font-semibold text-gray-700">{lastSaved ?? "Not yet saved"}</p>
          </div>
          <Cloud className="h-5 w-5 text-gray-300" />
        </div>
      </aside>
    </div>
  );
}
