import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2, Star, BadgeCheck, Shield, Zap, MapPin, CheckCircle,
  Share2, Edit3, Car, Clock, FileText, Video, ChevronRight, Camera
} from "lucide-react";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import { useProxyUpload } from "../hooks/useProxyUpload";
import { ProfileSection } from "../components/worker/ProfileSection";
import { SkillsSection } from "../components/worker/SkillsSection";
import { AvailabilitySection } from "../components/worker/AvailabilitySection";
import { DocumentsSection } from "../components/worker/DocumentsSection";
import { VideoSection } from "../components/worker/VideoSection";
import { ResumeSection } from "../components/worker/ResumeSection";
import { ReferencesSection } from "../components/worker/ReferencesSection";
import UpgradePage from "./UpgradePage";
import { PromoCodeBox } from "../components/PromoCodeBox";
import type { WorkerProfile } from "~backend/workers/profile_get";
import type { UpdateWorkerProfileRequest } from "~backend/workers/profile_update";
import type { WorkerAvailability, UpsertAvailabilityRequest } from "~backend/workers/availability";
import type { WorkerDocument } from "~backend/workers/documents";
import type { WorkerResume } from "~backend/workers/resume";
import type { WorkerReference, CreateReferenceRequest, UpdateReferenceRequest } from "~backend/workers/references";
import type { PaymentStatus } from "~backend/payments/status";
import type { WorkerCompletionResponse } from "~backend/workers/completion";
import type { VerificationScoreResponse } from "~backend/workers/verification_score";
import { CheckCircle2, XCircle, CreditCard, Users, ShieldCheck as ShieldCheckIcon } from "lucide-react";

function initials(name: string | null | undefined, fallback: string): string {
  const n = name || fallback;
  const parts = n.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return n[0]?.toUpperCase() ?? "?";
}

