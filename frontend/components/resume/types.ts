export interface WorkHistoryEntry {
  employer: string;
  role: string;
  startDate: string;
  endDate: string;
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
  expiryDate: string;
}

export interface CheckEntry {
  type: string;
  number: string;
  issueDate: string;
  expiryDate: string;
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

export interface SessionData {
  id: string;
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
  scoreBreakdown: any | null;
  aiSummary: string | null;
  aiBullets: string[];
  aiBio: string | null;
  aiSearchCard: string | null;
  aiInterviewPrompts: string[];
  aiGenerationCount: number;
  convertedWorkerId: string | null;
  status: string;
}

export const AUSTRALIAN_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export const SUPPORT_SETTINGS = [
  "In-home support",
  "Community participation",
  "SIL (Supported Independent Living)",
  "Day programmes",
  "School holiday programmes",
  "Respite care",
  "Hospital / clinical settings",
];

export const SUPPORT_TASKS = [
  "Personal care (showering, grooming, dressing)",
  "Meal preparation",
  "Medication administration",
  "Manual handling and transfers",
  "Community access and transport",
  "Social skills development",
  "Behavioural support",
  "Communication support (AAC, Auslan)",
  "Household tasks",
  "PEG feeding",
  "Wound care",
  "Complex care coordination",
  "Recreational activities",
  "Education support",
];

export const CLIENT_GROUPS = [
  "Autism Spectrum Disorder",
  "Intellectual disability",
  "Physical disability",
  "Acquired brain injury",
  "Mental health conditions",
  "Sensory impairment (vision/hearing)",
  "Multiple disabilities",
  "Children and young people",
  "Adults",
  "Older adults",
];

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const SHIFT_TYPES = ["Morning (6am–2pm)", "Afternoon (2pm–10pm)", "Evening (5pm–10pm)", "Night / Overnight", "Flexible"];

export const CHECKS_LIST = [
  "NDIS Worker Screening",
  "Police Check",
  "Working with Children Check",
  "First Aid Certificate",
  "CPR Certificate",
  "Manual Handling Certificate",
  "Medication Administration Certificate",
];

export const COMMON_QUALIFICATIONS = [
  "Certificate III in Individual Support",
  "Certificate IV in Disability",
  "Certificate IV in Mental Health",
  "Diploma of Community Services",
  "Bachelor of Social Work",
  "Diploma of Nursing (Enrolled)",
  "Bachelor of Nursing",
  "Bachelor of Occupational Therapy",
  "Bachelor of Psychology",
  "Diploma of Early Childhood Education",
];

export const ROLE_OPTIONS = [
  "Support Worker",
  "Disability Support Worker",
  "Community Support Worker",
  "Personal Care Worker",
  "Mental Health Support Worker",
  "Behaviour Support Worker",
  "Complex Care Worker",
  "Overnight / Sleepover Support Worker",
];

export const STEPS = [
  { label: "About You", icon: "👤" },
  { label: "Target Role", icon: "🎯" },
  { label: "Experience", icon: "💼" },
  { label: "Support Skills", icon: "🤝" },
  { label: "Checks", icon: "🛡️" },
  { label: "Qualifications", icon: "🎓" },
  { label: "Availability", icon: "📅" },
  { label: "Your Approach", icon: "💬" },
  { label: "Review", icon: "✅" },
];
