import { DAYS_OF_WEEK, SHIFT_TYPES } from "./types";
import type { SessionData, AvailabilityEntry } from "./types";

interface Props {
  data: SessionData;
  onChange: (field: string, value: any) => void;
}

export function StepAvailability({ data, onChange }: Props) {
  const availability = data.availability;

  const getEntry = (day: string): AvailabilityEntry | undefined =>
    availability.find((a) => a.day === day);

  const toggleDay = (day: string) => {
    if (getEntry(day)) {
      onChange("availability", availability.filter((a) => a.day !== day));
    } else {
      onChange("availability", [...availability, { day, shifts: [] }]);
    }
  };

  const toggleShift = (day: string, shift: string) => {
    const entry = getEntry(day);
    if (!entry) return;
    const shifts = entry.shifts.includes(shift)
      ? entry.shifts.filter((s) => s !== shift)
      : [...entry.shifts, shift];
    onChange("availability", availability.map((a) => a.day === day ? { ...a, shifts } : a));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Availability</h2>
        <p className="text-sm text-slate-500">Select your available days and preferred shift types. This helps providers find you quickly.</p>
      </div>

      <div className="space-y-2">
        {DAYS_OF_WEEK.map((day) => {
          const entry = getEntry(day);
          const isSelected = !!entry;
          return (
            <div
              key={day}
              className={`rounded-xl border-2 overflow-hidden transition-all ${
                isSelected ? "border-teal-400" : "border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  isSelected ? "bg-teal-50" : "bg-white hover:bg-slate-50"
                }`}
              >
                <span className={`font-medium text-sm ${isSelected ? "text-teal-800" : "text-slate-600"}`}>{day}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isSelected ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"}`}>
                  {isSelected ? "Available" : "Unavailable"}
                </span>
              </button>
              {isSelected && (
                <div className="px-4 pb-3 bg-teal-50">
                  <p className="text-xs text-teal-600 font-medium mb-2">Preferred shifts on {day}:</p>
                  <div className="flex flex-wrap gap-2">
                    {SHIFT_TYPES.map((shift) => (
                      <button
                        key={shift}
                        type="button"
                        onClick={() => toggleShift(day, shift)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          entry?.shifts.includes(shift)
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white text-slate-600 border-slate-300 hover:border-teal-400"
                        }`}
                      >
                        {shift}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {availability.length === 0 && (
        <p className="text-xs text-amber-600 text-center">Select at least one available day to improve your resume score.</p>
      )}

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <p className="text-xs text-blue-700">
          <strong>Privacy note:</strong> Your full availability schedule is only shown to providers you approve. Public search cards show general patterns only (e.g. "weekday mornings available").
        </p>
      </div>
    </div>
  );
}
