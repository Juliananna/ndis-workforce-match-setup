import { useState } from "react";
import { Upload, FileCheck, Eye, EyeOff, Trash2, Lock } from "lucide-react";
import backend from "~backend/client";
import type { DocumentRecord } from "~backend/resume/types";

const DOC_TYPES = [
  "NDIS Worker Screening Card",
  "Police Check",
  "Working with Children Check",
  "First Aid Certificate",
  "CPR Certificate",
  "Qualification Certificate",
  "Manual Handling Certificate",
  "Medication Administration Certificate",
  "Other",
];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private (only me)", icon: Lock, color: "text-red-500" },
  { value: "providers", label: "Verified providers", icon: Eye, color: "text-amber-500" },
  { value: "public", label: "Public", icon: Eye, color: "text-teal-600" },
];

interface Props {
  sessionId: string;
  documents: DocumentRecord[];
  onDocumentsChange: (docs: DocumentRecord[]) => void;
}

export function DocumentUploadSection({ sessionId, documents, onDocumentsChange }: Props) {
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [fileUrl, setFileUrl] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [visibility, setVisibility] = useState("providers");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async () => {
    if (!fileUrl.trim()) return;
    setAdding(true);
    try {
      const { document } = await backend.resume.addDocument({
        id: sessionId,
        documentType: docType,
        documentTitle: docType,
        fileUrl: fileUrl.trim(),
        expiryDate: expiryDate || undefined,
        visibility,
      });
      onDocumentsChange([...documents, document as DocumentRecord]);
      setFileUrl("");
      setExpiryDate("");
      setShowForm(false);
    } finally {
      setAdding(false);
    }
  };

  const changeVisibility = async (doc: DocumentRecord, vis: string) => {
    try {
      const { document } = await backend.resume.updateDocumentVisibility({
        id: sessionId,
        documentId: doc.id,
        visibility: vis,
      });
      onDocumentsChange(documents.map((d) => d.id === doc.id ? document as DocumentRecord : d));
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">Documents</h3>
          <p className="text-xs text-slate-400">Upload photos or PDFs of your compliance documents (optional).</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-teal-700 font-medium flex items-center gap-1 hover:underline"
        >
          <Upload size={13} /> Add document
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Document type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">File URL or link</label>
            <input type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="Paste a link to your document" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Expiry date (optional)</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Who can see this?</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleAdd} disabled={adding || !fileUrl} className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {adding ? "Adding…" : "Add document"}
            </button>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">
          No documents added yet. Documents help verify your profile.
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const visOpt = VISIBILITY_OPTIONS.find((v) => v.value === doc.visibility);
            const VisIcon = visOpt?.icon ?? Lock;
            return (
              <div key={doc.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck size={16} className={doc.verified ? "text-emerald-500" : "text-slate-400"} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{doc.documentTitle}</div>
                    <div className="text-xs text-slate-400">
                      {doc.verified ? "✓ Verified" : "Pending verification"}
                      {doc.expiryDate ? ` · Expires ${doc.expiryDate}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={doc.visibility}
                    onChange={(e) => changeVisibility(doc, e.target.value)}
                    className="text-xs rounded-lg border border-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
