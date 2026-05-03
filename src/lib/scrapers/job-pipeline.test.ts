import { describe, it, expect } from 'vitest'
import { deduplicateJobs, scoreJobsAgainstCV } from './job-pipeline'

describe('job-pipeline', () => {
  it('deduplicates jobs correctly based on url', () => {
    const jobs = [
      { url: 'https://example.com/1', title: 'Job 1' },
      { url: 'https://example.com/2', title: 'Job 2' },
      { url: 'https://example.com/1', title: 'Job 1 Duplicate' },
    ]

    const deduped = deduplicateJobs(jobs)

    expect(deduped).toHaveLength(2)
    expect(deduped[0].url).toBe('https://example.com/1')
    expect(deduped[1].url).toBe('https://example.com/2')
  })

  it('scoreJobsAgainstCV assigns matchScore', async () => {
    const jobs = [
      { url: 'https://example.com/1', title: 'Job 1', matchScore: undefined },
      { url: 'https://example.com/2', title: 'Job 2', matchScore: 0.9 },
    ]

    const scored = await scoreJobsAgainstCV(jobs, 'user-1')

    expect(scored).toHaveLength(2)
    expect(scored[0].matchScore).toBeDefined()
    expect(typeof scored[0].matchScore).toBe('number')
    expect(scored[1].matchScore).toBe(0.9)
  })
})
