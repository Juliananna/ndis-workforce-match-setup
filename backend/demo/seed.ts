import { api, APIError } from "encore.dev/api";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "../db";

export interface DemoPair {
  label: string;
  workerEmail: string;
  employerEmail: string;
  workerUserId: string;
  employerUserId: string;
}

export interface SeedDemoResponse {
  message: string;
  pairs: DemoPair[];
}

const DEMO_PASSWORD = "DemoNDIS2026!";

const FRONTEND_BASE_URL = "https://ndis-workforce-match-setup-d6t4j0c82vjgmsb23vrg.lp.dev";

function docUrl(filename: string): string {
  return `${FRONTEND_BASE_URL}/sample-docs/${encodeURIComponent(filename)}`;
}

const DEMO_DOCUMENTS: { documentType: string; filename: string; expiryDate: string | null; status: string }[] = [
  { documentType: "Driver's Licence",                   filename: "victoria-license-1.jpg",                          expiryDate: "2028-06-30", status: "Verified" },
  { documentType: "Passport / ID",                      filename: "australian passport sample.jpg",                  expiryDate: "2030-03-15", status: "Verified" },
  { documentType: "Working With Children Check",        filename: "WWCCcardsample.jpg",                              expiryDate: "2027-09-01", status: "Verified" },
  { documentType: "Police Clearance",                   filename: "police ccheck sample.png",                        expiryDate: "2026-12-01", status: "Verified" },
  { documentType: "NDIS Worker Screening Check",        filename: "ndis workers screening sample.png",               expiryDate: "2028-01-01", status: "Verified" },
  { documentType: "NDIS Worker Orientation Module",     filename: "ndis orientation modue.webp",                     expiryDate: null,          status: "Verified" },
  { documentType: "NDIS Code of Conduct acknowledgement", filename: "ndis code of conduct.jpg",                      expiryDate: null,          status: "Verified" },
  { documentType: "Infection Control Certificate",      filename: "infection cotrol sample.png",                     expiryDate: "2027-03-01", status: "Verified" },
  { documentType: "First Aid Certificate",              filename: "first aid sample.webp",                           expiryDate: "2027-06-01", status: "Verified" },
  { documentType: "CPR Certificate",                    filename: "cpr certificate sample.jpg",                      expiryDate: "2027-06-01", status: "Verified" },
  { documentType: "Certificate III / IV Disability",   filename: "certificate-iii-in-individual-support-ageing.jpg", expiryDate: null,          status: "Verified" },
];

const melbourneSuburbs = [
  { name: "Richmond", lat: -37.8182, lng: 144.9997 },
  { name: "Fitzroy", lat: -37.7994, lng: 144.9776 },
  { name: "Brunswick", lat: -37.7706, lng: 144.9598 },
  { name: "St Kilda", lat: -37.8676, lng: 144.981 },
  { name: "Prahran", lat: -37.8491, lng: 144.992 },
  { name: "Footscray", lat: -37.8006, lng: 144.8997 },
  { name: "Northcote", lat: -37.7726, lng: 145.0095 },
  { name: "Box Hill", lat: -37.8196, lng: 145.1232 },
];

const demoWorkers = [
  {
    label: "Demo Worker – Alex",
    name: "Alex Rivera",
    bio: "Passionate disability support worker with 6 years of experience across community participation and personal care. Known for building strong rapport with clients.",
    qualifications: "Certificate IV in Disability, First Aid, NDIS Worker Screening Clearance",
    experienceYears: 6,
    skills: ["Autism support", "Community participation", "Personal care", "Mental health support"],
    suburb: melbourneSuburbs[0],
    minRate: 34,
    phone: "0412 000 001",
  },
  {
    label: "Demo Worker – Jordan",
    name: "Jordan Kim",
    bio: "Experienced in complex care and medication management. Former registered nurse now focusing on NDIS disability support with a clinical edge.",
    qualifications: "Diploma of Nursing, Certificate III in Individual Support, Medication Administration",
    experienceYears: 9,
    skills: ["Complex care", "Medication administration", "Wound care", "PEG feeding"],
    suburb: melbourneSuburbs[2],
    minRate: 40,
    phone: "0412 000 002",
  },
  {
    label: "Demo Worker – Casey",
    name: "Casey Morgan",
    bio: "Enthusiastic support worker specialising in autism and behavioural support. Background in early childhood education brings a creative, structured approach.",
    qualifications: "Bachelor of Social Work, Certificate III in Individual Support, NDIS Worker Screening",
    experienceYears: 4,
    skills: ["Autism support", "Behavioural support", "Intellectual disability", "Community participation"],
    suburb: melbourneSuburbs[4],
    minRate: 32,
    phone: "0412 000 003",
  },
];

