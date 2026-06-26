import { MapPin, Phone, Car, ShieldCheck, Clock, GraduationCap, Briefcase, Star, Globe } from "lucide-react";
import type { SessionData } from "./types";

export type ResumeTheme = "classic_free" | "modern" | "executive" | "minimal";

interface Props {
  session: SessionData;
  photoUrl?: string | null;
  theme?: ResumeTheme;
  isPremium?: boolean;
}

export function ResumePreviewCard({ session, photoUrl, theme = "classic_free", isPremium = false }: Props) {
  const fullName = [session.firstName, session.lastName].filter(Boolean).join(" ") || "Your Name";
  const location = [session.suburb, session.state].filter(Boolean).join(", ");
  const currentChecks = session.checks.filter((c) => c.status === "Current");
  const effectiveTheme: ResumeTheme = isPremium ? theme : "classic_free";

  if (effectiveTheme === "modern") return <ModernTheme session={session} photoUrl={photoUrl} fullName={fullName} location={location} currentChecks={currentChecks} />;
  if (effectiveTheme === "executive") return <ExecutiveTheme session={session} photoUrl={photoUrl} fullName={fullName} location={location} currentChecks={currentChecks} />;
  if (effectiveTheme === "minimal") return <MinimalTheme session={session} photoUrl={photoUrl} fullName={fullName} location={location} currentChecks={currentChecks} />;
  return <ClassicFreeTheme session={session} photoUrl={photoUrl} fullName={fullName} location={location} currentChecks={currentChecks} showBranding={!isPremium} />;
}

interface ThemeProps {
  session: SessionData;
  photoUrl?: string | null;
  fullName: string;
  location: string;
  currentChecks: SessionData["checks"];
  showBranding?: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{children}</h2>;
}

