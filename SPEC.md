# JobPilot - Technical Specification

## Project Overview

**Project Name:** JobPilot
**Project Type:** Full-stack Web Application (SaaS)
**Core Functionality:** Intelligent job application automation platform for job seekers
**Target Users:** Job seekers, career changers, professionals actively looking for employment

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| AI | OpenAI GPT-4o |
| Scraping | Playwright (headless Chromium) |
| File Export | docx npm package |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Deployment | Vercel |

## Design System - Nexus

### Color Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--background` | `#FAF7F2` | `#1C1C1C` | Page background |
| `--foreground` | `#1C1C1C` | `#FAF7F2` | Primary text |
| `--primary` | `#01696f` | `#00A5B3` | Primary accent (teal) |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | Text on primary |
| `--card` | `#FFFFFF` | `#262626` | Card background |
| `--card-foreground` | `#1C1C1C` | `#FAF7F2` | Card text |
| `--muted` | `#F5F0E8` | `#333333` | Muted backgrounds |
| `--muted-foreground` | `#6B6B6B` | `#A0A0A0` | Muted text |
| `--border` | `#E5DFD5` | `#404040` | Borders |
| `--accent` | `#F5EEE6` | `#3D3D3D` | Accent backgrounds |
| `--destructive` | `#DC2626` | `#EF4444` | Destructive actions |

### Kanban Column Colors

| Column | Color |
|--------|-------|
| saved | `#6B6B6B` (Gray) |
| applying | `#2563EB` (Blue) |
| applied | `#4F46E5` (Indigo) |
| interview | `#F59E0B` (Amber) |
| offer | `#16A34A` (Green) |
| rejected | `#DC2626` (Red) |
| ghosted | `#475569` (Slate) |

### Typography

**Font Family:**
- Headings: `Satoshi` (Fontshare) - fallback: `system-ui`
- Body: `Satoshi` - fallback: `system-ui`
- Monospace: `JetBrains Mono` (for code/technical content)

**Type Scale:**
| Token | Size | Line Height | Weight |
|-------|------|------------|--------|
| `--text-xs` | 0.75rem (12px) | 1rem | 400 |
| `--text-sm` | 0.875rem (14px) | 1.25rem | 400 |
| `--text-base` | 1rem (16px) | 1.5rem | 400 |
| `--text-lg` | 1.125rem (18px) | 1.5rem | 500 |
| `--text-xl` | 1.25rem (20px) | 1.5rem | 600 |

### Spacing System

| Token | Value |
|-------|-------|
| `--space-1` | 0.25rem (4px) |
| `--space-2` | 0.5rem (8px) |
| `--space-3` | 0.75rem (12px) |
| `--space-4` | 1rem (16px) |
| `--space-6` | 1.5rem (24px) |
| `--space-8` | 2rem (32px) |
| `--space-12` | 3rem (48px) |

### Component Guidelines

- Buttons: Solid fill, no gradients, 8px border-radius, max 48px height
- Cards: 12px border-radius, 1px border, subtle shadow in light mode
- Inputs: 8px border-radius, 40px height (large), 36px height (small)
- Modals/Dialogs: 16px border-radius, max-width 540px
- No icon-in-colored-circle patterns

## Database Schema

### Tables

```sql
-- Extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  available_from DATE,
  salary_expectation INTEGER,
  work_authorization TEXT,
  languages JSONB DEFAULT '{"en": "fluent"}'::jsonb,
  quick_answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base resumes uploaded by the user
CREATE TABLE base_resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_text TEXT,
  content_html TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scraped or manually added jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description_text TEXT,
  description_html TEXT,
  url TEXT UNIQUE NOT NULL,
  url_hash TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  detected_language TEXT DEFAULT 'en',
  salary_range TEXT,
  skills_required TEXT[],
  remote BOOLEAN,
  job_type TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's job applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',
  kanban_column TEXT DEFAULT 'saved' CHECK (kanban_column IN ('saved', 'applying', 'applied', 'interview', 'offer', 'rejected', 'ghosted')),
  ats_score JSONB,
  resume_html TEXT,
  resume_docx_path TEXT,
  cover_letter_html TEXT,
  cover_letter_docx_path TEXT,
  template_used TEXT,
  auto_apply_result JSONB,
  notes TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline events per application
CREATE TABLE application_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only CRUD their own data
- `auth.uid()` used to enforce ownership

```sql
-- Example RLS policy pattern
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);
```

## API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/callback` | GET | Handle OAuth callback |
| `/api/auth/logout` | POST | Logout user |

### Jobs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs/scrape` | POST | Trigger job scraping |
| `/api/jobs/search` | GET | Search jobs in DB |
| `/api/jobs/[id]` | GET | Get single job |

### Applications
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/applications/generate` | POST | Generate resume + cover letter |
| `/api/applications/ats-score` | POST | Calculate ATS score |
| `/api/applications/auto-apply` | POST | Auto-apply to job |
| `/api/applications` | GET/POST | CRUD applications |
| `/api/applications/[id]` | GET/PATCH/DELETE | Single application |

### Profile
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profile` | GET/PATCH | User profile |

