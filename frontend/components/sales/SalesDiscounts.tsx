import { useEffect, useState, useCallback } from "react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { Discount, DiscountUpgrade } from "~backend/sales/discounts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Tag, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check, Zap,
} from "lucide-react";

const UPGRADE_OPTIONS: { value: DiscountUpgrade; label: string }[] = [
  { value: "docs_verified", label: "Document Verification" },
  { value: "refs", label: "Reference Checks" },
  { value: "priority_boost", label: "Priority Boost" },
];

function DiscountBadge({ d }: { d: Discount }) {
  if (!d.isActive) return <Badge className="bg-gray-100 text-gray-500 border-transparent text-xs">Inactive</Badge>;
  if (d.validUntil && new Date(d.validUntil) < new Date()) {
    return <Badge className="bg-red-100 text-red-600 border-transparent text-xs">Expired</Badge>;
  }
  if (d.maxUses !== null && d.usesCount >= d.maxUses) {
    return <Badge className="bg-orange-100 text-orange-600 border-transparent text-xs">Max reached</Badge>;
  }
  return <Badge className="bg-green-100 text-green-700 border-transparent text-xs">Active</Badge>;
}

function UpgradePills({ upgrades }: { upgrades: DiscountUpgrade[] }) {
  if (!upgrades || upgrades.length === 0) return null;
  const labels: Record<DiscountUpgrade, string> = {
    docs_verified: "Doc Verify",
    refs: "Ref Checks",
    priority_boost: "Priority",
  };
  return (
    <div className="flex flex-wrap gap-1">
      {upgrades.map((u) => (
        <span
          key={u}
          className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full"
        >
          <Zap className="h-2.5 w-2.5" />
          {labels[u] ?? u}
        </span>
      ))}
    </div>
  );
}

export function SalesDiscounts() {
  const api = useAuthedBackend();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "percent" as "percent" | "fixed_aud_cents",
    discountValue: "",
    appliesTo: "employer_subscription" as "employer_subscription" | "worker_purchase" | "all",
    grantsUpgrades: [] as DiscountUpgrade[],
    maxUses: "",
    validUntil: "",
  });

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.sales.listDiscounts();
      setDiscounts(res.discounts);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const toggleUpgrade = (u: DiscountUpgrade) => {
    setForm((p) => ({
      ...p,
      grantsUpgrades: p.grantsUpgrades.includes(u)
        ? p.grantsUpgrades.filter((x) => x !== u)
        : [...p.grantsUpgrades, u],
    }));
  };

  const handleCreate = async () => {
    if (!api) return;
    setError(null);
    if (!form.code.trim() || !form.discountValue) {
      setError("Code and discount value are required");
      return;
    }
    setSaving(true);
    try {
      const res = await api.sales.createDiscount({
        code: form.code.trim(),
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        appliesTo: form.appliesTo,
        grantsUpgrades: form.grantsUpgrades.length > 0 ? form.grantsUpgrades : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        validUntil: form.validUntil ? new Date(form.validUntil) : undefined,
      });
      setDiscounts((prev) => [res.discount, ...prev]);
      setShowForm(false);
      setForm({ code: "", description: "", discountType: "percent", discountValue: "", appliesTo: "employer_subscription", grantsUpgrades: [], maxUses: "", validUntil: "" });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    if (!api) return;
    setToggling(id);
    try {
      await api.sales.toggleDiscount({ discountId: id });
      setDiscounts((prev) => prev.map((d) => d.id === id ? { ...d, isActive: !d.isActive } : d));
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!api) return;
    setDeleting(id);
    try {
      await api.sales.deleteDiscount({ discountId: id });
      setDiscounts((prev) => prev.filter((d) => d.id !== id));
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const formatValue = (d: Discount) =>
    d.discountType === "percent"
      ? `${d.discountValue}% off`
      : `$${(d.discountValue / 100).toFixed(0)} off`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Tag className="h-4 w-4 text-orange-500" />
          Discount Codes
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{discounts.length}</span>
        </p>
        <Button
          size="sm"
          onClick={() => setShowForm((p) => !p)}
          className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />New Discount
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-orange-200 bg-orange-50/30">
          <p className="text-sm font-semibold text-gray-800">Create Discount</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Code *</Label>
              <Input
                placeholder="NDIS20"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="20% off for new employers"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select
                value={form.discountType}
                onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as "percent" | "fixed_aud_cents" }))}
                className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed_aud_cents">Fixed Amount (AUD cents)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Value * {form.discountType === "percent" ? "(e.g. 20 = 20%)" : "(e.g. 2000 = $20)"}
              </Label>
              <Input
                type="number"
                placeholder={form.discountType === "percent" ? "20" : "2000"}
                value={form.discountValue}
                onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Applies To</Label>
              <select
                value={form.appliesTo}
                onChange={(e) => setForm((p) => ({ ...p, appliesTo: e.target.value as typeof form.appliesTo }))}
                className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="employer_subscription">Employer Subscription</option>
                <option value="worker_purchase">Worker Purchase</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Uses (optional)</Label>
              <Input
                type="number"
                placeholder="100"
                value={form.maxUses}
                onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valid Until (optional)</Label>
              <Input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <Zap className="h-3 w-3 text-purple-500" />
                Auto-grant worker upgrades (optional)
              </Label>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {UPGRADE_OPTIONS.map((opt) => {
                  const selected = form.grantsUpgrades.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleUpgrade(opt.value)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        selected
                          ? "bg-purple-100 border-purple-400 text-purple-700 font-medium"
                          : "bg-white border-gray-200 text-gray-500 hover:border-purple-300"
                      }`}
                    >
                      {selected && <Check className="inline h-2.5 w-2.5 mr-0.5" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 pt-0.5">
                Workers who redeem this code will automatically receive the selected upgrades at no cost.
              </p>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving} className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-8 text-xs">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : discounts.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-10">No discount codes yet.</p>
      ) : (
        <div className="space-y-2">
          {discounts.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => copyCode(d.code)}
                      className="flex items-center gap-1.5 font-mono text-sm font-bold text-gray-900 hover:text-orange-600 transition-colors"
                    >
                      {d.code}
                      {copied === d.code ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
                    </button>
                    <DiscountBadge d={d} />
                    <Badge className="bg-blue-50 text-blue-600 border-transparent text-xs">{formatValue(d)}</Badge>
                    <Badge className="bg-gray-100 text-gray-500 border-transparent text-xs">{d.appliesTo.replace("_", " ")}</Badge>
                  </div>
                  {d.description && <p className="text-xs text-gray-500">{d.description}</p>}
                  <UpgradePills upgrades={d.grantsUpgrades} />
                  <p className="text-xs text-gray-400">
                    Used {d.usesCount}{d.maxUses !== null ? `/${d.maxUses}` : ""} times
                    {d.validUntil ? ` · expires ${new Date(d.validUntil).toLocaleDateString()}` : ""}
                    {" · "}by {d.createdByEmail}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggle(d.id)}
                    disabled={toggling === d.id}
                    className="text-gray-400 hover:text-orange-500 transition-colors"
                    title={d.isActive ? "Deactivate" : "Activate"}
                  >
                    {toggling === d.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : d.isActive
                        ? <ToggleRight className="h-5 w-5 text-green-500" />
                        : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={deleting === d.id}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    {deleting === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
