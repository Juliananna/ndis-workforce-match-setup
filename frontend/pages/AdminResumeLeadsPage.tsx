import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import {
  Search, Users, FileText, ShieldCheck, Clock, ArrowRight,
  CheckCircle, XCircle, RefreshCw, Download, Star
} from "lucide-react";

interface LeadSummary {
  session: any;
  documentCount: number;
  refereeCount: number;
  consentCount: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  email_captured: { label: "Email captured", color: "bg-blue-100 text-blue-700" },
  converted: { label: "Converted", color: "bg-emerald-100 text-emerald-700" },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-400" },
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-400">—</span>;
  const color = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-teal-600" : score >= 40 ? "text-amber-600" : "text-red-500";
  return <span className={`text-sm font-bold ${color}`}>{score}/100</span>;
}

export default function AdminResumeLeadsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const api = useAuthedBackend();

  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadLeads = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const result = await api.resume.listLeads({ status: statusFilter || undefined });
      setLeads(result.leads as LeadSummary[]);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLeads(); }, [statusFilter]);

  const openDetail = async (lead: LeadSummary) => {
    if (!api) return;
    setSelected(lead);
    setLoadingDetail(true);
    try {
      const result = await api.resume.getLeadDetail({ id: lead.session.id });
      setDetail(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const verifyDocument = async (sessionId: string, documentId: string, verified: boolean) => {
    if (!api) return;
    try {
      await api.resume.verifyResumeDocument({ id: sessionId, documentId, verified });
      toast({ title: verified ? "Document verified" : "Document rejected" });
      if (selected) openDetail(selected);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      l.session.email?.toLowerCase().includes(q) ||
      l.session.first_name?.toLowerCase().includes(q) ||
      l.session.last_name?.toLowerCase().includes(q) ||
      l.session.suburb?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-slate-400 hover:text-slate-600 text-sm">← Dashboard</button>
            <span className="text-slate-300">|</span>
            <h1 className="font-bold text-slate-800">Resume Leads</h1>
            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">{total} total</span>
          </div>
          <button onClick={loadLeads} className="text-slate-400 hover:text-slate-600">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 grid lg:grid-cols-[1fr_450px] gap-4">
        <div>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search by name, email or suburb…"
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="email_captured">Email captured</option>
              <option value="converted">Converted</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No leads found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLeads.map((lead) => {
                const s = lead.session;
                const statusCfg = STATUS_LABELS[s.status] ?? STATUS_LABELS.draft;
                const fullName = [s.firstName, s.lastName].filter(Boolean).join(" ") || "Anonymous";
                const isActive = selected?.session?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => openDetail(lead)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${isActive ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-sm">{fullName}</div>
                        <div className="text-xs text-slate-500 truncate">{s.email ?? "No email"}</div>
                        <div className="text-xs text-slate-400">{s.targetRole ?? "Role not set"} · {s.suburb ?? "Location unknown"}, {s.state ?? ""}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                        <ScoreBadge score={s.resumeStrengthScore} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <FileText size={11} /> {lead.documentCount} doc{lead.documentCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Users size={11} /> {lead.refereeCount} referee{lead.refereeCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <ShieldCheck size={11} /> {lead.consentCount} consent{lead.consentCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={11} /> Step {s.stepCompleted}/{8}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
              <FileText size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a lead to view details</p>
            </div>
          ) : loadingDetail ? (
            <div className="bg-white rounded-2xl border border-slate-200 flex items-center justify-center p-16">
              <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">
                    {[detail.session.firstName, detail.session.lastName].filter(Boolean).join(" ") || "Anonymous"}
                  </h2>
                  <p className="text-sm text-slate-500">{detail.session.email}</p>
                  <p className="text-xs text-slate-400">{detail.session.targetRole} · {detail.session.suburb}, {detail.session.state} · {detail.session.experienceYears}yr exp</p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="font-bold text-slate-800 text-lg"><ScoreBadge score={detail.session.resumeStrengthScore} /></div>
                    <div className="text-xs text-slate-400">Score</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="font-bold text-slate-800 text-lg">{detail.documents.length}</div>
                    <div className="text-xs text-slate-400">Documents</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="font-bold text-slate-800 text-lg">{detail.referees.length}</div>
                    <div className="text-xs text-slate-400">Referees</div>
                  </div>
                </div>

                {detail.session.checks?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Compliance checks</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.session.checks.map((c: any) => (
                        <span key={c.type} className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "Current" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                          {c.type} · {c.status}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {detail.session.aiSummary && (
                  <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                    <p className="text-xs font-semibold text-teal-700 mb-1">AI Summary</p>
                    <p className="text-xs text-teal-800">{detail.session.aiSummary}</p>
                  </div>
                )}
              </div>

              {detail.documents.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-800 mb-3 text-sm">Documents</h3>
                  <div className="space-y-2">
                    {detail.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">{doc.documentTitle}</div>
                          <div className="text-xs text-slate-400">
                            {doc.visibility} · {doc.verified ? "Verified" : "Unverified"}
                            {doc.expiryDate ? ` · exp ${String(doc.expiryDate)}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800">
                            <Download size={14} />
                          </a>
                          <button onClick={() => verifyDocument(detail.session.id, doc.id, true)} className={`p-1 rounded ${doc.verified ? "text-emerald-500" : "text-slate-300 hover:text-emerald-500"}`}>
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => verifyDocument(detail.session.id, doc.id, false)} className="p-1 rounded text-slate-300 hover:text-red-500">
                            <XCircle size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.referees.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-800 mb-3 text-sm">Referees</h3>
                  <div className="space-y-2">
                    {detail.referees.map((ref: any) => (
                      <div key={ref.id} className="p-3 bg-slate-50 rounded-xl">
                        <div className="font-medium text-sm text-slate-800">{ref.refereeName}</div>
                        <div className="text-xs text-slate-500">{ref.refereeRole}{ref.organisation ? ` · ${ref.organisation}` : ""}</div>
                        <div className="text-xs text-slate-400">{ref.phone} · {ref.email}</div>
                        <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          ref.referenceStatus === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {ref.referenceStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.auditLog.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-800 mb-3 text-sm">Audit log</h3>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {detail.auditLog.map((log: any) => (
                      <div key={log.id} className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="text-slate-300 shrink-0">{new Date(log.createdAt).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })}</span>
                        <span className="font-medium text-slate-600">{log.eventType.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
