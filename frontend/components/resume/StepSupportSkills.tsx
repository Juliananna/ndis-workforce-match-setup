import { SUPPORT_SETTINGS, SUPPORT_TASKS } from "./types";
import type { SessionData } from "./types";

interface Props {
  data: SessionData;
  onChange: (field: string, value: any) => void;
}

function ToggleChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
        selected
          ? "bg-teal-600 text-white border-teal-600 shadow-sm"
          : "bg-white text-slate-600 border-slate-200 hover:border-teal-400"
      }`}
    >
      {label}
    </button>
  );
}

export function StepSupportSkills({ data, onChange }: Props) {
  const toggleItem = (field: string, items: string[], item: string) => {
    onChange(field, items.includes(item) ? items.filter((i) => i !== item) : [...items, item]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Support Skills & Settings</h2>
        <p className="text-sm text-slate-500">Select all that apply. This shapes your resume content and provider matching.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Support settings you work in</label>
        <div className="flex flex-wrap gap-2">
          {SUPPORT_SETTINGS.map((setting) => (
            <ToggleChip
              key={setting}
              label={setting}
              selected={data.supportSettings.includes(setting)}
              onToggle={() => toggleItem("supportSettings", data.supportSettings, setting)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Support tasks you perform</label>
        <div className="flex flex-wrap gap-2">
          {SUPPORT_TASKS.map((task) => (
            <ToggleChip
              key={task}
              label={task}
              selected={data.supportTasks.includes(task)}
              onToggle={() => toggleItem("supportTasks", data.supportTasks, task)}
            />
          ))}
        </div>
        {data.supportTasks.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">Select at least 3 tasks to improve your resume score.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Your support style <span className="text-slate-400 font-normal">— in your own words</span>
        </label>
        <textarea
          value={data.supportStyle ?? ""}
          onChange={(e) => onChange("supportStyle", e.target.value)}
          rows={3}
          placeholder="Describe how you approach your support work. e.g. 'I focus on building trust, following the participant's lead and supporting their goals for independence.'"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">Use your own words. Our AI will refine it — without inventing anything.</p>
      </div>
    </div>
  );
}
