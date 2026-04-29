# CV Generation System — Detailed Specification

## Purpose

This document specifies the AI-powered, multilingual, ATS-optimized CV generation
system for JobPilot. It is the reference for AGENT 2.

---

## Language Support Matrix

| Language | Code | Date Format | Skills Label | Experience Label | Salutation (Formal) |
|----------|------|-------------|--------------|------------------|---------------------|
| English | en | Jan 2023 | Skills | Experience | Dear Hiring Manager, |
| French | fr | janv. 2023 | Compétences | Expérience | Madame, Monsieur, |
| German | de | Jan. 2023 | Kenntnisse | Berufserfahrung | Sehr geehrte Damen und Herren, |
| Spanish | es | ene. 2023 | Habilidades | Experiencia | Estimado/a responsable de selección, |
| Portuguese | pt | jan. 2023 | Competências | Experiência | Exmo./Exma. Sr./Sra., |
| Italian | it | gen. 2023 | Competenze | Esperienza | Egregio/Gentile Responsabile, |
| Dutch | nl | jan. 2023 | Vaardigheden | Werkervaring | Geachte heer/mevrouw, |
| Polish | pl | sty. 2023 | Umiejętności | Doświadczenie | Szanowni Państwo, |
| Swedish | sv | jan. 2023 | Kompetenser | Erfarenhet | Med vänlig hälsning, |
| Danish | da | jan. 2023 | Kompetencer | Erfaring | Kære ansættelsesansvarlige, |
| Norwegian | no | jan. 2023 | Ferdigheter | Erfaring | Kjære ansettelsesansvarlig, |

---

## AI Prompt Templates (production-ready)

### Prompt 1 — Job Analysis (GPT-4o, JSON mode)

```
SYSTEM:
You are a senior recruiter with 15+ years of experience in talent acquisition across
Europe and North America. Analyze job descriptions with precision.

USER:
Analyze this job description and return a structured JSON object.

Job Description:
---
{job_description}
---

Return this exact JSON structure:
{
  "detected_language": "ISO 639-1 code (e.g. fr, en, de)",
  "seniority": "junior|mid|senior|lead|executive",
  "tone": "formal|corporate|startup|creative|technical",
  "required_skills": ["skill1", "skill2", ...],
  "nice_to_have_skills": ["skill1", ...],
  "key_responsibilities": ["resp1", ...],
  "ats_keywords": ["keyword1", ...],
  "company_culture_hints": ["hint1", ...],
  "salary_range": "string or null",
  "remote_policy": "remote|hybrid|onsite|unspecified",
  "industry": "string"
}
```

### Prompt 2 — Resume Adaptation (GPT-4o, JSON mode)

```
SYSTEM:
You are an elite CV writer specializing in ATS optimization for the {detected_language}
job market. You adapt resumes to maximize keyword match without fabricating experience.
Output language: {detected_language}. Be natural, not robotic.

USER:
Adapt this candidate's resume for the following job. Reorder and rephrase to match
the job's ATS keywords. Do NOT add skills or experience the candidate does not have.

CANDIDATE BASE RESUME:
---
{base_resume_text}
---

JOB ANALYSIS:
{job_analysis_json}

Return this exact JSON:
{
  "summary": "2-3 sentence professional summary tailored to this job",
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "location": "City, Country",
      "start_date": "localized format",
      "end_date": "localized or 'Present'",
      "bullets": ["achievement 1 with metric", ...]
    }
  ],
  "education": [
    { "degree": "", "institution": "", "year": "", "details": "" }
  ],
  "skills": {
    "technical": ["skill1"],
    "soft": ["skill1"],
    "tools": ["tool1"]
  },
  "languages": [
    { "language": "French", "level": "Native" }
  ],
  "certifications": [
    { "name": "", "issuer": "", "year": "" }
  ]
}
```

### Prompt 3 — Cover Letter (GPT-4o, streaming)

```
SYSTEM:
You are an expert at writing compelling cover letters that get interviews.
You write in {detected_language}, matching the company's tone: {tone}.
Never start with "I am writing to apply for". Be specific, confident, and human.

USER:
Write a cover letter for this application.

CANDIDATE NAME: {full_name}
JOB TITLE: {job_title}
COMPANY: {company_name}
ADAPTED RESUME SUMMARY: {resume_summary}
TOP 3 ACHIEVEMENTS FROM RESUME: {top_achievements}
JOB REQUIREMENTS: {ats_keywords}

Requirements:
- Language: {detected_language}
- Tone: {tone}
- Length: 280-350 words
- Compelling opening specific to this company (not generic)
- Reference at least 2 achievements with numbers
- Confident, specific call to action in closing

Return as JSON:
{
  "subject": "Email subject line",
  "salutation": "Appropriate formal salutation for {detected_language}",
  "paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3", "paragraph 4"],
  "closing": "Appropriate closing for {detected_language}"
}
```

