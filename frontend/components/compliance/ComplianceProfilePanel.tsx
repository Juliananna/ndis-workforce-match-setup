import { useState, useEffect } from "react";
import { User, Lock, Save, Loader2, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import { useToast } from "@/components/ui/use-toast";

export function ComplianceProfilePanel() {
  const api = useAuthedBackend();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [createdAt, setCreatedAt] = useState<Date | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!api) return;
    api.admin.getComplianceProfile()
      .then((p) => {
        setEmail(p.email);
        setFullName(p.fullName);
        setCreatedAt(new Date(p.createdAt));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [api]);

  const handleSaveProfile = async () => {
    if (!api) return;
    setSaving(true);
    try {
      const res = await api.admin.updateComplianceProfile({ fullName });
      setFullName(res.fullName);
      toast({ title: "Profile updated", description: "Your name has been saved." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!api) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirm password must match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      await api.admin.updateComplianceProfile({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to change password", variant: "destructive" });
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account details and password.</p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <User className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Account Details</p>
            {createdAt && (
              <p className="text-xs text-gray-400">Member since {createdAt.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" value={email} disabled className="bg-gray-50 text-gray-500" />
          <p className="text-xs text-gray-400">Email cannot be changed. Contact an administrator.</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        <Button
          onClick={handleSaveProfile}
          disabled={saving || !fullName.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </Card>

      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Lock className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Change Password</p>
            <p className="text-xs text-gray-400">Use a strong password of at least 8 characters.</p>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            autoComplete="current-password"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            autoComplete="new-password"
          />
        </div>

        {newPassword && confirmPassword && newPassword === confirmPassword && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Passwords match
          </p>
        )}
        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-red-500">Passwords do not match</p>
        )}

        <Button
          onClick={handleChangePassword}
          disabled={savingPw || !currentPassword || !newPassword || !confirmPassword}
          variant="outline"
          className="border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          {savingPw ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
          Update password
        </Button>
      </Card>
    </div>
  );
}
