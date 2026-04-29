# AGENTS.md — JobPilot Multi-Agent Configuration

## Overview

AllHands should split this project across **6 specialized sub-agents** working in parallel
after the shared foundation (database + auth) is complete. Each agent owns a vertical
slice of the codebase. Agents communicate only through Supabase — never direct imports
across agent boundaries.

---

## Agent Roster

### AGENT 0 — Foundation Agent (runs first, blocks all others)

**Responsibility:** Scaffold the entire project, set up Supabase, and establish shared
infrastructure that all other agents depend on.

**Tasks:**
1. Initialize Next.js 14 project with TypeScript, Tailwind CSS, shadcn/ui
2. Configure `tailwind.config.ts` with Nexus design tokens:
   ```ts
   colors: {
     primary: { DEFAULT: "#01696f", light: "#02888f", dark: "#014d51" },
     surface: { DEFAULT: "#faf9f7", muted: "#f0ede8", border: "#e2ddd6" },
     ink: { DEFAULT: "#1a1917", muted: "#6b6660", subtle: "#9e9890" },
     dark: { surface: "#1c1b19", muted: "#252420", border: "#302e2b" }
   }
   ```
3. Set up `globals.css` with CSS custom properties, Satoshi font via Fontshare CDN
4. Create all Supabase migration files under `supabase/migrations/`:
   - `001_schema.sql` — all tables (user_profiles, base_resumes, jobs, applications,
     application_events, cv_templates, generated_cvs)
   - `002_rls.sql` — Row Level Security policies for every table
   - `003_functions.sql` — pg functions: `match_keywords`, `update_ats_score`
5. Set up Supabase Auth with Google OAuth + email/password
6. Create shared TypeScript types in `types/index.ts` covering all DB entities
7. Create `lib/supabase/client.ts` and `lib/supabase/server.ts`
8. Build the app shell: sidebar layout, top bar, route structure, dark mode toggle
9. Create placeholder pages for all 8 routes so other agents can fill them

**Done when:** `npm run dev` runs without errors, all routes exist, Supabase connection works.

---

### AGENT 1 — Scraper Agent

**Responsibility:** Build the job search, scraping pipeline, and job browsing UI.

**Owns:**
- `app/search/page.tsx`
- `app/jobs/[id]/page.tsx`
- `app/api/jobs/scrape/route.ts`
- `app/api/jobs/search/route.ts`
- `lib/scraper/`
- `components/search/`

**Tasks:**

1. **Playwright scraper engine** (`lib/scraper/playwright.ts`):
   - Use `playwright-extra` + `puppeteer-extra-plugin-stealth`
   - Randomized user-agent pool (10 agents), random delay 800–2500ms
   - Retry logic: 3 attempts with exponential backoff
   - Screenshot on failure for debugging

2. **Source scrapers** (each in `lib/scraper/sources/`):

   **French Sources:**
   - `france-travail.ts` — Official France Travail API (OAuth2 client credentials)
     * Free official REST API — no Playwright needed
     * Endpoint: `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search`
     * Params: motsCles, commune (INSEE code), typeContrat, distance, range
     * Returns: 500,000+ active listings — largest French job board
   - `apec.ts` — APEC.fr (cadre/executive roles)
     * Go-to for senior profiles (managers, engineers, executives)
   - `hellowork.ts` — HelloWork (~200K listings)
     * #4 most used French job board, strong on CDI/CDD
   - `cadremploi.ts` — Cadrempli (exec/senior market)
     * Premium executive market, complementary to APEC
   - `talentcom.ts` — Talent.com (aggregator)
     * Aggregates from 30+ French sources in one pass
   - `welcometothejungle.ts` — Welcome to the Jungle (startup-heavy)

   **International Sources:**
   - `linkedin.ts` — scrape LinkedIn Jobs search results + job detail pages
   - `indeed.ts` — scrape Indeed with pagination support
   - `glassdoor.ts` — scrape Glassdoor with cookie consent bypass

   Each scraper returns a normalized `ScrapedJob[]` array.

3. **France Travail API Integration**:
   ```ts
   // lib/scraper/sources/france-travail.ts
   const FT_API = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";
   
   const params = {
     motsCles: keywords,       // search keywords
     commune: inseeCode,      // INSEE city code (e.g. 75056 = Paris)
     typeContrat: "CDI,CDD",  // French contract types
     distance: 30,            // km radius
     range: "0-149"           // pagination (max 150 per call)
   };
   // Returns: intitule, entreprise, lieuTravail, salaire, 
   //          typeContrat, qualificationLibelle, dateCreation, description
   ```

   **Environment variables required:**
   ```
   FRANCE_TRAVAIL_CLIENT_ID=your_oauth2_client_id
   FRANCE_TRAVAIL_CLIENT_SECRET=your_oauth2_client_secret
   ```

