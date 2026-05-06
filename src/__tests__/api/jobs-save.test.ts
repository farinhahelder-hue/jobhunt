import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '../../app/api/jobs/save/route';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => {
  const mSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };
  return {
    createClient: jest.fn(() => mSupabase),
  };
});

// Import the mocked module
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient();

describe('/api/jobs/save', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: any, headers: Record<string, string> = {}) => {
    return new NextRequest('http://localhost:3000/api/jobs/save', {
      method: 'POST',
      headers: new Headers(headers),
      body: body ? JSON.stringify(body) : null,
    });
  };

  test('1. Valid POST -> returns { success: true, job_id, application_id } and CORS headers', async () => {
    // Mock auth
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    // Mock jobs query (not found, will insert)
    const mockJobsSelect = jest.fn().mockReturnValueOnce({ data: null });
    const mockJobsEq = jest.fn().mockReturnValueOnce({ single: mockJobsSelect });
    const mockJobsSelect2 = jest.fn().mockReturnValueOnce({ single: jest.fn().mockReturnValueOnce({ data: { id: 'new-job-1' }, error: null }) });
    const mockJobsInsert = jest.fn().mockReturnValueOnce({ select: mockJobsSelect2 });

    // Mock applications query (not found, will insert)
    const mockAppsSelect = jest.fn().mockReturnValueOnce({ data: null });
    const mockAppsEq2 = jest.fn().mockReturnValueOnce({ single: mockAppsSelect });
    const mockAppsEq1 = jest.fn().mockReturnValueOnce({ eq: mockAppsEq2 });

    const mockAppsSelect2 = jest.fn().mockReturnValueOnce({ single: jest.fn().mockReturnValueOnce({ data: { id: 'new-app-1' }, error: null }) });
    const mockAppsInsert = jest.fn().mockReturnValueOnce({ select: mockAppsSelect2 });

    supabase.from.mockImplementation((table) => {
      if (table === 'jobs') {
        return {
          select: jest.fn().mockReturnValueOnce({ eq: mockJobsEq }),
          insert: mockJobsInsert,
        };
      }
      if (table === 'applications') {
        return {
          select: jest.fn().mockReturnValueOnce({ eq: mockAppsEq1 }),
          insert: mockAppsInsert,
        };
      }
    });

    const req = createRequest(
      {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        description: 'Great job',
        url: 'https://example.com/job',
        source: 'linkedin',
        status: 'saved',
      },
      { authorization: 'Bearer valid-token' }
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      job_id: 'new-job-1',
      application_id: 'new-app-1',
      message: 'Job saved successfully',
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  test('2. Missing token -> 401 "Missing authorization header"', async () => {
    const req = createRequest({ title: 'A' }, {});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Missing authorization header');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  test('3. Invalid token -> 401 "Invalid or expired token"', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Invalid token'),
    });

    const req = createRequest(
      { title: 'A' },
      { authorization: 'Bearer invalid-token' }
    );
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Invalid or expired token');
  });

  test('4. Body incomplet (pas de title) -> 400 "Missing required fields"', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const req = createRequest(
      { company: 'Tech Corp', url: 'https://example.com/job' },
      { authorization: 'Bearer valid-token' }
    );
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Missing required fields');
  });

  test('5. Job déjà existant (même url_hash) -> upsert sans doublon', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    // Mock jobs existing
    const mockJobsSelect = jest.fn().mockReturnValueOnce({ data: { id: 'existing-job-1' } });
    const mockJobsEq = jest.fn().mockReturnValueOnce({ single: mockJobsSelect });
    const mockJobsEqUpdate = jest.fn();
    const mockJobsUpdate = jest.fn().mockReturnValueOnce({ eq: mockJobsEqUpdate });

    // Mock applications new
    const mockAppsSelect = jest.fn().mockReturnValueOnce({ data: null });
    const mockAppsEq2 = jest.fn().mockReturnValueOnce({ single: mockAppsSelect });
    const mockAppsEq1 = jest.fn().mockReturnValueOnce({ eq: mockAppsEq2 });

    const mockAppsSelect2 = jest.fn().mockReturnValueOnce({ single: jest.fn().mockReturnValueOnce({ data: { id: 'new-app-1' }, error: null }) });
    const mockAppsInsert = jest.fn().mockReturnValueOnce({ select: mockAppsSelect2 });

    supabase.from.mockImplementation((table) => {
      if (table === 'jobs') {
        return {
          select: jest.fn().mockReturnValueOnce({ eq: mockJobsEq }),
          update: mockJobsUpdate,
        };
      }
      if (table === 'applications') {
        return {
          select: jest.fn().mockReturnValueOnce({ eq: mockAppsEq1 }),
          insert: mockAppsInsert,
        };
      }
    });

    const req = createRequest(
      { title: 'Software Engineer', company: 'Tech Corp', url: 'https://example.com/job' },
      { authorization: 'Bearer valid-token' }
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.job_id).toBe('existing-job-1');
    expect(mockJobsUpdate).toHaveBeenCalled();
  });

  test('6. Application déjà existante -> update status sans doublon', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    // Mock jobs new
    const mockJobsSelect = jest.fn().mockReturnValueOnce({ data: null });
    const mockJobsEq = jest.fn().mockReturnValueOnce({ single: mockJobsSelect });
    const mockJobsSelect2 = jest.fn().mockReturnValueOnce({ single: jest.fn().mockReturnValueOnce({ data: { id: 'new-job-1' }, error: null }) });
    const mockJobsInsert = jest.fn().mockReturnValueOnce({ select: mockJobsSelect2 });

    // Mock applications existing
    const mockAppsSelect = jest.fn().mockReturnValueOnce({ data: { id: 'existing-app-1' } });
    const mockAppsEq2 = jest.fn().mockReturnValueOnce({ single: mockAppsSelect });
    const mockAppsEq1 = jest.fn().mockReturnValueOnce({ eq: mockAppsEq2 });

    const mockAppsEqUpdate = jest.fn();
    const mockAppsUpdate = jest.fn().mockReturnValueOnce({ eq: mockAppsEqUpdate });

    supabase.from.mockImplementation((table) => {
      if (table === 'jobs') {
        return {
          select: jest.fn().mockReturnValueOnce({ eq: mockJobsEq }),
          insert: mockJobsInsert,
        };
      }
      if (table === 'applications') {
        return {
          select: jest.fn().mockReturnValueOnce({ eq: mockAppsEq1 }),
          update: mockAppsUpdate,
        };
      }
    });

    const req = createRequest(
      { title: 'Software Engineer', company: 'Tech Corp', url: 'https://example.com/job' },
      { authorization: 'Bearer valid-token' }
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.application_id).toBe('existing-app-1');
    expect(mockAppsUpdate).toHaveBeenCalled();
  });

  test('7. OPTIONS preflight -> 204 avec headers CORS corrects', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
  });
});
