CREATE TABLE resume_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'email_captured', 'converted', 'archived')),
  step_completed INTEGER NOT NULL DEFAULT 0,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  travel_radius_km INTEGER,
  target_role TEXT,
  experience_level TEXT CHECK (experience_level IN ('entry', 'intermediate', 'experienced', 'senior')),
  experience_years INTEGER,
  support_settings TEXT[],
  support_tasks TEXT[],
  support_style TEXT,
  capability_stories JSONB,
  availability JSONB,
  drivers_licence BOOLEAN NOT NULL DEFAULT FALSE,
  own_vehicle BOOLEAN NOT NULL DEFAULT FALSE,
  languages TEXT[],
  work_history JSONB,
  qualifications JSONB,
  training JSONB,
  checks JSONB,
  ndis_screening_number TEXT,
  resume_strength_score INTEGER,
  score_breakdown JSONB,
  ai_summary TEXT,
  ai_bullets JSONB,
  ai_bio TEXT,
  ai_search_card TEXT,
  ai_interview_prompts JSONB,
  converted_worker_id UUID REFERENCES workers(worker_id) ON DELETE SET NULL
);

CREATE INDEX resume_sessions_email_idx ON resume_sessions (email) WHERE email IS NOT NULL;
CREATE INDEX resume_sessions_status_idx ON resume_sessions (status, created_at DESC);

CREATE TABLE resume_session_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES resume_sessions(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('resume_generation', 'profile_creation', 'provider_visibility', 'marketing_emails')),
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, consent_type)
);

CREATE TABLE resume_session_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES resume_sessions(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  expiry_date DATE,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'providers', 'public')),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX resume_session_documents_session_idx ON resume_session_documents (session_id);

CREATE TABLE resume_session_referees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES resume_sessions(id) ON DELETE CASCADE,
  referee_name TEXT NOT NULL,
  referee_role TEXT NOT NULL,
  organisation TEXT,
  relationship TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  years_known INTEGER,
  consent_to_contact BOOLEAN NOT NULL DEFAULT FALSE,
  reference_status TEXT NOT NULL DEFAULT 'pending' CHECK (reference_status IN ('pending', 'requested', 'completed', 'declined')),
  reference_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX resume_session_referees_session_idx ON resume_session_referees (session_id);

CREATE TABLE resume_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES resume_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX resume_audit_log_session_idx ON resume_audit_log (session_id, created_at DESC);
