const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const contentScriptPath = path.join(__dirname, '../content.js');
const contentScriptCode = fs.readFileSync(contentScriptPath, 'utf-8');

describe('Chrome Extension Content Script', () => {
  let dom;
  let originalConsoleError;

  beforeAll(() => {
    // Suppress console.error during tests for cleaner output when intentional errors happen
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const setupDOM = (html, url) => {
    dom = new JSDOM(html, {
      url,
      runScripts: 'dangerously'
    });

    // Patch JSDOM's timer to use the global fake timers
    dom.window.setTimeout = setTimeout;
    dom.window.clearTimeout = clearTimeout;

    // Patch MutationObserver since jsdom might missing it or it behaves weirdly
    dom.window.MutationObserver = class {
      observe() {}
      disconnect() {}
    };

    // Mock chrome.runtime.sendMessage
    const sendMessageMock = jest.fn();
    dom.window.chrome = {
      runtime: {
        sendMessage: sendMessageMock
      }
    };

    // Inject the script
    const script = dom.window.document.createElement('script');
    script.textContent = contentScriptCode;
    dom.window.document.body.appendChild(script);

    // Fire DOMContentLoaded to ensure the script's init function is called
    // because readyState is "loading" but JSDOM doesn't fire it automatically
    // when script is appended after JSDOM init
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    return sendMessageMock;
  };

  test('LinkedIn - extracts title, company, location correctly', () => {
    const html = `
      <html>
        <body>
          <h1 class="job-details-jobs-unified-top-card__job-title">Senior Frontend Developer</h1>
          <div class="job-details-jobs-unified-top-card__company-name">Test Company</div>
          <div class="job-details-jobs-unified-top-card__bullet">Remote</div>
          <div id="job-details">We are looking for a dev...</div>
        </body>
      </html>
    `;
    const sendMessageMock = setupDOM(html, 'https://www.linkedin.com/jobs/view/12345');

    // Fast-forward the setTimeout in content.js (1500ms)
    jest.advanceTimersByTime(1600);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'JOB_DATA',
      payload: {
        title: 'Senior Frontend Developer',
        company: 'Test Company',
        location: 'Remote',
        description: 'We are looking for a dev...',
        url: 'https://www.linkedin.com/jobs/view/12345',
        source: 'linkedin'
      }
    });
  });

  test('Indeed - extracts title, company, description correctly', () => {
    const html = `
      <html>
        <body>
          <h1 data-testid="jobsearch-JobInfoHeader-title">Fullstack Engineer</h1>
          <div data-testid="inlineHeader-companyName">IndeedTest</div>
          <div data-testid="jobsearch-CompanyHeaderLocation">Paris, France</div>
          <div id="jobDescriptionText">Awesome job description</div>
        </body>
      </html>
    `;
    const sendMessageMock = setupDOM(html, 'https://www.indeed.com/viewjob?jk=123');

    jest.advanceTimersByTime(1600);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'JOB_DATA',
      payload: {
        title: 'Fullstack Engineer',
        company: 'IndeedTest',
        location: 'Paris, France',
        description: 'Awesome job description',
        url: 'https://www.indeed.com/viewjob?jk=123',
        source: 'indeed'
      }
    });
  });

  test('WeWorkRemotely - extracts title, company correctly', () => {
    const html = `
      <html>
        <body>
          <h1 class="title">React Developer</h1>
          <div class="company-badge">WWR Company</div>
          <div class="region">Worldwide</div>
          <div class="content">Great remote job</div>
        </body>
      </html>
    `;
    const sendMessageMock = setupDOM(html, 'https://weworkremotely.com/jobs/react-developer');

    jest.advanceTimersByTime(1600);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'JOB_DATA',
      payload: {
        title: 'React Developer',
        company: 'WWR Company',
        location: 'Worldwide',
        description: 'Great remote job',
        url: 'https://weworkremotely.com/jobs/react-developer',
        source: 'weworkremotely'
      }
    });
  });

  test('RemoteOK - extracts title, company correctly', () => {
    const html = `
      <html>
        <body>
          <h1 itemprop="title">Backend Developer</h1>
          <div class="company">RemoteOK Inc</div>
          <div class="location">Anywhere</div>
          <div class="description">Cool backend role</div>
        </body>
      </html>
    `;
    const sendMessageMock = setupDOM(html, 'https://remoteok.com/remote-jobs/123');

    jest.advanceTimersByTime(1600);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'JOB_DATA',
      payload: {
        title: 'Backend Developer',
        company: 'RemoteOK Inc',
        location: 'Anywhere',
        description: 'Cool backend role',
        url: 'https://remoteok.com/remote-jobs/123',
        source: 'remoteok'
      }
    });
  });

  test('Unrecognized page - returns null without error', () => {
    const html = `
      <html>
        <body>
          <h1>Some Random Page</h1>
        </body>
      </html>
    `;
    const sendMessageMock = setupDOM(html, 'https://www.google.com');

    jest.advanceTimersByTime(1600);

    // sendMessage shouldn't be called because detectAndScrape returns null
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
