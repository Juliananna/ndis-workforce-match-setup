import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface ComplianceStatusResponse {
  onboardingStatus: "active" | "compliance_required";
  documentCount: number;
  complianceRequired: boolean;
}

export async function syncOnboardingStatus(workerId: string): Promise<"active" | "compliance_required"> {
  const docRow = await db.queryRow<{ cnt: number }>`
    SELECT COUNT(*)::int AS cnt FROM worker_documents WHERE worker_id = ${workerId}
  `;
  const documentCount = docRow?.cnt ?? 0;
  const newStatus = documentCount > 0 ? "active" : "compliance_required";

  await db.exec`
    UPDATE workers SET onboarding_status = ${newStatus} WHERE worker_id = ${workerId}
  `;

  return newStatus;
}

export const getComplianceStatus = api<void, ComplianceStatusResponse>(
  { expose: true, auth: true, method: "GET", path: "/workers/compliance-status" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const worker = await db.queryRow<{ worker_id: string }>`
      SELECT worker_id FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const newStatus = await syncOnboardingStatus(worker.worker_id);

    const docRow = await db.queryRow<{ cnt: number }>`
      SELECT COUNT(*)::int AS cnt FROM worker_documents WHERE worker_id = ${worker.worker_id}
    `;
    const documentCount = docRow?.cnt ?? 0;

    return {
      onboardingStatus: newStatus,
      documentCount,
      complianceRequired: newStatus === "compliance_required",
    };
  }
);
