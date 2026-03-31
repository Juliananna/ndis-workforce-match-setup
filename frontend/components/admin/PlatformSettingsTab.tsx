import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Settings, Save, RotateCcw, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, Clock, User, Filter,
} from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { PlatformSetting, AuditLogEntry } from "~backend/admin/settings";

type SettingsTab = "settings" | "audit";

const BOOL_KEYS = new Set([
  "document_expiry_warn_days_60",
  "document_expiry_warn_days_30",
  "emergency_shift_email_enabled",
  "reengagement_email_enabled",
  "profile_reminder_email_enabled",
  "subscription_expiry_reminder_enabled",
]);

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  UPDATE_SETTING:    { label: "Setting changed",    color: "bg-blue-500/15 text-blue-400" },
  SUSPEND_USER:      { label: "User suspended",     color: "bg-red-500/15 text-red-400" },
  UNSUSPEND_USER:    { label: "User unsuspended",   color: "bg-green-500/15 text-green-400" },
  ARCHIVE_USER:      { label: "User archived",      color: "bg-orange-500/15 text-orange-400" },
  UNARCHIVE_USER:    { label: "User unarchived",    color: "bg-green-500/15 text-green-400" },
  DELETE_USER:       { label: "User deleted",       color: "bg-red-500/15 text-red-400" },
  VERIFY_USER_EMAIL: { label: "Email verified",     color: "bg-emerald-500/15 text-emerald-400" },
};

function formatKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SettingRow({
  setting,
  onSave,
}: {
  setting: PlatformSetting;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const isBool = BOOL_KEYS.has(setting.key);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(setting.key, draft);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(setting.value);
    setEditing(false);
  };

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{formatKey(setting.key)}</p>
        {setting.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
        )}
        {setting.updatedByEmail && (
          <p className="text-xs text-muted-foreground/50 mt-0.5">
            Last changed by {setting.updatedByEmail} · {new Date(setting.updatedAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isBool ? (
          <button
            onClick={async () => {
              const newVal = setting.value === "true" ? "false" : "true";
              await onSave(setting.key, newVal);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              setting.value === "true" ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                setting.value === "true" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        ) : editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              className="h-7 text-sm w-32"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
              autoFocus
            />
            <Button size="sm" className="h-7 text-xs px-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={handleCancel}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {saved && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
            <span className="text-sm font-mono text-foreground">{setting.value}</span>
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.adminListSettings();
      setSettings(res.settings);
    } catch (e: unknown) {
      console.error(e);
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (key: string, value: string) => {
    if (!api) return;
    const updated = await api.admin.adminUpdateSetting({ key, value });
    setSettings((prev) => prev.map((s) => s.key === key ? updated : s));
  };

  const emailSettings = settings.filter((s) => s.key.includes("email") || s.key.includes("expiry_warn") || s.key.includes("reengagement") || s.key.includes("profile_reminder") || s.key.includes("subscription_expiry"));
  const platformSettings = settings.filter((s) => !emailSettings.includes(s));

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
        <AlertTriangle className="h-4 w-4 shrink-0" />{error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {platformSettings.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Platform</h3>
          <p className="text-xs text-muted-foreground mb-4">Core platform configuration values.</p>
          {platformSettings.map((s) => (
            <SettingRow key={s.key} setting={s} onSave={handleSave} />
          ))}
        </Card>
      )}

      {emailSettings.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Email Automation</h3>
          <p className="text-xs text-muted-foreground mb-4">Toggle automated email campaigns on or off.</p>
          {emailSettings.map((s) => (
            <SettingRow key={s.key} setting={s} onSave={handleSave} />
          ))}
        </Card>
      )}
    </div>
  );
}

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "UPDATE_SETTING", label: "Setting changes" },
  { value: "SUSPEND_USER", label: "Suspensions" },
  { value: "UNSUSPEND_USER", label: "Unsuspensions" },
  { value: "ARCHIVE_USER", label: "Archives" },
  { value: "DELETE_USER", label: "Deletions" },
  { value: "VERIFY_USER_EMAIL", label: "Email verifications" },
];

function AuditLogPanel({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 50;

  const load = useCallback(async (p: number, filter: string) => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.admin.adminListAuditLog({
        limit,
        offset: p * limit,
        action: filter || undefined,
      });
      setEntries(res.entries);
      setTotal(res.total);
    } catch (e: unknown) { console.error(e); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(page, actionFilter); }, [load, page, actionFilter]);

  const handleFilterChange = (v: string) => {
    setActionFilter(v);
    setPage(0);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="h-8 text-sm rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {ACTION_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">{total} events</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">{page + 1} / {Math.max(1, totalPages)}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-8">No audit log entries yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const meta = ACTION_LABELS[entry.action] ?? { label: entry.action, color: "bg-muted text-muted-foreground" };
            return (
              <Card key={entry.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs border-transparent ${meta.color}`}>{meta.label}</Badge>
                      {entry.entityType && entry.entityId && (
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                          {entry.entityType} · {entry.entityId.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground">{entry.adminEmail}</span>
                    </p>
                    {entry.detail && Object.keys(entry.detail).length > 0 && (
                      <div className="mt-1.5 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 font-mono">
                        {Object.entries(entry.detail).map(([k, v]) => (
                          <span key={k} className="mr-3">
                            <span className="text-muted-foreground/60">{k}:</span>{" "}
                            <span className="text-foreground">{String(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/50 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PlatformSettingsTab({ api }: { api: ReturnType<typeof useAuthedBackend> }) {
  const [tab, setTab] = useState<SettingsTab>("settings");

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "settings", label: "Settings",  icon: <Settings className="h-3.5 w-3.5" /> },
    { id: "audit",    label: "Audit Log", icon: <Clock className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Platform Settings & Audit Log</h2>
          <p className="text-xs text-muted-foreground">Edit platform config and review admin activity</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? "text-foreground border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "settings" && <SettingsPanel api={api} />}
      {tab === "audit"    && <AuditLogPanel api={api} />}
    </div>
  );
}
