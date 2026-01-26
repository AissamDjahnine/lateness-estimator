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
    
    if (eventDialog) {
      // REMOVED 'li' from the selectors to stop catching meeting notes
      const selectors = 'div[role="listitem"], div[data-email], div[data-hovercard-id]';
      const possibleAttendees = eventDialog.querySelectorAll(selectors);
      
      if (possibleAttendees.length > 0) {
        if (window.LateLabels.Model) {
          window.LateLabels.Model.processAttendees(possibleAttendees);
        }
      }
    }
  }

  function init() {
    console.log('Late Labels: Observer initializing...');
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    observer = new MutationObserver(handleMutations);
    observer.observe(targetNode, config);
  }

  return {
    init: init
  };
})();