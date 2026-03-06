window.LateLabels = window.LateLabels || {};

window.LateLabels.Storage = (function() {
  const STORAGE_KEY = 'lateManualLabels';
  const SETTINGS_KEY = 'lateSettings';
  const DEFAULT_SETTINGS = { mode: 'playful' };

  function isBenignRuntimeError(error) {
    const message = error && error.message ? error.message : String(error || '');
    return message.includes('Extension context invalidated') ||
      message.includes('message port closed before a response was received') ||
      message.includes('Receiving end does not exist');
  }

  async function updateStoredLabel(key, newLabel) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        reject(new Error('chrome.runtime not available'));
        return;
      }
      chrome.runtime.sendMessage(
        { action: 'updateLabel', key: key, label: newLabel },
        (response) => {
          if (chrome.runtime.lastError) {
            if (isBenignRuntimeError(chrome.runtime.lastError)) {
              resolve();
              return;
            }
            reject(chrome.runtime.lastError);
          } else if (response && response.success === false) {
            reject(new Error(response.error || 'Failed to update label'));
          } else {
            resolve();
          }
        }
      );
    });
  }

  async function getStoredLabel(key) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        reject(new Error('chrome.runtime not available'));
        return;
      }
      chrome.runtime.sendMessage(
        { action: 'getLabel', key: key },
        (response) => {
          if (chrome.runtime.lastError) {
            if (isBenignRuntimeError(chrome.runtime.lastError)) {
              resolve(null);
              return;
            }
            reject(chrome.runtime.lastError);
          } else {
            resolve(response?.label || null);
          }
        }
      );
    });
  }

  async function getSettings() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }

      chrome.storage.local.get(SETTINGS_KEY, (result) => {
        if (chrome.runtime && chrome.runtime.lastError && !isBenignRuntimeError(chrome.runtime.lastError)) {
          resolve({ ...DEFAULT_SETTINGS });
          return;
        }

        resolve({
          ...DEFAULT_SETTINGS,
          ...(result && result[SETTINGS_KEY] ? result[SETTINGS_KEY] : {})
        });
      });
    });
  }

  return {
    updateStoredLabel: updateStoredLabel,
    getStoredLabel: getStoredLabel,
    getSettings: getSettings
  };
})();
