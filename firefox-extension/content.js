// Content script - scrapes job data from job boards
// Sends data to popup via chrome.runtime.sendMessage

(function() {
  'use strict';

  // Detect which job board we're on and extract job data
  function detectAndScrape() {
    const url = window.location.href;

    // LinkedIn job posting
    if (url.includes('linkedin.com/jobs/view')) {
      return scrapeLinkedIn();
    }

    // Indeed job posting
    if (url.includes('indeed.com/viewjob')) {
      return scrapeIndeed();
    }

    // We Work Remotely
    if (url.includes('weworkremotely.com/jobs')) {
      return scrapeWeWorkRemotely();
    }

    // Remote OK
    if (url.includes('remoteok.com')) {
      return scrapeRemoteOK();
    }

    // Welcome to the Jungle
    if (url.includes('welcometothejungle.com/jobs')) {
      return scrapeWelcomeToTheJungle();
    }

    return null;
  }

  // Scrape LinkedIn job
  function scrapeLinkedIn() {
    try {
      // Title - multiple selectors for reliability
      const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title') ||
                    document.querySelector('h1') ||
                    document.querySelector('[data-test-job-id]');
      const title = titleEl?.textContent?.trim() || '';

      // Company
      const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name') ||
                      document.querySelector('.jobs-company-name') ||
                      document.querySelector('[data-test-company-name]');
      const company = companyEl?.textContent?.trim() || '';

      // Location
      const locationEl = document.querySelector('.job-details-jobs-unified-top-card__bullet') ||
                      document.querySelector('.jobs-location') ||
                      document.querySelector('[data-test-location]');
      const location = locationEl?.textContent?.trim() || '';

      // Description
      const descEl = document.querySelector('#job-details') ||
                    document.querySelector('.job-details-content') ||
                    document.querySelector('[data-test-content]');
      const description = descEl?.textContent?.trim() || '';

      if (!title && !company) {
        return null;
      }

      return {
        title,
        company,
        location,
        description,
        url: window.location.href,
        source: 'linkedin'
      };
    } catch (e) {
      console.error('JobHunt: LinkedIn scrape error', e);
      return null;
    }
  }

  // Scrape Indeed job
  function scrapeIndeed() {
    try {
      // Title
      const titleEl = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]') ||
                    document.querySelector('h1[data-testid="jobsearch-JobInfoHeader-title"]') ||
                    document.querySelector('h1');
      const title = titleEl?.textContent?.trim() || '';

      // Company
      const companyEl = document.querySelector('[data-testid="inlineHeader-companyName"]') ||
                      document.querySelector('.jobsearch-CompanyName-withTopNew') ||
                      document.querySelector('[data-test-company]');
      const company = companyEl?.textContent?.trim() || '';

      // Location
      const locationEl = document.querySelector('[data-testid="jobsearch-CompanyHeaderLocation"]') ||
                      document.querySelector('.jobsearch-CompanyHeaderLocation') ||
                      document.querySelector('[data-test-location]');
      const location = locationEl?.textContent?.trim() || '';

      // Description
      const descEl = document.querySelector('#jobDescriptionText') ||
                    document.querySelector('.jobsearch-JobDescriptionText') ||
                    document.querySelector('[data-test-description]');
      const description = descEl?.textContent?.trim() || '';

      if (!title && !company) {
        return null;
      }

      return {
        title,
        company,
        location,
        description,
        url: window.location.href,
        source: 'indeed'
      };
    } catch (e) {
      console.error('JobHunt: Indeed scrape error', e);
      return null;
    }
  }

  // Scrape We Work Remotely
  function scrapeWeWorkRemotely() {
    try {
      const titleEl = document.querySelector('h1') || document.querySelector('[class*="title"]');
      const title = titleEl?.textContent?.trim() || '';

      // Company often in the company details section
      const companyEl = document.querySelector('[class*="company"]') ||
                      document.querySelector('a[href*="/companies/"]') ||
                      document.querySelector('[class*="company-badge"]');
      const company = companyEl?.textContent?.trim() || '';

      const locationEl = document.querySelector('[class*="location"]') ||
                      document.querySelector('[class*="region"]');
      const location = locationEl?.textContent?.trim() || 'Remote';

      const descEl = document.querySelector('[class*="description"]') ||
                    document.querySelector('[class*="content"]');
      const description = descEl?.textContent?.trim() || '';

      if (!title && !company) {
        return null;
      }

      return {
        title,
        company,
        location,
        description,
        url: window.location.href,
        source: 'weworkremotely'
      };
    } catch (e) {
      console.error('JobHunt: WeWorkRemotely scrape error', e);
      return null;
    }
  }

  // Scrape Remote OK
  function scrapeRemoteOK() {
    try {
      const titleEl = document.querySelector('h1') || document.querySelector('[class*="job"]');
      const title = titleEl?.textContent?.trim() || '';

      const companyEl = document.querySelector('[class*="company"]') ||
                      document.querySelector('a[href*="/company/"]');
      const company = companyEl?.textContent?.trim() || '';

      const locationEl = document.querySelector('[class*="location"]') ||
                      document.querySelector('[class*="tag"]');
      const location = locationEl?.textContent?.trim() || 'Remote';

      const descEl = document.querySelector('[class*="description"]') ||
                    document.querySelector('[class*="details"]') ||
                    document.querySelector('[class*="content"]');
      const description = descEl?.textContent?.trim() || '';

      if (!title && !company) {
        return null;
      }

      return {
        title,
        company,
        location,
        description,
        url: window.location.href,
        source: 'remoteok'
      };
    } catch (e) {
      console.error('JobHunt: RemoteOK scrape error', e);
      return null;
    }
  }

  // Scrape Welcome to the Jungle
  function scrapeWelcomeToTheJungle() {
    try {
      // Title - WTTJ uses various selectors
      const titleEl = document.querySelector('h1') || 
                      document.querySelector('[class*="title"]') ||
                      document.querySelector('[data-testid="job-title"]');
      const title = titleEl?.textContent?.trim() || '';

      // Company - company info in the company card/badges
      const companyEl = document.querySelector('[class*="company"]') ||
                      document.querySelector('[class*="employer"]') ||
                      document.querySelector('a[href*="/companies/"]') ||
                      document.querySelector('[data-testid="company-name"]');
      const company = companyEl?.textContent?.trim() || '';

      // Location
      const locationEl = document.querySelector('[class*="location"]') ||
                      document.querySelector('[class*="place"]') ||
                      document.querySelector('[data-testid="location"]');
      const location = locationEl?.textContent?.trim() || 'Remote';

      // Description - WTTJ job details
      const descEl = document.querySelector('[class*="description"]') ||
                    document.querySelector('[class*="content"]') ||
                    document.querySelector('[class*="details"]') ||
                    document.querySelector('[data-testid="job-description"]');
      const description = descEl?.textContent?.trim() || '';

      if (!title && !company) {
        return null;
      }

      return {
        title,
        company,
        location,
        description,
        url: window.location.href,
        source: 'welcometothejungle'
      };
    } catch (e) {
      console.error('JobHunt: Welcome to the Jungle scrape error', e);
      return null;
    }
  }

  // Wait for page to be fully loaded
  function init() {
    // Initial scrape after short delay
    setTimeout(() => {
      const jobData = detectAndScrape();
      if (jobData) {
        // Send to background/popup
        chrome.runtime.sendMessage({
          type: 'JOB_DATA',
          payload: jobData
        });
      }
    }, 1500);

    // Also try on navigation (for SPAs)
    let lastUrl = window.location.href;
    new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setTimeout(() => {
          const jobData = detectAndScrape();
          if (jobData) {
            chrome.runtime.sendMessage({
              type: 'JOB_DATA',
              payload: jobData
            });
          }
        }, 1500);
      }
    }).observe(document.body, { subtree: true, childList: true });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();