const demoEmployers = [
  {
    label: "Demo Employer – Horizon Care",
    organisationName: "Horizon Care Services",
    contactPerson: "Demo Manager",
    abn: "99 888 777 001",
    phone: "03 9000 0001",
    suburb: melbourneSuburbs[1],
    serviceAreas: ["Richmond", "Fitzroy", "Northcote"],
    servicesProvided: ["Personal care", "Community participation", "Autism support"],
    organisationSize: "11-50",
  },
  {
    label: "Demo Employer – Summit NDIS",
    organisationName: "Summit NDIS Solutions",
    contactPerson: "Demo Coordinator",
    abn: "99 888 777 002",
    phone: "03 9000 0002",
    suburb: melbourneSuburbs[5],
    serviceAreas: ["Footscray", "Brunswick", "St Kilda"],
    servicesProvided: ["Complex care", "Medication administration", "Mental health support"],
    organisationSize: "11-50",
  },
  {
    label: "Demo Employer – Bayside Connect",
    organisationName: "Bayside Connect Disability",
    contactPerson: "Demo Director",
    abn: "99 888 777 003",
    phone: "03 9000 0003",
    suburb: melbourneSuburbs[3],
    serviceAreas: ["St Kilda", "Prahran", "Box Hill"],
    servicesProvided: ["Behavioural support", "Intellectual disability", "Autism support"],
    organisationSize: "51-200",
  },
];

const jobTemplates = [
  {
    supportTypeTags: ["Personal care", "Community participation"],
    shiftStartTime: "08:00",
    shiftDurationHours: 4,
    clientNotes: "Support client with morning routine and community outing. Client uses a walker and enjoys social activities.",
    genderPreference: "No preference" as const,
    ageRangePreference: "40-60",
    behaviouralConsiderations: "None",
    medicalRequirements: "None",
    weekdayRate: 35.0,
    weekendRate: 49.0,
    publicHolidayRate: 69.0,
    suburb: melbourneSuburbs[0],
  },
  {
    supportTypeTags: ["Autism support", "Behavioural support"],
    shiftStartTime: "09:00",
    shiftDurationHours: 3,
    clientNotes: "Assist non-verbal client with daily structure and social skills development. PBS plan in place.",
    genderPreference: "Female" as const,
    ageRangePreference: "18-28",
    behaviouralConsiderations: "Positive behaviour support plan provided. Calm and consistent approach essential.",
    medicalRequirements: "None",
    weekdayRate: 37.0,
    weekendRate: 52.0,
    publicHolidayRate: 72.0,
    suburb: melbourneSuburbs[2],
  },
  {
    supportTypeTags: ["Complex care", "Medication administration"],
    shiftStartTime: "06:30",
    shiftDurationHours: 8,
    clientNotes: "High care client requiring full personal care, PEG feeding, and medication schedule management.",
    genderPreference: "No preference" as const,
    ageRangePreference: "55-70",
    behaviouralConsiderations: "Client may experience anxiety — calm approach required.",
    medicalRequirements: "PEG feeding certified. Medication schedule provided on commencement.",
    weekdayRate: 43.0,
    weekendRate: 59.0,
    publicHolidayRate: 82.0,
    suburb: melbourneSuburbs[4],
  },
  {
    supportTypeTags: ["Mental health support", "Community participation"],
    shiftStartTime: "13:00",
    shiftDurationHours: 4,
    clientNotes: "Accompany client to appointments and social activities. Focus on confidence building.",
    genderPreference: "Male" as const,
    ageRangePreference: "22-35",
    behaviouralConsiderations: "Client managing social anxiety. Patience and reassurance required.",
    medicalRequirements: "None",
    weekdayRate: 36.0,
    weekendRate: 50.0,
    publicHolidayRate: 70.0,
    suburb: melbourneSuburbs[6],
  },
  {
    supportTypeTags: ["Intellectual disability", "Personal care"],
    shiftStartTime: "07:30",
    shiftDurationHours: 6,
    clientNotes: "Daily living support including meal prep, hygiene, and community engagement. Client loves sport.",
    genderPreference: "No preference" as const,
    ageRangePreference: "25-45",
    behaviouralConsiderations: "Structured routine is key. Client thrives with positive reinforcement.",
    medicalRequirements: "None",
    weekdayRate: 34.0,
    weekendRate: 48.0,
    publicHolidayRate: 67.0,
    suburb: melbourneSuburbs[1],
  },
];

