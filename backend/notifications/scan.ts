import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import db from "../db";
import { documentExpiryTopic, type NotificationType } from "./topic";

export const scanDocumentExpiry = api(
  { expose: false, method: "POST", path: "/notifications/internal/scan-expiry" },
  async (): Promise<void> => {
    const now = new Date();

    type DocRow = {
      id: string;
      worker_id: string;
      user_id: string;
      document_type: string;
      expiry_date: Date;
      days_until: number;
    };

    const rows = db.query<DocRow>`
      SELECT
        wd.id,
        wd.worker_id,
        w.user_id,
        wd.document_type,
        wd.expiry_date,
        EXTRACT(DAY FROM wd.expiry_date - NOW())::int AS days_until
      FROM worker_documents wd
      JOIN workers w ON w.worker_id = wd.worker_id
      WHERE
        wd.expiry_date IS NOT NULL
        AND wd.expiry_date >= (NOW() - INTERVAL '1 day')
        AND wd.expiry_date <= (NOW() + INTERVAL '61 days')
    `;

    for await (const row of rows) {
      let notificationType: NotificationType;
      if (row.days_until <= 0) {
        notificationType = "DOCUMENT_EXPIRED";
      } else if (row.days_until <= 30) {
        notificationType = "DOCUMENT_EXPIRING_30";
      } else {
        notificationType = "DOCUMENT_EXPIRING_60";
      }

      await documentExpiryTopic.publish({
        userId: row.user_id,
        documentId: row.id,
        documentType: row.document_type,
        expiryDate: row.expiry_date.toISOString().slice(0, 10),
        notificationType,
      });
    }

    void now;
  }
);

export const _ = new CronJob("scan-document-expiry", {
  title: "Scan for expiring compliance documents",
  schedule: "0 8 * * *",
  endpoint: scanDocumentExpiry,
});
