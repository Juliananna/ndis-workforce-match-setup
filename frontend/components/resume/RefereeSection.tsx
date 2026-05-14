import { useState } from "react";
import { Plus, Users, CheckCircle } from "lucide-react";
import backend from "~backend/client";
import type { RefereeRecord } from "~backend/resume/types";

interface Props {
  sessionId: string;
  referees: RefereeRecord[];
  onRefereesChange: (refs: RefereeRecord[]) => void;
}

const RELATIONSHIP_OPTIONS = [
  "Direct manager / supervisor",
  "Team leader",
  "Co-worker",
  "Teacher / educator",
  "Client family member (with consent)",
  "Volunteer coordinator",
  "Other professional",
];

const blankReferee = () => ({
  refereeName: "", refereeRole: "", organisation: "", relationship: "", phone: "", email: "", yearsKnown: 1, consentToContact: true,
});

export function RefereeSection({ sessionId, referees, onRefereesChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankReferee());
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    setError("");
    if (!form.refereeName || !form.refereeRole || !form.relationship) {
      setError("Please fill in name, role and relationship.");
      return;
    }
    setAdding(true);
    try {
      const { referee } = await backend.resume.addReferee({
        id: sessionId,
        ...form,
        yearsKnown: form.yearsKnown,
        organisation: form.organisation || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      onRefereesChange([...referees, referee as RefereeRecord]);
      setForm(blankReferee());
      setShowForm(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Users size={18} className="text-teal-600" />
            Referees
          </h3>
          <p className="text-xs text-slate-400">Two referees from disability or care roles significantly boost your score.</p>
        </div>
        {referees.length < 3 && (
          <button onClick={() => setShowForm(!showForm)} className="text-xs text-teal-700 font-medium flex items-center gap-1 hover:underline">
            <Plus size={13} /> Add referee
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Referee's full name *</label>
              <input type="text" value={form.refereeName} onChange={(e) => setForm({ ...form, refereeName: e.target.value })} placeholder="e.g. Karen Aldridge" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Their job title *</label>
              <input type="text" value={form.refereeRole} onChange={(e) => setForm({ ...form, refereeRole: e.target.value })} placeholder="e.g. Team Leader" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Organisation</label>
            <input type="text" value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} placeholder="e.g. Sunrise Care Services" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Your relationship *</label>
            <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select relationship</option>
              {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone (optional)</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0412 345 678" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email (optional)</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="referee@example.com" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={form.consentToContact} onChange={(e) => setForm({ ...form, consentToContact: e.target.checked })} className="mt-0.5 accent-teal-600 w-4 h-4" />
            <span className="text-xs text-slate-600">This person has consented to being contacted as a referee.</span>
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleAdd} disabled={adding} className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {adding ? "Adding…" : "Add referee"}
            </button>
          </div>
        </div>
      )}

      {referees.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">
          No referees added. Add 2 referees to maximise your resume score.
        </p>
      ) : (
        <div className="space-y-2">
          {referees.map((ref) => (
            <div key={ref.id} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <CheckCircle size={16} className="text-teal-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-sm text-slate-800">{ref.refereeName}</div>
                <div className="text-xs text-slate-500">{ref.refereeRole}{ref.organisation ? ` · ${ref.organisation}` : ""}</div>
                <div className="text-xs text-slate-400">{ref.relationship}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  ref.referenceStatus === "completed" ? "bg-emerald-50 text-emerald-700" :
                  ref.referenceStatus === "requested" ? "bg-blue-50 text-blue-700" :
                  "bg-slate-100 text-slate-500"
                }`}>
                  Reference: {ref.referenceStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
