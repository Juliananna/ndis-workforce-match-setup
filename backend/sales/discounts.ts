import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertSalesOrAdmin } from "./guard";

export type DiscountUpgrade = "docs_verified" | "refs" | "priority_boost";

export interface Discount {
  id: string;
  code: string;
  description: string | null;
  discountType: "percent" | "fixed_aud_cents";
  discountValue: number;
  appliesTo: "employer_subscription" | "worker_purchase" | "all";
  grantsUpgrades: DiscountUpgrade[];
  maxUses: number | null;
  usesCount: number;
  validFrom: Date;
  validUntil: Date | null;
  createdByEmail: string;
  createdAt: Date;
  isActive: boolean;
}

export interface ListDiscountsResponse {
  discounts: Discount[];
}

export const listDiscounts = api<void, ListDiscountsResponse>(
  { expose: true, auth: true, method: "GET", path: "/sales/discounts" },
  async () => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const rows = await db.queryAll<{
      id: string;
      code: string;
      description: string | null;
      discount_type: string;
      discount_value: number;
      applies_to: string;
      grants_upgrades: string[];
      max_uses: number | null;
      uses_count: number;
      valid_from: Date;
      valid_until: Date | null;
      created_by_email: string;
      created_at: Date;
      is_active: boolean;
    }>`
      SELECT
        d.id, d.code, d.description, d.discount_type, d.discount_value,
        d.applies_to, d.grants_upgrades, d.max_uses, d.uses_count, d.valid_from, d.valid_until,
        u.email AS created_by_email, d.created_at, d.is_active
      FROM sales_discounts d
      JOIN users u ON u.user_id = d.created_by
      ORDER BY d.created_at DESC
    `;

    return {
      discounts: rows.map((r) => ({
        id: r.id,
        code: r.code,
        description: r.description,
        discountType: r.discount_type as Discount["discountType"],
        discountValue: r.discount_value,
        appliesTo: r.applies_to as Discount["appliesTo"],
        grantsUpgrades: (r.grants_upgrades ?? []) as DiscountUpgrade[],
        maxUses: r.max_uses,
        usesCount: r.uses_count,
        validFrom: r.valid_from,
        validUntil: r.valid_until,
        createdByEmail: r.created_by_email,
        createdAt: r.created_at,
        isActive: r.is_active,
      })),
    };
  }
);

export interface CreateDiscountRequest {
  code: string;
  description?: string;
  discountType: "percent" | "fixed_aud_cents";
  discountValue: number;
  appliesTo: "employer_subscription" | "worker_purchase" | "all";
  grantsUpgrades?: DiscountUpgrade[];
  maxUses?: number;
  validUntil?: Date;
}

export interface CreateDiscountResponse {
  discount: Discount;
}

export const createDiscount = api<CreateDiscountRequest, CreateDiscountResponse>(
  { expose: true, auth: true, method: "POST", path: "/sales/discounts" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    if (!req.code.trim()) throw APIError.invalidArgument("code is required");
    if (req.discountValue <= 0) throw APIError.invalidArgument("discount value must be positive");
    if (req.discountType === "percent" && req.discountValue > 100) {
      throw APIError.invalidArgument("percent discount cannot exceed 100");
    }

    const code = req.code.trim().toUpperCase();
    const grantsUpgrades = req.grantsUpgrades ?? [];

    const row = await db.queryRow<{
      id: string;
      code: string;
      description: string | null;
      discount_type: string;
      discount_value: number;
      applies_to: string;
      grants_upgrades: string[];
      max_uses: number | null;
      uses_count: number;
      valid_from: Date;
      valid_until: Date | null;
      created_at: Date;
      is_active: boolean;
    }>`
      INSERT INTO sales_discounts
        (code, description, discount_type, discount_value, applies_to, grants_upgrades, max_uses, valid_until, created_by)
      VALUES
        (${code}, ${req.description ?? null}, ${req.discountType}, ${req.discountValue},
         ${req.appliesTo}, ${grantsUpgrades}, ${req.maxUses ?? null}, ${req.validUntil ?? null}, ${auth.userID})
      RETURNING *
    `;

    return {
      discount: {
        id: row!.id,
        code: row!.code,
        description: row!.description,
        discountType: row!.discount_type as Discount["discountType"],
        discountValue: row!.discount_value,
        appliesTo: row!.applies_to as Discount["appliesTo"],
        grantsUpgrades: (row!.grants_upgrades ?? []) as DiscountUpgrade[],
        maxUses: row!.max_uses,
        usesCount: row!.uses_count,
        validFrom: row!.valid_from,
        validUntil: row!.valid_until,
        createdByEmail: auth.email,
        createdAt: row!.created_at,
        isActive: row!.is_active,
      },
    };
  }
);

export interface ToggleDiscountRequest {
  discountId: string;
}

export const toggleDiscount = api<ToggleDiscountRequest, void>(
  { expose: true, auth: true, method: "POST", path: "/sales/discounts/:discountId/toggle" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const row = await db.queryRow<{ id: string }>`
      UPDATE sales_discounts SET is_active = NOT is_active WHERE id = ${req.discountId} RETURNING id
    `;
    if (!row) throw APIError.notFound("discount not found");
  }
);

export interface DeleteDiscountRequest {
  discountId: string;
}

export const deleteDiscount = api<DeleteDiscountRequest, void>(
  { expose: true, auth: true, method: "DELETE", path: "/sales/discounts/:discountId" },
  async (req) => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    await db.exec`DELETE FROM sales_discounts WHERE id = ${req.discountId}`;
  }
);
