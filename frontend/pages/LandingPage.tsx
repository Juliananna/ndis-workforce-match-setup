import { Link } from "react-router-dom";
import {
  Shield, Users, Zap, CheckCircle2, ArrowRight, Star,
  Calendar, DollarSign, Compass, Building2, Heart,
} from "lucide-react";

const STATS = [
  { value: "96,000+", label: "Support Workers" },
  { value: "4.9/5", label: "Avg. Satisfaction" },
  { value: "3 min", label: "To Get Started" },
  { value: "100%", label: "NDIS Verified" },
];

const FEATURES_WORKER = [
  { icon: DollarSign, color: "bg-indigo-100 text-indigo-600", title: "Set Your Own Rates", desc: "You're in control. Average providers earn 20% more than industry benchmarks." },
  { icon: Calendar, color: "bg-emerald-100 text-emerald-600", title: "Total Flexibility", desc: "Manage your schedule with ease. Work as much or as little as you want." },
  { icon: Compass, color: "bg-amber-100 text-amber-600", title: "Smart Matching", desc: "Our AI connects you with participants based on shared interests and personalities." },
];

const FEATURES_EMPLOYER = [
  { icon: Shield, color: "bg-blue-100 text-blue-600", title: "Pre-Verified Workers", desc: "Every worker is background-checked and credentials-verified before you see them." },
  { icon: Users, color: "bg-purple-100 text-purple-600", title: "Browse & Match", desc: "Search by location, skills, availability, and more. Find the perfect fit fast." },
  { icon: Zap, color: "bg-rose-100 text-rose-600", title: "Emergency Shifts", desc: "Post urgent shifts and get responses from qualified workers within hours." },
];

const TESTIMONIALS = [
  { name: "Sarah M.", role: "Support Worker", avatar: "bg-pink-400", quote: "I went from zero clients to a full schedule in 2 weeks. The matching is genuinely impressive." },
  { name: "James T.", role: "NDIS Provider", avatar: "bg-blue-400", quote: "We filled 3 emergency shifts within an hour. KizaziHire has been a game changer for our organisation." },
  { name: "Aisha K.", role: "Support Worker", avatar: "bg-amber-400", quote: "I love that I can set my own rates and choose who I work with. True independence." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f5f9] antialiased">

      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-extrabold text-gray-900 tracking-tight">KIZAZIHIRE</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#workers" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">For Workers</a>
            <a href="#employers" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">For Providers</a>
            <a href="#testimonials" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Reviews</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-xl hover:bg-gray-100"
            >
              Log in
            </Link>
            <Link
              to="/gethired"
              className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm shadow-indigo-500/25"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section className="bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
              <Shield className="h-3 w-3" />
              Australia's NDIS Workforce Marketplace
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Connecting{" "}
              <span className="text-indigo-600">Support Workers</span>{" "}
              with those who need them.
            </h1>
            <p className="text-lg text-gray-500 mb-8 max-w-xl leading-relaxed">
              Whether you're a support worker ready to make a difference, or an NDIS provider searching for verified talent — KizaziHire is your platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <Link
                to="/gethired"
                className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25 w-full sm:w-auto justify-center"
              >
                I'm a Support Worker <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-2xl transition-all border border-gray-200 shadow-sm w-full sm:w-auto justify-center"
              >
                <Building2 className="h-4 w-4 text-gray-500" />
                I'm a Provider
              </Link>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-6">
              <div className="flex -space-x-2">
                {["bg-blue-400", "bg-purple-400", "bg-pink-400", "bg-amber-400", "bg-emerald-400"].map((c, i) => (
                  <div key={i} className={`h-8 w-8 rounded-full ${c} border-2 border-white flex items-center justify-center text-xs font-bold text-white`}>
                    {["S", "J", "M", "A", "K"][i]}
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">96,000+</span> workers already joined
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 relative">
            <div className="w-72 h-72 md:w-80 md:h-80 rounded-3xl bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white rounded-2xl shadow-md px-3 py-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Match Found</p>
                  <p className="text-[10px] text-gray-400">Perfect fit confirmed</p>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 bg-white rounded-2xl shadow-md px-3 py-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">4.9/5 Rating</p>
                  <p className="text-[10px] text-gray-400">Avg. satisfaction</p>
                </div>
              </div>
              <Heart className="h-24 w-24 text-indigo-300" strokeWidth={1} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-indigo-600 py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-extrabold text-white">{value}</p>
              <p className="text-indigo-200 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workers" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">For Support Workers</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Work on your own terms</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Join Australia's fastest-growing NDIS workforce platform and take control of your career.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {FEATURES_WORKER.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link
              to="/gethired"
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25"
            >
              Apply as a Support Worker <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="employers" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">For NDIS Providers</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Find verified talent, fast</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Browse pre-screened, NDIS-compliant support workers ready to join your team today.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {FEATURES_EMPLOYER.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-6">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl transition-all shadow-lg"
            >
              Register as a Provider <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Loved by workers & providers</h2>
            <p className="text-gray-500">Real stories from real people using KizaziHire every day.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, avatar, quote }) => (
              <div key={name} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 rounded-full ${avatar} flex items-center justify-center text-white font-bold text-sm`}>
                    {name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{name}</p>
                    <p className="text-xs text-gray-500">{role}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed italic">"{quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to get started?</h2>
          <p className="text-indigo-200 mb-8 text-lg">Join thousands of support workers and providers already using KizaziHire.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/gethired"
              className="flex items-center gap-2 px-8 py-4 bg-white text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 transition-all shadow-lg w-full sm:w-auto justify-center"
            >
              I'm a Support Worker <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl transition-all border border-indigo-400 w-full sm:w-auto justify-center"
            >
              <Building2 className="h-4 w-4" />
              I'm a Provider
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-extrabold text-gray-900 tracking-tight">KIZAZIHIRE</span>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link to="/privacy-policy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Support</a>
          </div>
          <p className="text-xs text-gray-400">© 2024 NDIS Workforce Match. Built with empathy.</p>
        </div>
      </footer>
    </div>
  );
}
