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
      // UPDATED: Broader search strategy
      // 1. role="listitem" (standard lists)
      // 2. [data-email] (often attached to attendee divs)
      // 3. [data-hovercard-id] (hoverable people)
      // 4. li (sometimes guests are just list items)
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