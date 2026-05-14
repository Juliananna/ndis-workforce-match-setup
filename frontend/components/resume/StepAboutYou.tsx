import { AUSTRALIAN_STATES } from "./types";
import type { SessionData } from "./types";

interface Props {
  data: SessionData;
  onChange: (field: string, value: any) => void;
}

export function StepAboutYou({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">About You</h2>
        <p className="text-sm text-slate-500">Your basic details help us personalise your resume.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">First name</label>
          <input
            type="text"
            value={data.firstName ?? ""}
            onChange={(e) => onChange("firstName", e.target.value)}
            placeholder="e.g. Sarah"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Last name</label>
          <input
            type="text"
            value={data.lastName ?? ""}
            onChange={(e) => onChange("lastName", e.target.value)}
            placeholder="e.g. Mitchell"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Phone number</label>
        <input
          type="tel"
          value={data.phone ?? ""}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="e.g. 0412 345 678"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Suburb</label>
          <input
            type="text"
            value={data.suburb ?? ""}
            onChange={(e) => onChange("suburb", e.target.value)}
            placeholder="e.g. Brunswick"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
          <select
            value={data.state ?? ""}
            onChange={(e) => onChange("state", e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          >
            <option value="">Select</option>
            {AUSTRALIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Travel radius (km) <span className="text-slate-400 font-normal">— how far can you travel to work?</span>
        </label>
        <select
          value={data.travelRadiusKm ?? ""}
          onChange={(e) => onChange("travelRadiusKm", Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
        >
          <option value="">Select</option>
          {[5, 10, 15, 20, 30, 50, 100].map((n) => (
            <option key={n} value={n}>{n} km</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Languages spoken</label>
        <input
          type="text"
          value={data.languages.join(", ")}
          onChange={(e) => onChange("languages", e.target.value.split(",").map((l) => l.trim()).filter(Boolean))}
          placeholder="e.g. English, Mandarin, Arabic"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
        />
        <p className="text-xs text-slate-400 mt-1">Separate with commas</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-teal-400 transition-colors">
          <input
            type="checkbox"
            checked={data.driversLicence}
            onChange={(e) => onChange("driversLicence", e.target.checked)}
            className="w-4 h-4 accent-teal-600"
          />
          <span className="text-sm font-medium text-slate-700">I hold a driver's licence</span>
        </label>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-teal-400 transition-colors">
          <input
            type="checkbox"
            checked={data.ownVehicle}
            onChange={(e) => onChange("ownVehicle", e.target.checked)}
            className="w-4 h-4 accent-teal-600"
          />
          <span className="text-sm font-medium text-slate-700">I have my own vehicle</span>
        </label>
      </div>
    </div>
  );
}
