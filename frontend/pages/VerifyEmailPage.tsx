import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import backend from "~backend/client";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "success" | "error" | "no-token">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("no-token");
      return;
    }
    backend.auth.verifyEmail({ token })
      .then(() => setState("success"))
      .catch((e: unknown) => {
        console.error(e);
        setErrorMsg(e instanceof Error ? e.message : "Verification failed");
        setState("error");
      });
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail.trim()) return;
    setResending(true);
    try {
      await backend.auth.resendVerification({ email: resendEmail.trim() });
      setResendDone(true);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        {state === "loading" && (
          <>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email…</h2>
            <p className="text-gray-500 text-sm">Please wait a moment.</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email verified!</h2>
            <p className="text-gray-500 text-sm mb-6">Your account is now active. You can sign in.</p>
            <Link
              to="/login"
              className="block w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
            >
              Sign In
            </Link>
          </>
        )}

        {(state === "error" || state === "no-token") && (
          <>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification failed</h2>
            <p className="text-gray-500 text-sm mb-6">
              {state === "no-token"
                ? "No verification token found. Please use the link from your email."
                : errorMsg || "This link may be invalid or already used."}
            </p>

            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-left mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Mail className="h-4 w-4" />Resend verification email
              </p>
              {resendDone ? (
                <p className="text-sm text-green-600">A new verification link has been sent (if the email is registered).</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleResend()}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend"}
                  </button>
                </div>
              )}
            </div>

            <Link to="/login" className="text-sm text-blue-600 hover:underline font-medium">
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
