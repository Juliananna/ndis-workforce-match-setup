import { useEffect, useState, useCallback } from "react";
import { useAuthedBackend } from "../hooks/useAuthedBackend";
import type { AccountSummary } from "~backend/sales/accounts";
import type { AccountDetail } from "~backend/sales/account_edit";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Users, Building2, Search, ChevronRight, ArrowLeft,
  StickyNote, Plus, Trash2, CheckCircle, AlertCircle, Edit2, Save,
  X, ShieldCheck, CreditCard, XCircle, CalendarPlus, RefreshCw,
  CheckCircle2, BadgeCheck, Zap, FileCheck, Star, Eye, EyeOff,
  MapPin, Phone, Mail, Briefcase, Award, Clock, TrendingUp,
  UserCheck, Shield, Package,
} from "lucide-react";

const EMPLOYER_PLANS: {
  id: "monthly" | "biannual" | "annual";
  name: string;
  monthlyPrice: number;
  totalPrice: number;
  label: string;
  highlight?: boolean;
  badge?: string;
  saving?: string;
  defaultDays: number;
  defaultCents: number;
}[] = [
  { id: "monthly",  name: "Month to Month", monthlyPrice: 400,  totalPrice: 400,  label: "Billed monthly", defaultDays: 31,  defaultCents: 40000 },
  { id: "biannual", name: "6-Month Plan",    monthlyPrice: 300,  totalPrice: 1800, label: "Billed as $1,800 upfront", highlight: true, badge: "Popular", saving: "Save $600", defaultDays: 183, defaultCents: 180000 },
  { id: "annual",   name: "12-Month Plan",   monthlyPrice: 200,  totalPrice: 2400, label: "Billed as $2,400 upfront", badge: "Best Value", saving: "Save $2,400", defaultDays: 365, defaultCents: 240000 },
];

const SUB_STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-transparent",
  none: "bg-gray-100 text-gray-500 border-transparent",
  cancelled: "bg-red-100 text-red-600 border-transparent",
  expired: "bg-orange-100 text-orange-600 border-transparent",
};

const PLAN_LABELS: Record<string, string> = {
  monthly: "Monthly",
  biannual: "6-Month",
  annual: "Annual",
};