4. **French Contract Types** (add to DB schema):
   | Code | Label |
   |------|-------|
   | CDI | Contrat à durée indéterminée (permanent) |
   | CDD | Contrat à durée déterminée (fixed-term) |
   | MIS | Intérim / Mission |
   | ALT | Alternance (apprentissage + contrat pro) |
   | STG | Stage |
   | CCE | Agent commercial |

5. **API route** `POST /api/jobs/scrape`:
   - Accept `{ keywords, location, remote, language, job_type, salary_min, sources[] }`
   - Fan out to selected scrapers in parallel (Promise.allSettled)
   - Deduplicate by `sha256(url)`, upsert into `jobs` table
   - Emit progress via Supabase Realtime channel `scrape:{user_id}`

6. **Search UI** (`app/search/page.tsx`):
   - Search form with all filters + source checkboxes
   - Results grid: `JobCard` with company logo (Clearbit or letter avatar), title,
     location, salary range, detected language flag emoji, "Save" and "Apply" CTAs
   - Real-time progress bar during scraping via Supabase Realtime subscription
   - Filter sidebar: remote toggle, job type pills, salary slider, language selector
   - Infinite scroll pagination (20 results per page)

7. **Job detail** (`app/jobs/[id]/page.tsx`):
   - Full job description with syntax highlighting for technical requirements
   - Detected language badge, extracted skills chips
   - ATS preview panel (what score would your current resume get?)
   - "Generate Resume & Cover Letter" primary CTA → navigates to `/apply/[id]`

**Done when:** User can search, see scraped results in real-time, view job details.

---

### AGENT 2 — CV & Document Generation Agent

**Responsibility:** Build the AI-powered CV and cover letter generation system,
multilingual support, ATS scoring, and document export.

**Owns:**
- `app/apply/[id]/page.tsx`
- `app/api/applications/generate/route.ts`
- `app/api/applications/ats-score/route.ts`
- `lib/openai/generate.ts`
- `lib/openai/ats.ts`
- `components/editor/`

**Tasks:**

1. **Language detection** (`lib/openai/detect-language.ts`):
   - Use `franc` library first for language detection with 11-language matrix
   - Fall back to OpenAI for ambiguous cases
   - Return: `en` | `fr` | `de` | `es` | `it` | `nl` | `pt` | `sv` | `da` | `no` | `fi`

2. **5-step GPT-4o pipeline** (`lib/openai/generate.ts`):

   **Step 1 — Analyze Job:**
   ```ts
   const JOB_ANALYSIS_PROMPT = `You are a senior technical recruiter analyzing a job posting.
   Extract and format as JSON:
   {
     "key_requirements": [...],
     "must_have_skills": [...],
     "nice_to_have_skills": [...],
     "seniority": "junior|mid|senior|principal|staff",
     "tone": "formal|casual|academic",
     "salary_indicative": null | { "min": number, "max": number, "currency": "EUR" }
   }
   
   Job: {job_description}
   `;
   ```

   **Step 2 — Adapt Resume:**
   ```ts
   const RESUME_ADAPTATION_PROMPT = `You are a senior technical resume writer.
   Reorder and rephrase your existing experience to match the job requirements.
   DO NOT invent facts — only reframe existing achievements.
   Output as HTML optimized for ATS (single column, no tables, no icons).
   
   Original resume: {original_resume}
   Job analysis: {job_analysis}
   Target template: {template_name} (minimal|compact|modern|classic|international)
   `;
   ```

   **Step 3 — Generate Cover Letter:**
   ```ts
   const COVER_LETTER_PROMPT = `You are a professional cover letter writer.
   Match the company's tone (startup = casual, enterprise = formal).
   Write in the detected job language: {language}.
   
   Cover letter structure:
   - Opening: Address to hiring manager (or "Madame, Monsieur," for French formal)
   - Hook: Why *this* company? (research required)
   - Body: 2-3 paragraphs bridging your experience to their needs
   - Call to action: Polite close, availability for interview
   
   My profile: {profile}
   Job: {job}
   Tone: {detected_tone}
   `;
   ```

   **Step 4 — ATS Scoring:**
   ```ts
   const ATS_SCORING_PROMPT = `Score resume + cover letter against job description.
   Return structured JSON:
   {
     "overall": number,           // 0-100
     "keyword_match": number,      // % of job keywords found
     "missing_keywords": [...],  // top 10 missing
     "format_score": number,    // penalize columns, tables, images
     "length_score": number,    // ideal: 400-700 words for resume
     "language_match": boolean,  // does document language match job language
     "suggestions": [...],       // 3-5 actionable improvements
     "ats_safe": boolean       // true if score >= 70
   }
   
   Resume: {resume}
   Cover letter: {cover_letter}
   Job description: {job_description}
   `;
   ```

   **Step 5 — Translation (if needed):**
   ```ts
   const TRANSLATION_PROMPT = `Translate to {target_language}.
   Preserve all markdown, bullet points, and formatting.
   Maintain original meaning — do not localize names or company names.
   Keep dates in original format — do not convert between date systems.
   
   Source: {document}
   `;
   ```

