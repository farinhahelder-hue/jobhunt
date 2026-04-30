# AGENTS.md — JobPilot Multi-Agent Configuration

## Overview
AllHands should split this project across **6 specialized sub-agents** working in parallel after the shared foundation (database + auth) is complete. Each agent owns a vertical slice of the codebase. Agents communicate only through Supabase — never direct imports across agent boundaries.

---

## Agent Roster

### AGENT 0 — Foundation Agent (runs first, blocks all others)
**Responsibility:** Scaffold the entire project, set up Supabase, and establish shared infrastructure that all other agents depend on.

**Tasks:**
1. Initialize Next.js 14 project with TypeScript, Tailwind CSS, shadcn/ui
2. Configure `tailwind.config.ts` with Nexus design tokens
3. Set up `globals.css` with CSS custom properties, Satoshi font via Fontshare CDN
4. Create all Supabase migration files under `supabase/migrations/`:
   - `001_schema.sql` — all tables (user_profiles, base_resumes, jobs, applications, application_events, cv_templates, generated_cvs)
   - `002_rls.sql` — Row Level Security policies for every table
   - `003_functions.sql` — pg functions: `match_keywords`, `update_ats_score`
5. Set up Supabase Auth with Google OAuth + email/password
6. Create shared TypeScript types in `types/index.ts` covering all DB entities
7. Create `lib/supabase/client.ts` and `lib/supabase/server.ts`
8. Build the app shell: sidebar layout, top bar, route structure, dark mode toggle
9. Create placeholder pages for all 8 routes so other agents can fill them

**Done when:** `npm run dev` runs without errors, all routes exist, Supabase connection works.

---

### AGENT 1 — Scraper Agent (French Market Specialized)
**Responsibility:** Build the job search, scraping pipeline (Playwright + Official APIs), and job browsing UI. Focused on French and international markets.

**Owns:**
- `app/search/page.tsx`
- `app/jobs/[id]/page.tsx`
- `app/api/jobs/scrape/route.ts`
- `lib/scraper/`

**Tasks:**
1. **Playwright scraper engine** (`lib/scraper/playwright.ts`):
   - Use `playwright-extra` + `puppeteer-extra-plugin-stealth`
   - Randomized user-agent pool, random delay 800–2500ms
2. **Strategy Implementation**: For each jobboard (LinkedIn, France Travail, APEC, Indeed, etc.), strictly follow the integration strategies and methods (API vs Scraping) defined in **`docs/JOBBOARD_FACTORY_SPEC.md`**.
3. **French Source scrapers** (`lib/scraper/sources/`):
   - `france-travail.ts`: Implement **official REST API** (francetravail.io) with OAuth2.
   - `apec.ts`: Scrape Apec.fr using Playwright for Cadre/Executive roles.
   - `hellowork.ts`: Scrape HelloWork for general French CDI/CDD roles.
   - `welcometothejungle.ts`: Scrape WTTJ using the **Algolia API** discovery.
4. **International Source scrapers**:
   - `linkedin.ts`: Scrape LinkedIn Jobs search results.
   - `indeed.ts`: Scrape Indeed with pagination.
5. **API route** `POST /api/jobs/scrape`:
   - Fan out to selected scrapers. Deduplicate by `sha256(url)`.
   - Real-time progress via Supabase Realtime channel.

**Done when:** User can search French and international sources, see results in real-time, and filter by contract type.

---

### AGENT 2 — CV & Document Generation Agent
**Responsibility:** AI-powered CV and cover letter generation, multilingual support, ATS scoring, and export.

**Owns:**
- `app/apply/[id]/page.tsx`
- `app/api/applications/generate/route.ts`
- `lib/openai/`
- `lib/cv-templates/`

**Tasks:**
1. **AI Pipeline**: 5-step OpenAI GPT-4o prompt chain (Analysis -> Adaptation -> Cover Letter -> ATS Scoring -> Translation).
2. **Multilingual Support**: Support 11 languages with localized headers and formal salutations.
3. **CV Templates**: 5 ATS-optimized React templates (minimal, compact, modern, classic, international).
4. **Export**: PDF (@react-pdf/renderer) and DOCX (docx package) export.

**Done when:** CV + cover letter generated, ATS score displayed, and documents downloadable in multiple languages.

---

### AGENT 3 — Kanban Board Agent
**Responsibility:** Drag-and-drop application tracking board.

**Owns:**
- `app/board/page.tsx`
- `components/kanban/`

**Tasks:**
1. Kanban board with @dnd-kit (7 columns: saved to ghosted).
2. Slide-over detail panel with timeline, notes (auto-save), and document previews.
3. Milestone logging for interviews, offers, and rejections.

**Done when:** Drag-and-drop works, slide-over shows full detail, notes auto-save.

---

### AGENT 4 — Auto-Apply Agent
**Responsibility:** Playwright-based form filler for automatic submissions.

**Owns:**
- `lib/auto-apply/`
- `app/api/applications/auto-apply/route.ts`

**Tasks:**
1. Platform detector: LinkedIn Easy Apply, Greenhouse, Lever, Workday.
2. Safety rules: screenshot before submit, CAPTCHA detection -> `manual_required`.

**Done when:** LinkedIn Easy Apply and Greenhouse auto-apply work end-to-end.

---

### AGENT 5 — Dashboard & Profile Agent
**Responsibility:** Dashboard overview, user onboarding, and settings.

**Owns:**
- `app/dashboard/page.tsx`
- `app/profile/page.tsx`

**Tasks:**
1. Dashboard KPIs: Total Apps, Response Rate, Avg ATS Score, Interview Velocity.
2. Profile onboarding: Personal info, Work preferences, Languages, Base Resume upload.
3. Settings: OpenAI key override, Data export (CSV/ZIP).

**Done when:** Dashboard shows live KPIs, onboarding completable, resume upload works.

---

## Coordination Rules
1. AGENT 0 must complete before others start.
2. Agents 1–5 run in parallel after Agent 0.
3. Convention commits: `feat(agent-1): add france-travail api`.

---

## Definition of Done
- [ ] Scraping works for France Travail (API) and Apec (Playwright)
- [ ] CV generation supports French/English switching
- [ ] All 8 routes functional in light/dark mode
- [ ] RLS enabled on all Supabase tables