export function UserAccountsPanel() {
  const api = useAuthedBackend();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "WORKER" | "EMPLOYER">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [viewMode, setViewMode] = useState<"staff" | "client">("staff");

  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);

  const [activatingPlan, setActivatingPlan] = useState<string | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("30");
  const [extending, setExtending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  const [grantDocs, setGrantDocs] = useState(false);
  const [grantRefs, setGrantRefs] = useState(false);
  const [grantBoost, setGrantBoost] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.sales.listAccounts();
      setAccounts(res.accounts);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadDetail = useCallback(async (userId: string) => {
    if (!api) return;
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await api.sales.getAccountDetail({ userId });
      setDetail(d);
      if (d.worker) {
        setEditForm({ name: d.worker.name, phone: d.worker.phone, location: d.worker.location ?? "", bio: d.worker.bio ?? "", experienceYears: d.worker.experienceYears?.toString() ?? "" });
        setGrantDocs(false); setGrantRefs(false); setGrantBoost(false);
      } else if (d.employer) {
        setEditForm({ organisationName: d.employer.organisationName, contactPerson: d.employer.contactPerson, phone: d.employer.phone, email: d.employer.email ?? "", location: d.employer.location ?? "", abn: d.employer.abn });
      }
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  }, [api]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleSelect = (userId: string) => {
    setSelectedId(userId);
    setViewMode("staff");
    setEditing(false); setEditError(null); setSubError(null); setExtendOpen(false); setGrantError(null); setResetPasswordResult(null);
    loadDetail(userId);
  };

  const handleBack = () => { setSelectedId(null); setDetail(null); setEditing(false); setResetPasswordResult(null); };

  const handleSaveEdit = async () => {
    if (!api || !detail) return;
    setEditError(null); setSaving(true);
    try {
      if (detail.worker) {
        await api.sales.salesUpdateWorker({ userId: detail.userId, name: editForm.name || undefined, phone: editForm.phone || undefined, location: editForm.location || undefined, bio: editForm.bio || undefined, experienceYears: editForm.experienceYears ? Number(editForm.experienceYears) : undefined });
        setDetail((p) => p?.worker ? { ...p, worker: { ...p.worker, name: editForm.name || p.worker.name, phone: editForm.phone || p.worker.phone, location: editForm.location || p.worker.location, bio: editForm.bio || p.worker.bio, experienceYears: editForm.experienceYears ? Number(editForm.experienceYears) : p.worker.experienceYears } } : p);
        setAccounts((p) => p.map((a) => a.userId === detail.userId ? { ...a, name: editForm.name || a.name } : a));
      } else if (detail.employer) {
        await api.sales.salesUpdateEmployer({ userId: detail.userId, organisationName: editForm.organisationName || undefined, contactPerson: editForm.contactPerson || undefined, phone: editForm.phone || undefined, email: editForm.email || undefined, location: editForm.location || undefined });
        setDetail((p) => p?.employer ? { ...p, employer: { ...p.employer, organisationName: editForm.organisationName || p.employer.organisationName, contactPerson: editForm.contactPerson || p.employer.contactPerson, phone: editForm.phone || p.employer.phone, email: editForm.email || p.employer.email, location: editForm.location || p.employer.location } } : p);
        setAccounts((p) => p.map((a) => a.userId === detail.userId ? { ...a, name: editForm.organisationName || a.name } : a));
      }
      setEditing(false);
    } catch (e: unknown) { console.error(e); setEditError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const handleForceVerify = async () => {
    if (!api || !detail) return;
    setVerifying(true);
    try {
      await api.sales.salesForceVerifyEmail({ userId: detail.userId });
      setDetail((p) => p ? { ...p, isVerified: true } : p);
      setAccounts((p) => p.map((a) => a.userId === detail.userId ? { ...a, isVerified: true } : a));
    } catch (e: unknown) { console.error(e); }
    finally { setVerifying(false); }
  };

  const handleAdminResetPassword = async () => {
    if (!api || !detail) return;
    setResetPasswordResult(null);
    setResettingPassword(true);
    try {
      const res = await api.admin.adminResetUserPassword({ userId: detail.userId });
      setResetPasswordResult(res.temporaryPassword);
    } catch (e: unknown) { console.error(e); }
    finally { setResettingPassword(false); }
  };

  const handleActivatePlan = async (plan: typeof EMPLOYER_PLANS[0]) => {
    if (!api || !detail) return;
    setSubError(null); setActivatingPlan(plan.id);
    try {
      await api.sales.salesActivateSubscription({ userId: detail.userId, plan: plan.id, amountAudCents: plan.defaultCents, periodDays: plan.defaultDays });
      await loadDetail(detail.userId);
      setAccounts((p) => p.map((a) => a.userId === detail.userId ? { ...a, subscriptionStatus: "active", subscriptionPlan: plan.id } : a));
    } catch (e: unknown) { console.error(e); setSubError(e instanceof Error ? e.message : "Failed"); }
    finally { setActivatingPlan(null); }
  };

  const handleExtend = async () => {
    if (!api || !detail) return;
    setSubError(null); setExtending(true);
    try {
      await api.sales.salesExtendSubscription({ userId: detail.userId, additionalDays: Number(extendDays) || 30 });
      await loadDetail(detail.userId);
      setExtendOpen(false);
    } catch (e: unknown) { console.error(e); setSubError(e instanceof Error ? e.message : "Failed"); }
    finally { setExtending(false); }
  };

  const handleCancel = async () => {
    if (!api || !detail) return;
    setCancelling(true);
    try {
      await api.sales.salesCancelSubscription({ userId: detail.userId });
      await loadDetail(detail.userId);
      setAccounts((p) => p.map((a) => a.userId === detail.userId ? { ...a, subscriptionStatus: "cancelled" } : a));
    } catch (e: unknown) { console.error(e); }
    finally { setCancelling(false); }
  };

  const handleGrantPackage = async () => {
    if (!api || !detail || (!grantDocs && !grantRefs && !grantBoost)) return;
    setGrantError(null); setGranting(true);
    try {
      await api.sales.salesGrantWorkerPackage({ userId: detail.userId, grantDocs, grantRefs, grantPriorityBoost: grantBoost });
      await loadDetail(detail.userId);
      setGrantDocs(false); setGrantRefs(false); setGrantBoost(false);
    } catch (e: unknown) { console.error(e); setGrantError(e instanceof Error ? e.message : "Failed"); }
    finally { setGranting(false); }
  };

  const handleAddNote = async () => {
    if (!api || !selectedId || !newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await api.sales.addAccountNote({ userId: selectedId, note: newNote.trim() });
      const note = { id: res.id, note: newNote.trim(), createdBy: "you", createdAt: new Date() };
      setAccounts((p) => p.map((a) => a.userId === selectedId ? { ...a, notes: [note, ...a.notes] } : a));
      setNewNote("");
    } catch (e: unknown) { console.error(e); }
    finally { setAddingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!api || !selectedId) return;
    setDeletingNote(noteId);
    try {
      await api.sales.deleteAccountNote({ noteId });
      setAccounts((p) => p.map((a) => a.userId === selectedId ? { ...a, notes: a.notes.filter((n) => n.id !== noteId) } : a));
    } catch (e: unknown) { console.error(e); }
    finally { setDeletingNote(null); }
  };

  const filtered = accounts.filter((a) => {
    const matchRole = filter === "all" || a.role === filter;
    const q = search.toLowerCase();
    return matchRole && (!q || a.email.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  });

  const selectedAccount = accounts.find((a) => a.userId === selectedId) ?? null;

  if (selectedId && detailLoading) {
    return (
      <div className="space-y-4">
        <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"><ArrowLeft className="h-3.5 w-3.5" />Back</button>
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
      </div>
    );
  }

  if (selectedId && detail) {
    const isWorker = !!detail.worker;
    const isEmployer = !!detail.employer;
    const emp = detail.employer;
    const wkr = detail.worker;
    const isSubActive = emp?.subscriptionStatus === "active";
    const currentPlan = emp?.subscriptionPlan;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />Back to accounts
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setViewMode("staff")}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${viewMode === "staff" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <Shield className="h-3.5 w-3.5" />Staff View
              </button>
              <button
                onClick={() => setViewMode("client")}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${viewMode === "client" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <Eye className="h-3.5 w-3.5" />Client View
              </button>
            </div>
            <button onClick={() => loadDetail(selectedId)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {viewMode === "client" && (
          <div className="rounded-xl border-2 border-orange-200 bg-orange-50/30 p-1">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-orange-600 font-medium">
              <Eye className="h-3.5 w-3.5" />
              Client Preview — this is how the account appears to the {isWorker ? "worker" : "employer"}
            </div>
            <div className="bg-white rounded-lg p-4 space-y-4">
              {isWorker && wkr && <WorkerClientView wkr={wkr} email={detail.email} isVerified={detail.isVerified} />}
              {isEmployer && emp && <EmployerClientView emp={emp} email={detail.email} isVerified={detail.isVerified} />}
            </div>
          </div>
        )}

        {viewMode === "staff" && (
          <>
            <Card className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-base">{wkr?.name ?? emp?.organisationName}</p>
                    <Badge className={detail.role === "WORKER" ? "bg-blue-100 text-blue-700 border-transparent" : "bg-indigo-100 text-indigo-700 border-transparent"}>{detail.role}</Badge>
                    <Badge className={detail.isVerified ? "bg-green-100 text-green-700 border-transparent" : "bg-yellow-100 text-yellow-700 border-transparent"}>
                      {detail.isVerified ? <><CheckCircle className="h-3 w-3 mr-1 inline" />Verified</> : <><AlertCircle className="h-3 w-3 mr-1 inline" />Unverified</>}
                    </Badge>
                    {isEmployer && emp && (
                      <Badge className={SUB_STATUS_COLOR[emp.subscriptionStatus] ?? "bg-gray-100 text-gray-500 border-transparent"}>
                        {isSubActive ? `${PLAN_LABELS[currentPlan ?? ""] ?? "Active"} Plan` : emp.subscriptionStatus}
                        {isSubActive && emp.subscriptionPeriodEnd ? ` · until ${new Date(emp.subscriptionPeriodEnd).toLocaleDateString("en-AU")}` : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{detail.email}</p>
                  <p className="text-xs text-gray-400">Joined {new Date(detail.createdAt).toLocaleDateString("en-AU")}</p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  {!detail.isVerified && (
                    <Button size="sm" variant="outline" disabled={verifying} onClick={handleForceVerify} className="h-8 text-xs gap-1.5 text-green-600 border-green-300 hover:bg-green-50">
                      {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}Verify Email
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled={resettingPassword} onClick={handleAdminResetPassword} className="h-8 text-xs gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50">
                    {resettingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Reset Password
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing((p) => !p); setEditError(null); }} className="h-8 text-xs gap-1.5">
                    {editing ? <X className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}{editing ? "Cancel" : "Edit"}
                  </Button>
                </div>
              </div>

              {!editing && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm border-t border-gray-100 pt-3">
                  {isWorker && wkr && (<>
                    <Field label="Name" value={wkr.name} /><Field label="Phone" value={wkr.phone} />
                    <Field label="Location" value={wkr.location} /><Field label="Experience" value={wkr.experienceYears != null ? `${wkr.experienceYears} yrs` : null} />
                    {wkr.bio && <div className="col-span-2"><Field label="Bio" value={wkr.bio} /></div>}
                  </>)}
                  {isEmployer && emp && (<>
                    <Field label="Organisation" value={emp.organisationName} /><Field label="Contact" value={emp.contactPerson} />
                    <Field label="Phone" value={emp.phone} /><Field label="Email" value={emp.email} />
                    <Field label="Location" value={emp.location} /><Field label="ABN" value={emp.abn} />
                  </>)}
                </div>
              )}

              {editing && (
                <div className="space-y-3 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {isWorker && (<>
                      <FF label="Name" value={editForm.name ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, name: v }))} />
                      <FF label="Phone" value={editForm.phone ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))} />
                      <FF label="Location" value={editForm.location ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, location: v }))} />
                      <FF label="Experience (years)" type="number" value={editForm.experienceYears ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, experienceYears: v }))} />
                      <div className="sm:col-span-2"><FF label="Bio" value={editForm.bio ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, bio: v }))} /></div>
                    </>)}
                    {isEmployer && (<>
                      <FF label="Organisation Name" value={editForm.organisationName ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, organisationName: v }))} />
                      <FF label="Contact Person" value={editForm.contactPerson ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, contactPerson: v }))} />
                      <FF label="Phone" value={editForm.phone ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))} />
                      <FF label="Email" type="email" value={editForm.email ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, email: v }))} />
                      <FF label="Location" value={editForm.location ?? ""} onChange={(v) => setEditForm((p) => ({ ...p, location: v }))} />
                    </>)}
                  </div>
                  {editError && <p className="text-xs text-red-600">{editError}</p>}
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save Changes
                  </Button>
                </div>
              )}
            </Card>

            {resetPasswordResult && (
              <div className="rounded-xl border border-orange-300 bg-orange-50 p-4 flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-orange-800 flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4" />Password Reset &mdash; Temporary Password
                </p>
                <p className="text-xs text-orange-700">The user has been emailed this temporary password. Share it with them securely if the email was not received.</p>
                <code className="text-base font-mono font-bold text-orange-900 bg-orange-100 rounded-lg px-3 py-2 mt-1 select-all">{resetPasswordResult}</code>
                <button onClick={() => setResetPasswordResult(null)} className="text-xs text-orange-500 hover:text-orange-700 text-right mt-1">Dismiss</button>
              </div>
            )}

            {isEmployer && emp && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-orange-500" />Subscription
                  </p>
                  {isSubActive && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setExtendOpen((p) => !p)} className="h-7 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50">
                        <CalendarPlus className="h-3.5 w-3.5" />Extend
                      </Button>
                      <Button size="sm" variant="outline" disabled={cancelling} onClick={handleCancel} className="h-7 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50">
                        {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {extendOpen && (
                  <div className="flex items-end gap-2 bg-blue-50 rounded-lg p-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Additional Days</Label>
                      <Input type="number" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} className="h-8 text-sm w-28" placeholder="30" />
                    </div>
                    <Button size="sm" onClick={handleExtend} disabled={extending} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                      {extending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Extend"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setExtendOpen(false)} className="h-8 text-xs">Cancel</Button>
                  </div>
                )}

                {subError && <p className="text-xs text-red-600">{subError}</p>}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {EMPLOYER_PLANS.map((plan) => {
                    const isCurrent = isSubActive && currentPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        className={`relative rounded-xl border p-4 flex flex-col gap-3 ${
                          isCurrent
                            ? "border-green-400 bg-green-50/60"
                            : plan.highlight
                              ? "border-orange-300 bg-orange-50/40"
                              : "border-gray-200 bg-white"
                        }`}
                      >
                        {plan.badge && !isCurrent && (
                          <span className={`absolute -top-2.5 left-3 text-xs font-bold px-2 py-0.5 rounded-full ${plan.highlight ? "bg-orange-500 text-white" : "bg-gray-800 text-white"}`}>
                            {plan.badge}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="absolute -top-2.5 left-3 text-xs font-bold px-2 py-0.5 rounded-full bg-green-600 text-white flex items-center gap-1">
                            <BadgeCheck className="h-3 w-3" />Current
                          </span>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 font-medium">{plan.name}</p>
                          <div className="flex items-end gap-0.5 mt-0.5">
                            <span className="text-2xl font-extrabold text-gray-900">${plan.monthlyPrice}</span>
                            <span className="text-xs text-gray-400 mb-1">/mo AUD</span>
                          </div>
                          {plan.saving && <span className="text-xs text-green-700 font-semibold">{plan.saving}</span>}
                          <p className="text-xs text-gray-400 mt-0.5">{plan.label}</p>
                        </div>
                        <ul className="space-y-1 flex-1">
                          {["Unlimited worker access", "Compliance docs", "Reference checks", "Unlimited jobs"].map((f) => (
                            <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <CheckCircle2 className="h-3 w-3 text-orange-400 shrink-0" />{f}
                            </li>
                          ))}
                        </ul>
                        {isCurrent ? (
                          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-green-500/10 text-green-700 font-semibold py-2 text-xs">
                            <BadgeCheck className="h-3.5 w-3.5" />Active · {emp.subscriptionPeriodEnd ? `until ${new Date(emp.subscriptionPeriodEnd).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            disabled={activatingPlan !== null}
                            onClick={() => handleActivatePlan(plan)}
                            className={`w-full h-9 text-xs font-semibold gap-1.5 ${plan.highlight ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-gray-900 hover:bg-gray-800 text-white"}`}
                          >
                            {activatingPlan === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                            Activate {plan.name}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {emp.subscriptionHistory.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 space-y-1">
                    <p className="text-xs font-medium text-gray-500">Billing History</p>
                    <div className="space-y-1">
                      {emp.subscriptionHistory.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0">
                          <span className="capitalize">{PLAN_LABELS[s.plan] ?? s.plan} Plan</span>
                          <span>${(s.amountAudCents / 100).toLocaleString()} AUD</span>
                          <Badge className={s.status === "active" ? "bg-green-100 text-green-700 border-transparent" : s.status === "pending" ? "bg-yellow-100 text-yellow-700 border-transparent" : "bg-gray-100 text-gray-500 border-transparent"}>{s.status}</Badge>
                          {s.currentPeriodEnd && <span className="text-gray-400">until {new Date(s.currentPeriodEnd).toLocaleDateString("en-AU")}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {isWorker && wkr && (
              <Card className="p-5 space-y-4">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-orange-500" />Worker Access Level
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <PackageCard
                    icon={<FileCheck className="h-5 w-5 text-blue-600" />}
                    label="Document Verification"
                    description="Verified compliance docs shown to employers"
                    active={wkr.docsVerifiedPurchased}
                    bg="bg-blue-50"
                    activeColor="text-blue-700"
                  />
                  <PackageCard
                    icon={<CheckCircle2 className="h-5 w-5 text-purple-600" />}
                    label="Reference Checks"
                    description="Human-conducted reference checks on file"
                    active={wkr.refsPurchased}
                    bg="bg-purple-50"
                    activeColor="text-purple-700"
                  />
                  <PackageCard
                    icon={<Zap className="h-5 w-5 text-orange-500" />}
                    label="Priority Boost"
                    description="Appears first in employer search results"
                    active={wkr.priorityBoost}
                    bg="bg-orange-50"
                    activeColor="text-orange-700"
                  />
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <p className="text-xs font-medium text-gray-500">Grant access (no charge to worker)</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <GrantCheck label="Document Verification" checked={grantDocs} disabled={wkr.docsVerifiedPurchased} onChange={setGrantDocs} />
                    <GrantCheck label="Reference Checks" checked={grantRefs} disabled={wkr.refsPurchased} onChange={setGrantRefs} />
                    <GrantCheck label="Priority Boost" checked={grantBoost} disabled={wkr.priorityBoost} onChange={setGrantBoost} />
                  </div>
                  {grantError && <p className="text-xs text-red-600">{grantError}</p>}
                  <Button
                    size="sm"
                    onClick={handleGrantPackage}
                    disabled={granting || (!grantDocs && !grantRefs && !grantBoost)}
                    className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
                  >
                    {granting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Grant Selected
                  </Button>
                </div>
              </Card>
            )}

            <Card className="p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><StickyNote className="h-4 w-4 text-orange-500" />Sales Notes</p>
              <div className="flex gap-2">
                <Input placeholder="Add a note…" value={newNote} onChange={(e) => setNewNote(e.target.value)} className="h-8 text-sm flex-1" onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }} />
                <Button size="sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white">
                  {addingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {(selectedAccount?.notes ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-3">No notes yet.</p>
              ) : (
                <div className="space-y-2">
                  {(selectedAccount?.notes ?? []).map((n) => (
                    <div key={n.id} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{n.note}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.createdBy} · {new Date(n.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => handleDeleteNote(n.id)} disabled={deletingNote === n.id} className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                        {deletingNote === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-1">
          {(["all", "WORKER", "EMPLOYER"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === f ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f === "all" ? "All" : f === "WORKER" ? "Workers" : "Employers"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-10">No accounts found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const planLabel = a.subscriptionPlan ? PLAN_LABELS[a.subscriptionPlan] : null;
            const periodEnd = a.subscriptionStatus === "active" && (a as AccountSummary & { subscriptionPeriodEnd?: Date }).subscriptionPeriodEnd
              ? new Date((a as AccountSummary & { subscriptionPeriodEnd?: Date }).subscriptionPeriodEnd!).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
              : null;
            return (
              <button key={a.userId} onClick={() => handleSelect(a.userId)} className="w-full text-left">
                <Card className="p-4 hover:border-orange-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${a.role === "WORKER" ? "bg-blue-50" : "bg-indigo-50"}`}>
                      {a.role === "WORKER" ? <Users className="h-4 w-4 text-blue-600" /> : <Building2 className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{a.name}</p>
                        {!a.isVerified && <Badge className="bg-yellow-100 text-yellow-700 border-transparent text-xs">Unverified</Badge>}
                        {a.subscriptionStatus === "active" && (
                          <Badge className="bg-green-100 text-green-700 border-transparent text-xs flex items-center gap-0.5">
                            <BadgeCheck className="h-2.5 w-2.5" />
                            {planLabel ?? "Active"}{periodEnd ? ` · ${periodEnd}` : ""}
                          </Badge>
                        )}
                        {a.subscriptionStatus === "cancelled" && <Badge className="bg-red-100 text-red-600 border-transparent text-xs">Cancelled</Badge>}
                        {a.subscriptionStatus === "expired" && <Badge className="bg-orange-100 text-orange-600 border-transparent text-xs">Expired</Badge>}
                        {a.notes.length > 0 && (
                          <Badge className="bg-orange-100 text-orange-600 border-transparent text-xs">
                            <StickyNote className="h-2.5 w-2.5 mr-0.5 inline" />{a.notes.length}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{a.email} · {new Date(a.createdAt).toLocaleDateString("en-AU")}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkerClientView({ wkr, email, isVerified }: {
  wkr: NonNullable<AccountDetail["worker"]>;
  email: string;
  isVerified: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-2xl font-bold text-white">{wkr.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{wkr.name}</h2>
            {isVerified && (
              <Badge className="bg-green-100 text-green-700 border-transparent flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5" />Verified
              </Badge>
            )}
            {wkr.priorityBoost && (
              <Badge className="bg-orange-100 text-orange-700 border-transparent flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />Priority
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            {wkr.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{wkr.location}</span>}
            {wkr.experienceYears != null && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{wkr.experienceYears} years experience</span>}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{wkr.phone}</span>
            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{email}</span>
          </div>
        </div>
      </div>

      {wkr.bio && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About</p>
          <p className="text-sm text-gray-700 leading-relaxed">{wkr.bio}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Credentials & Access</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CredentialBadge
            icon={<FileCheck className="h-4 w-4" />}
            label="Document Verified"
            active={wkr.docsVerifiedPurchased}
            activeClass="bg-blue-50 border-blue-200 text-blue-700"
            inactiveClass="bg-gray-50 border-gray-200 text-gray-400"
          />
          <CredentialBadge
            icon={<UserCheck className="h-4 w-4" />}
            label="Reference Checked"
            active={wkr.refsPurchased}
            activeClass="bg-purple-50 border-purple-200 text-purple-700"
            inactiveClass="bg-gray-50 border-gray-200 text-gray-400"
          />
          <CredentialBadge
            icon={<TrendingUp className="h-4 w-4" />}
            label="Priority Listed"
            active={wkr.priorityBoost}
            activeClass="bg-orange-50 border-orange-200 text-orange-700"
            inactiveClass="bg-gray-50 border-gray-200 text-gray-400"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400 italic text-center">This is a preview of the worker's profile as seen by employers on the platform.</p>
      </div>
    </div>
  );
}

function EmployerClientView({ emp, email, isVerified }: {
  emp: NonNullable<AccountDetail["employer"]>;
  email: string;
  isVerified: boolean;
}) {
  const isSubActive = emp.subscriptionStatus === "active";
  const planLabel = emp.subscriptionPlan ? PLAN_LABELS[emp.subscriptionPlan] : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
          <Building2 className="h-8 w-8 text-white" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">{emp.organisationName}</h2>
            {isVerified && (
              <Badge className="bg-green-100 text-green-700 border-transparent flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5" />Verified
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            {emp.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{emp.location}</span>}
            <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" />ABN {emp.abn}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{emp.contactPerson}</span>
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{emp.phone}</span>
            {(emp.email ?? email) && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{emp.email ?? email}</span>}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Subscription Status</p>
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${isSubActive ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isSubActive ? "bg-green-100" : "bg-gray-100"}`}>
            <Package className={`h-6 w-6 ${isSubActive ? "text-green-600" : "text-gray-400"}`} />
          </div>
          <div className="flex-1">
            {isSubActive ? (
              <>
                <p className="font-semibold text-green-800">{planLabel ?? "Active"} Plan</p>
                <p className="text-sm text-green-600">
                  {emp.subscriptionPeriodEnd
                    ? `Active until ${new Date(emp.subscriptionPeriodEnd).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`
                    : "Currently active"}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-600 capitalize">{emp.subscriptionStatus === "none" ? "No Subscription" : emp.subscriptionStatus}</p>
                <p className="text-sm text-gray-400">Upgrade to access the full worker marketplace</p>
              </>
            )}
          </div>
          {isSubActive && (
            <Badge className="bg-green-100 text-green-700 border-transparent flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />Active
            </Badge>
          )}
        </div>
      </div>

      {!isSubActive && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Available Plans</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EMPLOYER_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-xl border p-4 flex flex-col gap-2 ${plan.highlight ? "border-orange-300 bg-orange-50/40" : "border-gray-200 bg-white"}`}
              >
                {plan.badge && (
                  <span className={`absolute -top-2.5 left-3 text-xs font-bold px-2 py-0.5 rounded-full ${plan.highlight ? "bg-orange-500 text-white" : "bg-gray-800 text-white"}`}>
                    {plan.badge}
                  </span>
                )}
                <p className="text-xs text-gray-500 font-medium">{plan.name}</p>
                <div className="flex items-end gap-0.5">
                  <span className="text-xl font-extrabold text-gray-900">${plan.monthlyPrice}</span>
                  <span className="text-xs text-gray-400 mb-0.5">/mo</span>
                </div>
                {plan.saving && <span className="text-xs text-green-700 font-semibold">{plan.saving}</span>}
                <p className="text-xs text-gray-400">{plan.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform Features</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: <Users className="h-4 w-4" />, label: "Browse Workers", color: "text-blue-600 bg-blue-50" },
            { icon: <FileCheck className="h-4 w-4" />, label: "View Documents", color: "text-purple-600 bg-purple-50" },
            { icon: <Briefcase className="h-4 w-4" />, label: "Post Jobs", color: "text-indigo-600 bg-indigo-50" },
            { icon: <Shield className="h-4 w-4" />, label: "Compliance Checks", color: "text-green-600 bg-green-50" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${f.color}`}>{f.icon}</div>
              <p className="text-xs text-center text-gray-600 font-medium">{f.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400 italic text-center">This is a preview of the employer dashboard as seen on the platform.</p>
      </div>
    </div>
  );
}

function CredentialBadge({ icon, label, active, activeClass, inactiveClass }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  activeClass: string;
  inactiveClass: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border p-3 ${active ? activeClass : inactiveClass}`}>
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-xs opacity-70">{active ? "Verified" : "Not verified"}</p>
      </div>
      {active && <CheckCircle className="h-4 w-4 shrink-0 opacity-70" />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}

function FF({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}

function PackageCard({ icon, label, description, active, bg, activeColor }: { icon: React.ReactNode; label: string; description: string; active: boolean; bg: string; activeColor: string }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${active ? "border-green-300 bg-green-50/50" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
        {active
          ? <Badge className="bg-green-100 text-green-700 border-transparent text-xs flex items-center gap-0.5"><CheckCircle className="h-3 w-3" />Active</Badge>
          : <Badge className="bg-gray-100 text-gray-400 border-transparent text-xs">Not active</Badge>}
      </div>
      <p className={`text-sm font-semibold ${active ? activeColor : "text-gray-700"}`}>{label}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}

function GrantCheck({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center gap-2 text-sm cursor-pointer select-none ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
      />
      {label}{disabled && <span className="text-xs text-green-600">(already active)</span>}
    </label>
  );
}
