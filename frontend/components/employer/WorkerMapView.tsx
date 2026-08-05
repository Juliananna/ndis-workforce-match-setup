import { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { WorkerSummary } from "~backend/workers/browse";
import { CheckCircle2, AlertCircle, Heart } from "lucide-react";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeIcon(score: number, priority: boolean) {
  let color = "#6b7280";
  if (score === 100) color = "#16a34a";
  else if (score >= 80) color = "#4f46e5";
  else if (score >= 50) color = "#d97706";

  const size = priority ? 36 : 30;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 4}" fill="white" opacity="0.8"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function makeEmployerIcon() {
  const svg = `
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" fill="#0ea5e9" stroke="white" stroke-width="2"/>
      <circle cx="10" cy="10" r="4" fill="white" opacity="0.9"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function FitBounds({ workers, center }: { workers: WorkerSummary[]; center: [number, number] | null }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    const points: [number, number][] = workers
      .filter((w) => w.latitude != null && w.longitude != null)
      .map((w) => [w.latitude!, w.longitude!]);

    if (center) points.push(center);

    if (points.length === 0) return;

    if (!fitted.current || workers.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], 11);
      } else {
        map.fitBounds(points, { padding: [48, 48] });
      }
      fitted.current = true;
    }
  }, [workers, center, map]);

  return null;
}

interface WorkerMapViewProps {
  workers: WorkerSummary[];
  highlightedId: string | null;
  savedIds: Set<string>;
  savingIds: Set<string>;
  employerCenter: { latitude: number; longitude: number; address: string } | null;
  radiusKm: number | null;
  onSelectWorker: (worker: WorkerSummary) => void;
  onToggleSave: (workerId: string, e: React.MouseEvent) => void;
}

export function WorkerMapView({
  workers,
  highlightedId,
  savedIds,
  savingIds,
  employerCenter,
  radiusKm,
  onSelectWorker,
  onToggleSave,
}: WorkerMapViewProps) {
  const mappableWorkers = useMemo(
    () => workers.filter((w) => w.latitude != null && w.longitude != null),
    [workers]
  );

  const noLocationCount = workers.length - mappableWorkers.length;

  const defaultCenter: [number, number] = employerCenter
    ? [employerCenter.latitude, employerCenter.longitude]
    : [-33.8688, 151.2093];

  const employerPos: [number, number] | null = employerCenter
    ? [employerCenter.latitude, employerCenter.longitude]
    : null;

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-border">
      <MapContainer
        center={defaultCenter}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds workers={mappableWorkers} center={employerPos} />

        {employerPos && (
          <>
            <Marker position={employerPos} icon={makeEmployerIcon()}>
              <Popup>
                <div className="text-xs font-semibold text-sky-700">Your organisation</div>
                <div className="text-xs text-muted-foreground">{employerCenter?.address}</div>
              </Popup>
            </Marker>
            {radiusKm != null && (
              <Circle
                center={employerPos}
                radius={radiusKm * 1000}
                pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.05, weight: 1.5, dashArray: "6 4" }}
              />
            )}
          </>
        )}

        {mappableWorkers.map((worker) => (
          <Marker
            key={worker.workerId}
            position={[worker.latitude!, worker.longitude!]}
            icon={makeIcon(worker.verificationScore, worker.priorityBoost)}
            zIndexOffset={highlightedId === worker.workerId ? 1000 : 0}
          >
            <Popup minWidth={220}>
              <WorkerMapPopup
                worker={worker}
                saved={savedIds.has(worker.workerId)}
                saving={savingIds.has(worker.workerId)}
                onSelect={() => onSelectWorker(worker)}
                onToggleSave={(e) => onToggleSave(worker.workerId, e)}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg border border-border px-3 py-2 flex flex-col gap-1.5 shadow text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-green-600 inline-block" />
          <span className="text-foreground">Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-indigo-600 inline-block" />
          <span className="text-foreground">Priority Profile</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-amber-600 inline-block" />
          <span className="text-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-gray-500 inline-block" />
          <span className="text-foreground">Getting Started</span>
        </div>
        {employerPos && (
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-sky-500 inline-block" />
            <span className="text-foreground">Your location</span>
          </div>
        )}
      </div>

      {noLocationCount > 0 && (
        <div className="absolute top-3 right-3 z-[1000] bg-amber-50/90 backdrop-blur-sm border border-amber-200 rounded-lg px-3 py-1.5 text-[11px] text-amber-700 shadow">
          {noLocationCount} worker{noLocationCount !== 1 ? "s" : ""} without location (not shown)
        </div>
      )}
    </div>
  );
}

interface WorkerMapPopupProps {
  worker: WorkerSummary;
  saved: boolean;
  saving: boolean;
  onSelect: () => void;
  onToggleSave: (e: React.MouseEvent) => void;
}

function WorkerMapPopup({ worker, saved, saving, onSelect, onToggleSave }: WorkerMapPopupProps) {
  return (
    <div className="space-y-1.5 min-w-[180px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {worker.avatarUrl ? (
            <img src={worker.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover border border-border shrink-0" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
              <span className="text-xs font-semibold text-muted-foreground">
                {(worker.fullName ?? worker.name).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-semibold text-xs text-foreground leading-tight">{worker.fullName ?? worker.name}</p>
            {worker.location && <p className="text-[10px] text-muted-foreground">{worker.location}</p>}
          </div>
        </div>
        <button
          onClick={onToggleSave}
          disabled={saving}
          className={`p-0.5 rounded-full transition-colors ${saved ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"}`}
        >
          <Heart className={`h-3.5 w-3.5 ${saved ? "fill-rose-500" : ""} ${saving ? "animate-pulse" : ""}`} />
        </button>
      </div>

      <div className="flex items-center gap-1">
        {worker.isFullyVerified ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
            <CheckCircle2 className="h-2.5 w-2.5" />Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
            <AlertCircle className="h-2.5 w-2.5" />{worker.verificationScore}% complete
          </span>
        )}
        {worker.distanceKm != null && (
          <span className="text-[10px] text-muted-foreground">{worker.distanceKm}km away</span>
        )}
      </div>

      {worker.bio && (
        <p className="text-[10px] text-muted-foreground line-clamp-2">{worker.bio}</p>
      )}

      <button
        onClick={onSelect}
        className="w-full text-[10px] font-semibold bg-primary text-primary-foreground rounded px-2 py-1 hover:opacity-90 transition-opacity"
      >
        View Profile
      </button>
    </div>
  );
}
