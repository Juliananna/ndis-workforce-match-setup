import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface PaymentStatus {
  priorityBoost: boolean;
  docsVerifiedPurchased: boolean;
  refsPurchased: boolean;
  purchases: {
    id: string;
    package: string;
    amountAudCents: number;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
  }[];
}

export const getPaymentStatus = api<void, PaymentStatus>(
  { expose: true, auth: true, method: "GET", path: "/payments/status" },
  async () => {
    const auth = getAuthData()!;
    if (auth.role !== "WORKER") {
      throw APIError.permissionDenied("only workers can view payment status");
    }

    const worker = await db.queryRow<{
      worker_id: string;
      priority_boost: boolean;
      docs_verified_purchased: boolean;
      refs_purchased: boolean;
    }>`
      SELECT worker_id, priority_boost, docs_verified_purchased, refs_purchased
      FROM workers WHERE user_id = ${auth.userID}
    `;
    if (!worker) throw APIError.notFound("worker profile not found");

    const purchases = await db.queryAll<{
      id: string;
      package: string;
      amount_aud_cents: number;
      status: string;
      created_at: Date;
      paid_at: Date | null;
    }>`
      SELECT id, package, amount_aud_cents, status, created_at, paid_at
      FROM worker_purchases WHERE worker_id = ${worker.worker_id}
      ORDER BY created_at DESC
    `;

    return {
      priorityBoost: worker.priority_boost,
      docsVerifiedPurchased: worker.docs_verified_purchased,
      refsPurchased: worker.refs_purchased,
      purchases: purchases.map((p) => ({
        id: p.id,
        package: p.package,
        amountAudCents: p.amount_aud_cents,
        status: p.status,
        createdAt: p.created_at,
        paidAt: p.paid_at,
      })),
    };
  }
);
