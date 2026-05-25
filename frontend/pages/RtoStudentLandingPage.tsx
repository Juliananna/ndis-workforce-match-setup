import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RtoEnquiryModal } from "../components/RtoEnquiryModal";
import {
  GraduationCap, FileText, Users, ShieldCheck, Briefcase,
  ArrowRight, CheckCircle2, Loader2, AlertCircle,
} from "lucide-react";
import backend from "~backend/client";
import type { RtoPartner } from "~backend/rto/types";

const FEATURES = [
  { icon: <FileText className="h-5 w-5" />, text: "Upload your compliance documents in one place" },
  { icon: <Users className="h-5 w-5" />, text: "Request and manage referee checks" },
  { icon: <ShieldCheck className="h-5 w-5" />, text: "Build a verified support worker profile" },
  { icon: <Briefcase className="h-5 w-5" />, text: "Connect with providers open to placement discussions" },
];

export default function RtoStudentLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [partner, setPartner] = useState<RtoPartner | null>(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const p = await backend.rto.getRtoPartnerBySlug({ slug });
        setPartner(p);
        await backend.rto.trackRtoReferral({
          referralCode: p.referralCode,
          sourceUrl: window.location.href,
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const buildResumeUrl = () => {
    const params = new URLSearchParams({
      source: "rto",
      rtoCode: partner?.referralCode ?? "",
      rtoId: partner?.rtoPartnerId ?? "",
    });
    return `/resume-builder?${params.toString()}`;
  };

  const signupUrl = () => {
    const params = new URLSearchParams({
      source: "rto",
      rtoCode: partner?.referralCode ?? "",
      rtoId: partner?.rtoPartnerId ?? "",
    });
    return `/worker-signup?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <h1 className="text-2xl font-bold text-gray-900">RTO page not found</h1>
        <p className="text-gray-500 max-w-sm">
          This RTO partner page doesn't exist or is no longer active. Please check with your training organisation for the correct link.
        </p>
        <Link to="/worker-signup" className="mt-2 text-teal-600 font-semibold hover:underline">
          Create a free worker profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <RtoEnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} rtoSlug={slug} />
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/kizazi-hire-logo.png" alt="KIZAZI Hire" className="h-8 w-auto" />
        </Link>
        <Link
          to="/login"
          className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign in
        </Link>
      </header>

      <section className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-medium mb-6">
            <GraduationCap className="h-4 w-4 text-teal-200" />
            <span>Student pathway — referred by {partner?.name}</span>
          </div>

          {partner?.logoUrl && (
            <div className="flex justify-center mb-6">
              <img
                src={partner.logoUrl}
                alt={partner.name}
                className="h-14 rounded-xl bg-white/10 p-2 object-contain"
              />
            </div>
          )}

          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-5">
            Get placement-ready<br />
            <span className="text-teal-200">for NDIS support work</span>
          </h1>
          <p className="text-teal-100 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            {partner?.name} has partnered with KIZAZI Hire to help you prepare for work placement. Build your compliance profile, complete reference checks, and connect with providers — all for free.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={buildResumeUrl()}
              className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white text-teal-700 font-bold rounded-2xl hover:bg-teal-50 transition-colors shadow-xl shadow-teal-900/20"
            >
              <FileText className="h-5 w-5" />
              Build my placement profile
            </Link>
            <Link
              to={signupUrl()}
              className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-teal-500/30 border border-white/25 text-white font-semibold rounded-2xl hover:bg-teal-500/40 transition-colors"
            >
              Create worker profile
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
          Everything you need to become placement-ready
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50">
              <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                {f.icon}
              </div>
              <span className="text-sm text-gray-700 leading-relaxed mt-1">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 border-t border-gray-100 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">What students need to know</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
              <p>Creating a KIZAZI profile is <strong>free</strong>. You can upload documents, complete reference checks, and appear in provider searches at no cost.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
              <p>Your profile is only <strong>active</strong> once you've uploaded at least one real compliance document. No shortcuts — this protects you and the people you'll support.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
              <p>You control who sees your profile. Your compliance documents are private and are never shared with your RTO without your explicit consent.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
              <p>KIZAZI helps you <strong>connect with providers open to placement discussions</strong>. Formal placement arrangements remain between you, your RTO, and the host employer.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="max-w-2xl mx-auto rounded-2xl bg-teal-600 text-white p-10 text-center shadow-xl shadow-teal-900/20">
          <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-teal-100 mb-7 text-sm leading-relaxed">
            Build your free placement profile now. It takes about 10 minutes and you can continue any time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={buildResumeUrl()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-colors"
            >
              Build my placement profile
            </Link>
            <Link
              to={signupUrl()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-500/30 border border-white/25 text-white font-semibold rounded-xl hover:bg-teal-500/40 transition-colors"
            >
              Create account & start now
            </Link>
          </div>
          {partner && (
            <p className="mt-6 text-xs text-teal-200">
              Referred by {partner.name} · Referral code: {partner.referralCode}
            </p>
          )}
        </div>
      </section>

      <footer className="border-t border-gray-100 px-6 py-6 text-center text-xs text-gray-400">
        <p>© 2024 Kizazi Hire · NDIS workforce platform</p>
        <p className="mt-1">KIZAZI does not manage or guarantee work placement arrangements.</p>
      </footer>
    </div>
  );
}
