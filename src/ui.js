window.LateLabels = window.LateLabels || {};

window.LateLabels.UI = (function() {
  
  function injectChip(attendee) {
    if (!attendee.element.isConnected) return;

    // 1. Create the skeleton chip immediately (empty)
    const chip = document.createElement('span');
    chip.className = 'late-ext-chip';
    chip.innerText = "..."; // Loading state
    
    // Append immediately so the user sees something happening
    attendee.element.style.position = "relative";
    attendee.element.appendChild(chip);

    // 2. Fetch the persistent label
    if (window.LateLabels.Storage) {
      window.LateLabels.Storage.getLabelForAttendee(attendee.id).then(label => {
        // Update the text once data is loaded
        chip.innerText = label;
      });
    } else {
      chip.innerText = "Storage Error";
    }
  }

  return {
    injectChip: injectChip
  };
})();