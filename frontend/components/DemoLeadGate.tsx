import { useState } from "react";
import { Sparkles, Loader2, User, Mail, Briefcase } from "lucide-react";
import backend from "~backend/client";

const ROLES = [
  { value: "EMPLOYER", label: "Employer / Organisation" },
  { value: "WORKER", label: "Support Worker" },
  { value: "OTHER", label: "Other" },
];

const STORAGE_KEY = "demo_lead_registered";

interface Props {
  onEnter: () => void;
}

export default function DemoLeadGate({ onEnter }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await backend.demo.registerDemoLead({ name: name.trim(), email: email.trim(), role });
      sessionStorage.setItem(STORAGE_KEY, "1");
      onEnter();
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Try the Demo</h1>
          <p className="text-white/50 text-sm">
            Enter your details to access the interactive MatchWorkforce demo.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5"
        >
          <div>
            <label className="block text-white/70 text-sm font-medium mb-1.5">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-1.5">I am a…</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition appearance-none"
              >
                <option value="" disabled className="bg-slate-900">Select your role</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value} className="bg-slate-900">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/40 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Entering demo…" : "Enter Demo"}
          </button>
        </form>

        <p className="text-center text-white/20 text-xs mt-6">
          Your information will only be used to follow up about MatchWorkforce.
        </p>
      </div>
    </div>
  );
}

export { STORAGE_KEY };
