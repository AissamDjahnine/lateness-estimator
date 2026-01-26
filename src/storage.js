window.LateLabels = window.LateLabels || {};

window.LateLabels.Storage = (function() {
  
  // Default phrases to pick from if no data exists
  const DEFAULTS = [
    "Typically on time",
    "Usually 2m late",
    "Est. 5m late",
    "Might skip",
    "Runs on coffee",
    "Wildcard entry",
    "Always early"
  ];

  function getLabelForAttendee(id) {
    return new Promise((resolve) => {
      chrome.storage.local.get([id], (result) => {
        if (result[id]) {
          // Return existing label
          resolve(result[id]);
        } else {
          // Generate new random label and save it
          const random = DEFAULTS[Math.floor(Math.random() * DEFAULTS.length)];
          saveLabel(id, random);
          resolve(random);
        }
      });
    });
  }

  function saveLabel(id, label) {
    const data = {};
    data[id] = label;
    chrome.storage.local.set(data);
  }

  return {
    getLabelForAttendee: getLabelForAttendee,
    saveLabel: saveLabel
  };
})();