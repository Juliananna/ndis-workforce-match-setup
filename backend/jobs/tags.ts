import { api } from "encore.dev/api";

export const SUPPORT_TYPE_TAGS = [
  "Autism support",
  "Intellectual disability",
  "Mobility support",
  "Personal care",
  "Behavioural support",
  "Community participation",
  "Medication administration",
  "Complex care",
  "PEG feeding",
  "Wound care",
  "Mental health support",
] as const;

export type SupportTypeTag = typeof SUPPORT_TYPE_TAGS[number];

export const listSupportTypeTags = api<void, { tags: string[] }>(
  { expose: true, method: "GET", path: "/jobs/support-type-tags" },
  async () => {
    return { tags: [...SUPPORT_TYPE_TAGS] };
  }
);
