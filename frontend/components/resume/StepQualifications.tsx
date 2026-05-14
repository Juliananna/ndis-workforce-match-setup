import { Plus, Trash2 } from "lucide-react";
import { COMMON_QUALIFICATIONS } from "./types";
import type { SessionData, QualificationEntry, TrainingEntry } from "./types";

interface Props {
  data: SessionData;
  onChange: (field: string, value: any) => void;
}

const blankQual = (): QualificationEntry => ({ name: "", institution: "", yearCompleted: "", level: "Certificate III" });
const blankTraining = (): TrainingEntry => ({ name: "", provider: "", completionDate: "", expiryDate: "" });

const QUAL_LEVELS = ["Certificate III", "Certificate IV", "Diploma", "Bachelor's degree", "Graduate Certificate", "Master's degree", "Other"];

export function StepQualifications({ data, onChange }: Props) {
  const quals = data.qualifications;
  const training = data.training;

  const updateQual = (idx: number, field: keyof QualificationEntry, value: string) => {
    onChange("qualifications", quals.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateTraining = (idx: number, field: keyof TrainingEntry, value: string) => {
    onChange("training", training.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const addPreset = (name: string) => {
    if (!quals.some((q) => q.name === name)) {
      onChange("qualifications", [...quals, { ...blankQual(), name }]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Qualifications & Training</h2>
        <p className="text-sm text-slate-500">Add your formal qualifications and any additional training relevant to NDIS work.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Quick-add common qualifications</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_QUALIFICATIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => addPreset(q)}
              disabled={quals.some((qual) => qual.name === q)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                quals.some((qual) => qual.name === q)
                  ? "bg-teal-50 text-teal-700 border-teal-300"
                  : "bg-white text-slate-600 border-slate-200 hover:border-teal-400"
              }`}
            >
              {quals.some((qual) => qual.name === q) ? "✓ " : "+ "}{q}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-700">Formal qualifications</label>
          <button
            type="button"
            onClick={() => onChange("qualifications", [...quals, blankQual()])}
            className="flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline"
          >
            <Plus size={13} /> Add qualification
          </button>
        </div>
        {quals.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">No qualifications added yet.</p>
        ) : (
          <div className="space-y-3">
            {quals.map((q, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Qualification {idx + 1}</span>
                  <button type="button" onClick={() => onChange("qualifications", quals.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Qualification name</label>
                    <input type="text" value={q.name} onChange={(e) => updateQual(idx, "name", e.target.value)} placeholder="e.g. Certificate III in Individual Support" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Level</label>
                    <select value={q.level} onChange={(e) => updateQual(idx, "level", e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {QUAL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Institution / RTO</label>
                    <input type="text" value={q.institution} onChange={(e) => updateQual(idx, "institution", e.target.value)} placeholder="e.g. TAFE Victoria" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Year completed</label>
                    <input type="text" value={q.yearCompleted} onChange={(e) => updateQual(idx, "yearCompleted", e.target.value)} placeholder="e.g. 2022" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-700">Additional training & short courses</label>
          <button
            type="button"
            onClick={() => onChange("training", [...training, blankTraining()])}
            className="flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline"
          >
            <Plus size={13} /> Add training
          </button>
        </div>
        {training.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">No training added yet.</p>
        ) : (
          <div className="space-y-3">
            {training.map((t, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Training {idx + 1}</span>
                  <button type="button" onClick={() => onChange("training", training.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Training name</label>
                    <input type="text" value={t.name} onChange={(e) => updateTraining(idx, "name", e.target.value)} placeholder="e.g. NDIS Orientation Module" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Provider</label>
                    <input type="text" value={t.provider} onChange={(e) => updateTraining(idx, "provider", e.target.value)} placeholder="e.g. NDIS Commission" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Completion date</label>
                    <input type="text" value={t.completionDate} onChange={(e) => updateTraining(idx, "completionDate", e.target.value)} placeholder="e.g. June 2023" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Expiry date (if applicable)</label>
                    <input type="text" value={t.expiryDate} onChange={(e) => updateTraining(idx, "expiryDate", e.target.value)} placeholder="e.g. June 2026" className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
