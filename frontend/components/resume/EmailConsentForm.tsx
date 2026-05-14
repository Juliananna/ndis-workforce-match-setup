import { useState } from "react";
import { Shield, Mail } from "lucide-react";

interface ConsentValues {
  consentResumeGeneration: boolean;
  consentProfileCreation: boolean;
  consentProviderVisibility: boolean;
  consentMarketingEmails: boolean;
}

interface Props {
  onSubmit: (email: string, consents: ConsentValues) => Promise<void>;
  loading: boolean;
}

export function EmailConsentForm({ onSubmit, loading }: Props) {
  const [email, setEmail] = useState("");
  const [consents, setConsents] = useState<ConsentValues>({
    consentResumeGeneration: false,
    consentProfileCreation: false,
    consentProviderVisibility: false,
    consentMarketingEmails: false,
  });
  const [error, setError] = useState("");

  const toggle = (key: keyof ConsentValues) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!consents.consentResumeGeneration) {
      setError("Please consent to resume generation to continue.");
      return;
    }
    await onSubmit(email, consents);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Mail size={18} className="text-teal-600" />
          Enter your email to download
        </h3>
        <p className="text-sm text-slate-500">We'll send your resume to this address and save your session.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com.au"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
        />
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={15} className="text-teal-600" />
          <span className="text-xs font-semibold text-slate-700">Your privacy choices</span>
        </div>

        {[
          {
            key: "consentResumeGeneration" as const,
            label: "Resume generation (required)",
            desc: "Allow KizaziHire to generate and store your resume content using the information you've provided.",
            required: true,
          },
          {
            key: "consentProfileCreation" as const,
            label: "KizaziHire worker profile",
            desc: "Allow your resume data to be used to create a KizaziHire profile if you choose to join.",
          },
          {
            key: "consentProviderVisibility" as const,
            label: "Provider visibility",
            desc: "Allow disability service providers to view your profile and contact you about opportunities.",
          },
          {
            key: "consentMarketingEmails" as const,
            label: "Job tips and updates",
            desc: "Receive occasional email updates about NDIS job opportunities and career tips.",
          },
        ].map(({ key, label, desc, required }) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consents[key]}
              onChange={() => toggle(key)}
              required={required}
              className="mt-0.5 w-4 h-4 accent-teal-600 shrink-0"
            />
            <div>
              <div className="text-xs font-medium text-slate-700">
                {label} {required && <span className="text-red-500">*</span>}
              </div>
              <div className="text-xs text-slate-500">{desc}</div>
            </div>
          </label>
        ))}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <p className="text-xs text-slate-400">
        Your data is handled in accordance with our{" "}
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
          Privacy Policy
        </a>
        . You can request deletion of your data at any time.
      </p>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60 text-sm"
      >
        {loading ? "Saving…" : "Save & Continue"}
      </button>
    </form>
  );
}
