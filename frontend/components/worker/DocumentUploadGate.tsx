import { useState, useRef, useEffect } from "react";
import {
  Upload, Loader2, CheckCircle2, ShieldCheck, FileText,
  AlertTriangle, ChevronRight, X,
} from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { useProxyUpload } from "../../hooks/useProxyUpload";
import type { WorkerDocument } from "~backend/workers/documents";

const MANDATORY_DOCUMENT_TYPES = [
  "Driver's Licence",
  "Passport / ID",
  "Working With Children Check",
  "Police Clearance",
  "NDIS Worker Screening Check",
  "NDIS Worker Orientation Module",
  "NDIS Code of Conduct acknowledgement",
  "Infection Control Certificate",
  "First Aid Certificate",
  "CPR Certificate",
  "Certificate III / IV Disability",
];

interface Props {
  onComplete: () => void;
}

export function DocumentUploadGate({ onComplete }: Props) {
  const api = useAuthedBackend();
  const proxy = useProxyUpload();

  const [documents, setDocuments] = useState<WorkerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(MANDATORY_DOCUMENT_TYPES[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!api) return;
    api.workers.listWorkerDocuments()
      .then((res) => {
        setDocuments(res.documents);
        if (res.documents.length > 0) onComplete();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  const uploadedTypes = new Set(documents.map((d) => d.documentType));
  const availableTypes = MANDATORY_DOCUMENT_TYPES.filter((t) => !uploadedTypes.has(t));
  const uploadedMandatory = MANDATORY_DOCUMENT_TYPES.filter((t) => uploadedTypes.has(t));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const doc = await proxy.uploadDocument(file, selectedType, expiryDate || undefined);
      const updated = [...documents, doc];
      setDocuments(updated);
      setExpiryDate("");
      if (fileRef.current) fileRef.current.value = "";
      const nextAvailable = availableTypes.filter((t) => t !== selectedType);
      if (nextAvailable.length > 0) setSelectedType(nextAvailable[0]);
    } catch (err: unknown) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const allUploaded = availableTypes.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Compliance Documents</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            To create your profile and get matched with NDIS providers, you must upload at least one compliance document.
            You can add more documents at any time from your profile.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-gray-900 text-sm">Required Documents</span>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
              {uploadedMandatory.length} / {MANDATORY_DOCUMENT_TYPES.length} uploaded
            </span>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 mb-5">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
              <p>
                <span className="font-semibold">Privacy notice: </span>
                Your documents are private. Employers can only view them after you have accepted a work offer.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
              {MANDATORY_DOCUMENT_TYPES.map((type) => {
                const uploaded = uploadedTypes.has(type);
                return (
                  <div
                    key={type}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border transition-colors ${
                      uploaded
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    {uploaded
                      ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                      : <X className="h-3.5 w-3.5 shrink-0 text-gray-300" />}
                    <span className="truncate">{type}</span>
                  </div>
                );
              })}
            </div>

            {!allUploaded && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Upload a Document</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700">Document Type <span className="text-red-500">*</span></label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700">Expiry Date <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleUpload}
                    className="hidden"
                    id="gate-doc-upload"
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-500/20"
                  >
                    {uploading
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</>
                      : <><Upload className="h-4 w-4" />Choose File & Upload</>}
                  </button>
                  <p className="text-xs text-gray-400 mt-1.5">PDF, JPG, PNG or WebP accepted</p>
                </div>

                {uploadError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {uploadError}
                  </div>
                )}
              </div>
            )}

            {allUploaded && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 mb-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                All mandatory documents uploaded!
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400">
              {documents.length === 0
                ? "Upload at least 1 document to continue"
                : `${documents.length} document${documents.length !== 1 ? "s" : ""} uploaded`}
            </p>
            <button
              disabled={documents.length === 0}
              onClick={onComplete}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-500/20"
            >
              Continue to Dashboard
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          You can upload additional documents anytime from your Profile page.
        </p>
      </div>
    </div>
  );
}
