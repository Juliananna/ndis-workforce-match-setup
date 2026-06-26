import { useState } from "react";
import { Mail, UserCircle2, Bell } from "lucide-react";

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
  const [createProfile, setCreateProfile] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    await onSubmit(email, {
      consentResumeGeneration: true,
      consentProfileCreation: createProfile,
      consentProviderVisibility: createProfile,
      consentMarketingEmails: marketingEmails,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Mail size={17} className="text-teal-600" />
          Where should we send your resume?
        </h3>
        <p className="text-sm text-slate-500">Enter your email to save your progress and download your resume.</p>
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

      <div className="space-y-2.5">
        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-colors">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={createProfile}
              onChange={(e) => setCreateProfile(e.target.checked)}
              className="w-4 h-4 accent-teal-600"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <UserCircle2 size={14} className="text-teal-600 shrink-0" />
              Create my free KizaziHire profile
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Turn your resume into a live profile so NDIS providers can find and contact you. You can update your visibility anytime.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
          <input
            type="checkbox"
            checked={marketingEmails}
            onChange={(e) => setMarketingEmails(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-teal-600 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Bell size={13} className="text-slate-400 shrink-0" />
              Send me NDIS job tips and updates
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Occasional emails about job opportunities and career tips. Unsubscribe anytime.</p>
          </div>
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <p className="text-xs text-slate-400">
        By saving, you consent to resume generation in accordance with our{" "}
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
