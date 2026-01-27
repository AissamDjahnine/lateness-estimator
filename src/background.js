// Service worker for Lateness Estimator extension
// Handles message passing from content scripts to access chrome.storage API

const STORAGE_KEY = 'lateLabels';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getLabel') {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const labels = result[STORAGE_KEY] || {};
      sendResponse({ label: labels[request.key] || null });
    });
    return true; // Keep channel open for async response
  } else if (request.action === 'updateLabel') {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const labels = result[STORAGE_KEY] || {};
      labels[request.key] = request.label;
      chrome.storage.local.set({ [STORAGE_KEY]: labels }, () => {
        sendResponse({ success: true });
      });
    });
    return true; // Keep channel open for async response
  }
});
