import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { workerDocumentsBucket } from "./storage";

function buildZip(files: { name: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  const centralDir: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, "utf8");
    const localHeader = Buffer.alloc(30 + nameBytes.length);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc32(file.data), 14);
    localHeader.writeUInt32LE(file.data.length, 18);
    localHeader.writeUInt32LE(file.data.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBytes.copy(localHeader, 30);

    parts.push(localHeader);
    parts.push(file.data);

    const cdEntry = Buffer.alloc(46 + nameBytes.length);
    cdEntry.writeUInt32LE(0x02014b50, 0);
    cdEntry.writeUInt16LE(20, 4);
    cdEntry.writeUInt16LE(20, 6);
    cdEntry.writeUInt16LE(0, 8);
    cdEntry.writeUInt16LE(0, 10);
    cdEntry.writeUInt16LE(0, 12);
    cdEntry.writeUInt16LE(0, 14);
    cdEntry.writeUInt32LE(crc32(file.data), 16);
    cdEntry.writeUInt32LE(file.data.length, 20);
    cdEntry.writeUInt32LE(file.data.length, 24);
    cdEntry.writeUInt16LE(nameBytes.length, 28);
    cdEntry.writeUInt16LE(0, 30);
    cdEntry.writeUInt16LE(0, 32);
    cdEntry.writeUInt16LE(0, 34);
    cdEntry.writeUInt16LE(0, 36);
    cdEntry.writeUInt32LE(0, 38);
    cdEntry.writeUInt32LE(offset, 42);
    nameBytes.copy(cdEntry, 46);
    centralDir.push(cdEntry);

    offset += localHeader.length + file.data.length;
  }

  const cdBuffer = Buffer.concat(centralDir);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, cdBuffer, eocd]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pad(label: string, value: string, width = 28): string {
  return `${(label + ":").padEnd(width)} ${value}`;
}

function buildProfileSummaryTxt(w: {
  fullName: string;
  email: string;
  phone: string;
  location: string | null;
  bio: string | null;
  experienceYears: number | null;
  qualifications: string | null;
  previousEmployers: string | null;
  driversLicense: boolean;
  vehicleAccess: boolean;
  travelRadiusKm: number | null;
  ndisScreeningNumber: string | null;
  skills: string[];
  availability: { availableDays: string[]; preferredShiftTypes: string[] } | null;
}, generatedAt: Date): Buffer {
  const lines: string[] = [
    "=".repeat(60),
    "  WORKER PROFILE SUMMARY",
    "=".repeat(60),
    "",
    "PERSONAL DETAILS",
    "-".repeat(40),
    pad("Full Name",           w.fullName || "Not provided"),
    pad("Email",               w.email || "Not provided"),
    pad("Phone",               w.phone || "Not provided"),
    pad("Location",            w.location || "Not provided"),
    pad("Experience",          w.experienceYears != null ? `${w.experienceYears} years` : "Not provided"),
    pad("Driver's Licence",    w.driversLicense ? "Yes" : "No"),
    pad("Own Vehicle",         w.vehicleAccess ? "Yes" : "No"),
    pad("Travel Radius",       w.travelRadiusKm != null ? `${w.travelRadiusKm} km` : "Not specified"),
    "",
    "NDIS SCREENING",
    "-".repeat(40),
    pad("Screening Number",    w.ndisScreeningNumber || "Not provided"),
    "",
    "BIO",
    "-".repeat(40),
    w.bio || "Not provided",
    "",
    "QUALIFICATIONS",
    "-".repeat(40),
    w.qualifications || "Not provided",
    "",
    "PREVIOUS EMPLOYERS",
    "-".repeat(40),
    w.previousEmployers || "Not provided",
    "",
    "SKILLS",
    "-".repeat(40),
    w.skills.length > 0 ? w.skills.join(", ") : "Not specified",
    "",
    "AVAILABILITY",
    "-".repeat(40),
    pad("Available Days",      w.availability?.availableDays.join(", ") || "Not specified"),
    pad("Preferred Shifts",    w.availability?.preferredShiftTypes.join(", ") || "Not specified"),
    "",
    "=".repeat(60),
    `Generated: ${generatedAt.toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} AEST`,
    "=".repeat(60),
  ];
  return Buffer.from(lines.join("\n"), "utf8");
}