3. **CV Templates** (in `components/editor/`):
   All single-column, ATS-optimized (no columns, no tables, no icons):
   - `minimal.tsx` — single column, generous whitespace, serif heading
   - `compact.tsx` — two-column skills sidebar, dense layout
   - `modern.tsx` — subtle accent color, left border section headers
   - `classic.tsx` — traditional, widely compatible
   - `international.tsx` — CV-compatible, multi-country format

4. **Document export** (`lib/docx/export.ts`):
   - Use `docx` npm package to generate .docx files client-side
   - Offer HTML preview + PDF print option
   - Upload to Supabase Storage under `/users/{user_id}/applications/`

5. **ATS Score Gauge UI** (`components/editor/ATSScoreGauge.tsx`):
   - Visual gauge showing 0-100 score
   - Keyword chips: matched = green, missing = red
   - Suggestions panel with actionable improvements
   - "ats_safe" badge (green if >= 70, red if < 70)

**Done when:** User can generate a resume + cover letter in the job's language, export as .docx, view ATS score.

---

### AGENT 3 — Kanban Board Agent

**Responsibility:** Build the application tracker with drag-and-drop Kanban board,
slide-over details, and timeline.

**Owns:**
- `app/board/page.tsx`
- `components/kanban/`
- All kanban-related API routes

**Tasks:**

1. **Kanban columns** (non-deletable):
   | Column | Color | Description |
   |--------|------|-------------|
   | saved | Gray | Job saved, not yet applied |
   | applying | Blue | Application in progress |
   | applied | Indigo | Submitted — awaiting response |
   | interview | Amber | Interview scheduled or completed |
   | offer | Green | Offer received |
   | rejected | Red | Application rejected |
   | ghosted | Slate | No response after 3 weeks |

2. **Kanban board** (`components/kanban/KanbanBoard.tsx`):
   - Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag and drop
   - Column counts visible in header badges
   - Filter bar: by date range, company, job type, ATS score range

3. **Application card** (`components/kanban/ApplicationCard.tsx`):
   - Company logo (Clearbit or letter avatar)
   - Job title, application date
   - ATS score badge
   - Quick action buttons: edit, view, delete

4. **Slide-over detail panel**:
   - Full application details
   - Generated documents (resume, cover letter)
   - Timeline of events (status changes, notes, reminders)
   - Notes textarea with auto-save (debounced 500ms)

5. **Timeline events** (`application_events` table):
   - `status_changed` — column transitions
   - `note_added` — user notes
   - `document_generated` — CV generation events
   - `interview_scheduled` — interview scheduling
   - `offer_received` — offer details

**Done when:** User can drag applications between columns, view full details, track history.

---

### AGENT 4 — Auto-Apply Agent

**Responsibility:** Build the automated application submittal system using Playwright,
detecting application platforms and handling multi-step forms.

**Owns:**
- `app/api/applications/auto-apply/route.ts`
- `lib/scraper/auto-apply/`
- Auto-apply UI components

**Tasks:**

1. **Application platform detection**:
   - **LinkedIn Easy Apply** — detect "Easy Apply" button, fill form fields
   - **Greenhouse** — detect by `greenhouse.io` domain
   - **Lever** — detect by `lever.co` domain
   - **Workday** — detect by `workday.com` domain
   - **Breezy HR** — detect by `breezy.hr` domain
   - **Direct apply** — company careers page form

2. **Profile data** (from `user_profiles` table):
   - Personal: name, email, phone, address
   - Professional: LinkedIn URL, portfolio URL
   - Availability: start date, desired salary, work authorization
   - Languages: spoken with proficiency level
   - Quick answers: JSONB map for common questions

3. **Auto-apply flow**:
   ```
   1. User clicks "Auto-Apply" on a job
   2. System detects application platform
   3. Playwright launches (headless)
   4. Navigate to job URL
   5. Fill form fields from profile data
   6. Upload generated resume PDF
   7. Handle multi-step forms (up to 5 pages)
   8. Submit and capture confirmation
   9. Log result: success | manual_required | failed
   ```

4. **Safety rules**:
   - **Rate limiting:** Max 10 applications per day per platform
   - **Random delays:** 30-120 seconds between submissions
   - **Captcha detection:** If detected → halt and mark `manual_required`
   - **Form validation:** Skip if > 5 fields missing from profile

