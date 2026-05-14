export interface WorkHistoryEntry {
  employer: string;
  role: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  responsibilities: string;
  clientGroups: string[];
}

export interface QualificationEntry {
  name: string;
  institution: string;
  yearCompleted: string;
  level: string;
}

export interface TrainingEntry {
  name: string;
  provider: string;
  completionDate: string;
  expiryDate: string | null;
}

export interface CheckEntry {
  type: string;
  number: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  status: string;
}

export interface CapabilityStory {
  situation: string;
  action: string;
  outcome: string;
  skill: string;
}

export interface AvailabilityEntry {
  day: string;
  shifts: string[];
}

export interface ScoreBreakdown {
  identity: number;
  experience: number;
  qualifications: number;
  checks: number;
  availability: number;
  capabilities: number;
  referees: number;
  documents: number;
}

export interface ResumeSession {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  stepCompleted: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  travelRadiusKm: number | null;
  targetRole: string | null;
  experienceLevel: string | null;
  experienceYears: number | null;
  supportSettings: string[];
  supportTasks: string[];
  supportStyle: string | null;
  capabilityStories: CapabilityStory[];
  availability: AvailabilityEntry[];
  driversLicence: boolean;
  ownVehicle: boolean;
  languages: string[];
  workHistory: WorkHistoryEntry[];
  qualifications: QualificationEntry[];
  training: TrainingEntry[];
  checks: CheckEntry[];
  ndisScreeningNumber: string | null;
  resumeStrengthScore: number | null;
  scoreBreakdown: ScoreBreakdown | null;
  aiSummary: string | null;
  aiBullets: string[];
  aiBio: string | null;
  aiSearchCard: string | null;
  aiInterviewPrompts: string[];
  convertedWorkerId: string | null;
}

export interface ConsentRecord {
  id: string;
  sessionId: string;
  consentType: string;
  granted: boolean;
  grantedAt: Date | null;
}

export interface RefereeRecord {
  id: string;
  sessionId: string;
  refereeName: string;
  refereeRole: string;
  organisation: string | null;
  relationship: string;
  phone: string | null;
  email: string | null;
  yearsKnown: number | null;
  consentToContact: boolean;
  referenceStatus: string;
  referenceNotes: string | null;
  createdAt: Date;
}

export interface DocumentRecord {
  id: string;
  sessionId: string;
  documentType: string;
  documentTitle: string;
  fileUrl: string;
  expiryDate: string | null;
  visibility: string;
  verified: boolean;
  adminNotes: string | null;
  createdAt: Date;
}
