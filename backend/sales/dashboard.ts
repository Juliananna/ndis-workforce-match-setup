import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { assertSalesOrAdmin } from "./guard";

export interface SalesDashboardStats {
  totalWorkers: number;
  totalEmployers: number;
  activeSubscriptions: number;
  totalRevenueAudCents: number;
  monthlyRevenueAudCents: number;
  pendingDocuments: number;
  activeJobs: number;
  totalOffers: number;
  acceptedOffers: number;
  scheduledDemos: number;
  completedDemos: number;
  activeDiscounts: number;
  newWorkersThisMonth: number;
  newEmployersThisMonth: number;
}

export const getSalesDashboard = api<void, SalesDashboardStats>(
  { expose: true, auth: true, method: "GET", path: "/sales/dashboard" },
  async () => {
    const auth = getAuthData()!;
    await assertSalesOrAdmin(auth.userID);

    const [
      workersRow,
      employersRow,
      subsRow,
      revenueRow,
      monthlyRevenueRow,
      pendingDocsRow,
      activeJobsRow,
      offersRow,
      demosRow,
      discountsRow,
      newWorkersRow,
      newEmployersRow,
    ] = await Promise.all([
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM workers w JOIN users u ON u.user_id = w.user_id WHERE u.is_demo = FALSE`,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM employers e JOIN users u ON u.user_id = e.user_id WHERE u.is_demo = FALSE`,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM employer_subscriptions WHERE status = 'active'`,
      db.queryRow<{ total: number }>`
        SELECT COALESCE(SUM(amount_aud_cents), 0)::int AS total
        FROM employer_subscriptions WHERE status = 'active'
      `,
      db.queryRow<{ total: number }>`
        SELECT COALESCE(SUM(amount_aud_cents), 0)::int AS total
        FROM employer_subscriptions
        WHERE status = 'active' AND created_at >= date_trunc('month', NOW())
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM worker_documents WHERE verification_status = 'Pending'
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM job_requests WHERE status = 'Open'
      `,
      db.queryRow<{ total: number; accepted: number }>`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'Accepted')::int AS accepted
        FROM offers
      `,
      db.queryRow<{ scheduled: number; completed: number }>`
        SELECT
          COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
        FROM sales_demo_sessions
      `,
      db.queryRow<{ count: number }>`SELECT COUNT(*)::int AS count FROM sales_discounts WHERE is_active = true`,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM workers w
        JOIN users u ON u.user_id = w.user_id
        WHERE u.created_at >= date_trunc('month', NOW()) AND u.is_demo = FALSE
      `,
      db.queryRow<{ count: number }>`
        SELECT COUNT(*)::int AS count FROM employers e
        JOIN users u ON u.user_id = e.user_id
        WHERE u.created_at >= date_trunc('month', NOW()) AND u.is_demo = FALSE
      `,
    ]);

    return {
      totalWorkers: workersRow?.count ?? 0,
      totalEmployers: employersRow?.count ?? 0,
      activeSubscriptions: subsRow?.count ?? 0,
      totalRevenueAudCents: revenueRow?.total ?? 0,
      monthlyRevenueAudCents: monthlyRevenueRow?.total ?? 0,
      pendingDocuments: pendingDocsRow?.count ?? 0,
      activeJobs: activeJobsRow?.count ?? 0,
      totalOffers: offersRow?.total ?? 0,
      acceptedOffers: offersRow?.accepted ?? 0,
      scheduledDemos: demosRow?.scheduled ?? 0,
      completedDemos: demosRow?.completed ?? 0,
      activeDiscounts: discountsRow?.count ?? 0,
      newWorkersThisMonth: newWorkersRow?.count ?? 0,
      newEmployersThisMonth: newEmployersRow?.count ?? 0,
    };
  }
);
