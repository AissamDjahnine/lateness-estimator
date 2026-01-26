window.LateLabels = window.LateLabels || {};

window.LateLabels.Storage = (function() {
  const STORAGE_KEY = 'lateLabels';

  async function updateStoredLabel(name, newLabel) {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const labels = result[STORAGE_KEY] || {};
        labels[name] = newLabel;
        chrome.storage.local.set({ [STORAGE_KEY]: labels }, () => {
          resolve();
        });
      });
    });
  }

  async function getStoredLabel(name) {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const labels = result[STORAGE_KEY] || {};
        resolve(labels[name] || null);
      });
    });
  }

  return {
    updateStoredLabel: updateStoredLabel,
    getStoredLabel: getStoredLabel
  };
})();