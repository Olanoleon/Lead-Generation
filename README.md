# Lead Generation Tool

An internal tool for generating and managing business leads based on industry and location criteria.

## Features

- **Lead Search**: Input industry and location parameters to generate leads with verified contact information (LinkedIn, email, phone)
- **Dashboard**: View all previous lead generation iterations with lead counts
- **Lead Preview**: Access detailed table view of leads from any search iteration
- **Saved Criteria**: Pin frequently used search filters for quick access
- **Export**: Download leads as CSV files

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Neon DB (PostgreSQL)
- **Icons**: Lucide React

## Database Schema

### Tables Overview

| Table | Description |
|-------|-------------|
| `users` | Internal tool users |
| `search_iterations` | Each lead generation search run |
| `leads` | Individual leads with contact information |
| `saved_criteria` | Pinned/saved search filters |

### Entity Relationship

```
users (1) ──────┬────── (N) search_iterations
                │
                └────── (N) saved_criteria

search_iterations (1) ────── (N) leads
```

### Table Details

#### users
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name | VARCHAR(255) | User's display name |
| email | VARCHAR(255) | Unique email address |
| created_at | TIMESTAMP | Account creation time |

#### search_iterations
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Reference to users table |
| industry | VARCHAR(255) | Industry search parameter |
| location | VARCHAR(255) | Location search parameter |
| status | VARCHAR(50) | pending, processing, completed, failed |
| total_leads | INTEGER | Auto-updated count of leads |
| created_at | TIMESTAMP | Search creation time |
| updated_at | TIMESTAMP | Last update time |

#### leads
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| search_iteration_id | INTEGER | Reference to search_iterations |
| company_name | VARCHAR(255) | Company name |
| contact_name | VARCHAR(255) | Contact person's name |
| job_title | VARCHAR(255) | Contact's job title |
| email | VARCHAR(255) | Contact email |
| phone | VARCHAR(100) | Contact phone number |
| linkedin_url | VARCHAR(500) | LinkedIn profile URL |
| website | VARCHAR(500) | Company website |
| industry | VARCHAR(255) | Lead's industry |
| location | VARCHAR(255) | Lead's location |
| company_size | VARCHAR(100) | Company size range |
| additional_info | JSONB | Flexible additional data |
| created_at | TIMESTAMP | Lead creation time |

#### saved_criteria
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Reference to users table |
| name | VARCHAR(255) | Criteria display name |
| industry | VARCHAR(255) | Industry filter |
| location | VARCHAR(255) | Location filter |
| filters | JSONB | Additional filters (revenue, employees, etc.) |
| created_at | TIMESTAMP | Creation time |

## Setup

### 1. Configure Environment

Copy the environment template and add your Neon DB connection string:

```bash
cp .env.example .env
```

Edit `.env` with your Neon DB credentials.

### 2. Initialize Database

Run the schema file against your Neon database:

```bash
psql $DATABASE_URL -f db/schema.sql
```

Or use the Neon SQL Editor to run the contents of `db/schema.sql`.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── users/        # User endpoints
│   │   │   ├── searches/     # Search iteration endpoints
│   │   │   ├── leads/        # Leads endpoints
│   │   │   ├── criteria/     # Saved criteria endpoints
│   │   │   └── stats/        # Dashboard stats endpoint
│   │   ├── dashboard/        # Dashboard page
│   │   ├── search/[id]/      # Lead results page
│   │   ├── saved/            # Saved criteria page
│   │   ├── settings/         # Settings page
│   │   ├── support/          # Support page
│   │   └── page.tsx          # Home/Search page
│   ├── components/
│   │   └── Sidebar.tsx       # Navigation sidebar
│   └── lib/
│       └── db.ts             # Database connection & types
├── db/
│   └── schema.sql            # Database schema
└── package.json
```
