import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { CLIENT_GROUPS } from "./types";
import type { SessionData, WorkHistoryEntry } from "./types";

interface Props {
  data: SessionData;
  onChange: (field: string, value: any) => void;
}

const blankEntry = (): WorkHistoryEntry => ({
  employer: "", role: "", startDate: "", endDate: "", current: false, responsibilities: "", clientGroups: [],
});

export function StepWorkHistory({ data, onChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0);

  const entries = data.workHistory.length > 0 ? data.workHistory : [];

  const update = (idx: number, field: keyof WorkHistoryEntry, value: any) => {
    const updated = entries.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    onChange("workHistory", updated);
  };

  const toggleGroup = (idx: number, group: string) => {
    const entry = entries[idx];
    const groups = entry.clientGroups.includes(group)
      ? entry.clientGroups.filter((g) => g !== group)
      : [...entry.clientGroups, group];
    update(idx, "clientGroups", groups);
  };

  const add = () => {
    onChange("workHistory", [...entries, blankEntry()]);
    setExpanded(entries.length);
  };

  const remove = (idx: number) => {
    onChange("workHistory", entries.filter((_, i) => i !== idx));
    setExpanded(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Work History</h2>
        <p className="text-sm text-slate-500">Add your most relevant disability / care roles. At least one entry strengthens your resume.</p>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
          No work history added yet.<br />
          <span className="text-xs">You can still build a resume — add entries if you have them.</span>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry, idx) => (
          <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              onClick={() => setExpanded(expanded === idx ? null : idx)}
            >
              <div>
                <div className="font-medium text-sm text-slate-800">
                  {entry.role || "New role"} {entry.employer ? `at ${entry.employer}` : ""}
                </div>
                {entry.startDate && (
                  <div className="text-xs text-slate-400">
                    {entry.startDate} — {entry.current ? "Present" : (entry.endDate || "—")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(idx); }}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
                {expanded === idx ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>
            </button>

            {expanded === idx && (
              <div className="p-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Employer / organisation</label>
                    <input
                      type="text"
                      value={entry.employer}
                      onChange={(e) => update(idx, "employer", e.target.value)}
                      placeholder="e.g. Sunrise Care Services"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Your role / job title</label>
                    <input
                      type="text"
                      value={entry.role}
                      onChange={(e) => update(idx, "role", e.target.value)}
                      placeholder="e.g. Support Worker"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Start date (month / year)</label>
                    <input
                      type="text"
                      value={entry.startDate}
                      onChange={(e) => update(idx, "startDate", e.target.value)}
                      placeholder="e.g. March 2022"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">End date</label>
                    <input
                      type="text"
                      value={entry.endDate}
                      onChange={(e) => update(idx, "endDate", e.target.value)}
                      disabled={entry.current}
                      placeholder="e.g. January 2024"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    <label className="flex items-center gap-2 mt-1 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entry.current}
                        onChange={(e) => update(idx, "current", e.target.checked)}
                        className="accent-teal-600"
                      />
                      I currently work here
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Key responsibilities <span className="text-slate-400 font-normal">(in your own words)</span>
                  </label>
                  <textarea
                    value={entry.responsibilities}
                    onChange={(e) => update(idx, "responsibilities", e.target.value)}
                    rows={3}
                    placeholder="Describe your main duties, types of support provided, and any notable achievements."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">Do not include participant names or identifying details.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Client groups supported</label>
                  <div className="flex flex-wrap gap-2">
                    {CLIENT_GROUPS.map((group) => (
                      <button
                        key={group}
                        type="button"
                        onClick={() => toggleGroup(idx, group)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          entry.clientGroups.includes(group)
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-teal-400"
                        }`}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-teal-300 rounded-xl text-teal-700 font-medium text-sm hover:border-teal-500 hover:bg-teal-50 transition-all"
      >
        <Plus size={16} />
        Add {entries.length === 0 ? "a" : "another"} work history entry
      </button>
    </div>
  );
}
