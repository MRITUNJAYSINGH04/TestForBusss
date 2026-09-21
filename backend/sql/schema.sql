-- ============================================================================
-- GOD'S EYE FOR BUSINESS — DATABASE SCHEMA
-- PostgreSQL with PostGIS Geospatial Extension
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Core identity and professional background for lead-generation personalization
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    agency_or_business_name VARCHAR(255),
    headline VARCHAR(500),
    bio TEXT,
    years_of_experience INTEGER DEFAULT 0,
    hourly_rate_usd NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. USER PROFILES TABLE
-- Detailed service offerings, skill matrices, target niches, and case studies
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    services_offered JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: ["Cloud Infrastructure Modernization", "Custom AI Agents", "PostgreSQL Optimization"]
    skill_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: [{"category": "AI/ML", "skills": ["PyTorch", "LangChain", "RAG"], "proficiency": "Expert"}]
    tools_utilized JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: ["Python", "FastAPI", "Kafka", "PostgreSQL", "Docker", "AWS", "PyTorch"]
    target_industries JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: ["Fintech", "Logistics", "Autonomous Supply Chain", "Defense Tech"]
    target_geographies JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: ["North America", "Western Europe", "Singapore", "Japan"]
    portfolio_case_studies JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Structure: [{"client_type": "Logistics SaaS", "result": "Reduced customs lag by 70%", "services_used": [...]}]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. COMPANY TARGET NODES TABLE
-- Corporate targets marked on the 3D globe with geospatial coordinates and AI gaps
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    hq_city VARCHAR(128) NOT NULL,
    hq_country VARCHAR(128) NOT NULL,
    hq_address TEXT,
    google_maps_url TEXT,
    phone VARCHAR(64),
    contact_email VARCHAR(255),
    operating_hours VARCHAR(128),
    rating NUMERIC(3, 2),
    reviews_count INTEGER DEFAULT 0,
    business_type VARCHAR(128),
    social_profiles JSONB NOT NULL DEFAULT '{}'::jsonb,
    key_people JSONB NOT NULL DEFAULT '[]'::jsonb,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED,
    industry VARCHAR(128) NOT NULL,
    sub_industry VARCHAR(128),
    employee_count_range VARCHAR(64),     -- e.g., '10-50', '50-200', '1000-5000', '10000+'
    estimated_revenue_usd VARCHAR(64),    -- e.g., '$10M-$50M', '$500M+'
    tech_stack JSONB DEFAULT '[]'::jsonb, -- e.g., ["React", "AWS", "Salesforce", "Postgres"]
    scraped_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Scraped web context, leadership, recent news, open job postings
    ai_gap_analysis JSONB DEFAULT '{}'::jsonb,
    -- Contains:
    --   operational_issues: [String, String, String] (Top 3 critical bottlenecks)
    --   bottlenecks: [String]
    --   technology_gaps: [String]
    --   confidence_score: Float (0.0 to 1.0)
    --   analyzed_at: ISO8601 Timestamp
    pitch_strategy JSONB DEFAULT '{}'::jsonb,
    -- Contains:
    --   tailored_angle: String
    --   value_proposition: String
    --   cold_outreach_subject: String
    --   email_body_template: String
    --   call_opening_hook: String
    status VARCHAR(32) DEFAULT 'DISCOVERED', -- DISCOVERED, ANALYZED, TARGETED, ENGAGED, ARCHIVED
    lead_match_score NUMERIC(5, 2) DEFAULT 85.0,
    outreach_status VARCHAR(32) DEFAULT 'NEW', -- NEW, CONTACTED, MEETING_BOOKED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for rapid spatial queries and filtering
CREATE INDEX IF NOT EXISTS idx_company_nodes_location ON company_nodes USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_company_nodes_industry ON company_nodes(industry);
CREATE INDEX IF NOT EXISTS idx_company_nodes_country ON company_nodes(hq_country);
CREATE INDEX IF NOT EXISTS idx_company_nodes_city ON company_nodes(hq_city);
CREATE INDEX IF NOT EXISTS idx_company_nodes_status ON company_nodes(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_nodes_domain ON company_nodes(domain);

-- ----------------------------------------------------------------------------
-- 4. USER TARGET CAMPAIGNS TABLE
-- Mapping between users and companies for CRM/outreach tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_target_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES company_nodes(id) ON DELETE CASCADE,
    outreach_status VARCHAR(64) DEFAULT 'NEW', -- NEW, DRAFTED, SENT, REPLIED, MEETING_BOOKED, REJECTED
    custom_notes TEXT,
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);
