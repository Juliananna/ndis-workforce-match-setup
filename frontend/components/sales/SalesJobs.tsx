import { useState, useCallback, useEffect } from "react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { AccountSummary } from "~backend/sales/accounts";
import type { JobRequest } from "~backend/jobs/get";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Search, Building2, ChevronRight, ArrowLeft,
  Briefcase, Share2, CheckCheck, Zap, MapPin, Calendar, Clock,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-500 border-transparent",
  Open: "bg-green-100 text-green-700 border-transparent",
  Closed: "bg-blue-100 text-blue-700 border-transparent",
  Cancelled: "bg-red-100 text-red-600 border-transparent",
};

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}

export function SalesJobs() {
  const api = useAuthedBackend();

  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedEmployer, setSelectedEmployer] = useState<AccountSummary | null>(null);
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!api) return;
    setLoadingAccounts(true);
    try {
      const res = await api.sales.listAccounts();
      setAccounts(res.accounts.filter((a) => a.role === "EMPLOYER"));
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoadingAccounts(false);
    }
  }, [api]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleSelectEmployer = useCallback(async (account: AccountSummary) => {
    if (!api) return;
    setSelectedEmployer(account);
    setJobs([]);
    setLoadingJobs(true);
    try {
      const res = await api.sales.listEmployerJobs({ userId: account.userId });
      setJobs(res.jobs);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoadingJobs(false);
    }
  }, [api]);

  const handleShare = async (job: JobRequest) => {
    const url = `${window.location.origin}/jobs/share/${job.jobId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: job.jobTitle ?? `Support Worker – ${job.location}`,
          text: `Job opportunity at ${job.location}. Apply on KIZAZIHIRE.`,
          url,
        });
        return;
      } catch { /* dismissed or not supported */ }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(job.jobId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  if (selectedEmployer) {
    const openJobs = jobs.filter((j) => j.status === "Open");
    const otherJobs = jobs.filter((j) => j.status !== "Open");

    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedEmployer(null); setJobs([]); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />Back to employers
        </button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{selectedEmployer.name}</p>
            <p className="text-xs text-gray-400">{selectedEmployer.email}</p>
          </div>
        </div>

        {loadingJobs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">This employer has no job requests yet.</p>
          </Card>
        ) : (
          <div className="space-y-5">
            {openJobs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Open Jobs — shareable</p>
                {openJobs.map((job) => <JobRow key={job.jobId} job={job} onShare={handleShare} copiedId={copiedId} />)}
              </div>
            )}
            {otherJobs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Other Jobs</p>
                {otherJobs.map((job) => <JobRow key={job.jobId} job={job} onShare={handleShare} copiedId={copiedId} />)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search employers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {loadingAccounts ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-8">No employers found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <button key={a.userId} onClick={() => handleSelectEmployer(a)} className="w-full text-left">
              <Card className="p-4 hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function JobRow({ job, onShare, copiedId }: {
  job: JobRequest;
  onShare: (job: JobRequest) => void;
  copiedId: string | null;
}) {
  const isCopied = copiedId === job.jobId;
  const canShare = job.status === "Open";

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900 truncate">
              {job.jobTitle ?? job.location}
            </span>
            <Badge className={`text-xs ${STATUS_COLORS[job.status]}`}>{job.status}</Badge>
            {job.isEmergency && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-semibold">
                <Zap className="h-3 w-3" />Emergency
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
            {job.shiftDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />{toDateStr(job.shiftDate)}
              </span>
            )}
            {job.shiftDurationHours && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{job.shiftDurationHours}h
              </span>
            )}
            <span>${job.weekdayRate}/hr</span>
          </div>
        </div>
        <button
          onClick={() => onShare(job)}
          disabled={!canShare}
          title={canShare ? "Share job link" : "Only open jobs can be shared"}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
            canShare
              ? isCopied
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100"
              : "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
          }`}
        >
          {isCopied
            ? <><CheckCheck className="h-3.5 w-3.5" />Copied!</>
            : <><Share2 className="h-3.5 w-3.5" />Share</>}
        </button>
      </div>
    </Card>
  );
}