function AvatarUpload({
  avatarUrl,
  displayName,
  isVerified,
  onUploadAvatar,
}: {
  avatarUrl: string | null;
  displayName: string;
  isVerified: boolean;
  onUploadAvatar: (file: File) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUploadAvatar(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="relative inline-block mb-3 group">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-md"
        />
      ) : (
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold border-4 border-white shadow-md">
          {initials(displayName, "?")}
        </div>
      )}
      {isVerified && (
        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
          <CheckCircle className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 text-white animate-spin" />
        ) : (
          <Camera className="h-5 w-5 text-white" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

const PILLAR_ICON: Record<string, React.ReactNode> = {
  profile:        <CheckCircle className="h-3.5 w-3.5" />,
  id:             <CreditCard className="h-3.5 w-3.5" />,
  certifications: <ShieldCheckIcon className="h-3.5 w-3.5" />,
  references:     <Users className="h-3.5 w-3.5" />,
  availability:   <Clock className="h-3.5 w-3.5" />,
};

function ScoreRing({ score, level }: { score: number; level: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  const fillColor = level === "low" ? "#ef4444"
    : level === "medium" ? "#eab308"
    : level === "high" ? "#22c55e"
    : "#10b981";

  const textColor = level === "low" ? "text-red-600"
    : level === "medium" ? "text-yellow-600"
    : level === "high" ? "text-green-600"
    : "text-emerald-600";

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={fillColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-base font-black tabular-nums leading-none ${textColor}`}>{score}%</span>
      </div>
    </div>
  );
}

function SidebarProfileCard({
  profile,
  documents,
  verificationScore,
  paymentStatus,
  onEditProfile,
  onUpgrade,
  onUploadAvatar,
}: {
  profile: WorkerProfile | null;
  documents: WorkerDocument[];
  verificationScore: VerificationScoreResponse | null;
  paymentStatus: PaymentStatus | null;
  onEditProfile: () => void;
  onUpgrade: () => void;
  onUploadAvatar: (file: File) => Promise<void>;
}) {
  const verifiedCount = documents.filter((d) => d.verificationStatus === "Verified").length;
  const isVerified = verifiedCount >= 5;
  const displayName = profile?.fullName || profile?.name || "";
  const score = verificationScore?.score ?? 0;
  const level = verificationScore?.level ?? "low";

  const levelBadge = level === "verified"
    ? { text: "Fully Verified ✅", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" }
    : level === "high"
    ? { text: "High Visibility 🟢", cls: "bg-green-100 text-green-700 border-green-200" }
    : level === "medium"
    ? { text: "Medium Visibility 🟡", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" }
    : { text: "Low Visibility 🔴", cls: "bg-red-100 text-red-700 border-red-200" };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 h-16" />
      <div className="px-5 pb-5 -mt-8">
        <AvatarUpload
          avatarUrl={profile?.avatarUrl ?? null}
          displayName={displayName}
          isVerified={isVerified}
          onUploadAvatar={onUploadAvatar}
        />

        <h2 className="text-gray-900 font-bold text-lg leading-tight">{displayName || "Your Name"}</h2>
        <p className="text-gray-500 text-sm mt-0.5">NDIS Support Worker</p>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center gap-3">
            <ScoreRing score={score} level={level} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-700 mb-1">Verification Score</p>
              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${levelBadge.cls}`}>
                {levelBadge.text}
              </span>
              {verificationScore && (
                <p className="text-xs text-gray-400 mt-1.5 leading-snug">
                  {verificationScore.visibilityLabel}
                </p>
              )}
            </div>
          </div>

          {verificationScore && (
            <div className="mt-3 space-y-1.5">
              {verificationScore.pillars.map((p) => (
                <div key={p.key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                  p.earned ? "bg-green-50" : "bg-white border border-gray-100"
                }`}>
                  <span className={p.earned ? "text-green-500" : "text-gray-300"}>
                    {p.earned
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <XCircle className="h-3.5 w-3.5" />}
                  </span>
                  <span className={`text-xs flex-1 ${p.earned ? "text-gray-400 line-through" : "text-gray-700 font-medium"}`}>
                    {p.label}
                  </span>
                  {!p.earned && (
                    <span className="text-xs font-bold text-indigo-500">+{p.points}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={onEditProfile}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/20"
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </button>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors">
            <Share2 className="h-4 w-4" />
            Share Profile
          </button>
        </div>

        {!paymentStatus?.priorityBoost && (
          <button
            onClick={onUpgrade}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
          >
            <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-yellow-800">Get Noticed</p>
              <p className="text-xs text-yellow-600 truncate">Upgrade for priority listing</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-yellow-500 shrink-0 ml-auto" />
          </button>
        )}
      </div>
    </div>
  );
}

function MetricsCard({
  profile,
  documents,
  paymentStatus,
}: {
  profile: WorkerProfile | null;
  documents: WorkerDocument[];
  paymentStatus: PaymentStatus | null;
}) {
  const verifiedDocs = documents.filter((d) => d.verificationStatus === "Verified").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Provider Metrics</p>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Docs Verified</span>
          <span className="text-sm font-bold text-blue-600">
            {verifiedDocs} / {documents.length || "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Experience</span>
          <span className="text-sm font-bold text-gray-900">
            {profile?.experienceYears ? `${profile.experienceYears} yrs` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Travel Radius</span>
          <span className="text-sm font-bold text-gray-900">
            {profile?.travelRadiusKm ? `${profile.travelRadiusKm} km` : "—"}
          </span>
        </div>
        {paymentStatus?.priorityBoost && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              Priority
            </span>
          </div>
        )}
        {paymentStatus?.docsVerifiedPurchased && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Verified Docs</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              Active
            </span>
          </div>
        )}
        {paymentStatus?.refsPurchased && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Ref Checks</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
              <Shield className="h-3.5 w-3.5" />
              Active
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickInfoCard({ profile }: { profile: WorkerProfile | null }) {
  if (!profile) return null;
  const items = [
    profile.location && { icon: <MapPin className="h-3.5 w-3.5 text-gray-400" />, label: profile.location },
    profile.driversLicense && { icon: <Car className="h-3.5 w-3.5 text-gray-400" />, label: "Driver's Licence" },
    profile.vehicleAccess && { icon: <Car className="h-3.5 w-3.5 text-gray-400" />, label: "Own Vehicle" },
  ].filter(Boolean) as { icon: React.ReactNode; label: string }[];

  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1 text-sm text-gray-500">
          {item.icon}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function WorkerProfilePage() {
  const api = useAuthedBackend();
  const proxy = useProxyUpload();
  const [completion, setCompletion] = useState<WorkerCompletionResponse | null>(null);
  const [verificationScore, setVerificationScore] = useState<VerificationScoreResponse | null>(null);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<WorkerAvailability | null>(null);
  const [documents, setDocuments] = useState<WorkerDocument[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [resume, setResume] = useState<WorkerResume | null>(null);
  const [references, setReferences] = useState<WorkerReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const load = useCallback(async () => {
    if (!api) return;
    try {
      const [profileRes, skillsRes, availRes, docsRes, videoRes, resumeRes, refsRes, payRes, completionRes, scoreRes] = await Promise.allSettled([
        api.workers.getWorkerProfile(),
        api.workers.getWorkerSkills(),
        api.workers.getWorkerAvailability(),
        api.workers.listWorkerDocuments(),
        api.workers.getWorkerVideo(),
        api.workers.getWorkerResume(),
        api.workers.listWorkerReferences(),
        api.payments.getPaymentStatus(),
        api.workers.getWorkerCompletion(),
        api.workers.getVerificationScore(),
      ]);

      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      if (skillsRes.status === "fulfilled") setSkills(skillsRes.value.skills);
      if (availRes.status === "fulfilled") setAvailability(availRes.value);
      if (docsRes.status === "fulfilled") setDocuments(docsRes.value.documents);
      if (videoRes.status === "fulfilled") setVideoUrl(videoRes.value.videoUrl);
      if (resumeRes.status === "fulfilled") setResume(resumeRes.value.resume);
      if (refsRes.status === "fulfilled") setReferences(refsRes.value.references);
      if (payRes.status === "fulfilled") setPaymentStatus(payRes.value);
      if (completionRes.status === "fulfilled") setCompletion(completionRes.value);
      if (scoreRes.status === "fulfilled") setVerificationScore(scoreRes.value);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      load();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [load]);

  const refreshCompletion = async () => {
    if (!api) return;
    try {
      const [c, s] = await Promise.all([
        api.workers.getWorkerCompletion(),
        api.workers.getVerificationScore(),
      ]);
      setCompletion(c);
      setVerificationScore(s);
    } catch {}
  };

  const handleSaveProfile = async (req: UpdateWorkerProfileRequest): Promise<WorkerProfile> => {
    const updated = await api!.workers.updateWorkerProfile(req);
    setProfile(updated);
    setEditingProfile(false);
    refreshCompletion();
    return updated;
  };

  const handleSaveSkills = async (s: string[]) => {
    const res = await api!.workers.updateWorkerSkills({ skills: s });
    setSkills(res.skills);
    refreshCompletion();
  };

  const handleSaveAvailability = async (req: UpsertAvailabilityRequest) => {
    const res = await api!.workers.upsertWorkerAvailability(req);
    setAvailability(res);
    refreshCompletion();
  };

  const handleUploadDocument = async (file: File, documentType: string, expiryDate?: string, title?: string) => {
    const doc = await proxy.uploadDocument(file, documentType, expiryDate, title);
    setDocuments((prev) => [doc, ...prev]);
    refreshCompletion();
    return doc;
  };

  const handleDeleteDocument = async (documentId: string) => {
    await api!.workers.deleteWorkerDocument({ documentId });
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    refreshCompletion();
  };

  const handleUpdateDocumentExpiry = async (documentId: string, expiryDate: string | null) => {
    const updated = await api!.workers.updateDocumentExpiry({ documentId, expiryDate });
    setDocuments((prev) => prev.map((d) => d.id === updated.id ? updated : d));
  };

  const handleUploadVideo = async (file: File) => proxy.uploadVideo(file);

  const handleDeleteVideo = async () => { await api!.workers.deleteWorkerVideo(); };

  const handleUploadAvatar = async (file: File) => {
    const { avatarUrl } = await proxy.uploadAvatar(file);
    setProfile((prev) => prev ? { ...prev, avatarUrl: avatarUrl ?? null } : prev);
    refreshCompletion();
  };

  const handleUploadResume = async (file: File): Promise<WorkerResume> => {
    const result = await proxy.uploadResume(file);
    setResume(result);
    refreshCompletion();
    return result;
  };

  const handleDeleteResume = async () => { await api!.workers.deleteWorkerResume(); setResume(null); refreshCompletion(); };

  const handleCreateReference = async (req: CreateReferenceRequest): Promise<WorkerReference> => {
    const ref = await api!.workers.createWorkerReference(req);
    setReferences((prev) => [...prev, ref]);
    refreshCompletion();
    return ref;
  };

  const handleUpdateReference = async (req: UpdateReferenceRequest): Promise<WorkerReference> => {
    const ref = await api!.workers.updateWorkerReference(req);
    setReferences((prev) => prev.map((r) => r.id === ref.id ? ref : r));
    return ref;
  };

  const handleDeleteReference = async (referenceId: string) => {
    await api!.workers.deleteWorkerReference({ referenceId });
    setReferences((prev) => prev.filter((r) => r.id !== referenceId));
    refreshCompletion();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showUpgrade) {
    return <UpgradePage onBack={() => setShowUpgrade(false)} />;
  }

  return (
    <div className="flex gap-6 items-start">
      <aside className="w-56 shrink-0 space-y-4 sticky top-4">
        <SidebarProfileCard
          profile={profile}
          documents={documents}
          verificationScore={verificationScore}
          paymentStatus={paymentStatus}
          onEditProfile={() => setEditingProfile(true)}
          onUpgrade={() => setShowUpgrade(true)}
          onUploadAvatar={handleUploadAvatar}
        />
        <MetricsCard profile={profile} documents={documents} paymentStatus={paymentStatus} />
        <PromoCodeBox onRedeemed={load} />
      </aside>

      <div className="flex-1 min-w-0 space-y-5">
        <VideoSection
          videoUrl={videoUrl}
          workerName={profile?.fullName || profile?.name || ""}
          onUpload={handleUploadVideo}
          onDelete={handleDeleteVideo}
          onVideoChange={setVideoUrl}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ProfileSection
            profile={profile}
            editing={editingProfile}
            onEdit={() => setEditingProfile(true)}
            onSave={handleSaveProfile}
            onCancel={() => setEditingProfile(false)}
          />
          <SkillsSection
            skills={skills}
            documents={documents}
            onSave={handleSaveSkills}
          />
        </div>

        <AvailabilitySection
          availability={availability}
          travelRadiusKm={profile?.travelRadiusKm ?? null}
          location={profile?.location ?? null}
          onSave={handleSaveAvailability}
        />

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-gray-100">
            <FileText className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Compliance Documents</h3>
          </div>
          <div className="p-5">
            <DocumentsSection
              documents={documents}
              onUpload={handleUploadDocument}
              onDelete={handleDeleteDocument}
              onUpdateExpiry={handleUpdateDocumentExpiry}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-gray-100">
            <Video className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Resume</h3>
          </div>
          <div className="p-5">
            <ResumeSection
              resume={resume}
              onUpload={handleUploadResume}
              onDelete={handleDeleteResume}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-gray-100">
            <Clock className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-gray-900">References</h3>
          </div>
          <div className="p-5">
            <ReferencesSection
              references={references}
              onCreate={handleCreateReference}
              onUpdate={handleUpdateReference}
              onDelete={handleDeleteReference}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
