import { Subscription } from "encore.dev/pubsub";
import { userVerifiedTopic } from "../notifications/lifecycle_topics";
import { upsertContact } from "./client";

new Subscription(userVerifiedTopic, "ghl-sync-verified-user", {
  handler: async (event) => {
    try {
      const nameParts = event.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? event.name;
      const lastName = nameParts.slice(1).join(" ") || undefined;

      await upsertContact({
        email: event.email,
        firstName,
        lastName,
        name: event.name,
        tags: [event.role.toLowerCase(), "ndis-platform", "verified"],
      });
    } catch {
    }
  },
});
