const SETTINGS_KEY = 'lateSettings';
const DEFAULT_SETTINGS = { mode: 'playful' };

function getSelectedMode() {
  const checked = document.querySelector('input[name="mode"]:checked');
  return checked ? checked.value : DEFAULT_SETTINGS.mode;
}

function setStatus(message) {
  const status = document.getElementById('status');
  status.textContent = message;
}

function applySettings(settings) {
  const mode = settings && settings.mode ? settings.mode : DEFAULT_SETTINGS.mode;
  const input = document.querySelector(`input[name="mode"][value="${mode}"]`);
  if (input) input.checked = true;
}

function loadSettings() {
  chrome.storage.local.get(SETTINGS_KEY, (result) => {
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(result && result[SETTINGS_KEY] ? result[SETTINGS_KEY] : {})
    };
    applySettings(settings);
  });
}

function saveSettings() {
  const mode = getSelectedMode();
  chrome.storage.local.set({ [SETTINGS_KEY]: { mode: mode } }, () => {
    setStatus('Saved. Reload Google Calendar to apply the new mode.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  document.getElementById('save-button').addEventListener('click', saveSettings);
  document.getElementById('mode-form').addEventListener('change', () => {
    setStatus('');
  });
});
