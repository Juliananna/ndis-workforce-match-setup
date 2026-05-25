export interface RtoPartner {
  rtoPartnerId: string;
  name: string;
  slug: string;
  contactName: string;
  contactEmail: string;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  referralCode: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export interface RtoReferral {
  referralId: string;
  rtoPartnerId: string;
  userId: string | null;
  workerId: string | null;
  referralCode: string;
  sourceUrl: string | null;
  createdAt: Date;
}

export interface StudentProfile {
  id: string;
  workerId: string;
  rtoPartnerId: string | null;
  isCurrentStudent: boolean;
  courseName: string | null;
  qualificationLevel: string | null;
  placementRequired: boolean;
  placementHoursRequired: number | null;
  placementHoursCompleted: number;
  placementStartDate: string | null;
  preferredPlacementSuburbs: string[];
  wantsPaidWork: boolean;
  rtoProgressConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}
