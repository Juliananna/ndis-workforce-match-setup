import { useState } from "react";
import { Loader2, CheckCircle, Edit3, X, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import type { WorkerDocument } from "~backend/workers/documents";

const ALL_SKILLS = [
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

const CERT_DOC_TYPES = [
  "NDIS Worker Screening Check",
  "First Aid Certificate",
  "CPR Certificate",
  "Working With Children Check",
  "Police Clearance",
  "Infection Control Certificate",
  "Certificate III / IV Disability",
];

interface Props {
  skills: string[];
  documents: WorkerDocument[];
  onSave: (skills: string[]) => Promise<void>;
}

function statusIcon(status: string) {
  if (status === "Verified") return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
  if (status === "Expired" || status === "Missing") return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
  if (status === "Expiring Soon") return <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />;
  return <Clock className="h-3.5 w-3.5 text-amber-400" />;
}

export function SkillsSection({ skills, documents, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(skills));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (skill: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave([...selected]);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save skills");
    } finally {
      setSaving(false);
    }
  };

  const certDocs = CERT_DOC_TYPES.map((type) => ({
    type,
    doc: documents.find((d) => d.documentType === type),
  })).filter((c) => c.doc);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Skills & Compliance</h3>
        </div>
        {!editing && (
          <button
            onClick={() => { setSelected(new Set(skills)); setEditing(true); }}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {!editing ? (
          <>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Core Skills</p>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No skills added yet.</p>
              )}
            </div>

            {certDocs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Certifications</p>
                <div className="space-y-2">
                  {certDocs.map(({ type, doc }) => (
                    <div key={type} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        {statusIcon(doc!.verificationStatus)}
                        <span className="text-sm text-gray-700">{type}</span>
                      </div>
                      {doc!.expiryDate && (
                        <span className="text-xs text-gray-400">
                          Exp: {new Date(doc!.expiryDate).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                Select Skills <span className="normal-case font-normal text-gray-400">({selected.size} selected)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggle(skill)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      selected.has(skill)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                {saved ? "Saved!" : "Save Skills"}
              </button>
              <button
                onClick={() => { setEditing(false); setError(null); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
