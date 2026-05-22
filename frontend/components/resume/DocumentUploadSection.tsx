import { ShieldCheck, ArrowRight, CheckCircle, Lock } from "lucide-react";

interface Props {
  sessionId: string;
  hasProfile: boolean;
  hasEmail: boolean;
  onActivate?: () => void;
}

export function DocumentUploadSection({ hasProfile, hasEmail, onActivate }: Props) {
  if (!hasEmail) return null;

  if (hasProfile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-teal-600" />
          <h3 className="font-bold text-slate-800">Compliance Documents</h3>
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
          <p className="text-sm text-teal-800 font-medium">
            Upload your compliance documents to activate your KizaziHire profile.
          </p>
          <ul className="space-y-1.5 text-xs text-teal-700">
            {[
              "Police Clearance",
              "NDIS Worker Screening Check",
              "Working With Children Check",
              "First Aid / CPR Certificate",
            ].map((doc) => (
              <li key={doc} className="flex items-center gap-2">
                <CheckCircle size={12} className="text-teal-500 shrink-0" />
                {doc}
              </li>
            ))}
          </ul>
          <div className="pt-1">
            <p className="text-xs text-teal-600 mb-3 flex items-center gap-1">
              <Lock size={11} />
              Documents are private — only visible to providers after you accept a work offer.
            </p>
            {onActivate ? (
              <button
                onClick={onActivate}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-colors"
              >
                Activate my profile <ArrowRight size={14} />
              </button>
            ) : (
              <a
                href="/login?onboarding=compliance"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-colors"
              >
                Activate my profile <ArrowRight size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-slate-400" />
        <h3 className="font-bold text-slate-800">Compliance Documents</h3>
      </div>
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center space-y-2">
        <p className="text-xs text-slate-500">
          Create your KizaziHire profile to securely upload compliance documents.
        </p>
        <p className="text-xs text-slate-400">
          Documents are stored securely and only shared with providers you accept.
        </p>
      </div>
    </div>
  );
}
