import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText, Upload, Trash2, Loader2, AlertTriangle,
  CheckCircle, Clock, X, ShieldCheck, Pencil, Check, Eye,
} from "lucide-react";
import { DocumentPreviewModal, type PreviewDoc } from "../DocumentPreviewModal";
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

const OPTIONAL_DOCUMENT_TYPES = [
  "Nursing qualifications",
  "Other relevant training",
];

const OTHER_TRAINING = "Other relevant training";

const ALL_DOCUMENT_TYPES = [...MANDATORY_DOCUMENT_TYPES, ...OPTIONAL_DOCUMENT_TYPES];

type VerificationStatus = "Pending" | "Verified" | "Missing" | "Expiring Soon" | "Expired";

interface Props {
  documents: WorkerDocument[];
  onUpload: (file: File, documentType: string, expiryDate?: string, title?: string) => Promise<WorkerDocument>;
  onDelete: (documentId: string) => Promise<void>;
  onUpdateExpiry: (documentId: string, expiryDate: string | null) => Promise<void>;
}

function StatusChip({ status }: { status: VerificationStatus }) {
  const cfg: Record<VerificationStatus, { color: string; icon: React.ReactNode }> = {
    Pending:        { color: "border-amber-500/40 text-amber-400",   icon: <Clock className="h-3 w-3" /> },
    Verified:       { color: "border-green-500/40 text-green-400",   icon: <CheckCircle className="h-3 w-3" /> },
    Missing:        { color: "border-red-500/40 text-red-400",       icon: <X className="h-3 w-3" /> },
    Expired:        { color: "border-red-600/60 text-red-500",       icon: <AlertTriangle className="h-3 w-3" /> },
    "Expiring Soon":{ color: "border-orange-500/40 text-orange-400", icon: <AlertTriangle className="h-3 w-3" /> },
  };
  const c = cfg[status] ?? cfg["Pending"];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${c.color}`}>
      {c.icon}{status}
    </span>
  );
}

function rowIcon(status: VerificationStatus | undefined) {
  if (!status) return <X className="h-3.5 w-3.5 text-muted-foreground/40" />;
  if (status === "Verified")       return <CheckCircle className="h-3.5 w-3.5 text-green-400" />;
  if (status === "Expired")        return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  if (status === "Expiring Soon")  return <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />;
  return <Clock className="h-3.5 w-3.5 text-amber-400" />;
}

function rowColor(status: VerificationStatus | undefined) {
  if (!status)                     return "text-muted-foreground";
  if (status === "Verified")       return "text-green-400";
  if (status === "Expired")        return "text-red-500";
  if (status === "Expiring Soon")  return "text-orange-400";
  return "text-amber-400";
}

function toInputDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}



interface DocRowProps {
  doc: WorkerDocument;
  onDelete: (id: string) => Promise<void>;
  onUpdateExpiry: (id: string, expiry: string | null) => Promise<void>;
  onQuickView: (doc: WorkerDocument) => void;
}

function DocRow({ doc, onDelete, onUpdateExpiry, onQuickView }: DocRowProps) {
  const [editing, setEditing] = useState(false);
  const [expiryVal, setExpiryVal] = useState(toInputDate(doc.expiryDate));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const displayName = doc.documentType === OTHER_TRAINING && doc.title
    ? doc.title
    : doc.documentType;

  const handleSaveExpiry = async () => {
    setSaving(true);
    try {
      await onUpdateExpiry(doc.id, expiryVal || null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(doc.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
          {doc.documentType === OTHER_TRAINING && (
            <p className="text-xs text-muted-foreground/60">Other relevant training</p>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <StatusChip status={doc.verificationStatus as VerificationStatus} />
            {!editing && doc.expiryDate && (
              <span className="text-xs text-muted-foreground">
                Expires {new Date(doc.expiryDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickView(doc)}
            className="text-primary hover:text-primary p-1 h-7 text-xs gap-1"
            title="Quick view"
          >
            <Eye className="h-3.5 w-3.5" />View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditing((v) => !v); setExpiryVal(toInputDate(doc.expiryDate)); }}
            className="text-muted-foreground hover:text-foreground p-1 h-7 w-7"
            title="Edit expiry date"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={deleting}
            onClick={handleDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-7 w-7"
            title="Delete document"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="flex items-end gap-2 pl-7">
          <div className="space-y-1 flex-1 max-w-xs">
            <Label className="text-xs text-muted-foreground">Expiry Date</Label>
            <Input
              type="date"
              value={expiryVal}
              onChange={(e) => setExpiryVal(e.target.value)}
              className="h-7 text-xs bg-input border-border text-foreground"
            />
          </div>
          <Button size="sm" className="h-7 text-xs px-2" disabled={saving} onClick={handleSaveExpiry}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function DocumentsSection({ documents, onUpload, onDelete, onUpdateExpiry }: Props) {
  const [uploading, setUploading] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [trainingTitle, setTrainingTitle] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleQuickView = (doc: WorkerDocument) => {
    setPreviewDoc(doc as PreviewDoc);
    setPreviewOpen(true);
  };

  const handleGetDownloadUrl = async (_docId: string): Promise<string> => {
    const doc = documents.find((d) => d.id === _docId);
    if (!doc?.fileUrl) throw new Error("No file URL");
    return doc.fileUrl;
  };

  const uploadedSingleTypes = new Set(
    documents
      .filter((d) => d.documentType !== OTHER_TRAINING)
      .map((d) => d.documentType)
  );

  const availableTypes = ALL_DOCUMENT_TYPES.filter((t) => {
    if (t === OTHER_TRAINING) return true;
    return !uploadedSingleTypes.has(t);
  });

  const [selectedType, setSelectedType] = useState<string>(() => availableTypes[0] ?? OTHER_TRAINING);

  const isOtherTraining = selectedType === OTHER_TRAINING;

  const mandatoryDocs = MANDATORY_DOCUMENT_TYPES.map((t) => ({
    type: t,
    doc: documents.find((d) => d.documentType === t),
  }));

  const optionalDocs = OPTIONAL_DOCUMENT_TYPES.map((t) => {
    if (t === OTHER_TRAINING) {
      return { type: t, docs: documents.filter((d) => d.documentType === OTHER_TRAINING) };
    }
    return { type: t, docs: documents.filter((d) => d.documentType === t) };
  });

  const mandatoryUploaded = mandatoryDocs.filter((r) => r.doc).length;
  const progressPct = Math.round((mandatoryUploaded / MANDATORY_DOCUMENT_TYPES.length) * 100);
  const verifiedCount = documents.filter((d) => d.verificationStatus === "Verified").length;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const typeToUpload = selectedType || availableTypes[0];
    if (!typeToUpload) {
      setUploadError("Please select a document type.");
      return;
    }

    if (typeToUpload === OTHER_TRAINING && !trainingTitle.trim()) {
      setUploadError("Please enter a title for this training document.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      await onUpload(file, typeToUpload, expiryDate || undefined, trainingTitle.trim() || undefined);
      setExpiryDate("");
      setTrainingTitle("");
      if (fileRef.current) fileRef.current.value = "";

      const remaining = availableTypes.filter((t) => t !== typeToUpload || t === OTHER_TRAINING);
      setSelectedType(remaining[0] ?? OTHER_TRAINING);
    } catch (err: unknown) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const allNonTrainingUploaded = availableTypes.filter((t) => t !== OTHER_TRAINING).length === 0;

  return (
    <div>
      <div className="space-y-5">

        <div className="flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-300">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
          <p>
            <span className="font-medium text-blue-300">Privacy notice: </span>
            Your documents are private. Employers can only view and download them after you have
            accepted a work offer from that employer.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {verifiedCount} verified &bull; {documents.length - verifiedCount} pending review
            </span>
            <span className="font-medium text-foreground">{progressPct}% mandatory complete</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
              Mandatory Documents
            </p>
            <div className="space-y-1">
              {mandatoryDocs.map(({ type, doc }) => (
                <div key={type} className="flex items-center gap-2 py-0.5">
                  {rowIcon(doc?.verificationStatus as VerificationStatus | undefined)}
                  <span className={`text-xs flex-1 ${rowColor(doc?.verificationStatus as VerificationStatus | undefined)}`}>
                    {type}
                  </span>
                  {doc && (
                    <span className="text-xs text-muted-foreground/60 shrink-0">
                      {doc.verificationStatus}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
              Optional Documents
            </p>
            <div className="space-y-1">
              {optionalDocs.map(({ type, docs }) => (
                <div key={type}>
                  {type === OTHER_TRAINING ? (
                    docs.length > 0 ? (
                      docs.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 py-0.5">
                          {rowIcon(doc.verificationStatus as VerificationStatus)}
                          <span className={`text-xs flex-1 ${rowColor(doc.verificationStatus as VerificationStatus)}`}>
                            {doc.title ?? OTHER_TRAINING}
                          </span>
                          <span className="text-xs text-muted-foreground/60 shrink-0">
                            {doc.verificationStatus}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 py-0.5">
                        {rowIcon(undefined)}
                        <span className="text-xs flex-1 text-muted-foreground">{type}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 py-0.5">
                      {rowIcon(docs[0]?.verificationStatus as VerificationStatus | undefined)}
                      <span className={`text-xs flex-1 ${rowColor(docs[0]?.verificationStatus as VerificationStatus | undefined)}`}>
                        {type}
                      </span>
                      {docs[0] && (
                        <span className="text-xs text-muted-foreground/60 shrink-0">
                          {docs[0].verificationStatus}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {allNonTrainingUploaded && availableTypes.length === 1 && availableTypes[0] === OTHER_TRAINING ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-xs text-green-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            All required document types uploaded. You can still add more &ldquo;Other relevant training&rdquo; below.
          </div>
        ) : null}

        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upload Document</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">Document Type</Label>
              <select
                value={selectedType}
                onChange={(e) => { setSelectedType(e.target.value); setTrainingTitle(""); }}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary [&>option]:bg-background [&>option]:text-foreground"
              >
                {availableTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">Expiry Date (optional)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="bg-input border-border text-foreground text-sm"
              />
            </div>
          </div>

          {isOtherTraining && (
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">
                Training Title <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                placeholder="e.g. Manual Handling Certificate"
                value={trainingTitle}
                onChange={(e) => setTrainingTitle(e.target.value)}
                className="bg-input border-border text-foreground text-sm"
              />
            </div>
          )}

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleUpload}
              className="hidden"
              id="doc-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="border-border text-foreground hover:bg-muted"
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? "Uploading..." : "Choose File & Upload"}
            </Button>
            <p className="text-xs text-muted-foreground/60 mt-1.5">PDF, JPG, PNG or WebP</p>
          </div>
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </div>

        {documents.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Uploaded Documents</p>
            {documents.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                onDelete={onDelete}
                onUpdateExpiry={onUpdateExpiry}
                onQuickView={handleQuickView}
              />
            ))}
          </div>
        )}

      </div>
      <DocumentPreviewModal
        doc={previewDoc}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onGetDownloadUrl={handleGetDownloadUrl}
      />
    </div>
  );
}
