import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { EmployerProfile } from "./profile_get";

export interface UpdateEmployerProfileRequest {
  organisationName?: string;
  abn?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  serviceAreas?: string[];
  contactPerson?: string;
  email?: string;
  phone?: string;
  organisationSize?: string;
  servicesProvided?: string[];
}

export const updateEmployerProfile = api<UpdateEmployerProfileRequest, EmployerProfile>(
  { expose: true, auth: true, method: "PUT", path: "/employers/profile" },
  async (req) => {
    const auth = getAuthData()!;
    if (auth.role !== "EMPLOYER") {
      throw APIError.permissionDenied("only employers can access this endpoint");
    }

    if (req.email !== undefined && req.email !== null) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) {
        throw APIError.invalidArgument("invalid email format");
      }
    }

    if (req.abn !== undefined && req.abn.trim() === "") {
      throw APIError.invalidArgument("abn cannot be empty");
    }

    const existing = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!existing) {
      throw APIError.notFound("employer profile not found");
    }

    const serviceAreas = req.serviceAreas ?? null;
    const servicesProvided = req.servicesProvided ?? null;

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
      UPDATE employers
      SET
        organisation_name = COALESCE(${req.organisationName ?? null}, organisation_name),
        abn = COALESCE(${req.abn ?? null}, abn),
        location = COALESCE(${req.location ?? null}, location),
        latitude = COALESCE(${req.latitude ?? null}, latitude),
        longitude = COALESCE(${req.longitude ?? null}, longitude),
        service_areas = COALESCE(${serviceAreas}, service_areas),
        contact_person = COALESCE(${req.contactPerson ?? null}, contact_person),
        email = COALESCE(${req.email ?? null}, email),
        phone = COALESCE(${req.phone ?? null}, phone),
        organisation_size = COALESCE(${req.organisationSize ?? null}, organisation_size),
        services_provided = COALESCE(${servicesProvided}, services_provided),
        updated_at = NOW()
      WHERE user_id = ${auth.userID}
      RETURNING employer_id, user_id, organisation_name, abn, location, latitude, longitude, service_areas,
                contact_person, email, phone, organisation_size, services_provided, logo_url, updated_at
    `;

    if (!row) {
      throw APIError.internal("failed to update employer profile");
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
