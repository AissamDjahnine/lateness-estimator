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
    // Google Calendar event details usually appear in a role="dialog" or generic container
    // We are looking for the "Guests" section or email lists
    // For this step, we just want to verify we detect the dialog opening.
    
    // This selector matches the standard GCal event popover
    const eventDialog = document.querySelector('div[role="dialog"]');
    
    if (eventDialog) {
      console.log('Late Labels: Event dialog detected!');
      // Future steps: Extract attendees and inject UI here
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