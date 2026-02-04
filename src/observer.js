window.LateLabels = window.LateLabels || {};

window.LateLabels.Observer = (function() {
  let observer = null;
  let debounceTimer = null;
  let lastDialog = null;
  let initialized = false;
  let pollTimer = null;
  let dialogObserver = null;
  let dialogBurstTimer = null;

  function mutationsAffectDialog(mutations, dialog) {
    if (!dialog) return true;
    for (const mutation of mutations) {
      if (dialog.contains(mutation.target)) return true;
      for (const node of mutation.addedNodes || []) {
        if (node.nodeType === 1 && (node === dialog || dialog.contains(node))) return true;
      }
      for (const node of mutation.removedNodes || []) {
        if (node.nodeType === 1 && (node === dialog || dialog.contains(node))) return true;
      }
    }
    return false;
  }

  function handleMutations(mutations) {
    if (!mutationsAffectDialog(mutations, lastDialog)) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      checkForEventDialog();
    }, 200);
  }

  function checkForEventDialog() {
    const eventDialog = document.querySelector('div[role="dialog"]');

    if (!eventDialog) {
      // Dialog is gone — clear any session-level state in the model
      if (lastDialog && window.LateLabels && window.LateLabels.Model && typeof window.LateLabels.Model.reset === 'function') {
        window.LateLabels.Model.reset();
      }
      lastDialog = null;
      if (dialogObserver && typeof dialogObserver.disconnect === 'function') {
        dialogObserver.disconnect();
      }
      dialogObserver = null;
      return;
    }

    if (eventDialog !== lastDialog) {
      if (window.LateLabels && window.LateLabels.Model && typeof window.LateLabels.Model.reset === 'function') {
        window.LateLabels.Model.reset();
      }
      lastDialog = eventDialog;

      if (dialogObserver && typeof dialogObserver.disconnect === 'function') {
        dialogObserver.disconnect();
      }
      dialogObserver = new MutationObserver(handleMutations);
      dialogObserver.observe(eventDialog, { childList: true, subtree: true, characterData: true });

      // Burst re-checks to catch async content updates when switching events
      if (dialogBurstTimer) clearTimeout(dialogBurstTimer);
      let attempts = 0;
      const burst = () => {
        attempts += 1;
        checkForEventDialog();
        if (attempts < 5) {
          dialogBurstTimer = setTimeout(burst, 200);
        }
      };
      dialogBurstTimer = setTimeout(burst, 200);
    }

    // Broad selectors to ensure we catch attendees
    const selectors = 'div[role="listitem"], div[data-email], div[data-hovercard-id], li';
    const possibleAttendees = eventDialog.querySelectorAll(selectors);
    
    if (possibleAttendees.length > 0) {
      if (window.LateLabels.Model) {
        window.LateLabels.Model.processAttendees(possibleAttendees);
      }
    }
  }

  function init() {
    if (initialized) {
      checkForEventDialog();
      return;
    }
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    if (observer && typeof observer.disconnect === 'function') {
      observer.disconnect();
    }
    observer = new MutationObserver(handleMutations);
    observer.observe(targetNode, config);
    initialized = true;

    // Run an initial scan in case the dialog is already open
    checkForEventDialog();

    // Fallback checks for SPA navigation or UI updates that don't trigger mutations
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkForEventDialog();
    });
    window.addEventListener('focus', () => {
      checkForEventDialog();
    });

    if (!pollTimer) {
      pollTimer = setInterval(() => {
        checkForEventDialog();
      }, 1200);
    }
  }

  return {
    init: init
  };
})();
