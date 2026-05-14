import { Plus, Trash2, Lightbulb } from "lucide-react";
import type { SessionData, CapabilityStory } from "./types";

interface Props {
  data: SessionData;
  onChange: (field: string, value: any) => void;
}

const blankStory = (): CapabilityStory => ({ situation: "", action: "", outcome: "", skill: "" });

const SKILL_EXAMPLES = [
  "Communication", "De-escalation", "Person-centred support", "Patience",
  "Problem-solving", "Teamwork", "Cultural sensitivity", "Independence building",
];

export function StepCapabilities({ data, onChange }: Props) {
  const stories = data.capabilityStories;

  const update = (idx: number, field: keyof CapabilityStory, value: string) => {
    onChange("capabilityStories", stories.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Your Approach & Capabilities</h2>
        <p className="text-sm text-slate-500">
          Share 1–2 real examples of your support work. Our AI will use these to write your resume bullet points.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Lightbulb size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-1">How to write a capability story</p>
            <p className="text-xs text-amber-700">
              Describe a real situation from your work — without naming the participant. Explain what you did and what the outcome was. Our AI will turn it into professional resume language.
            </p>
          </div>
        </div>
      </div>

      {stories.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
          No stories added yet. Add at least one to improve your score.
        </div>
      )}

      <div className="space-y-4">
        {stories.map((story, idx) => (
          <div key={idx} className="border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-slate-700">Story {idx + 1}</h3>
              <button type="button" onClick={() => onChange("capabilityStories", stories.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Situation <span className="text-slate-400">(What was happening? What was the challenge?)</span>
              </label>
              <textarea
                value={story.situation}
                onChange={(e) => update(idx, "situation", e.target.value)}
                rows={2}
                placeholder="e.g. A participant I supported was struggling to engage in community activities due to social anxiety..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                What you did <span className="text-slate-400">(Your actions and approach)</span>
              </label>
              <textarea
                value={story.action}
                onChange={(e) => update(idx, "action", e.target.value)}
                rows={2}
                placeholder="e.g. I worked with them to identify activities they were interested in, starting with small outings..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Outcome <span className="text-slate-400">(What changed? What did the person achieve?)</span>
              </label>
              <textarea
                value={story.outcome}
                onChange={(e) => update(idx, "outcome", e.target.value)}
                rows={2}
                placeholder="e.g. Over 3 months they built confidence and now attend a weekly social group independently."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Key skill this shows</label>
              <div className="flex flex-wrap gap-2">
                {SKILL_EXAMPLES.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => update(idx, "skill", skill)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      story.skill === skill
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-teal-400"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              {!SKILL_EXAMPLES.includes(story.skill) && (
                <input
                  type="text"
                  value={story.skill}
                  onChange={(e) => update(idx, "skill", e.target.value)}
                  placeholder="Or type your own..."
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {stories.length < 3 && (
        <button
          type="button"
          onClick={() => onChange("capabilityStories", [...stories, blankStory()])}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-teal-300 rounded-xl text-teal-700 font-medium text-sm hover:border-teal-500 hover:bg-teal-50 transition-all"
        >
          <Plus size={16} />
          Add {stories.length === 0 ? "a" : "another"} capability story
        </button>
      )}
    </div>
  );
}
