import { CronJob } from "encore.dev/cron";
import { cronBulkSyncToGHL } from "./bulk_sync";

const _ = new CronJob("ghl-bulk-sync", {
  title: "GHL Bulk Sync",
  schedule: "0 6,18 * * *",
  endpoint: cronBulkSyncToGHL,
});
