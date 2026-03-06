// Service worker for Lateness Estimator extension
// Handles message passing from content scripts to access chrome.storage API

const STORAGE_KEY = 'lateLabels';
let updateQueue = Promise.resolve();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getLabel') {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ label: null, error: chrome.runtime.lastError.message });
        return;
      }

      const labels = result[STORAGE_KEY] || {};
      sendResponse({ label: labels[request.key] || null });
    });
    return true; // Keep channel open for async response
  } else if (request.action === 'updateLabel') {
    updateQueue = updateQueue.catch(() => {}).then(() => new Promise((resolve, reject) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        const labels = result[STORAGE_KEY] || {};
        labels[request.key] = request.label;
        chrome.storage.local.set({ [STORAGE_KEY]: labels }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          resolve();
        });
      });
    }));

    updateQueue
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error && error.message ? error.message : String(error) }));
    return true; // Keep channel open for async response
  }
});
