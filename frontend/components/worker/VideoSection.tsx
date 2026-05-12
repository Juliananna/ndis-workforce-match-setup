import { useState, useRef } from "react";
import { Video, Upload, Trash2, Loader2, Play } from "lucide-react";

interface Props {
  videoUrl: string | null;
  workerName?: string;
  onUpload: (file: File) => Promise<{ videoUrl: string }>;
  onDelete: () => Promise<void>;
  onVideoChange: (url: string | null) => void;
}

function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.currentTime = 1;
    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas context unavailable"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    });
    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not load video for thumbnail"));
    });
  });
}

export function VideoSection({ videoUrl, workerName, onUpload, onDelete, onVideoChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError("Video must be under 100MB");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const thumb = await generateThumbnail(file).catch(() => null);
      if (thumb) setThumbnail(thumb);
      const { videoUrl: url } = await onUpload(file);
      onVideoChange(url);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      console.error(err);
      setThumbnail(null);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      onVideoChange(null);
      setThumbnail(null);
      setPlaying(false);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handlePlay = () => {
    setPlaying(true);
    setTimeout(() => videoRef.current?.play(), 50);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950 shadow-lg min-h-[220px] flex flex-col items-center justify-center">
      {videoUrl ? (
        <>
          {!playing ? (
            <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center gap-4 p-8 relative">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt="Video thumbnail"
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-indigo-900/20" />
              )}
              <div className="absolute inset-0 bg-black/30" />
              <button
                onClick={handlePlay}
                className="relative z-10 h-16 w-16 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-xl transition-transform hover:scale-105"
              >
                <Play className="h-7 w-7 text-gray-900 ml-1" />
              </button>
              <div className="relative z-10 text-center">
                <p className="text-white font-semibold text-lg drop-shadow">Video Introduction</p>
                <p className="text-white/70 text-sm mt-1 drop-shadow">
                  See why participants love working with {workerName || "this provider"}.
                </p>
              </div>
              <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 text-white text-xs font-medium transition-colors border border-white/20"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              className="w-full max-h-[360px] object-contain"
              onEnded={() => setPlaying(false)}
            />
          )}
        </>
      ) : (
        <div className="w-full flex flex-col items-center justify-center gap-4 p-10 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-indigo-900/10" />
          <div className="relative z-10 h-16 w-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <Video className="h-8 w-8 text-white/60" />
          </div>
          <div className="relative z-10 text-center">
            <p className="text-white font-semibold text-lg">Video Introduction</p>
            <p className="text-white/50 text-sm mt-1">
              Upload a short 1–3 minute video introducing yourself to potential employers.
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/90 hover:bg-white text-gray-900 text-sm font-semibold rounded-xl transition-colors shadow-lg disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload Video"}
            </button>
            <p className="text-white/30 text-xs">MP4, WebM or MOV · Max 100MB</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-xs px-3 py-1.5 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
