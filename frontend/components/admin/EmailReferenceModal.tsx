import { useState } from "react";
import { Mail, X, Loader2, Send, CheckCircle, AlertTriangle, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { PendingReferenceItem } from "~backend/admin/reference_bookings";
import type { EmailReferenceRequestItem } from "~backend/admin/email_reference";

interface Props {
  item: PendingReferenceItem;
  onClose: () => void;
  onSent: () => void;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  Pending: {
    color: "bg-blue-100 text-blue-700",
    icon: <Clock className="h-3 w-3" />,
    label: "Awaiting Response",
  },
  Completed: {
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle className="h-3 w-3" />,
    label: "Completed",
  },
  Expired: {
    color: "bg-gray-100 text-gray-500",
    icon: <AlertTriangle className="h-3 w-3" />,
    label: "Expired",
  },
  Cancelled: {
    color: "bg-red-100 text-red-600",
    icon: <Ban className="h-3 w-3" />,
    label: "Cancelled",
  },
};

export function EmailReferenceModal({ item, onClose, onSent }: Props) {
  const api = useAuthedBackend();
  const { toast } = useToast();
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [requests, setRequests] = useState<EmailReferenceRequestItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const hasEmail = !!item.refereeEmail;

  const loadHistory = async () => {
    if (!api) return;
    setLoadingHistory(true);
    try {
      const res = await api.admin.adminListEmailReferenceRequests({ referenceId: item.referenceId });
      setRequests(res.requests);
    } catch (e) {
      console.error("Failed to load email reference history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useState(() => {
    loadHistory();
  });

  const handleSend = async () => {
    if (!api || !hasEmail) return;
    setSending(true);
    try {
      await api.admin.adminSendEmailReferenceRequest({
        referenceId: item.referenceId,
        customMessage: customMessage.trim() || undefined,
      });
      toast({ title: "Email sent", description: `Reference form sent to ${item.refereeEmail}` });
      onSent();
      await loadHistory();
    } catch (e: unknown) {
      console.error("Failed to send email reference request:", e);
      toast({ title: "Failed to send", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!api) return;
    setCancelling(requestId);
    try {
      await api.admin.adminCancelEmailReferenceRequest({ requestId });
      toast({ title: "Request cancelled" });
      await loadHistory();
    } catch (e: unknown) {
      console.error("Failed to cancel:", e);
      toast({ title: "Failed to cancel", variant: "destructive" });
    } finally {
      setCancelling(null);
    }
  };

  const pendingRequest = requests.find((r) => r.status === "Pending");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-indigo-600" />
            <div>
              <p className="font-semibold text-sm text-gray-900">Send Email Reference Request</p>
              <p className="text-xs text-gray-500">{item.refereeName} · {item.refereeOrganisation}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 space-y-2">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Referee Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-800">{item.refereeName}</span></div>
              <div><span className="text-gray-500">Title:</span> <span className="font-medium text-gray-800">{item.refereeTitle}</span></div>
              <div className="col-span-2">
                <span className="text-gray-500">Email:</span>{" "}
                {hasEmail
                  ? <span className="font-medium text-indigo-700">{item.refereeEmail}</span>
                  : <span className="text-red-500 font-medium">No email address on file</span>
                }
              </div>
            </div>
            {!hasEmail && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-1">
                The referee does not have an email address. Ask the worker to update their referee details before sending.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Optional message to referee
              <span className="text-gray-400 font-normal ml-1">(added to the email)</span>
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. Please don't hesitate to reach out if you have any questions."
              disabled={!hasEmail}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50"
            />
            <p className="text-xs text-gray-400">The email will include a unique link that expires in 14 days.</p>
          </div>

          {requests.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Previous Requests</p>
              <div className="space-y-2">
                {requests.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.Pending;
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 truncate">Sent to {r.sentToEmail}</p>
                        <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("en-AU", { dateStyle: "medium" })}</p>
                      </div>
                      {r.status === "Pending" && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={cancelling === r.id}
                          className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50 shrink-0"
                        >
                          {cancelling === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loadingHistory && requests.length === 0 && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !hasEmail}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {pendingRequest ? "Resend Email" : "Send Email Reference"}
          </Button>
        </div>
      </div>
    </div>
  );
}
