-- Lead Generation Tool - Database Schema
-- Designed for Neon DB (PostgreSQL)

-- ============================================
-- USERS TABLE
-- Simple user table for internal tool
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SEARCH ITERATIONS TABLE
-- Stores each lead generation search run
-- ============================================
CREATE TABLE IF NOT EXISTS search_iterations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    industry VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_leads INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LEADS TABLE
-- Stores individual leads generated from searches
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    search_iteration_id INTEGER NOT NULL REFERENCES search_iterations(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    contact_name VARCHAR(255),
    job_title VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    linkedin_url VARCHAR(500),
    website VARCHAR(500),
    industry VARCHAR(255),
    location VARCHAR(255),
    company_size VARCHAR(100),
    additional_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SAVED CRITERIA TABLE
-- Stores pinned/saved search filters for quick access
-- ============================================
CREATE TABLE IF NOT EXISTS saved_criteria (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    location VARCHAR(255),
    filters JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- For improved query performance
-- ============================================

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Indexes for search iterations
CREATE INDEX IF NOT EXISTS idx_search_iterations_user_id ON search_iterations(user_id);
CREATE INDEX IF NOT EXISTS idx_search_iterations_status ON search_iterations(status);
CREATE INDEX IF NOT EXISTS idx_search_iterations_created_at ON search_iterations(created_at DESC);

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_search_iteration_id ON leads(search_iteration_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);

-- Indexes for saved criteria
CREATE INDEX IF NOT EXISTS idx_saved_criteria_user_id ON saved_criteria(user_id);

-- ============================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_search_iterations_updated_at
    BEFORE UPDATE ON search_iterations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Auto-update total_leads count
-- ============================================
CREATE OR REPLACE FUNCTION update_total_leads_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE search_iterations 
        SET total_leads = total_leads + 1 
        WHERE id = NEW.search_iteration_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE search_iterations 
        SET total_leads = total_leads - 1 
        WHERE id = OLD.search_iteration_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_count
    AFTER INSERT OR DELETE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_total_leads_count();
