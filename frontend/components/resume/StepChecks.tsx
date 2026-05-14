import { useState } from "react";
import { Plus, Trash2, ShieldCheck, AlertCircle } from "lucide-react";
import { CHECKS_LIST } from "./types";
import type { SessionData, CheckEntry } from "./types";

interface Props {
  data: SessionData;
  onChange: (field: string, value: any) => void;
}

const STATUS_OPTIONS = ["Current", "Expired", "In progress", "Not held"];

const blankCheck = (type: string): CheckEntry => ({
  type, number: "", issueDate: "", expiryDate: "", status: "Current",
});

export function StepChecks({ data, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customType, setCustomType] = useState("");

  const checks = data.checks;

  const hasCheck = (type: string) => checks.some((c) => c.type === type);

  const toggleCheck = (type: string) => {
    if (hasCheck(type)) {
      onChange("checks", checks.filter((c) => c.type !== type));
    } else {
      onChange("checks", [...checks, blankCheck(type)]);
    }
  };

  const updateCheck = (idx: number, field: keyof CheckEntry, value: string) => {
    onChange("checks", checks.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const addCustom = () => {
    if (customType.trim()) {
      onChange("checks", [...checks, blankCheck(customType.trim())]);
      setCustomType("");
      setShowCustom(false);
    }
  };

  const removeCheck = (idx: number) => {
    onChange("checks", checks.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Compliance Checks</h2>
        <p className="text-sm text-slate-500">Select the checks you hold. These are crucial for NDIS provider trust.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHECKS_LIST.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => toggleCheck(type)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              hasCheck(type)
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400"
            }`}
          >
            {hasCheck(type) && <ShieldCheck size={13} />}
            {type}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="px-3 py-2 rounded-lg text-xs font-medium border border-dashed border-slate-300 text-slate-500 hover:border-teal-400"
        >
          + Other check
        </button>
      </div>

      {showCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="e.g. Infection Control Certificate"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={addCustom}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {checks.length === 0 ? (
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">No checks added yet. Adding your NDIS Worker Screening check will significantly boost your score.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {checks.map((check, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span className="font-medium text-sm text-slate-800">{check.type}</span>
                </div>
                <button type="button" onClick={() => removeCheck(idx)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select
                    value={check.status}
                    onChange={(e) => updateCheck(idx, "status", e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Check number (optional)</label>
                  <input
                    type="text"
                    value={check.number}
                    onChange={(e) => updateCheck(idx, "number", e.target.value)}
                    placeholder="e.g. NWS123456"
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Expiry date (optional)</label>
                  <input
                    type="text"
                    value={check.expiryDate}
                    onChange={(e) => updateCheck(idx, "expiryDate", e.target.value)}
                    placeholder="e.g. 12/2026"
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">NDIS Worker Screening number (optional)</label>
        <input
          type="text"
          value={data.ndisScreeningNumber ?? ""}
          onChange={(e) => onChange("ndisScreeningNumber", e.target.value)}
          placeholder="e.g. NWS123456789"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <p className="text-xs text-slate-400 mt-1">Your number will only be shown to verified providers with your permission.</p>
      </div>
    </div>
  );
}
