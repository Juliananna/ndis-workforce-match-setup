import { useState } from "react";
import { X, GraduationCap, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import backend from "~backend/client";

interface Props {
  open: boolean;
  onClose: () => void;
  rtoSlug?: string;
}

export function RtoEnquiryModal({ open, onClose, rtoSlug }: Props) {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setName(""); setOrg(""); setEmail(""); setPhone(""); setMessage("");
    setError(null); setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await backend.rto.submitRtoEnquiry({
        name: name.trim(),
        organisationName: org.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: message.trim(),
        rtoSlug: rtoSlug || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Request an RTO referral link</h2>
              <p className="text-teal-100 text-xs mt-0.5">We'll respond within one business day.</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          {success ? (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="h-16 w-16 rounded-full bg-teal-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Enquiry sent!</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Thanks for your interest. Our team will be in touch within one business day with your RTO referral link.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Organisation name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    placeholder="e.g. Sunraysia Institute of TAFE"
                    className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@rto.edu.au"
                    className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Phone <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03 9XXX XXXX"
                    className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your RTO — course names, student numbers, what you're hoping to achieve with the partnership..."
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                ) : (
                  "Send enquiry"
                )}
              </button>

              <p className="text-xs text-gray-400 text-center">
                We'll respond within one business day with your unique referral link.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
