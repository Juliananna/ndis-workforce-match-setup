import { Subscription } from "encore.dev/pubsub";
import { employerSubscribedTopic } from "../notifications/lifecycle_topics";
import { upsertContact } from "./client";

new Subscription(employerSubscribedTopic, "ghl-sync-employer-subscribed", {
  handler: async (event) => {
    try {
      await upsertContact({
        email: event.email,
        companyName: event.organisationName,
        tags: ["employer", "ndis-platform", "subscribed", `plan:${event.plan}`],
      });
    } catch {
    }
  },
});