function buildReferenceChecksTxt(refs: {
  refereeName: string;
  refereeTitle: string;
  refereeOrganisation: string;
  refereeEmail: string | null;
  refereePhone: string | null;
  relationship: string;
  status: string;
  notes: string | null;
  check: {
    conductedBy: string;
    conductedAt: Date;
    employmentDates: string;
    reasonForLeaving: string;
    scores: Record<string, number>;
    strengths: string;
    developmentAreas: string;
    additionalComments: string;
    totalScore: number;
    riskLevel: string;
    recommendation: string;
  } | null;
}[], workerName: string, generatedAt: Date): Buffer {
  const lines: string[] = [
    "=".repeat(60),
    "  REFERENCE CHECKS REPORT",
    `  Worker: ${workerName}`,
    "=".repeat(60),
    "",
  ];

  if (refs.length === 0) {
    lines.push("No references have been provided.");
  } else {
    refs.forEach((r, i) => {
      lines.push(`REFERENCE ${i + 1} OF ${refs.length}`);
      lines.push("-".repeat(40));
      lines.push(pad("Referee Name",       r.refereeName));
      lines.push(pad("Title",              r.refereeTitle));
      lines.push(pad("Organisation",       r.refereeOrganisation));
      lines.push(pad("Email",              r.refereeEmail || "Not provided"));
      lines.push(pad("Phone",              r.refereePhone || "Not provided"));
      lines.push(pad("Relationship",       r.relationship));
      lines.push(pad("Status",             r.status));
      if (r.notes) {
        lines.push(pad("Notes",            r.notes));
      }
      lines.push("");

      if (r.check) {
        const c = r.check;
        lines.push("  REFERENCE CHECK CONDUCTED");
        lines.push(`  Conducted by: ${c.conductedBy}`);
        lines.push(`  Date:         ${new Date(c.conductedAt).toLocaleDateString("en-AU")}`);
        lines.push(`  Employment:   ${c.employmentDates}`);
        lines.push(`  Reason left:  ${c.reasonForLeaving}`);
        lines.push("");
        lines.push("  PERFORMANCE SCORES (1-5)");
        const scoreLabels: Record<string, string> = {
          workPerformance: "Work Performance", reliability: "Reliability",
          punctuality: "Punctuality", professionalism: "Professionalism",
          qualityOfCare: "Quality of Care", documentation: "Documentation",
          teamwork: "Teamwork", initiative: "Initiative",
          concerns: "Concerns (risk)", rehire: "Would Rehire",
        };
        for (const [key, label] of Object.entries(scoreLabels)) {
          lines.push(`    ${(label + ":").padEnd(22)} ${c.scores[key] ?? "-"} / 5`);
        }
        lines.push("");
        lines.push(`  TOTAL SCORE:    ${c.totalScore}`);
        lines.push(`  RISK LEVEL:     ${c.riskLevel}`);
        lines.push(`  RECOMMENDATION: ${c.recommendation}`);
        lines.push("");
        lines.push("  Strengths:");
        lines.push(`    ${c.strengths}`);
        lines.push("  Development Areas:");
        lines.push(`    ${c.developmentAreas}`);
        lines.push("  Additional Comments:");
        lines.push(`    ${c.additionalComments}`);
      } else {
        lines.push("  No formal reference check conducted yet.");
      }

      lines.push("");
    });
  }

  lines.push("=".repeat(60));
  lines.push(`Generated: ${generatedAt.toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} AEST`);
  lines.push("=".repeat(60));

  return Buffer.from(lines.join("\n"), "utf8");
}

async function assertEmployerWorkerAgreement(
  employerId: string,
  workerId: string
): Promise<void> {
  const agreement = await db.queryRow<{ offer_id: string }>`
    SELECT offer_id FROM offers
    WHERE employer_id = ${employerId}
      AND worker_id = ${workerId}
      AND status = 'Accepted'
    LIMIT 1
  `;
  if (!agreement) {
    throw APIError.permissionDenied(
      "document access requires an accepted offer between this employer and worker"
    );
  }
}

