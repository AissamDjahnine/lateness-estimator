window.LateLabels = window.LateLabels || {};

window.LateLabels.UI = (function() {
  
  function injectChip(attendee) {
    // Safety check: ensure element is still in DOM
    if (!attendee.element.isConnected) return;

    // Create the container for our label
    const chip = document.createElement('span');
    chip.className = 'late-ext-chip';
    
    // SIMPLE LOGIC FOR NOW: Randomly assign a status
    // We will make this persistent in the next step.
    const statuses = [
      "Typically on time",
      "Usually 2m late",
      "Est. 5m late",
      "Might skip",
      "Runs on coffee"
    ];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    chip.innerText = randomStatus;

    // Finding where to append:
    // We want it next to the name. The attendee element is usually a Flex container or list item.
    // We try to append it directly to the element.
    attendee.element.style.position = "relative"; // Ensure relative positioning context
    attendee.element.appendChild(chip);
  }

  return {
    injectChip: injectChip
  };
})();