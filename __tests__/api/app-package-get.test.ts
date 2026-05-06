process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

import * as route from '../../src/app/api/app-package/route'

describe('GET /api/app-package', () => {
  it('should not export a GET handler', () => {
    // If it's not exported, Next.js handles it and returns 405 Method Not Allowed
    expect((route as any).GET).toBeUndefined();
  });
});
