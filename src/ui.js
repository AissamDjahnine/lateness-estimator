window.LateLabels = window.LateLabels || {};

window.LateLabels.UI = (function() {
  
  function injectChip(attendee) {
    if (!attendee.element.isConnected) return;

    // 1. UNIQUE ID CHECK (The Fix for Duplicates)
    // We create a unique ID for the chip based on the person's name
    const chipId = 'late-chip-' + attendee.id;
    
    // If a chip for this person ALREADY exists anywhere on screen, stop.
    if (document.getElementById(chipId)) {
      // Optional: Check if the existing chip is inside the current element's parent? 
      // For now, strict 1-chip-per-person rule is safest.
      return; 
    }

    // 2. Element Safety Check
    // If this specific DOM element already has a chip, stop.
    if (attendee.element.querySelector('.late-ext-chip')) return;
    
    // 3. Create the chip
    const chip = document.createElement('span');
    chip.id = chipId; // Assign the ID so we can find it later
    chip.className = 'late-ext-chip';
    chip.innerText = "..."; 
    
    attendee.element.style.position = "relative";
    attendee.element.appendChild(chip);

    // 4. Load Data
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