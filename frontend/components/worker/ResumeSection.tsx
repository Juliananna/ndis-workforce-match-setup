import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Trash2, Loader2, ExternalLink } from "lucide-react";
import type { WorkerResume } from "~backend/workers/resume";

interface Props {
  resume: WorkerResume | null;
  onUpload: (file: File) => Promise<WorkerResume>;
  onDelete: () => Promise<void>;
}

export function ResumeSection({ resume, onUpload, onDelete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
        {resume ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{resume.fileName}</p>
              <p className="text-xs text-muted-foreground">
                Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={resume.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </a>
              <Button
                variant="ghost"
                size="sm"
                disabled={deleting}
                onClick={handleDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-7 w-7"
                title="Delete resume"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
        )}

        <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {resume ? "Replace Resume" : "Upload Resume"}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleUpload}
            className="hidden"
            id="resume-upload"
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
          <p className="text-xs text-muted-foreground/60">PDF, DOC, or DOCX &bull; Max one resume at a time</p>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
