/**
 * Unit tests for chrome-extension/content.js
 * Tests job scraping functionality for different job boards
 */

const { JSDOM } = require('jsdom');

// Test cases for different job boards
const testCases = [
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs/view/123456789',
    html: `
      <html>
        <body>
          <h1 class="job-details-jobs-unified-top-card__job-title">Senior Frontend Developer</h1>
          <span class="job-details-jobs-unified-top-card__company-name">Acme Corp</span>
          <span class="job-details-jobs-unified-top-card__bullet">Paris, France</span>
          <div id="job-details"><p>Job description here</p></div>
        </body>
      </html>
    `,
    expected: {
      title: 'Senior Frontend Developer',
      company: 'Acme Corp',
      location: 'Paris, France',
      description: 'Job description here',
      source: 'linkedin',
    },
  },
  {
    name: 'Indeed',
    url: 'https://www.indeed.com/viewjob?jk=abc123',
    html: `
      <html>
        <body>
          <h1 data-testid="jobsearch-JobInfoHeader-title">Software Engineer</h1>
          <span data-testid="inlineHeader-companyName">Tech Inc</span>
          <span data-testid="jobsearch-CompanyHeaderLocation">Remote</span>
          <div id="jobDescriptionText"><p>Indeed description</p></div>
        </body>
      </html>
    `,
    expected: {
      title: 'Software Engineer',
      company: 'Tech Inc',
      location: 'Remote',
      description: 'Indeed description',
      source: 'indeed',
    },
  },
  {
    name: 'WeWorkRemotely',
    url: 'https://weworkremotely.com/jobs/remote-frontend-developer',
    html: `
      <html>
        <body>
          <h1>Remote React Developer</h1>
          <a href="/companies/abc">StartupXYZ</a>
          <span class="location">Worldwide</span>
          <div class="description"><p>WWR description</p></div>
        </body>
      </html>
    `,
    expected: {
      title: 'Remote React Developer',
      company: 'StartupXYZ',
      location: 'Worldwide',
      description: 'WWR description',
      source: 'weworkremotely',
    },
  },
  {
    name: 'RemoteOK',
    url: 'https://remoteok.com/tabs/developer/12345',
    html: `
      <html>
        <body>
          <h1>Full Stack Engineer</h1>
          <a href="/company/xyz">DevCorp</a>
          <span class="tag">Europe</span>
          <div class="description"><p>RemoteOK description</p></div>
        </body>
      </html>
    `,
    expected: {
      title: 'Full Stack Engineer',
      company: 'DevCorp',
      location: 'Europe',
      description: 'RemoteOK description',
      source: 'remoteok',
    },
  },
  {
    name: 'Unknown site returns null',
    url: 'https://example.com/some-page',
    html: '<html><body><h1>Generic Page</h1></body></html>',
    expected: null,
  },
];

// Simple DOM simulation for testing
function createMockDOM(html) {
  const dom = new JSDOM(html, { url: 'https://example.com' });
  return dom.window.document;
}

// Scrape functions extracted from content.js for testing
function scrapeLinkedIn(doc) {
  const titleEl = doc.querySelector('.job-details-jobs-unified-top-card__job-title') ||
                doc.querySelector('h1') ||
                doc.querySelector('[data-test-job-id]');
  const title = titleEl?.textContent?.trim() || '';

  const companyEl = doc.querySelector('.job-details-jobs-unified-top-card__company-name') ||
                  doc.querySelector('.jobs-company-name') ||
                  doc.querySelector('[data-test-company-name]');
  const company = companyEl?.textContent?.trim() || '';

  const locationEl = doc.querySelector('.job-details-jobs-unified-top-card__bullet') ||
                  doc.querySelector('.jobs-location') ||
                  doc.querySelector('[data-test-location]');
  const location = locationEl?.textContent?.trim() || '';

  const descEl = doc.querySelector('#job-details') ||
              doc.querySelector('.job-details-content') ||
              doc.querySelector('[data-test-content]');
  const description = descEl?.textContent?.trim() || '';

  if (!title && !company) return null;

  return { title, company, location, description, source: 'linkedin' };
}

