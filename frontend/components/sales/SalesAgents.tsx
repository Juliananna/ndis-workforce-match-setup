import { useEffect, useState, useCallback } from "react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { SalesAgent } from "~backend/sales/agents";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCog, Plus, Trash2, AlertTriangle } from "lucide-react";

export function SalesAgents() {
  const api = useAuthedBackend();
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.sales.listSalesAgents();
      setAgents(res.agents);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!api) return;
    setError(null);
    if (!form.email.trim() || !form.password) {
      setError("Email and password are required");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await api.sales.createSalesAgent({
        email: form.email.trim(),
        password: form.password,
        notes: form.notes || undefined,
      });
      setAgents((prev) => [{ userId: res.userId, email: res.email, grantedAt: new Date(), notes: form.notes || null }, ...prev]);
      setShowForm(false);
      setForm({ email: "", password: "", notes: "" });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!api) return;
    setDeleting(userId);
    try {
      await api.sales.deleteSalesAgent({ userId });
      setAgents((prev) => prev.filter((a) => a.userId !== userId));
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <UserCog className="h-4 w-4 text-orange-500" />
          Sales Team Members
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{agents.length}</span>
        </p>
        <Button
          size="sm"
          onClick={() => setShowForm((p) => !p)}
          className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />Add Agent
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-orange-200 bg-orange-50/30">
          <p className="text-sm font-semibold text-gray-800">Create Sales Agent Account</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="h-8 text-sm"
                placeholder="agent@company.com"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="h-8 text-sm"
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="h-8 text-sm"
                placeholder="Region, role, etc."
              />
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />{error}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving} className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-8 text-xs">Cancel</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : agents.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-10">No sales agents yet.</p>
      ) : (
        <div className="space-y-2">
          {agents.map((a) => (
            <Card key={a.userId} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.email}</p>
                  {a.notes && <p className="text-xs text-gray-500 mt-0.5">{a.notes}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">Added {new Date(a.grantedAt).toLocaleDateString()}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deleting === a.userId}
                  onClick={() => handleDelete(a.userId)}
                  className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50 shrink-0"
                >
                  {deleting === a.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Trash2 className="h-3 w-3 mr-1" />Remove</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
