// Background script - handles message passing between content script and popup

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle JOB_DATA from content script
  if (message.type === 'JOB_DATA') {
    // Store job data for popup to access
    chrome.storage.local.set({ current_job: message.payload });
    sendResponse({ success: true });
  }

  // Handle GET_JOB request from popup
  if (message.type === 'GET_JOB') {
    chrome.storage.local.get(['current_job'], (result) => {
      sendResponse({ job: result.current_job });
    });
    return true; // Keep channel open for async response
  }

  // Handle CLEAR_JOB request
  if (message.type === 'CLEAR_JOB') {
    chrome.storage.local.remove(['current_job'], () => {
      sendResponse({ success: true });
    });
  }

  return true;
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('JobHunt extension installed:', details.reason);
});

// Badge update when job is detected
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'JOB_DATA') {
    // Use browser.action for Firefox, chrome.action for Chrome
    const action = browser.action || chrome.action;
    action.setBadgeText({ text: '1' });
    action.setBadgeBackgroundColor({ color: '#6366f1' });
    
    // Clear badge after 5 seconds
    setTimeout(() => {
      action.setBadgeText({ text: '' });
    }, 5000);
  }
});