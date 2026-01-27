window.LateLabels = window.LateLabels || {};

window.LateLabels.Observer = (function() {
  let observer = null;
  let debounceTimer = null;

  function handleMutations(mutations) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      checkForEventDialog();
    }, 200);
  }

  function checkForEventDialog() {
    const eventDialog = document.querySelector('div[role="dialog"]');

    if (!eventDialog) {
      // Dialog is gone — clear any session-level state in the model
      if (window.LateLabels && window.LateLabels.Model && typeof window.LateLabels.Model.reset === 'function') {
        window.LateLabels.Model.reset();
      }
    }

    if (eventDialog) {
      // Broad selectors to ensure we catch attendees
      const selectors = 'div[role="listitem"], div[data-email], div[data-hovercard-id], li';
      const possibleAttendees = eventDialog.querySelectorAll(selectors);
      
      if (possibleAttendees.length > 0) {
        if (window.LateLabels.Model) {
          window.LateLabels.Model.processAttendees(possibleAttendees);
        }
      }
    }
  }

  function init() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    observer = new MutationObserver(handleMutations);
    observer.observe(targetNode, config);
  }

  return {
    init: init
  };
})();