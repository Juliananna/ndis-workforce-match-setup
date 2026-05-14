import { useState } from "react";
import {
  Dialog, DialogContent, DialogClose,
} from "@/components/ui/dialog";
import {
  Zap, Search, ShieldCheck, Star, Users, Bell, FileCheck, ArrowRight, CheckCircle, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const FEATURES = [
  {
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-50",
    title: "Your resume becomes your profile instantly",
    desc: "All the information you've entered pre-fills your KizaziHire profile. No re-entering data — you're done in seconds.",
  },
  {
    icon: Search,
    color: "text-teal-600",
    bg: "bg-teal-50",
    title: "Appear in provider searches",
    desc: "NDIS providers search KizaziHire daily for available support workers. A complete profile means more eyes on you.",
  },
  {
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
    title: "Get matched with job openings",
    desc: "Our matching engine connects you to roles that fit your skills, availability and location — without you having to apply.",
  },
  {
    icon: Bell,
    color: "text-purple-600",
    bg: "bg-purple-50",
    title: "Emergency shift alerts",
    desc: "Get notified the moment a provider posts an urgent shift in your area. First to respond, first to get booked.",
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    title: "Verified compliance badge",
    desc: "Upload your NDIS Worker Screening, police check and qualifications once. Providers see a verified badge — building instant trust.",
  },
  {
    icon: FileCheck,
    color: "text-rose-500",
    bg: "bg-rose-50",
    title: "Collect and showcase references",
    desc: "Add your referees and we'll contact them for you. Verified references sit right on your profile and set you apart.",
  },
  {
    icon: Star,
    color: "text-orange-500",
    bg: "bg-orange-50",
    title: "Reviews from providers",
    desc: "After completing work, providers can leave reviews on your profile. A strong rating helps you win more bookings.",
  },
  {
    icon: CheckCircle,
    color: "text-slate-500",
    bg: "bg-slate-50",
    title: "You control your visibility — always",
    desc: "Your profile stays private until you're ready. Choose exactly which providers can see you, and turn it off any time.",
  },
];

const STATS = [
  { value: "3×", label: "more interview requests with a verified profile" },
  { value: "48h", label: "average time from profile to first job offer" },
  { value: "Free", label: "to join — profile & job matching at no cost" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  hasEmail?: boolean;
}

export function GetHiredFasterModal({ open, onOpenChange, sessionId, hasEmail }: Props) {
  const navigate = useNavigate();

  const handleCTA = () => {
    onOpenChange(false);
    if (sessionId && hasEmail) {
      document.getElementById("profile-conversion-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (sessionId) {
      document.getElementById("email-gate")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      navigate("/register");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col gap-0">
        <div className="bg-gradient-to-br from-teal-600 to-emerald-600 px-6 pt-6 pb-5 text-white relative shrink-0">
          <DialogClose className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <X size={20} />
            <span className="sr-only">Close</span>
          </DialogClose>
          <p className="text-teal-200 text-xs font-semibold uppercase tracking-widest mb-1">KizaziHire Profile</p>
          <h2 className="text-2xl font-extrabold mb-2 leading-tight">How to get hired faster as an NDIS support worker</h2>
          <p className="text-teal-100 text-sm">A free KizaziHire profile puts you in front of providers who are actively hiring — here's what you get.</p>

          <div className="grid grid-cols-3 gap-3 mt-5">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white/15 rounded-xl px-3 py-3 text-center">
                <div className="text-2xl font-extrabold">{s.value}</div>
                <div className="text-teal-100 text-xs mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <div className="grid sm:grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                <div className={`shrink-0 w-9 h-9 rounded-lg ${f.bg} flex items-center justify-center`}>
                  <f.icon size={18} className={f.color} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800 leading-snug">{f.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 text-xs text-slate-500 hidden sm:block">
            Free to join · Profile & matching at no cost
          </div>
          <button
            onClick={handleCTA}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-sm rounded-xl hover:from-teal-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
          >
            Create my free profile <ArrowRight size={16} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
