import { api } from "encore.dev/api";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "../db";

export interface SeedResponse {
  message: string;
  workersCreated: number;
  employersCreated: number;
  jobsCreated: number;
}

const melbourneSuburbs = [
  { name: "Richmond", lat: -37.8182, lng: 144.9997 },
  { name: "Fitzroy", lat: -37.7994, lng: 144.9776 },
  { name: "Brunswick", lat: -37.7706, lng: 144.9598 },
  { name: "St Kilda", lat: -37.8676, lng: 144.9810 },
  { name: "Prahran", lat: -37.8491, lng: 144.9920 },
  { name: "Footscray", lat: -37.8006, lng: 144.8997 },
  { name: "Northcote", lat: -37.7726, lng: 145.0095 },
  { name: "Coburg", lat: -37.7423, lng: 144.9643 },
  { name: "Doncaster", lat: -37.7877, lng: 145.1233 },
  { name: "Box Hill", lat: -37.8196, lng: 145.1232 },
  { name: "Dandenong", lat: -37.9877, lng: 145.2147 },
  { name: "Frankston", lat: -38.1443, lng: 145.1264 },
  { name: "Werribee", lat: -37.9009, lng: 144.6598 },
  { name: "Sunshine", lat: -37.7887, lng: 144.8312 },
  { name: "Ringwood", lat: -37.8162, lng: 145.2295 },
];

