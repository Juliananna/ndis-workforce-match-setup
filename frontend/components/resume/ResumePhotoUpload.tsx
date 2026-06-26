import { useState, useRef } from "react";
import { Camera, Upload, CheckCircle, Loader2, X } from "lucide-react";
import backend from "~backend/client";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  sessionId: string;
  currentPhotoUrl?: string | null;
  onPhotoUploaded: (url: string) => void;
}

export function ResumePhotoUpload({ sessionId, currentPhotoUrl, onPhotoUploaded }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl ?? null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const { uploadUrl, photoKey } = await backend.resume.getSessionPhotoUploadUrl({
        id: sessionId,
        fileName: file.name,
      });

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      const { photoUrl } = await backend.resume.confirmSessionPhoto({
        id: sessionId,
        photoKey,
      });

      onPhotoUploaded(photoUrl);
      toast({ title: "Photo uploaded!", description: "Your photo will appear on your resume and profile." });
    } catch (err) {
      console.error(err);
      setPreview(currentPhotoUrl ?? null);
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-teal-600" />
        <h3 className="font-bold text-slate-800 text-sm">Profile Photo</h3>
        <span className="text-xs text-slate-400">(optional)</span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        Add a professional photo — it'll appear on your resume and become your KizaziHire profile picture.
      </p>

      <div
        className="flex flex-col items-center gap-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Profile"
              className="h-28 w-28 rounded-full object-cover border-4 border-teal-200 shadow-md"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
            {!uploading && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md hover:bg-teal-700 transition-colors"
                title="Change photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-28 w-28 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-teal-50 transition-colors flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-teal-600 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Camera className="h-6 w-6" />
                <span className="text-xs font-medium">Add photo</span>
              </>
            )}
          </button>
        )}

        <div className="text-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-teal-700 font-medium hover:underline disabled:opacity-60"
          >
            <Upload className="h-3 w-3" />
            {preview ? "Change photo" : "Upload from device"}
          </button>
          <p className="text-xs text-slate-400 mt-0.5">JPG, PNG · Max 5MB</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
