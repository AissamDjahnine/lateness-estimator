window.LateLabels = window.LateLabels || {};

window.LateLabels.Storage = (function() {
  const STORAGE_KEY = 'lateLabels';

  async function updateStoredLabel(key, newLabel) {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const labels = result[STORAGE_KEY] || {};
        labels[key] = newLabel;
        chrome.storage.local.set({ [STORAGE_KEY]: labels }, () => {
          resolve();
        });
      });
    });
  }

  async function getStoredLabel(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const labels = result[STORAGE_KEY] || {};
        resolve(labels[key] || null);
      });
    });
  }

  return {
    updateStoredLabel: updateStoredLabel,
    getStoredLabel: getStoredLabel
  };
})();