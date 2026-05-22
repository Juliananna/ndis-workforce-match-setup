import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface ComplianceStatusResponse {
  onboardingStatus: "active" | "compliance_required";
  documentCount: number;
  complianceRequired: boolean;
}

export const getComplianceStatus = api<void, ComplianceStatusResponse>(
  { expose: true, auth: true, method: "GET", path: "/workers/compliance-status" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can access this endpoint");
    }

    const worker = await db.queryRow<{ worker_id: string; onboarding_status: string }>`
      SELECT worker_id, onboarding_status FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const docRow = await db.queryRow<{ cnt: number }>`
      SELECT COUNT(*)::int AS cnt FROM worker_documents WHERE worker_id = ${worker.worker_id}
    `;
    const documentCount = docRow?.cnt ?? 0;

    const complianceRequired = documentCount === 0 || worker.onboarding_status === "compliance_required";

    if (complianceRequired && worker.onboarding_status !== "compliance_required") {
      await db.exec`
        UPDATE workers SET onboarding_status = 'compliance_required' WHERE worker_id = ${worker.worker_id}
      `;
    }

    if (!complianceRequired && worker.onboarding_status === "compliance_required") {
      await db.exec`
        UPDATE workers SET onboarding_status = 'active' WHERE worker_id = ${worker.worker_id}
      `;
    }

    return {
      onboardingStatus: complianceRequired ? "compliance_required" : "active",
      documentCount,
      complianceRequired,
    };
  }
);