### Prompt 4 — ATS Scoring (GPT-4o, JSON mode)

```
SYSTEM:
You are an ATS simulation engine. Score documents the way real ATS software
(Taleo, Workday, Greenhouse, iCIMS) would.

USER:
Score this resume against this job description.

RESUME TEXT:
---
{adapted_resume_text}
---

JOB DESCRIPTION:
---
{job_description}
---

Return this exact JSON:
{
  "overall": <0-100 integer>,
  "grade": "<A|B|C|D|F>",
  "keyword_match": <0-100 integer>,
  "matched_keywords": ["keyword1", ...],
  "missing_keywords": ["keyword1", ... up to 10],
  "format_score": <0-100>,
  "length_score": <0-100>,
  "language_match": <true|false>,
  "ats_safe": <true if overall >= 70>,
  "suggestions": [
    "Specific actionable improvement 1",
    "Specific actionable improvement 2",
    "Specific actionable improvement 3"
  ]
}
```

### Prompt 5 — Translation (GPT-4o, JSON mode)

```
SYSTEM:
You are a professional translator specializing in HR documents.
Translate naturally — adapt idioms, not just words.
Never translate proper nouns (company names, product names, certifications).

USER:
Translate this {source_language} CV JSON into {target_language}.

CV JSON:
{adapted_resume_json}

Rules:
- Translate all text values, keep identical JSON structure and keys
- Localize date formats per {target_language} standard
- Use professional vocabulary (not literal translations)
- Translate section labels to standard {target_language} equivalents
- Do NOT translate: company names, tool names, certification names, URLs, emails

Return the complete translated JSON with identical structure.
```

---

## CV Template Specifications

| ID | Name | Style | Best For |
|----|------|-------|----------|
| `minimal` | Minimal | Single col, Playfair Display heading, 2cm margins | Senior/exec |
| `compact` | Compact | Dense, Inter 10pt, bold section rules | Tech/engineering |
| `modern` | Modern | Teal #01696f left border on section headers | Startups |
| `classic` | Classic | Times New Roman, small-caps headers, black/white | Finance/law/gov |
| `international` | International | Photo placeholder, nationality/DOB fields | EU market |

### ATS Rules (ALL templates must follow)
- Single column only — no multi-column layouts
- No tables, text boxes, or images in the body
- All text selectable (no text-as-image)
- Standard section labels (localized but mapped to standard meaning)
- Fonts embedded in PDF
- File size: PDF < 500KB, DOCX < 200KB
- No headers/footers (ATS parsers often skip these areas)
- Dates: "Jan 2023 – Mar 2025" format (localized per language matrix)
- Bullets: Unicode "•" (U+2022)
- Contact info on one line: email · phone · location
- Page count: 1 page < 5 years exp, max 2 pages otherwise

---

## Language Detection Flow

```typescript
async function detectLanguage(text: string): Promise<string> {
  // Step 1: franc (fast, offline)
  const francResult = franc(text, { minLength: 20 });
  if (francResult !== 'und') return francResult;

  // Step 2: GPT-4o-mini fallback
  const result = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user',
      content: `Detect language. Return only ISO 639-1 code (2 letters). Text: ${text.slice(0, 500)}` }],
    max_tokens: 3
  });
  return result.choices[0].message.content?.trim() ?? 'en';
}
```

---

## Supabase Storage Structure

```
Bucket: "documents" (private, RLS-protected)

/users/{user_id}/
  base-resumes/
    {resume_id}.pdf
    {resume_id}.txt
  applications/{application_id}/
    resume-{template}-{lang}.pdf
    resume-{template}-{lang}.docx
    cover-letter-{lang}.pdf
    cover-letter-{lang}.docx
  exports/
    all-applications-{date}.csv
    all-documents-{date}.zip
```

---

## Multilingual Quality Checklist

- [ ] Language detected automatically from job description
- [ ] CV and cover letter always match the job's language
- [ ] Date formats localized per language matrix above
- [ ] Section labels correctly translated (not literal English)
- [ ] Cover letter salutation adapted per language matrix
- [ ] No false cognates or unnatural phrasing
- [ ] Phone format adapted to target country convention
- [ ] "Skills" → "Compétences" (FR), "Kenntnisse" (DE), "Habilidades" (ES)

## ATS Quality Checklist

- [ ] No tables, text boxes, multi-column layouts in exported file
- [ ] All text selectable (no text-as-image)
- [ ] Fonts embedded in PDF
- [ ] File size: PDF < 500KB, DOCX < 200KB
- [ ] Consistent date formatting throughout
- [ ] Bullet points use Unicode • not - or *
- [ ] No widows or orphans across page breaks
- [ ] Validated parseable by Jobscan or Resume Worded API
