import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import db from "../db";
import { rowToSession } from "./session_helpers";
import type { ResumeSession } from "./types";

const openAIKey = secret("OpenAIKey");

interface GenerateParams {
  id: string;
}

interface GenerateResponse {
  session: ResumeSession;
}

async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIKey()}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    throw APIError.internal("AI generation failed");
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

const NDIS_SYSTEM_PROMPT = `You are an expert Australian disability support worker resume writer with deep knowledge of the NDIS sector.

CRITICAL RULES:
- Use Australian English spelling throughout (programme, behaviour, recognise, organise, fulfil, etc.)
- Use NDIS-aligned language: choice, control, dignity, safety, independence, person-centred support, community inclusion, capacity building
- NEVER invent qualifications, certifications, experience, dates or verification status not provided
- NEVER include participant-identifying information (names, addresses, diagnoses)
- Do not overstate complex clinical care experience unless explicitly described
- Write warmly and professionally, as fits the care sector
- Keep content factual, grounded and honest
- Focus on transferable skills, values and work ethic`;

function buildSessionContext(session: ResumeSession): string {
  const name = [session.firstName, session.lastName].filter(Boolean).join(" ") || "the worker";
  const location = [session.suburb, session.state].filter(Boolean).join(", ");
  const checksStr = session.checks.map((c) => c.type).join(", ");
  const qualsStr = session.qualifications.map((q) => `${q.name} (${q.institution}, ${q.yearCompleted})`).join("; ");
  const trainingStr = session.training.map((t) => t.name).join(", ");
  const workStr = session.workHistory.map((w) => `${w.role} at ${w.employer} (${w.startDate}–${w.current ? "Present" : (w.endDate ?? "")}): ${w.responsibilities}`).join("\n");
  const tasks = session.supportTasks.join(", ");
  const settings = session.supportSettings.join(", ");
  const storiesStr = session.capabilityStories.map((s, i) =>
    `Story ${i + 1}: In ${s.situation}, ${s.action}. Outcome: ${s.outcome}. Skill demonstrated: ${s.skill}`
  ).join("\n");

  return `
Worker name: ${name}
Location: ${location || "Not specified"}
Target role: ${session.targetRole || "NDIS Support Worker"}
Experience level: ${session.experienceLevel || "Not specified"}
Years of experience: ${session.experienceYears ?? "Not specified"}
Support settings: ${settings || "Not specified"}
Support tasks performed: ${tasks || "Not specified"}
Support style described: ${session.supportStyle || "Not specified"}
Compliance checks held: ${checksStr || "None listed"}
Qualifications: ${qualsStr || "None listed"}
Additional training: ${trainingStr || "None listed"}
Work history:
${workStr || "Not provided"}
Capability stories:
${storiesStr || "None provided"}
Driver's licence: ${session.driversLicence ? "Yes" : "No"}
Own vehicle: ${session.ownVehicle ? "Yes" : "No"}
Languages: ${session.languages.join(", ") || "English"}
`.trim();
}

const AI_GENERATION_LIMIT = 3;

// Generates all AI content for a resume session (summary, bullets, bio, search card, interview prompts).
export const generateResumeContent = api<GenerateParams, GenerateResponse>(
  { expose: true, method: "POST", path: "/resume-sessions/:id/generate-resume" },
  async ({ id }) => {
    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${id}`;
    if (!row) throw APIError.notFound("session not found");

    const count: number = row.ai_generation_count ?? 0;
    if (count >= AI_GENERATION_LIMIT) {
      throw APIError.resourceExhausted(
        `AI generation limit reached. Each resume session can generate AI content up to ${AI_GENERATION_LIMIT} times.`
      );
    }

    const session = rowToSession(row);
    const context = buildSessionContext(session);

    const summaryPrompt = `Based on the following worker profile, write a professional 2–3 sentence career summary for an NDIS support worker resume. Focus on their key strengths, values and commitment to person-centred support. Do not invent any details not provided.

${context}

Return only the summary text, no headings or extra formatting.`;

    const bulletsPrompt = `Based on the following NDIS support worker profile, write 4–6 concise resume bullet points that highlight their key skills, tasks and accomplishments. Use action verbs. Use NDIS-aligned language. Do not invent details.

${context}

Return a JSON array of strings, one bullet per string, no markdown formatting. Example: ["Delivered person-centred support...", "Assisted participants..."]`;

    const bioPrompt = `Based on the following NDIS support worker profile, write a warm 2–3 sentence personal bio suitable for a profile card shown to disability service providers. Highlight their approach and values. No invented details.

${context}

Return only the bio text.`;

    const searchCardPrompt = `Write a single concise sentence (max 25 words) summarising this NDIS support worker for a provider search result card. Highlight role, experience level and a standout quality.

${context}

Return only the sentence.`;

    const interviewPromptsPrompt = `Based on this NDIS support worker's background, generate 5 thoughtful interview questions a disability service provider might ask them. Focus on their specific experience and the NDIS context.

${context}

Return a JSON array of 5 strings. Example: ["Tell me about a time...", "How do you approach..."]`;

    const [summary, bulletsRaw, bio, searchCard, interviewRaw] = await Promise.all([
      callOpenAI(summaryPrompt, NDIS_SYSTEM_PROMPT),
      callOpenAI(bulletsPrompt, NDIS_SYSTEM_PROMPT),
      callOpenAI(bioPrompt, NDIS_SYSTEM_PROMPT),
      callOpenAI(searchCardPrompt, NDIS_SYSTEM_PROMPT),
      callOpenAI(interviewPromptsPrompt, NDIS_SYSTEM_PROMPT),
    ]);

    let bullets: string[] = [];
    let interviewPrompts: string[] = [];

    try {
      bullets = JSON.parse(bulletsRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      bullets = bulletsRaw.split("\n").filter((l) => l.trim().startsWith("-") || l.trim().startsWith("•"))
        .map((l) => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean);
    }

    try {
      interviewPrompts = JSON.parse(interviewRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      interviewPrompts = interviewRaw.split("\n").filter((l) => l.trim()).slice(0, 5);
    }

    await db.exec`
      UPDATE resume_sessions SET
        ai_summary = ${summary.trim()},
        ai_bullets = ${JSON.stringify(bullets)}::jsonb,
        ai_bio = ${bio.trim()},
        ai_search_card = ${searchCard.trim()},
        ai_interview_prompts = ${JSON.stringify(interviewPrompts)}::jsonb,
        ai_generation_count = ai_generation_count + 1,
        updated_at = NOW()
      WHERE id = ${id}
    `;

    await db.exec`
      INSERT INTO resume_audit_log (session_id, event_type, event_data)
      VALUES (${id}, 'ai_content_generated', '{}')
    `;

    const updated = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${id}`;
    return { session: rowToSession(updated!) };
  }
);

