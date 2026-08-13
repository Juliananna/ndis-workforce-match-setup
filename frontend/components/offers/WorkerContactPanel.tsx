import { useState, useEffect } from "react";
import { Mail, Phone, Copy, Check, Loader2 } from "lucide-react";
import { useAuthedBackend } from "../../hooks/useAuthedBackend";
import type { WorkerContactInfoResponse } from "~backend/workers/contact_info";

interface Props {
  workerId: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function WorkerContactPanel({ workerId }: Props) {
  const api = useAuthedBackend();
  const [info, setInfo] = useState<WorkerContactInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    setLoading(true);
    api.workers.getWorkerContactInfo({ workerId })
      .then(setInfo)
      .catch((e: unknown) => {
        console.error("Failed to load worker contact info:", e);
        setError(e instanceof Error ? e.message : "Failed to load contact info");
      })
      .finally(() => setLoading(false));
  }, [api, workerId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />Loading contact info…
      </div>
    );
  }

  if (error || !info) {
    return (
      <p className="text-sm text-muted-foreground italic py-2">
        {error ?? "Contact info unavailable"}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Mail className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Email</p>
          <a
            href={`mailto:${info.email}`}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate block"
          >
            {info.email}
          </a>
        </div>
        <CopyButton text={info.email} />
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <Phone className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Phone</p>
          <a
            href={`tel:${info.phone}`}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline truncate block"
          >
            {info.phone}
          </a>
        </div>
        <CopyButton text={info.phone} />
      </div>
    </div>
  );
}
