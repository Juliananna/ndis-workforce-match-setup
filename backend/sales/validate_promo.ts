import { api, APIError } from "encore.dev/api";
import db from "../db";

export interface ValidatePromoRequest {
  code: string;
}

export interface ValidatePromoResponse {
  valid: boolean;
  description: string | null;
  discountType: "percent" | "fixed_aud_cents";
  discountValue: number;
  appliesTo: "employer_subscription" | "worker_purchase" | "all";
}

export const validatePromo = api<ValidatePromoRequest, ValidatePromoResponse>(
  { expose: true, method: "POST", path: "/sales/discounts/validate" },
  async (req) => {
    if (!req.code.trim()) throw APIError.invalidArgument("code is required");

    const code = req.code.trim().toUpperCase();

    const row = await db.queryRow<{
      description: string | null;
      discount_type: string;
      discount_value: number;
      applies_to: string;
      max_uses: number | null;
      uses_count: number;
      valid_from: Date;
      valid_until: Date | null;
      is_active: boolean;
    }>`
      SELECT description, discount_type, discount_value, applies_to,
             max_uses, uses_count, valid_from, valid_until, is_active
      FROM sales_discounts
      WHERE code = ${code}
    `;

    if (!row || !row.is_active) {
      return { valid: false, description: null, discountType: "percent", discountValue: 0, appliesTo: "all" };
    }

    const now = new Date();
    if (row.valid_from > now) {
      return { valid: false, description: null, discountType: "percent", discountValue: 0, appliesTo: "all" };
    }
    if (row.valid_until && row.valid_until < now) {
      return { valid: false, description: null, discountType: "percent", discountValue: 0, appliesTo: "all" };
    }
    if (row.max_uses !== null && row.uses_count >= row.max_uses) {
      return { valid: false, description: null, discountType: "percent", discountValue: 0, appliesTo: "all" };
    }

    const appliesTo = row.applies_to as ValidatePromoResponse["appliesTo"];
    if (appliesTo === "employer_subscription") {
      return { valid: false, description: null, discountType: "percent", discountValue: 0, appliesTo: "all" };
    }

    return {
      valid: true,
      description: row.description,
      discountType: row.discount_type as ValidatePromoResponse["discountType"],
      discountValue: row.discount_value,
      appliesTo,
    };
  }
);
