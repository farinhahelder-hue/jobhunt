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
   - `linkedin.ts` — scrape LinkedIn Jobs search results + job detail pages
   - `indeed.ts` — scrape Indeed with pagination support
   - `welcometothejungle.ts` — scrape WTTJ (French-heavy source, important)
   - `glassdoor.ts` — scrape Glassdoor with cookie consent bypass
   - Each scraper returns a normalized `ScrapedJob[]` array

3. **API route** `POST /api/jobs/scrape`:
   - Accept `{ keywords, location, remote, language, job_type, salary_min, sources[] }`
   - Fan out to selected scrapers in parallel (Promise.allSettled)
   - Deduplicate by `sha256(url)`, upsert into `jobs` table
   - Emit progress via Supabase Realtime channel `scrape:{user_id}`

4. **Search UI** (`app/search/page.tsx`):
   - Search form with all filters + source checkboxes
   - Results grid: `JobCard` with company logo (Clearbit or letter avatar), title,
     location, salary range, detected language flag emoji, "Save" and "Apply" CTAs
   - Real-time progress bar during scraping via Supabase Realtime subscription
   - Filter sidebar: remote toggle, job type pills, salary slider, language selector
   - Infinite scroll pagination (20 results per page)

5. **Job detail** (`app/jobs/[id]/page.tsx`):
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
- `lib/openai/`
- `lib/docx/`
- `lib/pdf/`
- `lib/cv-templates/`
- `components/editor/`
- `components/cv/`

**Tasks:**

#### 2A — AI Generation Pipeline
Implement a 5-step OpenAI GPT-4o prompt chain with structured outputs (JSON mode).
Full prompt templates are in `CV_GENERATION_SPEC.md`.

Steps:
1. Job Analysis — extract skills, tone, language, ATS keywords
2. Resume Adaptation — reorder/rephrase bullets using job keywords (no fabrication)
3. Cover Letter Generation — language-matched, tone-matched, 280-350 words
4. ATS Scoring — structured score object with keyword gap analysis
5. Translation Variants — on-demand translation to any supported language

#### 2B — CV Templates
Build 5 ATS-optimized React CV templates (single column, no tables, no images):
- `minimal` — serif heading, generous whitespace
- `compact` — dense layout, text-only skill list
- `modern` — teal left border accent
- `classic` — traditional, black/white, small-caps headers
- `international` — photo placeholder, EU market fields

All templates must be A4 print-safe with embedded fonts.

#### 2C — PDF & DOCX Export
- PDF via `@react-pdf/renderer` — A4, 2cm margins, embedded Inter font
- DOCX via `docx` npm package — proper heading styles for ATS parsing
- Files saved to Supabase Storage under `/users/{user_id}/applications/{app_id}/`

#### 2D — Application Editor UI
Split-pane layout:
- Left 60%: Live CV preview + template switcher (5 thumbnails) + language selector
- Right 40%: Tabs — Resume editor (tiptap) | Cover Letter editor | ATS Score
- ATS Score tab: SVG arc gauge + grade badge + keyword chips + suggestions list
- Bottom bar: Save Draft, Export PDF, Export DOCX, Auto-Apply CTA

**Done when:** CV + cover letter generated in job's language, ATS score displayed,
PDF and DOCX downloadable, template switching works.

---

### AGENT 3 — Kanban Board Agent

**Responsibility:** Build the drag-and-drop application tracking board.

**Owns:**
- `app/board/page.tsx`
- `app/api/applications/[id]/route.ts`
- `components/kanban/`

**Tasks:**

1. Kanban board with @dnd-kit — 7 fixed columns:
   saved (gray) → applying (blue) → applied (indigo) → interview (amber)
   → offer (green) → rejected (red) → ghosted (slate)

2. Application card: company logo, job title, applied date, ATS badge, language flag,
   hover quick actions (view/edit/delete)

3. Slide-over detail panel (400px from right):
   - Full job description, document preview thumbnails, ATS breakdown
   - Timeline of events (applied, interview, offer/rejection)
   - Notes textarea with 500ms debounced auto-save
   - "Add Event" manual milestone button
   - PDF/DOCX download buttons

