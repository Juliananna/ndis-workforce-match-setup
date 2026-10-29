export type LifecycleEntityType = "resume_session" | "worker" | "user";

export const LIFECYCLE_EVENT_VERSION = 1;

export type LifecycleEventType =
  | "email_captured"
  | "resume_completed"
  | "worker_profile_created"
  | "worker_profile_linked"
  | "email_verified"
  | "compliance_submitted"
  | "ready_to_hire_approved"
  | "ready_to_hire_revoked"
  | "ready_to_hire_auto_revoked"
  | "marketing_consent_recorded"
  | "sms_consent_recorded";

export interface BasePayload {
  eventType: LifecycleEventType;
  occurredAt: string;
}

export interface EmailCapturedPayload extends BasePayload {
  eventType: "email_captured";
  sessionId: string;
  email: string;
  consentMarketingEmails: boolean;
  consentProfileCreation: boolean;
  consentProviderVisibility: boolean;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ResumeCompletedPayload extends BasePayload {
  eventType: "resume_completed";
  sessionId: string;
  email: string | null;
  stepCompleted: number;
  resumeStrengthScore: number | null;
  convertedWorkerId: string | null;
  utmSource: string | null;
  fbclid: string | null;
  metaCampaignId: string | null;
}

export interface WorkerProfileCreatedPayload extends BasePayload {
  eventType: "worker_profile_created";
  workerId: string;
  userId: string;
  sessionId: string;
  email: string;
  consentMarketingEmails: boolean;
  marketingConsentTransferred: boolean;
  isNewUser: boolean;
}

export interface WorkerProfileLinkedPayload extends BasePayload {
  eventType: "worker_profile_linked";
  workerId: string;
  userId: string;
  sessionId: string;
  email: string;
}

export interface EmailVerifiedPayload extends BasePayload {
  eventType: "email_verified";
  userId: string;
  email: string;
  role: string;
  verificationPath: "direct_registration" | "resume_builder_auto";
}

export interface ComplianceSubmittedPayload extends BasePayload {
  eventType: "compliance_submitted";
  workerId: string;
  userId: string;
  email: string;
  documentType: string;
  documentId: string;
  isFirstDocument: boolean;
}

export interface ReadyToHireApprovedPayload extends BasePayload {
  eventType: "ready_to_hire_approved";
  workerId: string;
  email: string;
  approvedByEmail: string;
  verifiedDocCount: number;
  verifiedRefCount: number;
  mandatoryDocsPresent: string[];
}

export interface ReadyToHireRevokedPayload extends BasePayload {
  eventType: "ready_to_hire_revoked";
  workerId: string;
  email: string;
  revokedByEmail: string;
  reason: string;
}

export interface ReadyToHireAutoRevokedPayload extends BasePayload {
  eventType: "ready_to_hire_auto_revoked";
  workerId: string;
  email: string;
  reason: string;
  mandatoryDocsExpiredOrFlagged: string[];
}

export type LifecyclePayload =
  | EmailCapturedPayload
  | ResumeCompletedPayload
  | WorkerProfileCreatedPayload
  | WorkerProfileLinkedPayload
  | EmailVerifiedPayload
  | ComplianceSubmittedPayload
  | ReadyToHireApprovedPayload
  | ReadyToHireRevokedPayload
  | ReadyToHireAutoRevokedPayload;