const workerData = [
  {
    name: "Sarah Mitchell",
    bio: "Experienced disability support worker with a passion for helping clients achieve their goals. Specialising in autism and intellectual disability support.",
    qualifications: "Certificate III in Individual Support, First Aid Certified, NDIS Worker Screening",
    experienceYears: 5,
    skills: ["Autism support", "Intellectual disability", "Personal care", "Community participation"],
    suburb: melbourneSuburbs[0],
    availability: { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], shifts: ["Morning", "Afternoon"], minRate: 32 },
  },
  {
    name: "James Nguyen",
    bio: "Compassionate carer with extensive experience in complex care and medication administration. Former nurse transitioning to disability support.",
    qualifications: "Diploma of Nursing, Certificate IV in Disability, Medication Administration Cert",
    experienceYears: 8,
    skills: ["Complex care", "Medication administration", "PEG feeding", "Wound care"],
    suburb: melbourneSuburbs[1],
    availability: { days: ["Monday", "Wednesday", "Friday", "Saturday", "Sunday"], shifts: ["Morning", "Evening", "Night"], minRate: 38 },
  },
  {
    name: "Emily Okoye",
    bio: "Dedicated support worker helping clients with mobility challenges and community participation. Experienced with manual handling and assistive technology.",
    qualifications: "Certificate III in Individual Support, Manual Handling Certificate, NDIS Worker Screening",
    experienceYears: 3,
    skills: ["Mobility support", "Personal care", "Community participation"],
    suburb: melbourneSuburbs[2],
    availability: { days: ["Tuesday", "Thursday", "Saturday", "Sunday"], shifts: ["Afternoon", "Evening"], minRate: 30 },
  },
  {
    name: "Marcus Thompson",
    bio: "Mental health support specialist with experience in behavioural support and crisis intervention. Committed to person-centred care.",
    qualifications: "Bachelor of Psychology, Certificate IV in Mental Health, MHFA Certified",
    experienceYears: 6,
    skills: ["Mental health support", "Behavioural support", "Community participation"],
    suburb: melbourneSuburbs[3],
    availability: { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], shifts: ["Morning", "Afternoon", "Evening"], minRate: 35 },
  },
  {
    name: "Priya Sharma",
    bio: "Warm and empathetic carer with expertise in personal care and daily living support. Speaks Hindi and Punjabi.",
    qualifications: "Certificate III in Individual Support, NDIS Worker Screening, First Aid",
    experienceYears: 4,
    skills: ["Personal care", "Autism support", "Community participation", "Intellectual disability"],
    suburb: melbourneSuburbs[4],
    availability: { days: ["Monday", "Wednesday", "Friday"], shifts: ["Morning", "Afternoon"], minRate: 31 },
  },
  {
    name: "Daniel Walsh",
    bio: "Skilled support worker specialising in high-needs clients including PEG feeding, wound care, and complex medical conditions.",
    qualifications: "Certificate IV in Disability, PEG Feeding Cert, Wound Management Cert, NDIS Worker Screening",
    experienceYears: 7,
    skills: ["PEG feeding", "Wound care", "Complex care", "Medication administration", "Personal care"],
    suburb: melbourneSuburbs[5],
    availability: { days: ["Tuesday", "Thursday", "Saturday"], shifts: ["Morning", "Overnight"], minRate: 40 },
  },
  {
    name: "Aisha Abdullah",
    bio: "Enthusiastic disability support worker with a background in early childhood education. Great with younger NDIS participants.",
    qualifications: "Certificate III in Individual Support, Diploma of Early Childhood Education, NDIS Worker Screening",
    experienceYears: 2,
    skills: ["Autism support", "Intellectual disability", "Behavioural support"],
    suburb: melbourneSuburbs[6],
    availability: { days: ["Monday", "Tuesday", "Wednesday", "Thursday"], shifts: ["Morning", "Afternoon"], minRate: 29 },
  },
  {
    name: "Tom Brennan",
    bio: "Reliable and experienced support worker with a strong focus on independence building and community engagement for adults with disabilities.",
    qualifications: "Certificate IV in Disability, Community Services Cert, NDIS Worker Screening",
    experienceYears: 9,
    skills: ["Community participation", "Intellectual disability", "Mobility support", "Behavioural support"],
    suburb: melbourneSuburbs[7],
    availability: { days: ["Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], shifts: ["Afternoon", "Evening", "Flexible"], minRate: 33 },
  },
  {
    name: "Lily Chen",
    bio: "Bilingual support worker (English/Mandarin) with expertise in autism support and social skills development. Passionate about inclusive communities.",
    qualifications: "Bachelor of Social Work, Certificate III in Individual Support, NDIS Worker Screening",
    experienceYears: 4,
    skills: ["Autism support", "Community participation", "Mental health support"],
    suburb: melbourneSuburbs[8],
    availability: { days: ["Monday", "Tuesday", "Wednesday", "Friday"], shifts: ["Morning", "Afternoon"], minRate: 34 },
  },
  {
    name: "Robert Kowalski",
    bio: "Experienced in complex care and medication management. Formerly worked in aged care and now focused on NDIS disability support.",
    qualifications: "Certificate IV in Aged Care, Certificate III in Individual Support, Medication Administration Cert",
    experienceYears: 11,
    skills: ["Complex care", "Medication administration", "Personal care", "Wound care"],
    suburb: melbourneSuburbs[9],
    availability: { days: ["Monday", "Tuesday", "Thursday", "Friday", "Saturday"], shifts: ["Morning", "Evening", "Night"], minRate: 37 },
  },
];

const employerData = [
  {
    organisationName: "Sunrise Care Services",
    contactPerson: "Karen Aldridge",
    abn: "12 345 678 901",
    phone: "03 9123 4567",
    suburb: melbourneSuburbs[10],
    serviceAreas: ["Dandenong", "Frankston", "Ringwood"],
    servicesProvided: ["Personal care", "Community participation", "Complex care"],
    organisationSize: "11-50",
  },
  {
    organisationName: "Bayside Disability Support",
    contactPerson: "Michael Forsythe",
    abn: "23 456 789 012",
    phone: "03 9234 5678",
    suburb: melbourneSuburbs[11],
    serviceAreas: ["Frankston", "St Kilda", "Prahran"],
    servicesProvided: ["Mobility support", "Mental health support", "Behavioural support"],
    organisationSize: "11-50",
  },
  {
    organisationName: "Inner North Community Care",
    contactPerson: "Sandra Petrov",
    abn: "34 567 890 123",
    phone: "03 9345 6789",
    suburb: melbourneSuburbs[1],
    serviceAreas: ["Fitzroy", "Brunswick", "Northcote", "Coburg"],
    servicesProvided: ["Autism support", "Intellectual disability", "Community participation"],
    organisationSize: "51-200",
  },
  {
    organisationName: "Western Suburbs NDIS",
    contactPerson: "Greg Morrison",
    abn: "45 678 901 234",
    phone: "03 9456 7890",
    suburb: melbourneSuburbs[12],
    serviceAreas: ["Werribee", "Footscray", "Sunshine"],
    servicesProvided: ["Personal care", "Complex care", "Medication administration"],
    organisationSize: "11-50",
  },
];

const jobTemplates = [
  {
    supportTypeTags: ["Personal care", "Mobility support"],
    shiftStartTime: "07:00",
    shiftDurationHours: 4,
    clientNotes: "Client requires assistance with morning routine, shower, dressing and breakfast preparation. Uses a wheelchair.",
    genderPreference: "No preference" as const,
    ageRangePreference: "35-50",
    behaviouralConsiderations: "None",
    medicalRequirements: "None",
    weekdayRate: 34.5,
    weekendRate: 48.5,
    publicHolidayRate: 68.0,
  },
  {
    supportTypeTags: ["Autism support", "Community participation"],
    shiftStartTime: "10:00",
    shiftDurationHours: 3,
    clientNotes: "Support client to attend community activities. Client is non-verbal and uses AAC device. Consistent routine is important.",
    genderPreference: "Male" as const,
    ageRangePreference: "18-25",
    behaviouralConsiderations: "Sensory sensitivities - avoid loud environments",
    medicalRequirements: "Carry EpiPen at all times",
    weekdayRate: 36.0,
    weekendRate: 50.5,
    publicHolidayRate: 70.0,
  },
  {
    supportTypeTags: ["Complex care", "Medication administration"],
    shiftStartTime: "06:00",
    shiftDurationHours: 8,
    clientNotes: "High care client requiring full personal care, medication administration and PEG feeding. Experience with complex care essential.",
    genderPreference: "Female" as const,
    ageRangePreference: "50-70",
    behaviouralConsiderations: "Client can be anxious - calm approach required",
    medicalRequirements: "PEG feeding, daily medication schedule provided",
    weekdayRate: 42.0,
    weekendRate: 58.0,
    publicHolidayRate: 80.0,
  },
  {
    supportTypeTags: ["Mental health support", "Community participation"],
    shiftStartTime: "13:00",
    shiftDurationHours: 4,
    clientNotes: "Client working on social skills and community engagement. Support to attend appointments and social activities.",
    genderPreference: "No preference" as const,
    ageRangePreference: "20-35",
    behaviouralConsiderations: "Client managing anxiety - patience required",
    medicalRequirements: "None",
    weekdayRate: 35.0,
    weekendRate: 49.0,
    publicHolidayRate: 69.0,
  },
  {
    supportTypeTags: ["Intellectual disability", "Personal care"],
    shiftStartTime: "08:00",
    shiftDurationHours: 6,
    clientNotes: "Support with daily living tasks, meal preparation and community activities. Fun and engaging approach appreciated.",
    genderPreference: "No preference" as const,
    ageRangePreference: "25-40",
    behaviouralConsiderations: "Client thrives with structure and routine",
    medicalRequirements: "None",
    weekdayRate: 33.0,
    weekendRate: 47.0,
    publicHolidayRate: 66.0,
  },
  {
    supportTypeTags: ["Behavioural support", "Intellectual disability"],
    shiftStartTime: "14:00",
    shiftDurationHours: 5,
    clientNotes: "Client with challenging behaviours requires positive behaviour support strategies. PBS plan provided.",
    genderPreference: "Male" as const,
    ageRangePreference: "18-30",
    behaviouralConsiderations: "Positive behaviour support plan in place. Debrief with team leader after each shift.",
    medicalRequirements: "None",
    weekdayRate: 38.0,
    weekendRate: 53.0,
    publicHolidayRate: 75.0,
  },
  {
    supportTypeTags: ["Wound care", "Personal care"],
    shiftStartTime: "09:00",
    shiftDurationHours: 3,
    clientNotes: "Daily wound dressing and personal care. Client is independent in many areas but requires clinical nursing support.",
    genderPreference: "No preference" as const,
    ageRangePreference: "60-80",
    behaviouralConsiderations: "None",
    medicalRequirements: "Wound care certificate required. Dressing supplies provided by client.",
    weekdayRate: 40.0,
    weekendRate: 56.0,
    publicHolidayRate: 78.0,
  },
  {
    supportTypeTags: ["Autism support", "Behavioural support"],
    shiftStartTime: "15:00",
    shiftDurationHours: 4,
    clientNotes: "After-school support for teenager with autism. Assist with homework, social skills and afternoon activities.",
    genderPreference: "Female" as const,
    ageRangePreference: "13-18",
    behaviouralConsiderations: "Meltdowns possible - de-escalation techniques required",
    medicalRequirements: "None",
    weekdayRate: 36.5,
    weekendRate: 51.0,
    publicHolidayRate: 71.0,
  },
];

const shiftDates = [
  "2026-03-25", "2026-03-26", "2026-03-27", "2026-03-28",
  "2026-03-30", "2026-03-31", "2026-04-01", "2026-04-02",
  "2026-04-03", "2026-04-07", "2026-04-08", "2026-04-09",
];

export const seed = api(
  { expose: true, method: "POST", path: "/admin/seed" },
  async (): Promise<SeedResponse> => {
    const passwordHash = await bcrypt.hash("Password123!", 12);
    let workersCreated = 0;
    let employersCreated = 0;
    let jobsCreated = 0;

    const employerIds: string[] = [];

    for (let i = 0; i < employerData.length; i++) {
      const emp = employerData[i];
      const email = `employer${i + 1}@seeddata.com.au`;

      const existing = await db.queryRow`SELECT user_id FROM users WHERE email = ${email}`;
      if (existing) continue;

      const verificationToken = randomUUID();
      const user = await db.queryRow<{ user_id: string }>`
        INSERT INTO users (email, password_hash, role, is_verified, verification_token)
        VALUES (${email}, ${passwordHash}, 'EMPLOYER', TRUE, ${verificationToken})
        RETURNING user_id
      `;
      if (!user) continue;

      const employer = await db.queryRow<{ employer_id: string }>`
        INSERT INTO employers (user_id, organisation_name, contact_person, phone, abn, location, latitude, longitude,
          service_areas, organisation_size, services_provided, email)
        VALUES (
          ${user.user_id}, ${emp.organisationName}, ${emp.contactPerson}, ${emp.phone}, ${emp.abn},
          ${emp.suburb.name + ", VIC"}, ${emp.suburb.lat}, ${emp.suburb.lng},
          ${emp.serviceAreas}, ${emp.organisationSize}, ${emp.servicesProvided}, ${email}
        )
        RETURNING employer_id
      `;
      if (!employer) continue;

      employerIds.push(employer.employer_id);
      employersCreated++;
    }

    const existingEmployers = await db.queryAll<{ employer_id: string }>`
      SELECT employer_id FROM employers
      ORDER BY employer_id
      LIMIT 4
    `;
    const allEmployerIds = existingEmployers.map((e) => e.employer_id);

    for (let i = 0; i < workerData.length; i++) {
      const w = workerData[i];
      const email = `worker${i + 1}@seeddata.com.au`;

      const existing = await db.queryRow`SELECT user_id FROM users WHERE email = ${email}`;
      if (existing) continue;

      const verificationToken = randomUUID();
      const user = await db.queryRow<{ user_id: string }>`
        INSERT INTO users (email, password_hash, role, is_verified, verification_token)
        VALUES (${email}, ${passwordHash}, 'WORKER', TRUE, ${verificationToken})
        RETURNING user_id
      `;
      if (!user) continue;

      const worker = await db.queryRow<{ worker_id: string }>`
        INSERT INTO workers (user_id, name, phone, full_name, location, latitude, longitude,
          travel_radius_km, drivers_license, vehicle_access, bio, experience_years, qualifications)
        VALUES (
          ${user.user_id}, ${w.name}, ${"04" + String(10000000 + i * 11111111).slice(0, 8)},
          ${w.name}, ${w.suburb.name + ", VIC"}, ${w.suburb.lat}, ${w.suburb.lng},
          ${20 + (i % 3) * 10}, ${i % 2 === 0}, ${i % 3 !== 0},
          ${w.bio}, ${w.experienceYears}, ${w.qualifications}
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

      const daysJson = JSON.stringify(w.availability.days);
      const shiftsJson = JSON.stringify(w.availability.shifts);
      await db.exec`
        INSERT INTO worker_availability (worker_id, available_days, preferred_shift_types,
          minimum_pay_rate, max_travel_distance_km, time_window_start, time_window_end)
        VALUES (${worker.worker_id}, ${daysJson}, ${shiftsJson},
          ${w.availability.minRate}, ${20 + (i % 3) * 10}, '07:00', '21:00')
        ON CONFLICT (worker_id) DO NOTHING
      `;

      workersCreated++;
    }

    let jobIdx = 0;
    for (const employerId of allEmployerIds) {
      const jobsPerEmployer = 5;
      for (let j = 0; j < jobsPerEmployer; j++) {
        const template = jobTemplates[jobIdx % jobTemplates.length];
        const suburbIdx = (jobIdx * 3) % melbourneSuburbs.length;
        const suburb = melbourneSuburbs[suburbIdx];
        const shiftDate = shiftDates[jobIdx % shiftDates.length];

        await db.exec`
          INSERT INTO job_requests (
            employer_id, location, shift_date, shift_start_time, shift_duration_hours,
            support_type_tags, client_notes, gender_preference, age_range_preference,
            behavioural_considerations, medical_requirements,
            weekday_rate, weekend_rate, public_holiday_rate, status,
            is_emergency, latitude, longitude
          ) VALUES (
            ${employerId},
            ${suburb.name + ", VIC"},
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
            ${suburb.lat},
            ${suburb.lng}
          )
        `;
        jobIdx++;
        jobsCreated++;
      }
    }

    return {
      message: "Seed data created successfully",
      workersCreated,
      employersCreated,
      jobsCreated,
    };
  }
);
