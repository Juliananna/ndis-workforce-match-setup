import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";

const googleMapsApiKey = secret("GoogleMapsApiKey");

export interface MapsKeyResponse {
  apiKey: string;
}

export const getMapsKey = api<void, MapsKeyResponse>(
  { expose: true, auth: false, method: "GET", path: "/config/maps-key" },
  async () => {
    return { apiKey: googleMapsApiKey() };
  }
);
