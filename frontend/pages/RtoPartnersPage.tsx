import { Link } from "react-router-dom";
import {
  GraduationCap, CheckCircle2, ArrowRight, FileText, Users, ShieldCheck,
  Briefcase, Mail, BookOpen, ClipboardList,
} from "lucide-react";

const STEPS = [
  {
    icon: <GraduationCap className="h-5 w-5 text-teal-600" />,
    title: "Students get a unique link",
    body: "Share your RTO referral link with students at enrolment or orientation. They land on a co-branded page tailored for your course.",
  },
  {
    icon: <FileText className="h-5 w-5 text-teal-600" />,
    title: "Students build a compliance-ready profile",
    body: "Students upload their compliance documents, complete reference checks, and build a professional support worker profile — all in one place.",
  },
  {
    icon: <Briefcase className="h-5 w-5 text-teal-600" />,
    title: "Students connect with providers",
    body: "Once placement-ready, students appear in search results for NDIS providers open to placement discussions and entry-level workers.",
  },
];

const BENEFITS = [
  { icon: <ClipboardList className="h-5 w-5" />, text: "One structured place for students to organise their compliance documents" },
  { icon: <ShieldCheck className="h-5 w-5" />, text: "Reference check tools built in — no chasing referees manually" },
  { icon: <Users className="h-5 w-5" />, text: "Connect students with NDIS providers open to placement discussions" },
  { icon: <BookOpen className="h-5 w-5" />, text: "Track student readiness without accessing sensitive documents" },
  { icon: <CheckCircle2 className="h-5 w-5" />, text: "Students who complete their profile are more likely to secure paid work after graduation" },
];

const FAQS = [
  {
    q: "Does KIZAZI manage work placement arrangements?",
    a: "No. KIZAZI is a workforce platform that helps students become placement-ready and connect with providers. Formal placement arrangements remain the responsibility of the RTO and the host employer.",
  },
  {
    q: "Can RTOs see student compliance documents?",
    a: "No. Student compliance documents are private. RTOs can only see general progress information if the student has given explicit consent.",
  },
  {
    q: "Is there a cost for RTOs or students?",
    a: "Creating a student worker profile on KIZAZI is free. Students may choose to upgrade for premium features like priority matching. There is no cost for RTOs to partner with KIZAZI.",
  },
  {
    q: "What happens if a student already has a KIZAZI account?",
    a: "They can log in and update their profile to indicate they're seeking placement. The referral link works for new sign-ups and returning students.",
  },
];

export default function RtoPartnersPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100 flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/kizazi-hire-logo.png" alt="KIZAZI Hire" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign in
          </Link>
          <a
            href="mailto:hello@kizazihire.com.au?subject=RTO Partner Referral Link Request"
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            Request a referral link
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white px-6 py-20 md:py-28">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 60%, #fff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6ee7b7 0%, transparent 40%)" }} />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-medium mb-8">
            <GraduationCap className="h-4 w-4 text-teal-200" />
            <span>RTO Partner Programme</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Help your students become<br />
            <span className="text-teal-200">placement-ready</span> for NDIS support work
          </h1>
          <p className="text-teal-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            KIZAZI Hire gives students one simple place to build a support worker profile, upload compliance documents, complete reference checks, and connect with NDIS providers looking for new workers or placement-ready students.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:hello@kizazihire.com.au?subject=RTO Partner Referral Link Request"
              className="inline-flex items-center gap-2 px-7 py-4 bg-white text-teal-700 font-bold rounded-2xl hover:bg-teal-50 transition-colors shadow-xl shadow-teal-900/20 text-base"
            >
              <Mail className="h-5 w-5" />
              Request an RTO referral link
            </a>
            <Link
              to="/worker-signup"
              className="inline-flex items-center gap-2 px-7 py-4 bg-teal-500/30 border border-white/25 text-white font-semibold rounded-2xl hover:bg-teal-500/40 transition-colors text-base"
            >
              Refer students now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">How it works</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            A simple three-step pathway that supports students preparing for work placement and beyond.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div key={i} className="relative flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                  {step.icon}
                </div>
                <div className="h-0.5 flex-1 bg-teal-100 hidden md:block" style={{ display: i < STEPS.length - 1 ? undefined : "none" }} />
              </div>
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Step {i + 1}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-1 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-100 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Why KIZAZI</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-6">
                Support students preparing for work placement — without adding admin burden
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                RTOs spend significant time helping students gather compliance documents, chase referees, and find providers. KIZAZI gives students a structured, self-guided pathway so your team can focus on teaching.
              </p>
              <a
                href="mailto:hello@kizazihire.com.au?subject=RTO Partner Referral Link Request"
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
              >
                Get your free referral link
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <ul className="space-y-4">
              {BENEFITS.map((b, i) => (
                <li key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                    {b.icon}
                  </div>
                  <span className="text-sm text-gray-700 leading-relaxed">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="rounded-2xl bg-teal-600 text-white p-10 text-center shadow-xl shadow-teal-900/20">
          <GraduationCap className="h-12 w-12 mx-auto mb-5 text-teal-200" />
          <h2 className="text-3xl font-bold mb-3">Ready to support your students?</h2>
          <p className="text-teal-100 mb-8 max-w-xl mx-auto">
            Get in touch and we'll set up a unique referral link for your RTO within 24 hours. No cost, no lock-in.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@kizazihire.com.au?subject=RTO Partner Referral Link Request"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white text-teal-700 font-bold rounded-2xl hover:bg-teal-50 transition-colors"
            >
              <Mail className="h-5 w-5" />
              Request an RTO referral link
            </a>
            <Link
              to="/worker-signup?source=rto"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-teal-500/30 border border-white/25 text-white font-semibold rounded-2xl hover:bg-teal-500/40 transition-colors"
            >
              Refer students now
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-t border-gray-100 px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 px-6 py-8 text-center text-xs text-gray-400">
        <p>© 2024 Kizazi Hire. All rights reserved.</p>
        <p className="mt-1">
          KIZAZI connects disability support workers with providers. We do not manage work placement obligations.
        </p>
      </footer>
    </div>
  );
}
