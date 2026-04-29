# AllHands Agent Prompt — JobPilot (Job Application Automation Platform)

## Mission

Build a full-stack web application called **JobPilot** — an intelligent job application
automation platform. The app enables users to find jobs, auto-apply, generate and adapt
cover letters and resumes in the correct language, track applications on a Kanban board,
and score their documents against ATS (Applicant Tracking System) requirements.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes (Edge-compatible where possible)
- **Database:** Supabase (PostgreSQL) with Supabase JS client
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **AI:** OpenAI GPT-4o — resume/cover letter generation, ATS scoring, translation
- **Scraping:** Playwright (playwright-extra + stealth plugin) in Node.js worker
- **Queue:** Supabase Realtime + pg_cron for background job processing
- **PDF export:** @react-pdf/renderer
- **DOCX export:** docx npm package
- **Rich text editing:** tiptap
- **Drag and drop:** @dnd-kit/core + @dnd-kit/sortable
- **Deployment target:** Vercel + Supabase

See AGENTS.md for sub-agent task breakdown.
See CV_GENERATION_SPEC.md for full AI prompt templates and CV template specs.

## Features

### 1. Job Search & Scraping
- Sources: LinkedIn Jobs, Indeed, Glassdoor, Welcome to the Jungle
- Search form: keywords, location, remote toggle, language, job type, salary min
- Background scraping via /api/jobs/scrape with Supabase Realtime progress streaming
- Deduplicate by URL hash, detect job language automatically
- Anti-bot: stealth mode, 10 random user-agents, 800-2500ms delays, retry logic

### 2. CV & Cover Letter Generation (multilingual, ATS-optimized)
- 5-step GPT-4o chain: Job Analysis → Resume Adaptation → Cover Letter → ATS Score → Translation
- Auto-detect job language → generate ALL documents in that language
- Supported languages: en, fr, de, es, pt, it, nl, pl, sv, da, no
- 5 ATS-safe CV templates: minimal, compact, modern, classic, international
- ATS rules enforced: no tables, no columns, no images, standard section labels
- Export: PDF (A4, fonts embedded) + DOCX download
- Inline editor with tiptap for all sections
- Language selector to generate additional language variants on demand

### 3. ATS Scoring Engine
- Score: overall (0-100), keyword_match %, missing_keywords[], format_score,
  length_score, language_match, ats_safe, grade (A/B/C/D/F), suggestions[]
- Visual: SVG arc gauge + colored keyword chips (green matched, red missing)
- Animated counter on mount

### 4. Kanban Board
- 7 fixed columns: saved, applying, applied, interview, offer, rejected, ghosted
- @dnd-kit drag-and-drop, smooth animations
- Application cards: company logo (Clearbit), title, ATS badge, date, language flag
- Slide-over detail panel: full job, document thumbnails, timeline, auto-save notes
- Filter bar: date range, company, ATS grade, job type

### 5. Auto-Apply Engine
- Playwright form filler for: LinkedIn Easy Apply, Greenhouse, Lever, Workday, generic
- Screenshot confirmation before submit (user approves)
- CAPTCHA detected → return manual_required immediately
- Result logged: success | manual_required | failed

## Database Schema (Supabase / PostgreSQL)

user_profiles, base_resumes, jobs, applications, application_events — all with RLS.
See CV_GENERATION_SPEC.md for Supabase Storage structure.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Login / landing |
| `/dashboard` | KPI cards, activity feed, stats charts |
| `/search` | Job search + scraped results grid |
| `/jobs/[id]` | Job detail + ATS preview |
| `/apply/[id]` | Split-pane CV editor + ATS score |
| `/board` | Kanban drag-and-drop board |
| `/profile` | Onboarding + base resume upload |
| `/settings` | API keys, preferences, data export |

## Design System

- Font: Satoshi (Fontshare CDN)
- Palette: Teal primary #01696f, warm beige surfaces, dark mode first-class
- Compact web app typography — max heading size: --text-xl
- Component base: shadcn/ui customized to Nexus tokens
- Light + dark mode across all pages

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
│   ├── (auth)/login/page.tsx
│   ├── dashboard/page.tsx
│   ├── search/page.tsx
│   ├── jobs/[id]/page.tsx
│   ├── apply/[id]/page.tsx
│   ├── board/page.tsx
│   ├── profile/page.tsx
│   ├── settings/page.tsx
│   └── api/
│       ├── jobs/scrape/route.ts
│       ├── jobs/search/route.ts
│       ├── applications/generate/route.ts
│       ├── applications/ats-score/route.ts
│       └── applications/auto-apply/route.ts
├── components/
│   ├── kanban/
│   ├── editor/
│   ├── search/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── openai/
│   ├── scraper/
│   ├── docx/
│   └── pdf/
├── types/index.ts
├── supabase/migrations/
└── .env.example
```

## Recommended Development Order

1. Supabase schema + auth
2. Profile page + base resume upload
3. Job search + scraping API
4. AI generation pipeline
5. ATS scoring engine
6. Application editor page
7. Kanban board
8. Auto-apply engine
9. Dashboard
10. Polish (empty states, mobile, dark mode)
