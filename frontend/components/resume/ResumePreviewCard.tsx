import { MapPin, Phone, Car, ShieldCheck, Clock, GraduationCap, Briefcase, Star } from "lucide-react";
import type { SessionData } from "./types";

interface Props {
  session: SessionData;
}

export function ResumePreviewCard({ session }: Props) {
  const fullName = [session.firstName, session.lastName].filter(Boolean).join(" ") || "Your Name";
  const location = [session.suburb, session.state].filter(Boolean).join(", ");
  const currentChecks = session.checks.filter((c) => c.status === "Current");

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden" id="resume-preview">
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 px-6 py-8 text-white">
        <h1 className="text-2xl font-bold mb-0.5">{fullName}</h1>
        <p className="text-teal-100 font-medium">{session.targetRole || "NDIS Support Worker"}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-sm text-teal-100">
          {location && (
            <span className="flex items-center gap-1"><MapPin size={13} />{location}</span>
          )}
          {session.phone && (
            <span className="flex items-center gap-1"><Phone size={13} />{session.phone}</span>
          )}
          {session.driversLicence && (
            <span className="flex items-center gap-1"><Car size={13} />Driver's licence{session.ownVehicle ? " & own vehicle" : ""}</span>
          )}
          {session.travelRadiusKm && (
            <span className="flex items-center gap-1"><Clock size={13} />Travel up to {session.travelRadiusKm} km</span>
          )}
          {session.languages.length > 1 && (
            <span>Languages: {session.languages.join(", ")}</span>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {session.aiSummary && (
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Professional Summary</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{session.aiSummary}</p>
          </div>
        )}

        {session.aiBullets.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Skills & Achievements</h2>
            <ul className="space-y-1">
              {session.aiBullets.map((bullet, i) => (
                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!session.aiSummary && (
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Profile</h2>
            <p className="text-sm text-slate-400 italic">
              {session.supportStyle || `${fullName} is a committed NDIS support worker with ${session.experienceYears ?? "several"} years of experience.`}
            </p>
          </div>
        )}

        {currentChecks.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1"><ShieldCheck size={13} />Compliance Checks</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {currentChecks.map((check) => (
                <span key={check.type} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                  <ShieldCheck size={11} />{check.type}
                  {check.expiryDate && <span className="text-emerald-500">· exp {String(check.expiryDate)}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {session.qualifications.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1"><GraduationCap size={13} />Qualifications</span>
            </h2>
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
                  {t.completionDate && <span className="text-slate-400"> · {String(t.completionDate)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {session.workHistory.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1"><Briefcase size={13} />Work History</span>
            </h2>
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
                  {job.responsibilities && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{job.responsibilities}</p>
                  )}
                  {job.clientGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {job.clientGroups.map((g) => (
                        <span key={g} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {session.supportTasks.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Support Tasks</h2>
            <div className="flex flex-wrap gap-1.5">
              {session.supportTasks.map((task) => (
                <span key={task} className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-lg border border-teal-100">{task}</span>
              ))}
            </div>
          </div>
        )}

        {session.availability.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Availability</h2>
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
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1"><Star size={13} />Capability Examples</span>
            </h2>
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

      <div className="px-6 pb-5">
        <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-3">
          Generated by KizaziHire Resume Builder · kizazihire.com.au
        </p>
      </div>
    </div>
  );
}
