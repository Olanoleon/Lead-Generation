-- Add search_type and company_name columns to search_iterations
ALTER TABLE search_iterations 
ADD COLUMN IF NOT EXISTS search_type VARCHAR(50) DEFAULT 'industry' CHECK (search_type IN ('industry', 'company'));

ALTER TABLE search_iterations 
ALTER COLUMN industry DROP NOT NULL;

ALTER TABLE search_iterations 
ALTER COLUMN location DROP NOT NULL;

ALTER TABLE search_iterations 
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
