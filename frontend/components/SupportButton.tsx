import { useState } from "react";
import { HelpCircle, X, Send, CheckCircle, Loader2, ChevronDown } from "lucide-react";
import { useAuthedBackend } from "../hooks/useAuthedBackend";

const CATEGORIES = [
  { value: "general",    label: "General enquiry" },
  { value: "technical",  label: "Technical issue" },
  { value: "billing",    label: "Billing & subscription" },
  { value: "compliance", label: "Compliance & documents" },
  { value: "account",    label: "Account help" },
] as const;

type Category = typeof CATEGORIES[number]["value"];

export function SupportButton() {
  const api = useAuthedBackend();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSubject("");
    setMessage("");
    setCategory("general");
    setSent(false);
    setError(null);
  };

  const handleClose = () => {
    setOpen(false);
    if (sent) reset();
  };

  const handleSubmit = async () => {
    if (!api) return;
    if (!subject.trim()) { setError("Please enter a subject"); return; }
    if (!message.trim()) { setError("Please describe your issue"); return; }
    setSending(true);
    setError(null);
    try {
      await api.support.submitSupportTicket({ subject, message, category });
      setSent(true);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); reset(); }}
        className="fixed bottom-6 right-6 z-50 h-13 w-13 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
        title="Contact support"
        aria-label="Contact support"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:pr-6 sm:pb-24 px-0">
          <div className="absolute inset-0 bg-black/30 sm:hidden" onClick={handleClose} />

          <div className="relative w-full sm:w-96 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 bg-indigo-600">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="h-5 w-5 text-indigo-200" />
                <span className="font-semibold text-white text-sm">Contact Support</span>
              </div>
              <button onClick={handleClose} className="p-1 rounded-lg hover:bg-indigo-500 transition-colors">
                <X className="h-4 w-4 text-indigo-200" />
              </button>
            </div>

            {sent ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Request sent!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    We've received your message and will get back to you shortly. A confirmation has been sent to your email.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="mt-2 px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                <div className="px-5 py-4 space-y-4">
                  <p className="text-xs text-gray-500">
                    Describe your issue and we'll get back to you as soon as possible.
                  </p>

                  {error && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Category</label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Category)}
                        className="w-full h-9 text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Subject *</label>
                    <input
                      type="text"
                      className="w-full h-9 text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Brief description of your issue"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Message *</label>
                    <textarea
                      rows={5}
                      className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Please describe your issue in detail…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 h-10 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? "Sending…" : "Send Request"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
