# Save to JobPilot - Firefox Extension

A Firefox extension to save job listings directly from LinkedIn, Indeed, We Work Remotely, and Remote OK to your JobPilot board.

## Features

- **Auto-detect job postings** on supported job boards
- **One-click save** to your JobHunt board
- **Status selection** (wishlist, saved, applied, interviewing)
- **Works offline** - saves when you're back online

## Supported Job Boards

- LinkedIn Jobs (linkedin.com/jobs/view/*)
- Indeed (indeed.com/viewjob*)
- We Work Remotely (weworkremotely.com/jobs/*)
- Remote OK (remoteok.com/*)
- Welcome to the Jungle (welcometothejungle.com/jobs/*)

## Chrome Web Store

1. Create developer account: https://chrome.google.com/webstore/devconsole/ ($5 one-time)
2. Zip extension: `zip -r jobpilot-extension.zip chrome-extension/`
3. Upload zip
4. Submit for review

## Mozilla Add-ons (Firefox)

1. Create developer account: https://addons.mozilla.org/developers/ (free)
2. Upload a zip of the firefox-extension folder
3. Submit for review (~24-48h)

## Privacy

### From Source (Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/farinhahelder-hue/jobhunt.git
   cd jobhunt
   ```

2. Navigate to the extension folder:
   ```bash
   cd chrome-extension
   ```

3. Load in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the `chrome-extension` folder

### First Setup

1. Open the JobHunt app at: https://jobhunt-git-main-farinhahelder-1210s-projects.vercel.app
2. Log in or create an account
3. Open the extension popup
4. Click "🔑 Connect to JobHunt" (if prompted)
5. Complete authentication in the opened tab

## Usage

### Saving a Job

1. Visit a job posting on LinkedIn, Indeed, or another supported site
2. Click the extension icon (or it auto-detects)
3. Review the job details in the popup
4. Select initial status (wishlist, saved, applied, interviewing)
5. Click "💾 Save to JobHunt"
6. Job is added to your board!

### Managing Authentication

- The extension stores your JWT token securely in Chrome storage
- If your session expires, simply reconnect via the "🔑 Connect" button
- Use "Disconnect" to log out from the extension

## Troubleshooting

### "No job listing detected"

The extension didn't detect a job on the current page. Make sure:
- You're on a job posting page (not search results)
- The page has fully loaded
- The job board is in the supported list

### "Failed to save"

- Check your internet connection
- Verify you're logged into JobHunt
- Try reconnecting via the "🔑 Connect" button

### Extension not working

- Make sure the extension is enabled in `chrome://extensions`
- Try reloading the extension
- Check the extension badge for errors

## Development

### Building

If you make changes to the extension:

1. Ensure all files are in the `chrome-extension/` folder
2. Reload the extension in Chrome (click refresh icon)
3. Test the changes

### File Structure

```
chrome-extension/
├── manifest.json      # Extension manifest (V3)
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
├── content.js         # Content script (job scraping)
├── background.js     # Background worker
├── icons/             # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md         # This file
```

### API Endpoint

The extension uses the `/api/jobs/save` endpoint to create jobs. This endpoint:
- Accepts job data (title, company, location, description, url, source)
- Creates/updates job in the `jobs` table
- Creates/updates application in the `applications` table
- Uses Supabase Auth for token verification
- Returns `{ success: true, job_id, application_id }`

## License

MIT