4. Column move triggers:
   - → interview: prompt to log interview date
   - → rejected/ghosted: prompt for reason note
   - → offer: prompt for salary + start date

5. Filter bar: date range, company search, ATS grade, job type
   Stats row: total applied, response rate %, avg ATS score, interview rate %

**Done when:** Drag-and-drop works, slide-over shows full detail, notes auto-save.

---

### AGENT 4 — Auto-Apply Agent

**Responsibility:** Playwright-based form filler for automatic job application submission.

**Owns:**
- `app/api/applications/auto-apply/route.ts`
- `lib/auto-apply/`

**Tasks:**

1. Platform detector — identify ATS from URL/page:
   LinkedIn Easy Apply, Greenhouse, Lever, Workday, Breezy HR, generic fallback

2. Per-platform fillers in `lib/auto-apply/platforms/`:
   - `linkedin.ts` — Easy Apply multi-step form + resume upload
   - `greenhouse.ts` — standard fields + PDF upload
   - `lever.ts` — cover letter text field support
   - `generic.ts` — heuristic field detection by label/aria/placeholder/name

3. Safety rules:
   - Always return `requires_review` with screenshot before submitting
   - CAPTCHA detected → return `manual_required` immediately
   - Timeout: 90 seconds max
   - Log all interactions to `application_events`

4. Result statuses:
   - `success` — confirmation captured
   - `manual_required` — captcha/login/complex form
   - `failed` — unexpected error + screenshot

**Done when:** LinkedIn Easy Apply and Greenhouse auto-apply work end-to-end.

---

### AGENT 5 — Dashboard & Profile Agent

**Responsibility:** Dashboard overview, user onboarding, and settings.

**Owns:**
- `app/dashboard/page.tsx`
- `app/profile/page.tsx`
- `app/settings/page.tsx`
- `components/dashboard/`

**Tasks:**

1. Dashboard KPIs: Total Applications, Response Rate %, Avg ATS Score,
   Interviews This Month, Offers Received
   + Application status donut chart (Recharts SVG)
   + Recent activity feed (last 10 events)
   + Weekly velocity sparkline

2. Profile onboarding (6-step stepper):
   1. Personal info
   2. Work preferences (remote, type, salary, availability)
   3. Languages spoken with proficiency level
   4. Base resume upload (PDF drag-drop → pdf-parse text extraction)
   5. Quick answers for auto-apply common questions
   6. Work authorization

3. Settings:
   - OpenAI API key override (user brings own key)
   - Notification preferences
   - Scraping preferences (default sources, rate limiting)
   - Data export: CSV of all applications + ZIP of all documents
   - Danger zone: delete account

**Done when:** Dashboard shows live KPIs, onboarding completable, resume upload works.

---

## Coordination Rules

1. **AGENT 0 must complete before any other agent starts.**
2. Agents 1–5 run in parallel after Agent 0.
3. `types/index.ts` is owned by Agent 0. Others open PRs to propose additions.
4. API routes are owned exclusively by the listed agent — no cross-agent edits.
5. Schema is frozen after Agent 0. New columns go in new migration files only.
6. All agents must pass `npm run lint` and `npm run type-check` before marking done.
7. Conventional commits: `feat(agent-1): add linkedin scraper`

---

## Definition of Done

- [ ] All 8 pages render without console errors in light + dark mode
- [ ] Job scraping returns results for LinkedIn and WTTJ within 60 seconds
- [ ] AI generation produces CV + cover letter in the correct language of the job
- [ ] PDF export is ATS-parseable
- [ ] Kanban drag-and-drop works on Chrome, Firefox, Safari
- [ ] Auto-apply succeeds on a test LinkedIn Easy Apply job
- [ ] All Supabase queries protected by RLS
- [ ] Lighthouse: Performance >= 85, Accessibility >= 90
- [ ] TypeScript strict mode: zero `any` types
- [ ] All env vars documented in `.env.example`
