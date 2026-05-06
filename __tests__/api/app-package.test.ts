import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/app-package/route'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Ensure we inject the required variables into the code BEFORE imports run
// This is done via setting env vars before any tests run
process.env.OPENAI_API_KEY = 'test-key'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    from: vi.fn(),
  }
  return {
    createClient: vi.fn(() => mockSupabase),
  }
})

// Ensure required test env vars are present as requested
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

// Access to mock for assertion
const mockSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) as any

describe('/api/app-package', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set required env vars
    vi.stubEnv('OPENAI_API_KEY', 'test-key')

    // Mock global fetch for OpenAI
    global.fetch = vi.fn()
  })

  describe('GET', () => {
    it('returns 405 Method Not Allowed', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data).toEqual({ success: false, error: 'Method Not Allowed' })
    })
  })

  describe('POST Failure Cases', () => {
    it('returns 400 for missing/invalid JSON body', async () => {
      // Mock request throwing error on json()
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as Request

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ success: false, error: 'Invalid JSON body' })
    })

    it('returns 400 for missing job_id', async () => {
      const request = new Request('http://localhost/api/app-package', {
        method: 'POST',
        body: JSON.stringify({ user_id: 'user123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ success: false, error: 'Missing job_id or user_id' })
    })

    it('returns 400 for missing user_id', async () => {
      const request = new Request('http://localhost/api/app-package', {
        method: 'POST',
        body: JSON.stringify({ job_id: 'job123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ success: false, error: 'Missing job_id or user_id' })
    })

    it('returns Job not found for non-existent job_id', async () => {
      const request = new Request('http://localhost/api/app-package', {
        method: 'POST',
        body: JSON.stringify({ job_id: 'fake-job', user_id: 'user123' }),
      })

      // Setup mock to return no job
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // route.ts returns 200 with error property for this case
      expect(data).toEqual({ success: false, error: 'Job not found' })
    })
  })

  describe('POST Success Case', () => {
    it('generates application package successfully', async () => {
      const request = new Request('http://localhost/api/app-package', {
        method: 'POST',
        body: JSON.stringify({ job_id: 'job123', user_id: 'user123' }),
      })

      // Mock database queries sequence
      let queryCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'job123', title: 'Software Engineer', company: 'Tech Corp' },
                  error: null
                }),
              }),
            }),
          }
        }

        if (table === 'base_resumes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { content: 'Resume content' },
                      error: null
                    })
                  })
                })
              })
            })
          }
        }

        if (table === 'user_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { scoring_preferences: { target_keywords: ['react'] } },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'applications') {
          return {
            update: mockUpdate
          }
        }

        return {}
      })

      const mockEq2 = vi.fn().mockResolvedValue({ error: null })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq1 })

      // Set up the mock return for applications table properly to capture arguments
      mockSupabase.from.mockImplementation((table: string) => {
        // ... (previous implementations)
        if (table === 'jobs') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'job123', title: 'Software Engineer', company: 'Tech Corp' }, error: null }) }) }) }
        if (table === 'base_resumes') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { content: 'Resume content' }, error: null }) }) }) }) }) }
        if (table === 'user_profiles') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { scoring_preferences: { target_keywords: ['react'] } }, error: null }) }) }) }
        if (table === 'applications') return { update: mockUpdate }
        return {}
      })

      const mockAiPackage = {
        cover_letter: "Test letter",
        elevator_pitch: "Test pitch",
        answers: {
          why_company: "Test company",
          why_role: "Test role",
          experience_years: "5",
          availability: "Now",
          salary_expectation: "100k",
          remote_preference: "Remote"
        },
        keywords_to_mention: ["react"],
        red_flags: [],
        application_tips: ["Be confident"]
      }

      // Mock OpenAI Response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify(mockAiPackage)
              }
            }
          ]
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.application_package).toEqual(mockAiPackage)

      // Verify db update was called and verify the updated data
      expect(mockSupabase.from).toHaveBeenCalledWith('applications')
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        application_package: mockAiPackage,
        package_generated_at: expect.any(String),
      }))
      expect(mockEq1).toHaveBeenCalledWith('job_id', 'job123')
      expect(mockEq2).toHaveBeenCalledWith('user_id', 'user123')
    })
  })
})