interface AISummaryRequest {
  sessionId: string;
}
interface AISummaryResponse {
  summary: string;
}

// Generates only the AI resume summary for a session.
export const generateSummary = api<AISummaryRequest, AISummaryResponse>(
  { expose: true, method: "POST", path: "/ai/resume-summary" },
  async ({ sessionId }) => {
    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${sessionId}`;
    if (!row) throw APIError.notFound("session not found");
    const session = rowToSession(row);
    const context = buildSessionContext(session);
    const summary = await callOpenAI(
      `Write a 2–3 sentence professional career summary for this NDIS support worker resume. Use Australian English.\n\n${context}\n\nReturn only the summary text.`,
      NDIS_SYSTEM_PROMPT
    );
    return { summary: summary.trim() };
  }
);

interface AIBulletsRequest {
  sessionId: string;
}
interface AIBulletsResponse {
  bullets: string[];
}

// Generates AI resume bullet points for a session.
export const generateBullets = api<AIBulletsRequest, AIBulletsResponse>(
  { expose: true, method: "POST", path: "/ai/resume-bullets" },
  async ({ sessionId }) => {
    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${sessionId}`;
    if (!row) throw APIError.notFound("session not found");
    const session = rowToSession(row);
    const context = buildSessionContext(session);
    const raw = await callOpenAI(
      `Write 4–6 resume bullet points for this NDIS support worker. Return a JSON array of strings.\n\n${context}`,
      NDIS_SYSTEM_PROMPT
    );
    let bullets: string[] = [];
    try { bullets = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); } catch { bullets = []; }
    return { bullets };
  }
);

interface AIBioRequest {
  sessionId: string;
}
interface AIBioResponse {
  bio: string;
}

// Generates an AI profile bio for a session.
export const generateBio = api<AIBioRequest, AIBioResponse>(
  { expose: true, method: "POST", path: "/ai/profile-bio" },
  async ({ sessionId }) => {
    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${sessionId}`;
    if (!row) throw APIError.notFound("session not found");
    const session = rowToSession(row);
    const context = buildSessionContext(session);
    const bio = await callOpenAI(
      `Write a 2–3 sentence warm profile bio for a KizaziHire provider-facing profile card.\n\n${context}\n\nReturn only the bio.`,
      NDIS_SYSTEM_PROMPT
    );
    return { bio: bio.trim() };
  }
);

interface AISearchCardRequest {
  sessionId: string;
}
interface AISearchCardResponse {
  searchCard: string;
}

// Generates an AI search card summary for a session.
export const generateSearchCard = api<AISearchCardRequest, AISearchCardResponse>(
  { expose: true, method: "POST", path: "/ai/search-card" },
  async ({ sessionId }) => {
    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${sessionId}`;
    if (!row) throw APIError.notFound("session not found");
    const session = rowToSession(row);
    const context = buildSessionContext(session);
    const searchCard = await callOpenAI(
      `Write a single concise sentence (max 25 words) for this NDIS support worker's search card.\n\n${context}\n\nReturn only the sentence.`,
      NDIS_SYSTEM_PROMPT
    );
    return { searchCard: searchCard.trim() };
  }
);

interface AIInterviewPromptsRequest {
  sessionId: string;
}
interface AIInterviewPromptsResponse {
  prompts: string[];
}

// Generates AI interview prompts for a session.
export const generateInterviewPrompts = api<AIInterviewPromptsRequest, AIInterviewPromptsResponse>(
  { expose: true, method: "POST", path: "/ai/interview-prompts" },
  async ({ sessionId }) => {
    const row = await db.queryRow`SELECT * FROM resume_sessions WHERE id = ${sessionId}`;
    if (!row) throw APIError.notFound("session not found");
    const session = rowToSession(row);
    const context = buildSessionContext(session);
    const raw = await callOpenAI(
      `Generate 5 interview questions a provider might ask this NDIS support worker. Return a JSON array of strings.\n\n${context}`,
      NDIS_SYSTEM_PROMPT
    );
    let prompts: string[] = [];
    try { prompts = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); } catch { prompts = []; }
    return { prompts };
  }
);
