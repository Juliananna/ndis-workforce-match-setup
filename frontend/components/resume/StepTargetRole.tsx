import { ROLE_OPTIONS } from "./types";
import type { SessionData } from "./types";

interface Props {
  data: SessionData;
  onChange: (field: string, value: any) => void;
}

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry level", sub: "Less than 1 year in disability / care" },
  { value: "intermediate", label: "Intermediate", sub: "1–3 years experience" },
  { value: "experienced", label: "Experienced", sub: "3–7 years experience" },
  { value: "senior", label: "Senior / Complex care", sub: "7+ years or specialist clinical background" },
];

export function StepTargetRole({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Your Target Role</h2>
        <p className="text-sm text-slate-500">Help us tailor your resume to the right NDIS support role.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Target role title</label>
        <select
          value={data.targetRole ?? ""}
          onChange={(e) => onChange("targetRole", e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
        >
          <option value="">Select a role</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
          <option value="Other">Other (I'll type it below)</option>
        </select>
        {data.targetRole === "Other" && (
          <input
            type="text"
            placeholder="Enter your role title"
            className="mt-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            onChange={(e) => onChange("targetRole", e.target.value)}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Experience level</label>
        <div className="space-y-2">
          {EXPERIENCE_LEVELS.map((level) => (
            <label
              key={level.value}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                data.experienceLevel === level.value
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="experienceLevel"
                value={level.value}
                checked={data.experienceLevel === level.value}
                onChange={() => onChange("experienceLevel", level.value)}
                className="mt-0.5 accent-teal-600"
              />
              <div>
                <div className="font-medium text-slate-800 text-sm">{level.label}</div>
                <div className="text-xs text-slate-500">{level.sub}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          How many years have you worked in disability / care?
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={40}
            value={data.experienceYears ?? ""}
            onChange={(e) => onChange("experienceYears", Number(e.target.value))}
            placeholder="e.g. 3"
            className="w-24 px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          />
          <span className="text-sm text-slate-500">years</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">Include aged care, childcare or similar if relevant.</p>
      </div>
    </div>
  );
}