function scrapeIndeed(doc) {
  const titleEl = doc.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]') ||
                doc.querySelector('h1');
  const title = titleEl?.textContent?.trim() || '';

  const companyEl = doc.querySelector('[data-testid="inlineHeader-companyName"]') ||
                  doc.querySelector('.jobsearch-CompanyName-withTopNew');
  const company = companyEl?.textContent?.trim() || '';

  const locationEl = doc.querySelector('[data-testid="jobsearch-CompanyHeaderLocation"]') ||
                  doc.querySelector('.jobsearch-CompanyHeaderLocation');
  const location = locationEl?.textContent?.trim() || '';

  const descEl = doc.querySelector('#jobDescriptionText') ||
                doc.querySelector('.jobsearch-JobDescriptionText');
  const description = descEl?.textContent?.trim() || '';

  if (!title && !company) return null;

  return { title, company, location, description, source: 'indeed' };
}

function scrapeWeWorkRemotely(doc) {
  const titleEl = doc.querySelector('h1') || doc.querySelector('[class*="title"]');
  const title = titleEl?.textContent?.trim() || '';

  const companyEl = doc.querySelector('[class*="company"]') ||
                doc.querySelector('a[href*="/companies/"]');
  const company = companyEl?.textContent?.trim() || '';

  const locationEl = doc.querySelector('[class*="location"]') ||
                      doc.querySelector('[class*="region"]');
  const location = locationEl?.textContent?.trim() || 'Remote';

  const descEl = doc.querySelector('[class*="description"]') ||
                doc.querySelector('[class*="content"]');
  const description = descEl?.textContent?.trim() || '';

  if (!title && !company) return null;

  return { title, company, location, description, source: 'weworkremotely' };
}

function scrapeRemoteOK(doc) {
  const titleEl = doc.querySelector('h1') || doc.querySelector('[class*="job"]');
  const title = titleEl?.textContent?.trim() || '';

  const companyEl = doc.querySelector('[class*="company"]') ||
                  doc.querySelector('a[href*="/company/"]');
  const company = companyEl?.textContent?.trim() || '';

  const locationEl = doc.querySelector('[class*="location"]') ||
                      doc.querySelector('[class*="tag"]');
  const location = locationEl?.textContent?.trim() || 'Remote';

  const descEl = doc.querySelector('[class*="description"]') ||
                doc.querySelector('[class*="details"]');
  const description = descEl?.textContent?.trim() || '';

  if (!title && !company) return null;

  return { title, company, location, description, source: 'remoteok' };
}

function detectAndScrape(url, doc) {
  if (url.includes('linkedin.com/jobs/view')) {
    return scrapeLinkedIn(doc);
  }
  if (url.includes('indeed.com/viewjob')) {
    return scrapeIndeed(doc);
  }
  if (url.includes('weworkremotely.com/jobs')) {
    return scrapeWeWorkRemotely(doc);
  }
  if (url.includes('remoteok.com')) {
    return scrapeRemoteOK(doc);
  }
  return null;
}

// Test runner
function runTests() {
  console.log('🧪 Running content.js scraper tests...\n');
  
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const doc = createMockDOM(tc.html);
    const result = detectAndScrape(tc.url, doc);
    
    if (tc.expected === null) {
      if (result === null) {
        console.log(`✅ ${tc.name}: correctly returns null`);
        passed++;
      } else {
        console.log(`❌ ${tc.name}: expected null but got`, result);
        failed++;
      }
    } else {
      const titleMatch = result?.title === tc.expected.title;
      const companyMatch = result?.company === tc.expected.company;
      const locationMatch = result?.location === tc.expected.location;
      const sourceMatch = result?.source === tc.expected.source;
      
      if (titleMatch && companyMatch && locationMatch && sourceMatch) {
        console.log(`✅ ${tc.name}: scraped correctly`);
        passed++;
      } else {
        console.log(`❌ ${tc.name}: mismatch`);
        console.log('  Expected:', tc.expected);
        console.log('  Got:', result);
        failed++;
      }
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();