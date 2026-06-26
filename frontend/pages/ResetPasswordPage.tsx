import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import backend from "~backend/client";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const isWelcome = searchParams.get("welcome") === "1";
  const onboarding = searchParams.get("onboarding");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token. Please request a new reset link.");
      return;
    }

    setLoading(true);
    try {
      await backend.auth.resetPassword({ token, newPassword });
      setDone(true);
      const loginDest = onboarding ? `/login?onboarding=${onboarding}` : "/login";
      setTimeout(() => navigate(loginDest), 3000);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("expired")) {
        setTokenInvalid(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Invalid Reset Link</h1>
          <p className="text-gray-500 text-sm mt-2 mb-6">This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (tokenInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {isWelcome ? "Activation link expired" : "Reset link expired"}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {isWelcome
              ? "Your account activation link has expired or already been used. Request a new password reset link to set your password and log in."
              : "This password reset link has expired or already been used. Reset links are only valid for 1 hour."}
          </p>
          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Request a new {isWelcome ? "activation" : "reset"} link
            </Link>
            <Link
              to="/login"
              className="block text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Already have a password? Log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            {isWelcome && (
              <div className="flex items-start gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4">
                <span className="text-xl">🎉</span>
                <div>
                  <p className="font-bold text-teal-800 text-sm">Your resume is ready — one step to activate!</p>
                  <p className="text-xs text-teal-700 mt-0.5">Set a password to log in, then upload your first compliance document to activate your profile and get matched with providers.</p>
                </div>
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{isWelcome ? "Create your password" : "Set new password"}</h1>
            <p className="text-gray-500 mt-1 text-sm">Choose a strong password for your account.</p>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">Password set successfully!</p>
                <p className="text-sm text-gray-500 mt-1">Redirecting you to login…</p>
              </div>
              <Link to={onboarding ? `/login?onboarding=${onboarding}` : "/login"} className="text-sm text-blue-600 hover:underline font-medium mt-2">
                Go to login now
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 mb-5">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full pl-10 pr-10 py-3 bg-gray-100 border border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isWelcome ? "Activate My Account" : "Reset Password"}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                <Link to={onboarding ? `/login?onboarding=${onboarding}` : "/login"} className="text-blue-600 hover:underline font-semibold">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