function ClassicFreeTheme({ session, photoUrl, fullName, location, currentChecks, showBranding }: ThemeProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden" id="resume-preview">
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 px-6 py-8 text-white">
        <div className="flex items-start gap-5">
          {photoUrl && (
            <img src={photoUrl} alt={fullName} className="h-20 w-20 rounded-full object-cover border-2 border-white/30 shadow-lg shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-0.5">{fullName}</h1>
            <p className="text-teal-100 font-medium">{session.targetRole || "NDIS Support Worker"}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-teal-100">
              {location && <span className="flex items-center gap-1"><MapPin size={13} />{location}</span>}
              {session.phone && <span className="flex items-center gap-1"><Phone size={13} />{session.phone}</span>}
              {session.driversLicence && <span className="flex items-center gap-1"><Car size={13} />Driver's licence{session.ownVehicle ? " & own vehicle" : ""}</span>}
              {session.travelRadiusKm && <span className="flex items-center gap-1"><Clock size={13} />Travel up to {session.travelRadiusKm} km</span>}
              {session.languages.length > 1 && <span className="flex items-center gap-1"><Globe size={13} />{session.languages.join(", ")}</span>}
            </div>
          </div>
        </div>
      </div>

      <ResumeBody session={session} currentChecks={currentChecks} accentClass="text-teal-500" tagClass="bg-teal-50 text-teal-700 border border-teal-100" checkClass="bg-emerald-50 text-emerald-700 border-emerald-200" />

      <div className="px-6 pb-5">
        {showBranding ? (
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">Generated with <span className="font-semibold text-teal-600">KizaziHire Resume Builder</span></p>
            <p className="text-xs text-slate-300">kizazihire.com.au</p>
          </div>
        ) : (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-300 text-center">kizazihire.com.au</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ModernTheme({ session, photoUrl, fullName, location, currentChecks }: ThemeProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden" id="resume-preview">
      <div className="flex">
        <div className="w-56 shrink-0 bg-slate-800 text-white px-5 py-8 flex flex-col gap-6">
          {photoUrl && (
            <img src={photoUrl} alt={fullName} className="h-24 w-24 rounded-full object-cover border-4 border-slate-600 mx-auto" />
          )}
          <div>
            <h1 className="text-lg font-black leading-tight mb-0.5">{fullName}</h1>
            <p className="text-slate-300 text-xs font-medium">{session.targetRole || "NDIS Support Worker"}</p>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            {location && <p className="flex items-center gap-1.5"><MapPin size={11} className="shrink-0" />{location}</p>}
            {session.phone && <p className="flex items-center gap-1.5"><Phone size={11} className="shrink-0" />{session.phone}</p>}
            {session.driversLicence && <p className="flex items-center gap-1.5"><Car size={11} className="shrink-0" />Driver's licence</p>}
            {session.travelRadiusKm && <p className="flex items-center gap-1.5"><Clock size={11} className="shrink-0" />Up to {session.travelRadiusKm}km</p>}
            {session.languages.length > 1 && <p className="flex items-center gap-1.5"><Globe size={11} className="shrink-0" />{session.languages.join(", ")}</p>}
          </div>

          {currentChecks.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Compliance</p>
              <div className="space-y-1.5">
                {currentChecks.map((c) => (
                  <div key={c.type} className="flex items-start gap-1.5">
                    <ShieldCheck size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-slate-300 leading-tight">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {session.supportTasks.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Skills</p>
              <div className="flex flex-wrap gap-1">
                {session.supportTasks.map((t) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{t}</span>
                ))}
              </div>
            </div>
          )}

          {session.availability.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Availability</p>
              <div className="space-y-0.5">
                {session.availability.map((a) => (
                  <p key={a.day} className="text-xs text-slate-300">{a.day}{a.shifts.length > 0 ? ` · ${a.shifts.join(", ")}` : ""}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 px-6 py-8 space-y-5 min-w-0">
          {(session.aiSummary || session.supportStyle) && (
            <div>
              <SectionLabel>Professional Summary</SectionLabel>
              <p className="text-sm text-slate-700 leading-relaxed">
                {session.aiSummary || session.supportStyle}
              </p>
            </div>
          )}

          {session.aiBullets.length > 0 && (
            <div>
              <SectionLabel>Key Achievements</SectionLabel>
              <ul className="space-y-1">
                {session.aiBullets.map((b, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-slate-800 mt-0.5 shrink-0 font-bold">▸</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {session.workHistory.length > 0 && (
            <div>
              <SectionLabel>Work History</SectionLabel>
              <div className="space-y-3">
                {session.workHistory.map((job, i) => (
                  <div key={i}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{job.role}</div>
                        <div className="text-xs text-slate-500">{job.employer}</div>
                      </div>
                      <div className="text-xs text-slate-400 shrink-0">{String(job.startDate || "")} — {job.current ? "Present" : (job.endDate ? String(job.endDate) : "")}</div>
                    </div>
                    {job.responsibilities && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{job.responsibilities}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(session.qualifications.length > 0 || session.training.length > 0) && (
            <div>
              <SectionLabel>Qualifications & Training</SectionLabel>
              <div className="space-y-1.5">
                {session.qualifications.map((q, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-slate-700">{q.name}</span>
                    {q.institution && <span className="text-slate-400"> · {q.institution}</span>}
                    {q.yearCompleted && <span className="text-slate-400"> · {q.yearCompleted}</span>}
                  </div>
                ))}
                {session.training.map((t, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-slate-700">{t.name}</span>
                    {t.provider && <span className="text-slate-400"> · {t.provider}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {session.capabilityStories.length > 0 && (
            <div>
              <SectionLabel>Capability Examples</SectionLabel>
              <div className="space-y-2">
                {session.capabilityStories.map((s, i) => (
                  <div key={i} className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
                    <span className="font-semibold text-slate-700">{s.skill}: </span>
                    {s.situation} — {s.action} → {s.outcome}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExecutiveTheme({ session, photoUrl, fullName, location, currentChecks }: ThemeProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden" id="resume-preview">
      <div className="border-b-4 border-indigo-700 px-8 py-8">
        <div className="flex items-start gap-6">
          {photoUrl && (
            <img src={photoUrl} alt={fullName} className="h-24 w-24 rounded-xl object-cover border border-slate-200 shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">{fullName}</h1>
            <p className="text-indigo-700 font-bold text-sm mb-3">{session.targetRole || "NDIS Support Worker"}</p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              {location && <span className="flex items-center gap-1"><MapPin size={11} />{location}</span>}
              {session.phone && <span className="flex items-center gap-1"><Phone size={11} />{session.phone}</span>}
              {session.driversLicence && <span className="flex items-center gap-1"><Car size={11} />Driver's licence</span>}
              {session.languages.length > 1 && <span className="flex items-center gap-1"><Globe size={11} />{session.languages.join(", ")}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {(session.aiSummary || session.supportStyle) && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-indigo-700 mb-2 pb-1 border-b border-indigo-100">Executive Summary</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{session.aiSummary || session.supportStyle}</p>
          </div>
        )}

        {session.aiBullets.length > 0 && (
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-indigo-700 mb-2 pb-1 border-b border-indigo-100">Key Contributions</h2>
            <ul className="grid sm:grid-cols-2 gap-1.5">
              {session.aiBullets.map((b, i) => (
                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-6">
          {session.workHistory.length > 0 && (
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.15em] text-indigo-700 mb-2 pb-1 border-b border-indigo-100">Career History</h2>
              <div className="space-y-3">
                {session.workHistory.map((job, i) => (
                  <div key={i}>
                    <p className="font-bold text-slate-800 text-sm">{job.role}</p>
                    <p className="text-xs text-slate-500">{job.employer} · {String(job.startDate || "")} – {job.current ? "Present" : (job.endDate ? String(job.endDate) : "")}</p>
                    {job.responsibilities && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{job.responsibilities}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5">
            {(session.qualifications.length > 0 || session.training.length > 0) && (
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-indigo-700 mb-2 pb-1 border-b border-indigo-100">Education & Training</h2>
                <div className="space-y-1.5">
                  {session.qualifications.map((q, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-slate-800">{q.name}</span>
                      {q.institution && <span className="text-slate-400 text-xs"> · {q.institution}</span>}
                    </div>
                  ))}
                  {session.training.map((t, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-slate-800">{t.name}</span>
                      {t.provider && <span className="text-slate-400 text-xs"> · {t.provider}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentChecks.length > 0 && (
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-indigo-700 mb-2 pb-1 border-b border-indigo-100">Compliance</h2>
                <div className="space-y-1">
                  {currentChecks.map((c) => (
                    <div key={c.type} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <ShieldCheck size={11} className="text-indigo-500 shrink-0" />
                      {c.type}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {session.availability.length > 0 && (
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-indigo-700 mb-2 pb-1 border-b border-indigo-100">Availability</h2>
                <div className="flex flex-wrap gap-1">
                  {session.availability.map((a) => (
                    <span key={a.day} className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">{a.day}</span>
                  ))}
                </div>
              </div>
            )}

            {session.supportTasks.length > 0 && (
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-indigo-700 mb-2 pb-1 border-b border-indigo-100">Core Skills</h2>
                <div className="flex flex-wrap gap-1">
                  {session.supportTasks.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MinimalTheme({ session, photoUrl, fullName, location, currentChecks }: ThemeProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden font-serif" id="resume-preview">
      <div className="px-10 pt-10 pb-6 text-center border-b border-slate-100">
        {photoUrl && (
          <img src={photoUrl} alt={fullName} className="h-20 w-20 rounded-full object-cover mx-auto mb-4 border border-slate-200" />
        )}
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{fullName}</h1>
        <p className="text-slate-500 text-sm mt-1 font-sans">{session.targetRole || "NDIS Support Worker"}</p>
        <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-slate-400 font-sans">
          {location && <span>{location}</span>}
          {session.phone && <span>{session.phone}</span>}
          {session.driversLicence && <span>Driver's licence</span>}
          {session.languages.length > 1 && <span>{session.languages.join(" · ")}</span>}
        </div>
      </div>

      <div className="px-10 py-7 space-y-6 font-sans">
        {(session.aiSummary || session.supportStyle) && (
          <div className="text-center max-w-lg mx-auto">
            <p className="text-sm text-slate-600 leading-relaxed italic">{session.aiSummary || session.supportStyle}</p>
          </div>
        )}

        {session.aiBullets.length > 0 && (
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center mb-3">Highlights</h2>
            <ul className="space-y-1 max-w-md mx-auto">
              {session.aiBullets.map((b, i) => (
                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-slate-300 mt-0.5 shrink-0">—</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {session.workHistory.length > 0 && (
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center mb-3">Experience</h2>
            <div className="space-y-3 max-w-lg mx-auto">
              {session.workHistory.map((job, i) => (
                <div key={i} className="text-center">
                  <p className="font-semibold text-slate-800 text-sm">{job.role}</p>
                  <p className="text-xs text-slate-500">{job.employer} · {String(job.startDate || "")} – {job.current ? "Present" : (job.endDate || "")}</p>
                  {job.responsibilities && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{job.responsibilities}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-5 text-center">
          {(session.qualifications.length > 0 || session.training.length > 0) && (
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Qualifications</h2>
              <div className="space-y-1">
                {session.qualifications.map((q, i) => <p key={i} className="text-xs text-slate-600">{q.name}</p>)}
                {session.training.map((t, i) => <p key={i} className="text-xs text-slate-600">{t.name}</p>)}
              </div>
            </div>
          )}

          {currentChecks.length > 0 && (
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Compliance</h2>
              <div className="space-y-1">
                {currentChecks.map((c) => <p key={c.type} className="text-xs text-slate-600">{c.type}</p>)}
              </div>
            </div>
          )}

          {session.availability.length > 0 && (
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Availability</h2>
              <div className="space-y-1">
                {session.availability.map((a) => <p key={a.day} className="text-xs text-slate-600">{a.day}</p>)}
              </div>
            </div>
          )}
        </div>

        {session.supportTasks.length > 0 && (
          <div className="text-center">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Skills</h2>
            <p className="text-xs text-slate-500">{session.supportTasks.join("  ·  ")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResumeBody({ session, currentChecks, accentClass, tagClass, checkClass }: {
  session: SessionData;
  currentChecks: SessionData["checks"];
  accentClass: string;
  tagClass: string;
  checkClass: string;
}) {
  return (
    <div className="px-6 py-5 space-y-5">
      {session.aiSummary && (
        <div>
          <SectionLabel>Professional Summary</SectionLabel>
          <p className="text-sm text-slate-700 leading-relaxed">{session.aiSummary}</p>
        </div>
      )}

      {session.aiBullets.length > 0 && (
        <div>
          <SectionLabel>Key Skills & Achievements</SectionLabel>
          <ul className="space-y-1">
            {session.aiBullets.map((bullet, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                <span className={`${accentClass} mt-0.5 shrink-0`}>•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!session.aiSummary && (
        <div>
          <SectionLabel>Profile</SectionLabel>
          <p className="text-sm text-slate-400 italic">
            {session.supportStyle || `${session.firstName ?? "This worker"} is a committed NDIS support worker with ${session.experienceYears ?? "several"} years of experience.`}
          </p>
        </div>
      )}

      {currentChecks.length > 0 && (
        <div>
          <SectionLabel><span className="flex items-center gap-1"><ShieldCheck size={13} />Compliance Checks</span></SectionLabel>
          <div className="flex flex-wrap gap-2">
            {currentChecks.map((check) => (
              <span key={check.type} className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${checkClass}`}>
                <ShieldCheck size={11} />{check.type}
                {check.expiryDate && <span className="opacity-60">· exp {String(check.expiryDate)}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {session.qualifications.length > 0 && (
        <div>
          <SectionLabel><span className="flex items-center gap-1"><GraduationCap size={13} />Qualifications</span></SectionLabel>
          <div className="space-y-1.5">
            {session.qualifications.map((q, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium text-slate-700">{q.name}</span>
                {q.institution && <span className="text-slate-400"> · {q.institution}</span>}
                {q.yearCompleted && <span className="text-slate-400"> · {q.yearCompleted}</span>}
              </div>
            ))}
            {session.training.map((t, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium text-slate-700">{t.name}</span>
                {t.provider && <span className="text-slate-400"> · {t.provider}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {session.workHistory.length > 0 && (
        <div>
          <SectionLabel><span className="flex items-center gap-1"><Briefcase size={13} />Work History</span></SectionLabel>
          <div className="space-y-3">
            {session.workHistory.map((job, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-800 text-sm">{job.role}</div>
                    <div className="text-xs text-slate-500">{job.employer}</div>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">
                    {String(job.startDate || "")} — {job.current ? "Present" : (job.endDate ? String(job.endDate) : "")}
                  </div>
                </div>
                {job.responsibilities && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{job.responsibilities}</p>}
                {job.clientGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {job.clientGroups.map((g) => <span key={g} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{g}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {session.supportTasks.length > 0 && (
        <div>
          <SectionLabel>Support Tasks</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {session.supportTasks.map((task) => (
              <span key={task} className={`px-2 py-1 text-xs rounded-lg ${tagClass}`}>{task}</span>
            ))}
          </div>
        </div>
      )}

      {session.availability.length > 0 && (
        <div>
          <SectionLabel>Availability</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {session.availability.map((a) => (
              <span key={a.day} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg">
                {a.day}{a.shifts.length > 0 ? ` (${a.shifts.join(", ")})` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {session.capabilityStories.length > 0 && (
        <div>
          <SectionLabel><span className="flex items-center gap-1"><Star size={13} />Capability Examples</span></SectionLabel>
          <div className="space-y-2">
            {session.capabilityStories.map((s, i) => (
              <div key={i} className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
                <span className="font-medium text-slate-700">{s.skill}: </span>
                {s.situation} — {s.action} → {s.outcome}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