## Page Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Landing + Login |
| `/login` | Login | Login/Register page |
| `/dashboard` | Dashboard | KPI overview |
| `/search` | JobSearch | Search + results |
| `/jobs/[id]` | JobDetail | Job details |
| `/apply/[id]` | ApplicationEditor | Edit + preview docs |
| `/board` | KanbanBoard | Application tracker |
| `/profile` | Profile | User profile + resume |
| `/settings` | Settings | App settings |

## Core Features Implementation

### 1. Job Scraping Pipeline

**Sources:** LinkedIn, Indeed, Glassdoor, Welcome to the Jungle

**Implementation:**
- Use Playwright with randomized user agents
- Random delays 800-2500ms between requests
- Use `playwright-extra` + `stealth` plugin
- Detect duplicate jobs via URL hash
- Extract: title, company, location, description, salary, skills, language
- Save to `jobs` table
- Stream results via Supabase Realtime

### 2. AI Generation Pipeline

**Steps:**
1. **Analyze Job** - Extract requirements, skills, tone
2. **Adapt Resume** - Reorder bullets, match keywords
3. **Generate Cover Letter** - Same language as job
4. **ATS Scoring** - Score against job description

**Language Detection:** Use `franc` or OpenAI to detect job language
**Output:** Resume HTML + DOCX, Cover Letter HTML + DOCX
**Templates:** minimal, compact, modern

### 3. ATS Scoring

**Score Object:**
```typescript
interface ATSScore {
  overall: number;           // 0-100
  keyword_match: number;     // % keywords found
  missing_keywords: string[]; // top 10 missing
  format_score: number;    // penalize columns/tables
  length_score: number;    // ideal 400-700 words
  language_match: boolean;  // doc lang == job lang
  suggestions: string[];   // 3-5 improvements
  ats_safe: boolean;       // score >= 70
}
```

### 4. Auto-Apply Engine

**Supported Platforms:**
- LinkedIn Easy Apply
- Greenhouse
- Lever
- Workday
- Breezy HR
- Company direct forms

**Flow:**
1. Detect application method
2. Fill form fields from profile
3. Upload generated PDF
4. Handle multi-step forms (up to 5 pages)
5. Log result: success/manual_required/failed

### 5. Kanban Board

**Columns:** saved, applying, applied, interview, offer, rejected, ghosted

**Card Display:**
- Company logo (Clearbit or letter avatar)
- Job title, application date
- ATS score badge
- Quick actions (edit, view, delete)

**Features:**
- Drag and drop between columns
- Filter by date, company, job type, ATS score
- Notes with auto-save (debounced 500ms)
- Slide-over detail panel

## Resume Templates

### minimal
```html
<header>
  <h1>{name}</h1>
  <p>{email} | {phone} | {location}</p>
</header>
<section>
  <h2>Experience</h2>
  <!-- Single column, serif heading -->
</section>
```

### compact
```html
<aside>
  <h3>Skills</h3>
  <!-- Two-column sidebar -->
</aside>
<main>
  <!-- Dense experience -->
</main>
```

### modern
```html>
<header>
  <!-- Left accent border -->
</header>
<section>
  <!-- Section headers with left border -->
</section>
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
PLAYWRIGHT_HEADLESS=true
CLEARBIT_API_KEY=
```

## File Structure

```
jobpilot/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── dashboard/
│   │       └── page.tsx
│   ├── search/
│   │       └── page.tsx
│   ├── jobs/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── apply/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── board/
│   │       └── page.tsx
│   ├── profile/
│   │       └── page.tsx
│   ├── settings/
│   │       └── page.tsx
│   └── api/
│       ├── jobs/
│       │   ├── scrape/
│       │   │   └── route.ts
│       │   └── search/
│       │       └── route.ts
│       ├── applications/
│       │   ├── generate/
│       │   │   └── route.ts
│       │   ├── ats-score/
│       │   │   └── route.ts
│       │   └── auto-apply/
│       │       └── route.ts
│       └── auth/
│           └── callback/
│               └── route.ts
├── components/
│   ├── kanban/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   └── ApplicationCard.tsx
│   ├── editor/
│   │   ├── DocumentPreview.tsx
│   │   ├── ATSScoreGauge.tsx
│   │   └── KeywordChips.tsx
│   ├── search/
│   │   ├── JobSearchForm.tsx
│   │   ├── JobCard.tsx
│   │   └── JobFilters.tsx
│   └── ui/
│       └── (shadcn components)
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── openai/
│   │   ├── generate.ts
│   │   └── ats.ts
│   ├── scraper/
│   │   ├── playwright.ts
│   │   ├── sources/
│   │   │   ├── linkedin.ts
│   │   │   └── indeed.ts
│   └── docx/
│       └── export.ts
├── types/
│   └── index.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── tailwind.config.ts
├── globals.css
└── package.json
```

## Acceptance Criteria

- [ ] User can search for jobs and see scraped results in real-time
- [ ] Clicking "Generate" on a job produces language-matched resume + cover letter
- [ ] ATS score is displayed with keyword gap analysis and suggestions
- [ ] User can edit generated documents before applying
- [ ] Drag-and-drop Kanban board tracks all applications with correct columns
- [ ] Auto-apply works for LinkedIn Easy Apply and Greenhouse-based forms
- [ ] All documents are downloadable as .docx
- [ ] Light and dark mode work correctly across all pages
- [ ] Supabase RLS ensures users only see their own data
- [ ] The app is fully responsive down to 375px