5. **Manual fallback**:
   - If auto-apply fails, show "Manual Apply" button
   - Opens job URL in new tab
   - Documents pre-downloaded

**Done when:** User can auto-apply to LinkedIn jobs with one click, view auto-apply logs.

---

### AGENT 5 — Dashboard & Profile Agent

**Responsibility:** Build the dashboard overview, user profile management, settings,
and data export.

**Owns:**
- `app/dashboard/page.tsx`
- `app/profile/page.tsx`
- `app/settings/page.tsx`
- Dashboard-related API routes

**Tasks:**

1. **Dashboard KPIs** (`app/dashboard/page.tsx`):
   | Metric | Calculation |
   |--------|-------------|
   | Total applied | COUNT WHERE status != 'saved' |
   | Interviews | COUNT WHERE column = 'interview' |
   | Offers | COUNT WHERE column = 'offer' |
   | Response rate | (applied - rejected - ghosted) / applied |
   | Avg ATS score | AVG(ats_score.overall) |

2. **Recent activity feed**:
   - Timeline of application status changes
   - Upcoming interviews (from calendar integration)
   - New jobs matching saved searches

3. **Quick actions**:
   - "Add job manually" button
   - "Search new jobs" button
   - "Export all data" button

4. **Profile page** (`app/profile/page.tsx`):
   - Personal info form: name, email, phone, location
   - Professional: LinkedIn URL, portfolio URL
   - Base resume upload (text or PDF extraction)
   - Availability settings
   - Languages spoken with levels

5. **Settings page** (`app/settings/page.tsx`):
   - **API keys:** OpenAI key (with reveal toggle), Clearbit key
   - **Notifications:** Email alerts for new jobs, interview reminders
   - **Data export:** Download all data as JSON/CSV
   - **Theme:** Light/dark mode toggle
   - **Delete account:** With confirmation

**Done when:** User can view dashboard metrics, manage profile, export data.

---

## Shared Infrastructure

### Types (`types/index.ts`)

```ts
interface Job {
  id: string
  title: string
  company: string
  location: string
  description_text: string
  description_html: string
  url: string
  url_hash: string
  source: 'linkedin' | 'indeed' | 'welcometothejungle' | 'glassdoor' |
         'france-travail' | 'apec' | 'hellowork' | 'cadremploi' | 'talentcom'
  posted_at: string
  detected_language: 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl'
  salary_range: { min: number; max: number; currency: string } | null
  skills_required: string[]
  remote: boolean
  job_type: 'CDI' | 'CDD' | 'MIS' | 'ALT' | 'STG' | 'CCE' | 'fulltime' | 'parttime'
  scraped_at: string
}

interface Application {
  id: string
  user_id: string
  job_id: string
  status: 'draft' | 'submitted' | 'withdrawn'
  kanban_column: 'saved' | 'applying' | 'applied' | 'interview' | 'offer' | 'rejected' | 'ghosted'
  ats_score: ATSScore | null
  resume_html: string | null
  resume_docx_path: string | null
  cover_letter_html: string | null
  cover_letter_docx_path: string | null
  template_used: 'minimal' | 'compact' | 'modern' | 'classic' | 'international'
  auto_apply_result: { status: string; error?: string } | null
  notes: string | null
  applied_at: string | null
  created_at: string
  updated_at: string
}

interface ATSScore {
  overall: number
  keyword_match: number
  missing_keywords: string[]
  format_score: number
  length_score: number
  language_match: boolean
  suggestions: string[]
  ats_safe: boolean
}
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=
CLEARBIT_API_KEY=
PLAYWRIGHT_HEADLESS=true
```

### Supabase Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `resumes` | User-generated .docx resumes |
| `cover-letters` | User-generated .docx cover letters |
| `avatars` | User profile images |

### Development Order

1. **Agent 0** — Foundation (blocks all others)
2. **Agents 1-5** — Run in parallel once Agent 0 is done
3. **Integration** — Connect all pieces, end-to-end testing
4. **Polish** — Empty states, error handling, mobile UI, dark mode

### Definition of Done

- [ ] User can sign up / log in with email + Google
- [ ] User can search jobs and see scraped results in real-time
- [ ] User can generate resume + cover letter in the job's language
- [ ] ATS score displays with keyword gap analysis and suggestions
- [ ] User can edit generated documents before applying
- [ ] User can drag-and-drop applications across Kanban columns
- [ ] User can auto-apply to LinkedIn Easy Apply jobs
- [ ] User can download documents as .docx
- [ ] Dark mode and light mode work correctly
- [ ] All data is RLS-protected — users only see their own data
- [ ] Responsive design works down to 375px mobile