const shiftDates = [
  "2026-04-01", "2026-04-02", "2026-04-03", "2026-04-07",
  "2026-04-08", "2026-04-09", "2026-04-10", "2026-04-14",
  "2026-04-15", "2026-04-16",
];

export const seedDemo = api(
  { expose: true, method: "POST", path: "/demo/seed" },
  async (): Promise<SeedDemoResponse> => {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const pairs: DemoPair[] = [];

    await db.exec`DELETE FROM demo_pairs`;

    const createdWorkerIds: string[] = [];
    const createdEmployerIds: { userId: string; employerId: string }[] = [];

    for (let i = 0; i < demoWorkers.length; i++) {
      const w = demoWorkers[i];
      const email = `demo.worker${i + 1}@matchworkforce.demo`;

      await db.exec`DELETE FROM users WHERE email = ${email}`;

      const verificationToken = randomUUID();
      const user = await db.queryRow<{ user_id: string }>`
        INSERT INTO users (email, password_hash, role, is_verified, verification_token, is_demo)
        VALUES (${email}, ${passwordHash}, 'WORKER', TRUE, ${verificationToken}, TRUE)
        RETURNING user_id
      `;
      if (!user) continue;

      const worker = await db.queryRow<{ worker_id: string }>`
        INSERT INTO workers (user_id, name, phone, full_name, location, latitude, longitude,
          travel_radius_km, drivers_license, vehicle_access, bio, experience_years, qualifications)
        VALUES (
          ${user.user_id}, ${w.name}, ${w.phone}, ${w.name},
          ${w.suburb.name + ", VIC"}, ${w.suburb.lat}, ${w.suburb.lng},
          30, TRUE, TRUE, ${w.bio}, ${w.experienceYears}, ${w.qualifications}
        )
        RETURNING worker_id
      `;
      if (!worker) continue;

      for (const skill of w.skills) {
        await db.exec`
          INSERT INTO worker_skills (worker_id, skill) VALUES (${worker.worker_id}, ${skill})
          ON CONFLICT DO NOTHING
        `;
      }

      const daysJson = JSON.stringify(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
      const shiftsJson = JSON.stringify(["Morning", "Afternoon", "Evening"]);
      await db.exec`
        INSERT INTO worker_availability (worker_id, available_days, preferred_shift_types,
          minimum_pay_rate, max_travel_distance_km, time_window_start, time_window_end)
        VALUES (${worker.worker_id}, ${daysJson}, ${shiftsJson},
          ${w.minRate}, 30, '07:00', '22:00')
        ON CONFLICT (worker_id) DO NOTHING
      `;

      for (const doc of DEMO_DOCUMENTS) {
        const fileUrl = docUrl(doc.filename);
        const expiryDate = doc.expiryDate ? new Date(doc.expiryDate) : null;
        await db.exec`
          INSERT INTO worker_documents (worker_id, document_type, file_key, expiry_date, verification_status, is_demo_url)
          VALUES (${worker.worker_id}, ${doc.documentType}, ${fileUrl}, ${expiryDate}, ${doc.status}, TRUE)
        `;
      }

      createdWorkerIds.push(user.user_id);
    }

    for (let i = 0; i < demoEmployers.length; i++) {
      const emp = demoEmployers[i];
      const email = `demo.employer${i + 1}@matchworkforce.demo`;

      await db.exec`DELETE FROM users WHERE email = ${email}`;

      const verificationToken = randomUUID();
      const user = await db.queryRow<{ user_id: string }>`
        INSERT INTO users (email, password_hash, role, is_verified, verification_token, is_demo)
        VALUES (${email}, ${passwordHash}, 'EMPLOYER', TRUE, ${verificationToken}, TRUE)
        RETURNING user_id
      `;
      if (!user) continue;

      const employer = await db.queryRow<{ employer_id: string }>`
        INSERT INTO employers (user_id, organisation_name, contact_person, phone, abn,
          location, latitude, longitude, service_areas, organisation_size, services_provided, email)
        VALUES (
          ${user.user_id}, ${emp.organisationName}, ${emp.contactPerson}, ${emp.phone}, ${emp.abn},
          ${emp.suburb.name + ", VIC"}, ${emp.suburb.lat}, ${emp.suburb.lng},
          ${emp.serviceAreas}, ${emp.organisationSize}, ${emp.servicesProvided}, ${email}
        )
        RETURNING employer_id
      `;
      if (!employer) continue;

      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      await db.exec`
        INSERT INTO employer_subscriptions (
          employer_id, plan, stripe_session_id, stripe_subscription_id, stripe_customer_id,
          amount_aud_cents, status, current_period_start, current_period_end, paid_at
        ) VALUES (
          ${employer.employer_id}, 'annual', ${"demo_session_" + randomUUID()},
          ${"demo_sub_" + randomUUID()}, ${"demo_cus_" + randomUUID()},
          0, 'active', NOW(), ${periodEnd.toISOString()}, NOW()
        )
      `;

      await db.exec`
        UPDATE employers
        SET subscription_status = 'active',
            subscription_plan = 'annual',
            subscription_period_end = ${periodEnd.toISOString()}
        WHERE employer_id = ${employer.employer_id}
      `;

      createdEmployerIds.push({ userId: user.user_id, employerId: employer.employer_id });
    }

    for (let i = 0; i < createdEmployerIds.length; i++) {
      const { employerId } = createdEmployerIds[i];
      const jobsPerEmployer = 4;
      for (let j = 0; j < jobsPerEmployer; j++) {
        const template = jobTemplates[(i * jobsPerEmployer + j) % jobTemplates.length];
        const shiftDate = shiftDates[(i * jobsPerEmployer + j) % shiftDates.length];

        await db.exec`
          INSERT INTO job_requests (
            employer_id, location, shift_date, shift_start_time, shift_duration_hours,
            support_type_tags, client_notes, gender_preference, age_range_preference,
            behavioural_considerations, medical_requirements,
            weekday_rate, weekend_rate, public_holiday_rate, status,
            is_emergency, latitude, longitude
          ) VALUES (
            ${employerId},
            ${template.suburb.name + ", VIC"},
            ${shiftDate}::date,
            ${template.shiftStartTime},
            ${template.shiftDurationHours},
            ${template.supportTypeTags},
            ${template.clientNotes},
            ${template.genderPreference},
            ${template.ageRangePreference},
            ${template.behaviouralConsiderations},
            ${template.medicalRequirements},
            ${template.weekdayRate},
            ${template.weekendRate},
            ${template.publicHolidayRate},
            'Open',
            FALSE,
            ${template.suburb.lat},
            ${template.suburb.lng}
          )
        `;
      }
    }

    const numPairs = Math.min(demoWorkers.length, demoEmployers.length);
    for (let i = 0; i < numPairs; i++) {
      const workerUserId = createdWorkerIds[i];
      const employerUserId = createdEmployerIds[i].userId;
      const label = `Demo Set ${i + 1} — ${demoWorkers[i].name} / ${demoEmployers[i].organisationName}`;
      const workerEmail = `demo.worker${i + 1}@matchworkforce.demo`;
      const employerEmail = `demo.employer${i + 1}@matchworkforce.demo`;

      await db.exec`
        INSERT INTO demo_pairs (label, worker_user_id, employer_user_id)
        VALUES (${label}, ${workerUserId}, ${employerUserId})
      `;

      pairs.push({
        label,
        workerEmail,
        employerEmail,
        workerUserId,
        employerUserId,
      });
    }

    return {
      message: "Demo accounts seeded successfully",
      pairs,
    };
  }
);
