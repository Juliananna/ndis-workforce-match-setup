export interface CompletionSection {
  key: string;
  label: string;
  done: boolean;
  weight: number;
}

export interface CompletionResult {
  completionPercent: number;
  sections: CompletionSection[];
}

export interface CompletionInputs {
  fullName: boolean;
  phone: boolean;
  location: boolean;
  bio: boolean;
  experienceYears: boolean;
  photo: boolean;
  skills: boolean;
  availability: boolean;
  documents: boolean;
  resume: boolean;
  references: boolean;
}

const SECTION_DEFS: { key: keyof CompletionInputs; label: string; weight: number }[] = [
  { key: "fullName",     label: "Full name",            weight: 10 },
  { key: "phone",        label: "Phone number",          weight: 5  },
  { key: "location",     label: "Location",              weight: 10 },
  { key: "bio",          label: "Bio",                   weight: 10 },
  { key: "experienceYears", label: "Years of experience", weight: 5 },
  { key: "photo",        label: "Profile photo",         weight: 5  },
  { key: "skills",       label: "Skills",                weight: 10 },
  { key: "availability", label: "Availability",          weight: 10 },
  { key: "documents",    label: "Compliance documents",  weight: 25 },
  { key: "resume",       label: "Resume",                weight: 5  },
  { key: "references",   label: "References",            weight: 5  },
];

export function computeCompletion(inputs: CompletionInputs): CompletionResult {
  const sections: CompletionSection[] = SECTION_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    done: inputs[def.key],
    weight: def.weight,
  }));

  const totalWeight = sections.reduce((s, sec) => s + sec.weight, 0);
  const earnedWeight = sections.filter((s) => s.done).reduce((s, sec) => s + sec.weight, 0);
  const completionPercent = Math.round((earnedWeight / totalWeight) * 100);

  return { completionPercent, sections };
}
