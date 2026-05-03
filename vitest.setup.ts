import { beforeAll, afterEach, afterAll } from 'vitest'

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-key'
})

afterEach(() => {
  // Clear any mocks after each test
  vi.clearAllMocks()
})

afterAll(() => {
  // Cleanup
  vi.resetAllMocks()
})