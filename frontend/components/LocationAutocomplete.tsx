import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import backend from "~backend/client";

interface GMapsWindow {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (
          input: HTMLInputElement,
          opts?: object
        ) => {
          addListener: (event: string, handler: () => void) => void;
          getPlace: () => {
            formatted_address?: string;
            geometry?: {
              location?: {
                lat: () => number;
                lng: () => number;
              };
            };
          };
        };
      };
    };
  };
}

interface LocationResult {
  address: string;
  latitude: number;
  longitude: number;
}

interface Props {
  value: string;
  onChange: (result: LocationResult) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

let mapsApiKeyCache: string | null = null;
let mapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (mapsLoadPromise) return mapsLoadPromise;
  const w = window as GMapsWindow;
  if (w.google?.maps) {
    mapsLoadPromise = Promise.resolve();
    return mapsLoadPromise;
  }
  mapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Search suburb or address…",
  className = "",
  label,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initialised = useRef(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const initAutocomplete = useCallback(async () => {
    if (initialised.current || !inputRef.current) return;
    initialised.current = true;
    try {
      setLoading(true);
      if (!mapsApiKeyCache) {
        const res = await backend.config.getMapsKey();
        mapsApiKeyCache = res.apiKey;
      }
      await loadGoogleMaps(mapsApiKeyCache);

      const w = window as GMapsWindow;
      const PlacesAC = w.google?.maps?.places?.Autocomplete;
      if (!PlacesAC || !inputRef.current) return;

      const ac = new PlacesAC(inputRef.current, {
        types: ["geocode"],
        componentRestrictions: { country: "au" },
        fields: ["formatted_address", "geometry"],
      });

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        const address = place.formatted_address ?? inputRef.current?.value ?? "";
        const latitude = place.geometry.location.lat();
        const longitude = place.geometry.location.lng();
        setInputValue(address);
        onChange({ address, latitude, longitude });
      });
    } catch (e) {
      initialised.current = false;
      setError("Location search unavailable");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  const handleFocus = () => {
    if (!initialised.current) {
      initAutocomplete();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-foreground text-xs font-medium">{label}</label>
      )}
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={`w-full h-9 rounded-md border border-input bg-background pl-8 pr-8 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
