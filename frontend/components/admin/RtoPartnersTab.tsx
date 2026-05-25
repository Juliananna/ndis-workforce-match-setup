import { useState, useEffect } from "react";
import {
  GraduationCap, Plus, Loader2, ExternalLink, BarChart2,
  CheckCircle, Users, FileText, ClipboardList, Briefcase,
  X, Check, RefreshCw, QrCode,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { RtoFlyerModal } from "./RtoFlyerModal";
import type { RtoPartner } from "~backend/rto/types";
import type { RtoPartnerStats } from "~backend/admin/rto_partners";

type Tab = "stats" | "partners";

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className={`flex flex-col items-center px-4 py-3 rounded-xl border ${color}`}>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs font-medium mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

export function RtoPartnersTab() {
  const api = useAuthedBackend();
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<RtoPartnerStats[]>([]);
  const [partners, setPartners] = useState<RtoPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [flyerPartner, setFlyerPartner] = useState<RtoPartner | null>(null);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newWebsite, setNewWebsite] = useState("");

  const load = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const [statsRes, partnersRes] = await Promise.allSettled([
        api.admin.adminListRtoPartnerStats(),
        api.admin.adminListRtoPartners(),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.stats);
      if (partnersRes.status === "fulfilled") setPartners(partnersRes.value.partners);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [api]);

  const handleCreate = async () => {
    if (!api) return;
    if (!newName.trim() || !newSlug.trim() || !newContactName.trim() || !newContactEmail.trim()) {
      setCreateError("Name, slug, contact name and email are required.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const p = await api.admin.adminCreateRtoPartner({
        name: newName.trim(),
        slug: newSlug.trim(),
        contactName: newContactName.trim(),
        contactEmail: newContactEmail.trim(),
        phone: newPhone.trim() || undefined,
        website: newWebsite.trim() || undefined,
      });
      setPartners((prev) => [p, ...prev]);
      setShowCreateForm(false);
      setFlyerPartner(p);
      setNewName(""); setNewSlug(""); setNewContactName(""); setNewContactEmail(""); setNewPhone(""); setNewWebsite("");
    } catch (e: unknown) {
      console.error(e);
      setCreateError(e instanceof Error ? e.message : "Failed to create partner");
    } finally {
      setCreating(false);
    }
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleLogoUpdated = (partnerId: string, logoUrl: string) => {
    setPartners((prev) => prev.map((p) => p.rtoPartnerId === partnerId ? { ...p, logoUrl } : p));
    if (flyerPartner?.rtoPartnerId === partnerId) {
      setFlyerPartner((prev) => prev ? { ...prev, logoUrl } : prev);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold text-foreground">RTO Partner Programme</h2>
          </div>
          <p className="text-sm text-muted-foreground">Manage RTO partners and track student referral performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add RTO Partner
          </button>
        </div>
      </div>

      {showCreateForm && (
        <Card className="p-5 border-teal-200 bg-teal-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">New RTO Partner</h3>
            <button onClick={() => setShowCreateForm(false)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">RTO Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); if (!newSlug) setNewSlug(autoSlug(e.target.value)); }}
                placeholder="e.g. Sunraysia Institute of TAFE"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">URL Slug * (letters, numbers, hyphens)</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="e.g. sunraysia-tafe"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {newSlug && (
                <p className="text-xs text-muted-foreground">Student landing page: /rto/{newSlug}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Contact Name *</label>
              <input
                type="text"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Contact Email *</label>
              <input
                type="email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Phone (optional)</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Website (optional)</label>
              <input
                type="url"
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                placeholder="https://"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create Partner
            </button>
          </div>
        </Card>
      )}

      <div className="flex gap-1 border-b border-border">
        {(["stats", "partners"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t
                ? "text-teal-600 border-teal-600"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t === "stats" ? "Referral Performance" : "Partner Directory"}
          </button>
        ))}
      </div>

      {activeTab === "stats" && (
        <div className="space-y-4">
          {stats.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No RTO partners yet. Add a partner to start tracking referrals.</p>
            </div>
          ) : (
            stats.map((s) => (
              <Card key={s.rtoPartnerId} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{s.rtoName}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Referral code: <span className="font-mono font-semibold">{s.referralCode}</span>
                      {" · "}
                      Student page: <span className="font-mono">/rto/{s.slug}</span>
                    </p>
                  </div>
                  <a
                    href={`/rto/${s.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-teal-600 hover:underline shrink-0"
                  >
                    View page <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  <StatPill value={s.totalReferrals} label="Total referrals" color="bg-blue-50 border-blue-200 text-blue-800" />
                  <StatPill value={s.profilesStarted} label="Profiles started" color="bg-indigo-50 border-indigo-200 text-indigo-800" />
                  <StatPill value={s.profilesActivated} label="Profiles activated" color="bg-teal-50 border-teal-200 text-teal-800" />
                  <StatPill value={s.complianceUploaded} label="Docs uploaded" color="bg-green-50 border-green-200 text-green-800" />
                  <StatPill value={s.referenceChecksRequested} label="Ref checks" color="bg-purple-50 border-purple-200 text-purple-800" />
                  <StatPill value={s.placementRequiredCount} label="Need placement" color="bg-amber-50 border-amber-200 text-amber-800" />
                  <StatPill value={s.wantsPaidWorkCount} label="Want paid work" color="bg-emerald-50 border-emerald-200 text-emerald-800" />
                </div>

                {s.totalReferrals > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Activation rate</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-teal-500 transition-all"
                          style={{ width: `${Math.round((s.profilesActivated / s.totalReferrals) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-teal-700 shrink-0">
                        {Math.round((s.profilesActivated / s.totalReferrals) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "partners" && (
        <div className="space-y-3">
          {partners.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No RTO partners yet.</p>
            </div>
          ) : (
            partners.map((p) => (
              <Card key={p.rtoPartnerId} className="p-4 flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {p.logoUrl
                    ? <img src={p.logoUrl} alt={p.name} className="h-full w-full object-contain p-1" crossOrigin="anonymous" />
                    : <GraduationCap className="h-5 w-5 text-teal-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{p.name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.contactName} · {p.contactEmail}
                    {p.phone && ` · ${p.phone}`}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span>
                      Code: <span className="font-mono font-semibold text-foreground">{p.referralCode}</span>
                    </span>
                    <span>
                      Page: <span className="font-mono text-teal-600">/rto/{p.slug}</span>
                    </span>
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-teal-600 hover:underline">
                        Website <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(p.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <button
                    onClick={() => setFlyerPartner(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR &amp; Flyer
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {flyerPartner && (
        <RtoFlyerModal
          partner={flyerPartner}
          open={true}
          onClose={() => setFlyerPartner(null)}
          onLogoUpdated={(logoUrl) => handleLogoUpdated(flyerPartner.rtoPartnerId, logoUrl)}
        />
      )}
    </div>
  );
}
