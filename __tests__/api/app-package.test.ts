import { createClient } from '@supabase/supabase-js'

// Setting env vars for the tests before importing the route handler
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
process.env.OPENAI_API_KEY = 'mock-openai-key';

import { POST } from '../../src/app/api/app-package/route'

// Mock the dependencies
jest.mock('@supabase/supabase-js', () => {
  const chainableBuilder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    update: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => resolve({ error: null }))
  };

  const mSupabase = {
    from: jest.fn().mockReturnValue(chainableBuilder),
  };

  return {
    createClient: jest.fn(() => mSupabase),
  };
});

// Mock fetch for OpenAI
global.fetch = jest.fn();

describe('POST /api/app-package', () => {
  let supabaseMock: any;
  let builderMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked client instance
    supabaseMock = createClient('', '');
    builderMock = supabaseMock.from();
  });

  const createRequest = (body: any) => {
    return new Request('http://localhost/api/app-package', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    });
  };

  it('should return error if body is empty or invalid JSON', async () => {
    const req = new Request('http://localhost/api/app-package', {
      method: 'POST',
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toEqual({ success: false, error: 'Internal error' });

    consoleSpy.mockRestore();
  });

  it('should return validation error if job_id is missing', async () => {
    const req = createRequest({ user_id: 'user-1' });
    const res = await POST(req);
    const data = await res.json();

    expect(data).toEqual({ success: false, error: 'Missing job_id or user_id' });
  });

  it('should return validation error if user_id is missing', async () => {
    const req = createRequest({ job_id: 'job-1' });
    const res = await POST(req);
    const data = await res.json();

    expect(data).toEqual({ success: false, error: 'Missing job_id or user_id' });
  });

  it('should return "Job not found" if job_id and user_id are fake', async () => {
    builderMock.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    const req = createRequest({ job_id: 'fake-job', user_id: 'fake-user' });
    const res = await POST(req);
    const data = await res.json();

    expect(data).toEqual({ success: false, error: 'Job not found' });
  });

  it('should successfully generate and update package with valid mock data', async () => {
    const mockJob = {
      id: 'job-1', title: 'Developer', company: 'Tech Corp',
      description: 'Dev role', requirements: 'Node.js',
      nice_to_have: 'React', salary_range: '100k', location: 'Remote'
    };
    const mockResume = { content: 'My resume content', word_count: 3 };
    const mockProfile = { scoring_preferences: { target_keywords: ['node'] }, full_name: 'John Doe' };
    const mockAiPackage = { cover_letter: "Hello", elevator_pitch: "Hire me" };

    // 1st single() call: Job
    builderMock.single.mockResolvedValueOnce({ data: mockJob, error: null });
    // 2nd single() call: Resume
    builderMock.single.mockResolvedValueOnce({ data: mockResume, error: null });
    // 3rd single() call: Profile
    builderMock.single.mockResolvedValueOnce({ data: mockProfile, error: null });

    // Mock OpenAI fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: JSON.stringify(mockAiPackage) } }
        ]
      })
    });

    const req = createRequest({ job_id: 'job-1', user_id: 'user-1' });
    const res = await POST(req);
    const data = await res.json();

    expect(data).toEqual({ success: true, application_package: mockAiPackage });

    // Verify Supabase calls
    expect(supabaseMock.from).toHaveBeenCalledWith('applications');
    expect(builderMock.update).toHaveBeenCalledWith(expect.objectContaining({
      application_package: mockAiPackage,
      package_generated_at: expect.any(String),
    }));
  });
});
