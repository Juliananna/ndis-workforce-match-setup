import { Subscription } from "encore.dev/pubsub";
import db from "../db";
import { emergencyShiftTopic } from "./topic";

new Subscription(emergencyShiftTopic, "persist-emergency-notifications", {
  handler: async (event) => {
    const deadline = event.responseDeadline
      ? ` Respond by ${new Date(event.responseDeadline).toLocaleString()}.`
      : "";

    const title = `Emergency shift available — ${event.location}`;
    const body =
      `${event.shiftDate} at ${event.shiftStartTime} (${event.shiftDurationHours}h) — ` +
      `$${event.weekdayRate}/hr. Job ID: ${event.jobId}.${deadline}`;

    for (const userId of event.workerUserIds) {
      await db.exec`
        INSERT INTO notifications (user_id, type, title, body)
        VALUES (${userId}, 'EMERGENCY_SHIFT_AVAILABLE', ${title}, ${body})
        ON CONFLICT DO NOTHING
      `;
    }
  },
});
