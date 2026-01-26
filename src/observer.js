window.LateLabels = window.LateLabels || {};

window.LateLabels.Observer = (function() {
  let observer = null;
  let debounceTimer = null;

  // We debounce to avoid running our logic 100 times per second while GCal animates
  function handleMutations(mutations) {
    if (debounceTimer) clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      checkForEventDialog();
    }, 200); // Wait 200ms after DOM stops changing
  }

  function checkForEventDialog() {
    const eventDialog = document.querySelector('div[role="dialog"]');
    
    if (eventDialog) {
      // Strategy: Attendees are almost always in role="listitem" elements.
      // We limit our search to inside the dialog to avoid side-panel noise.
      const listItems = eventDialog.querySelectorAll('div[role="listitem"]');
      
      if (listItems.length > 0) {
        if (window.LateLabels.Model) {
          window.LateLabels.Model.processAttendees(listItems);
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