// Returns a ZIP archive of all compliance documents for a worker, accessible only by an employer with an accepted offer.
export const downloadWorkerDocumentsZip = api.raw(
  {
    expose: true,
    auth: true,
    method: "GET",
    path: "/employers/workers/:workerId/documents/download-zip",
  },
  async (req, resp) => {
    const auth = getAuthData();
    if (!auth || auth.role !== "EMPLOYER") {
      resp.writeHead(403, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ code: "permission_denied", message: "only employers can access this endpoint" }));
      return;
    }

    const urlParts = req.url?.split("/") ?? [];
    const workersIdx = urlParts.indexOf("workers");
    const workerId = workersIdx !== -1 ? urlParts[workersIdx + 1]?.split("?")[0] : null;

    if (!workerId) {
      resp.writeHead(400, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ code: "invalid_argument", message: "missing workerId" }));
      return;
    }

    const employer = await db.queryRow<{ employer_id: string }>`
      SELECT employer_id FROM employers WHERE user_id = ${auth.userID}
    `;
    if (!employer) {
      resp.writeHead(404, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ code: "not_found", message: "employer profile not found" }));
      return;
    }

    const worker = await db.queryRow<{
      worker_id: string; name: string; full_name: string | null;
      email: string; phone: string; location: string | null; bio: string | null;
      experience_years: number | null; qualifications: string | null;
      previous_employers: string | null; drivers_license: boolean;
      vehicle_access: boolean; travel_radius_km: number | null;
      ndis_screening_number: string | null;
    }>`
      SELECT w.worker_id, w.name, w.full_name, u.email, w.phone, w.location, w.bio,
             w.experience_years, w.qualifications, w.previous_employers,
             w.drivers_license, w.vehicle_access, w.travel_radius_km, w.ndis_screening_number
      FROM workers w JOIN users u ON u.user_id = w.user_id
      WHERE w.worker_id = ${workerId}
    `;
    if (!worker) {
      resp.writeHead(404, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ code: "not_found", message: "worker not found" }));
      return;
    }

    await assertEmployerWorkerAgreement(employer.employer_id, workerId);

    const [docRows, skillRows, availRow, refRows] = await Promise.all([
      db.queryAll<{ id: string; document_type: string; file_key: string; is_demo_url: boolean }>`
        SELECT id, document_type, file_key, is_demo_url
        FROM worker_documents WHERE worker_id = ${workerId} ORDER BY upload_date DESC
      `,
      db.queryAll<{ skill: string }>`
        SELECT skill FROM worker_skills WHERE worker_id = ${worker.worker_id} ORDER BY skill
      `,
      db.queryRow<{ available_days: string[]; preferred_shift_types: string[] }>`
        SELECT available_days, preferred_shift_types FROM worker_availability WHERE worker_id = ${worker.worker_id}
      `,
      db.queryAll<{
        id: string; referee_name: string; referee_title: string; referee_organisation: string;
        referee_email: string | null; referee_phone: string | null;
        relationship: string; status: string; notes: string | null;
      }>`
        SELECT id, referee_name, referee_title, referee_organisation, referee_email,
               referee_phone, relationship, status, notes
        FROM worker_references WHERE worker_id = ${worker.worker_id} ORDER BY created_at ASC
      `,
    ]);

    const checkRows = await Promise.all(refRows.map((r) =>
      db.queryRow<{
        conducted_by: string; conducted_at: Date; employment_dates: string;
        reason_for_leaving: string; strengths: string; development_areas: string;
        additional_comments: string; total_score: number; risk_level: string;
        recommendation: string;
        score_work_performance: number; score_reliability: number; score_punctuality: number;
        score_professionalism: number; score_quality_of_care: number; score_documentation: number;
        score_teamwork: number; score_initiative: number; score_concerns: number; score_rehire: number;
      }>`
        SELECT conducted_by, conducted_at, employment_dates, reason_for_leaving,
               strengths, development_areas, additional_comments, total_score, risk_level, recommendation,
               score_work_performance, score_reliability, score_punctuality, score_professionalism,
               score_quality_of_care, score_documentation, score_teamwork, score_initiative,
               score_concerns, score_rehire
        FROM reference_checks WHERE reference_id = ${r.id} ORDER BY created_at DESC LIMIT 1
      `
    ));

    const workerDisplayName = worker.full_name || worker.name;
    const workerName = workerDisplayName.replace(/[^a-z0-9]/gi, "_");
    const generatedAt = new Date();

    const files: { name: string; data: Buffer }[] = [];

    const profileBuf = buildProfileSummaryTxt({
      fullName:           workerDisplayName,
      email:              worker.email,
      phone:              worker.phone,
      location:           worker.location,
      bio:                worker.bio,
      experienceYears:    worker.experience_years,
      qualifications:     worker.qualifications,
      previousEmployers:  worker.previous_employers,
      driversLicense:     worker.drivers_license,
      vehicleAccess:      worker.vehicle_access,
      travelRadiusKm:     worker.travel_radius_km,
      ndisScreeningNumber: worker.ndis_screening_number,
      skills:             skillRows.map((s) => s.skill),
      availability:       availRow ? {
        availableDays:        availRow.available_days,
        preferredShiftTypes:  availRow.preferred_shift_types,
      } : null,
    }, generatedAt);
    files.push({ name: `${workerName}_profile_summary.txt`, data: profileBuf });

    const refsWithChecks = refRows.map((r, i) => ({
      refereeName:         r.referee_name,
      refereeTitle:        r.referee_title,
      refereeOrganisation: r.referee_organisation,
      refereeEmail:        r.referee_email,
      refereePhone:        r.referee_phone,
      relationship:        r.relationship,
      status:              r.status,
      notes:               r.notes,
      check: checkRows[i] ? {
        conductedBy:         checkRows[i]!.conducted_by,
        conductedAt:         checkRows[i]!.conducted_at,
        employmentDates:     checkRows[i]!.employment_dates,
        reasonForLeaving:    checkRows[i]!.reason_for_leaving,
        scores: {
          workPerformance: checkRows[i]!.score_work_performance,
          reliability:     checkRows[i]!.score_reliability,
          punctuality:     checkRows[i]!.score_punctuality,
          professionalism: checkRows[i]!.score_professionalism,
          qualityOfCare:   checkRows[i]!.score_quality_of_care,
          documentation:   checkRows[i]!.score_documentation,
          teamwork:        checkRows[i]!.score_teamwork,
          initiative:      checkRows[i]!.score_initiative,
          concerns:        checkRows[i]!.score_concerns,
          rehire:          checkRows[i]!.score_rehire,
        },
        strengths:           checkRows[i]!.strengths,
        developmentAreas:    checkRows[i]!.development_areas,
        additionalComments:  checkRows[i]!.additional_comments,
        totalScore:          checkRows[i]!.total_score,
        riskLevel:           checkRows[i]!.risk_level,
        recommendation:      checkRows[i]!.recommendation,
      } : null,
    }));

    const refsBuf = buildReferenceChecksTxt(refsWithChecks, workerDisplayName, generatedAt);
    files.push({ name: `${workerName}_reference_checks.txt`, data: refsBuf });

    const usedNames = new Map<string, number>();

    for (const row of docRows) {
      try {
        const buffer = row.is_demo_url
          ? null
          : await workerDocumentsBucket.download(row.file_key).catch(() => null);
        if (!buffer) continue;

        const ext = row.file_key.split(".").pop() ?? "bin";
        const docName = row.document_type.replace(/[^a-z0-9]/gi, "_");
        const baseName = `${workerName}_${docName}`;
        const count = usedNames.get(baseName) ?? 0;
        usedNames.set(baseName, count + 1);
        const fileName = count === 0 ? `${baseName}.${ext}` : `${baseName}_${count}.${ext}`;
        files.push({ name: fileName, data: buffer });

        await db.exec`
          INSERT INTO document_access_log (employer_id, worker_id, document_id, access_type)
          VALUES (${employer.employer_id}, ${workerId}, ${row.id}, 'DOWNLOAD')
        `;
      } catch (e) {
        console.error(`Failed to download document ${row.id}:`, e);
      }
    }

    const zipBuffer = buildZip(files);

    resp.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${workerName}_documents.zip"`,
      "Content-Length": zipBuffer.length,
    });
    resp.end(zipBuffer);
  }
);
