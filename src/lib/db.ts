import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default sql;

// Types for our database models
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface SearchIteration {
  id: number;
  user_id: number;
  industry: string;
  location: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_leads: number;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: number;
  search_iteration_id: number;
  company_name: string | null;
  contact_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  company_size: string | null;
  additional_info: Record<string, unknown>;
  created_at: string;
}

export interface SavedCriteria {
  id: number;
  user_id: number;
  name: string;
  industry: string | null;
  location: string | null;
  filters: Record<string, unknown>;
  created_at: string;
}
