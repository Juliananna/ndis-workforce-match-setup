import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import backend from "~backend/client";
import type { DemoPairInfo } from "~backend/demo/list_pairs";
import {
  Loader2,
  Play,
  RefreshCw,
  Users,
  Building2,
  ChevronRight,
  Sparkles,
  ArrowLeftRight,
  Info,
} from "lucide-react";

export default function DemoPortalPage() {
  const navigate = useNavigate();
  const { login, logout, user } = useAuth();
  const [pairs, setPairs] = useState<DemoPairInfo[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [activePairIndex, setActivePairIndex] = useState<number | null>(null);
  const [activeRole, setActiveRole] = useState<"WORKER" | "EMPLOYER" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPairs = async () => {
    try {
      const res = await backend.demo.listDemoPairs();
      setPairs(res.pairs);
      setSeeded(res.seeded);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPairs();
  }, []);

  useEffect(() => {
    if (user) {
      const isDemo = user.email.includes("@matchworkforce.demo");
      if (isDemo) {
        const match = user.email.match(/demo\.(worker|employer)(\d+)@/);
        if (match) {
          setActivePairIndex(parseInt(match[2]) - 1);
          setActiveRole(user.role === "WORKER" ? "WORKER" : "EMPLOYER");
        }
      }
    }
  }, [user]);

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      await backend.demo.seedDemo();
      await fetchPairs();
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Seeding failed");
    } finally {
      setSeeding(false);
    }
  };

  const handleLogin = async (pairIndex: number, role: "WORKER" | "EMPLOYER") => {
    const key = `${pairIndex}-${role}`;
    setSwitchingTo(key);
    setError(null);
    try {
      logout();
      const res = await backend.demo.demoLogin({ pairIndex, role });
      await login(res.token);
      setActivePairIndex(pairIndex);
      setActiveRole(role);
      navigate("/dashboard");
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setSwitchingTo(null);
    }
  };

  const isCurrentSession = (pairIndex: number, role: "WORKER" | "EMPLOYER") =>
    activePairIndex === pairIndex && activeRole === role;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col">
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">MatchWorkforce</span>
              <span className="ml-2 text-xs bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-full px-2 py-0.5 font-medium">
                DEMO MODE
              </span>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-sm">
                Logged in as <span className="text-white/80 font-medium">{user.email}</span>
              </span>
              <button
                onClick={() => { logout(); setActivePairIndex(null); setActiveRole(null); }}
                className="text-white/60 hover:text-white text-sm transition-colors"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-3">Demo Portal</h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Switch instantly between worker and employer demo accounts to showcase the full platform experience.
          </p>
        </div>

        <div className="mb-6 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-200/80">
            <strong className="text-indigo-200">Isolated demo ecosystem.</strong> All demo accounts and their data are completely separate from real client data.
            Demo accounts are pre-seeded with realistic NDIS jobs, worker profiles, and offers.
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          </div>
        ) : !seeded ? (
          <div className="text-center py-16">
            <div className="h-20 w-20 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
              <Sparkles className="h-10 w-10 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No demo data yet</h2>
            <p className="text-white/50 mb-8 max-w-sm mx-auto">
              Seed the demo ecosystem to create isolated demo accounts with realistic platform data.
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/40 disabled:opacity-60"
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {seeding ? "Seeding..." : "Seed Demo Data"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Demo Account Sets
                <span className="ml-2 text-sm text-white/40 font-normal">({pairs.length} pairs)</span>
              </h2>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 text-white/80 text-sm font-medium rounded-lg border border-white/20 transition-all disabled:opacity-50"
              >
                {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Re-seed
              </button>
            </div>

            <div className="space-y-4">
              {pairs.map((pair) => (
                <div
                  key={pair.index}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
                >
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center border border-indigo-500/40">
                        {pair.index + 1}
                      </span>
                      <span className="text-white font-medium">{pair.label}</span>
                    </div>
                    {(activePairIndex === pair.index) && (
                      <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2.5 py-0.5 font-medium">
                        Active set
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                          <Users className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{pair.workerName}</p>
                          <p className="text-white/40 text-xs">{pair.workerEmail}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleLogin(pair.index, "WORKER")}
                        disabled={!!switchingTo || isCurrentSession(pair.index, "WORKER")}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                          isCurrentSession(pair.index, "WORKER")
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 cursor-default"
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 disabled:opacity-50"
                        }`}
                      >
                        {switchingTo === `${pair.index}-WORKER` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isCurrentSession(pair.index, "WORKER") ? (
                          <>Currently active</>
                        ) : (
                          <>
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            Log in as Worker
                            <ChevronRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                          <Building2 className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{pair.employerName}</p>
                          <p className="text-white/40 text-xs">{pair.employerEmail}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleLogin(pair.index, "EMPLOYER")}
                        disabled={!!switchingTo || isCurrentSession(pair.index, "EMPLOYER")}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                          isCurrentSession(pair.index, "EMPLOYER")
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                        }`}
                      >
                        {switchingTo === `${pair.index}-EMPLOYER` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isCurrentSession(pair.index, "EMPLOYER") ? (
                          <>Currently active</>
                        ) : (
                          <>
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                            Log in as Employer
                            <ChevronRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {activePairIndex !== null && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/40"
                >
                  Go to Dashboard
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="text-center py-6 text-white/20 text-xs border-t border-white/10">
        Demo Portal — MatchWorkforce Internal Use Only
      </div>
    </div>
  );
}
