import { useState, useEffect } from "react";
import { Loader2, CheckCircle, Edit3, X, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkerAvailability, UpsertAvailabilityRequest } from "~backend/workers/availability";

const GRID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const GRID_SHIFTS = [
  { label: "MORNING",   matches: ["Morning"] },
  { label: "AFTERNOON", matches: ["Afternoon"] },
  { label: "EVENING",   matches: ["Evening"] },
  { label: "OVERNIGHT", matches: ["Night", "Overnight", "Flexible"] },
];

const EDIT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const EDIT_SHIFTS = ["Morning", "Afternoon", "Evening", "Night", "Overnight", "Flexible"];

interface Props {
  availability: WorkerAvailability | null;
  travelRadiusKm: number | null;
  location: string | null;
  onSave: (req: UpsertAvailabilityRequest) => Promise<void>;
}

export function AvailabilitySection({ availability, travelRadiusKm, location, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState<Set<string>>(new Set());
  const [shifts, setShifts] = useState<Set<string>>(new Set());
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [minPay, setMinPay] = useState("");
  const [maxTravel, setMaxTravel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (availability) {
      setDays(new Set(availability.availableDays));
      setShifts(new Set(availability.preferredShiftTypes));
      setTimeStart(availability.timeWindowStart ?? "");
      setTimeEnd(availability.timeWindowEnd ?? "");
      setMinPay(availability.minimumPayRate !== null ? String(availability.minimumPayRate) : "");
      setMaxTravel(availability.maxTravelDistanceKm !== null ? String(availability.maxTravelDistanceKm) : "");
    }
  }, [availability]);

  const toggleSet = <T extends string>(set: Set<T>, setFn: React.Dispatch<React.SetStateAction<Set<T>>>, val: T) => {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        availableDays: [...days],
        preferredShiftTypes: [...shifts],
        timeWindowStart: timeStart || undefined,
        timeWindowEnd: timeEnd || undefined,
        minimumPayRate: minPay ? Number(minPay) : undefined,
        maxTravelDistanceKm: maxTravel ? Number(maxTravel) : undefined,
      });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  const isAvailable = (dayIdx: number, shiftMatches: string[]): boolean => {
    const dayName = DAY_FULL[dayIdx];
    if (!days.has(dayName)) return false;
    return shiftMatches.some((m) => shifts.has(m));
  };

  const hasAnyAvailability = days.size > 0 && shifts.size > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">Weekly Availability</h3>
        </div>
        <div className="flex items-center gap-3">
          {!editing && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-blue-600 inline-block" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" />
                Unavailable
              </span>
            </div>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        {!editing ? (
          <div className="space-y-4">
            {hasAnyAvailability ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left pb-3 pr-4 w-24" />
                      {GRID_DAYS.map((day) => (
                        <th key={day} className="text-center pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    {GRID_SHIFTS.map((shift) => (
                      <tr key={shift.label}>
                        <td className="pr-4 py-1.5">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {shift.label}
                          </span>
                        </td>
                        {GRID_DAYS.map((_, dayIdx) => {
                          const available = isAvailable(dayIdx, shift.matches);
                          return (
                            <td key={dayIdx} className="px-1 py-1.5 text-center">
                              <div
                                className={`mx-auto h-8 w-10 rounded-lg transition-colors ${
                                  available
                                    ? "bg-blue-600 shadow-sm shadow-blue-600/20"
                                    : "bg-gray-100 border border-gray-200"
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No availability set yet.</p>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-2 text-sm text-blue-600 hover:underline font-medium"
                >
                  Set your availability
                </button>
              </div>
            )}

            {(travelRadiusKm || location) && (
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                <MapPin className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  {availability?.minimumPayRate && (
                    <span>Minimum rate ${availability.minimumPayRate}/hr · </span>
                  )}
                  {travelRadiusKm
                    ? `Willing to travel up to ${travelRadiusKm}km${location ? ` from ${location}` : ""} for regular shifts.`
                    : `Based in ${location}.`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-gray-600 text-xs font-medium">Available Days</Label>
              <div className="flex flex-wrap gap-2">
                {EDIT_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleSet(days, setDays, day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      days.has(day)
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-600 text-xs font-medium">Preferred Shift Types</Label>
              <div className="flex flex-wrap gap-2">
                {EDIT_SHIFTS.map((shift) => (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => toggleSet(shifts, setShifts, shift)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      shifts.has(shift)
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    {shift}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-600 text-xs font-medium">Availability From</Label>
                <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 text-sm rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-600 text-xs font-medium">Availability To</Label>
                <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 text-sm rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-600 text-xs font-medium">Min Pay Rate ($/hr)</Label>
                <Input type="number" value={minPay} onChange={(e) => setMinPay(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 text-sm rounded-lg" placeholder="e.g. 32" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-600 text-xs font-medium">Max Travel Distance (km)</Label>
                <Input type="number" value={maxTravel} onChange={(e) => setMaxTravel(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 text-sm rounded-lg" placeholder="e.g. 25" />
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                {saved ? "Saved!" : "Save Availability"}
              </button>
              <button
                onClick={() => { setEditing(false); setError(null); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
