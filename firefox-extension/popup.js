// Popup script - handles UI interactions and saving jobs

// Constants
const API_BASE = 'https://jobhunt-git-main-farinhahelder-1210s-projects.vercel.app';
const JOBHUNT_APP_URL = 'https://jobhunt-git-main-farinhahelder-1210s-projects.vercel.app';

// State
let currentJob = null;
let authToken = null;

// DOM Elements
const appEl = document.getElementById('app');
const notAuthEl = document.getElementById('not-auth');
const noJobEl = document.getElementById('no-job');
const jobTitleEl = document.getElementById('job-title');
const jobCompanyEl = document.getElementById('job-company');
const jobLocationEl = document.getElementById('job-location');
const jobSourceEl = document.getElementById('job-source');
const statusSelectEl = document.getElementById('status');
const saveBtnEl = document.getElementById('save-btn');
const logoutBtnEl = document.getElementById('logout-btn');
const statusMsgEl = document.getElementById('status-msg');

// Initialize popup
async function init() {
  // Check authentication
  authToken = await getAuthToken();
  
  if (!authToken) {
    showNotAuthenticated();
    return;
  }

  // Try to get job data from storage (set by content script)
  currentJob = await getJobData();
  
  if (!currentJob) {
    showNoJob();
    return;
  }

  // Show job preview
  showJobPreview();
}

// Get auth token from storage
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['jobhunt_token'], (result) => {
      resolve(result.jobhunt_token || null);
    });
  });
}

// Get job data from storage
async function getJobData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['current_job'], (result) => {
      resolve(result.current_job || null);
    });
  });
}

// Save auth token to storage
async function setAuthToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ jobhunt_token: token }, resolve);
  });
}

// Remove auth token from storage
async function removeAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['jobhunt_token'], resolve);
  });
}

// Clear job data from storage
async function clearJobData() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['current_job'], resolve);
  });
}

// Show job preview
function showJobPreview() {
  appEl.classList.remove('hidden');
  noJobEl.classList.add('hidden');
  notAuthEl.classList.add('hidden');

  jobTitleEl.textContent = currentJob.title || 'Unknown Position';
  jobCompanyEl.textContent = currentJob.company || 'Unknown Company';
  jobLocationEl.textContent = currentJob.location || '';
  jobSourceEl.textContent = currentJob.source || '';
}

// Show not authenticated UI
function showNotAuthenticated() {
  appEl.classList.add('hidden');
  noJobEl.classList.add('hidden');
  notAuthEl.classList.remove('hidden');
}

// Show no job detected UI
function showNoJob() {
  appEl.classList.add('hidden');
  notAuthEl.classList.add('hidden');
  noJobEl.classList.remove('hidden');
}

// Show status message
function showStatus(message, type) {
  statusMsgEl.textContent = message;
  statusMsgEl.className = `status status-${type}`;
  statusMsgEl.classList.remove('hidden');
}

// Hide status message
function hideStatus() {
  statusMsgEl.classList.add('hidden');
}

// Save job to JobHunt
async function saveJob() {
  if (!currentJob || !authToken) {
    showStatus('Not authenticated', 'error');
    return;
  }

  // Show loading
  saveBtnEl.disabled = true;
  saveBtnEl.textContent = '⏳ Saving...';
  hideStatus();

  try {
    const response = await fetch(`${API_BASE}/api/jobs/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: currentJob.title,
        company: currentJob.company,
        location: currentJob.location,
        description: currentJob.description,
        url: currentJob.url,
        source: currentJob.source,
        status: statusSelectEl.value
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to save job');
    }

    showStatus('✅ Job saved successfully!', 'success');
    
    // Clear job data after successful save
    await clearJobData();
    
    // Disable button after save
    saveBtnEl.textContent = '✓ Saved';
    
  } catch (error) {
    console.error('Save error:', error);
    
    // If authentication error, prompt re-auth
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      showStatus('Session expired. Please reconnect.', 'error');
      await removeAuthToken();
      setTimeout(() => {
        window.open(JOBHUNT_APP_URL + '/login', '_blank');
      }, 1500);
    } else {
      showStatus(`❌ ${error.message}`, 'error');
    }
    
    saveBtnEl.disabled = false;
    saveBtnEl.textContent = '💾 Save to JobHunt';
  }
}

// Handle logout
async function handleLogout() {
  await removeAuthToken();
  showNotAuthenticated();
}

// Event listeners
saveBtnEl.addEventListener('click', saveJob);
logoutBtnEl.addEventListener('click', handleLogout);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);