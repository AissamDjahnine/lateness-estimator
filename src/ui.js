window.LateLabels = window.LateLabels || {};

window.LateLabels.UI = (function() {
  
  function injectChip(attendee) {
    if (!attendee.element.isConnected) return;

    // SAFETY CHECK: If this element (or its children) already has a chip, STOP.
    if (attendee.element.querySelector('.late-ext-chip')) return;
    
    // Create the skeleton chip
    const chip = document.createElement('span');
    chip.className = 'late-ext-chip';
    chip.innerText = "..."; 
    
    attendee.element.style.position = "relative";
    attendee.element.appendChild(chip);

    if (window.LateLabels.Storage) {
      window.LateLabels.Storage.getLabelForAttendee(attendee.id).then(label => {
        chip.innerText = label;
      });
    } else {
      chip.innerText = "Err";
    }
  }

  return {
    injectChip: injectChip
  };
})();