import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface EmployerProfile {
  employerId: string;
  userId: string;
  organisationName: string;
  abn: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  serviceAreas: string[];
  contactPerson: string;
  email: string | null;
  phone: string;
  organisationSize: string | null;
  servicesProvided: string[];
  logoUrl: string | null;
  updatedAt: Date;
}

export const getEmployerProfile = api<void, EmployerProfile>(
  { expose: true, auth: true, method: "GET", path: "/employers/profile" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can access this endpoint");
    }

    const row = await db.queryRow<{
      employer_id: string;
      user_id: string;
      organisation_name: string;
      abn: string;
      location: string | null;
      latitude: number | null;
      longitude: number | null;
      service_areas: string[] | null;
      contact_person: string;
      email: string | null;
      phone: string;
      organisation_size: string | null;
      services_provided: string[] | null;
      logo_url: string | null;
      updated_at: Date;
    }>`
      SELECT employer_id, user_id, organisation_name, abn, location, latitude, longitude, service_areas,
             contact_person, email, phone, organisation_size, services_provided, logo_url, updated_at
      FROM employers
      WHERE user_id = ${auth.userID}
    `;

    if (!row) {
      throw APIError.notFound("employer profile not found");
    }

    return {
      employerId: row.employer_id,
      userId: row.user_id,
      organisationName: row.organisation_name,
      abn: row.abn,
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      serviceAreas: row.service_areas ?? [],
      contactPerson: row.contact_person,
      email: row.email,
      phone: row.phone,
      organisationSize: row.organisation_size,
      servicesProvided: row.services_provided ?? [],
      logoUrl: row.logo_url,
      updatedAt: row.updated_at,
    };
  }
);
