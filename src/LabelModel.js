window.LateLabels = window.LateLabels || {};

window.LateLabels.Model = (function() {
  function getAttendeeFromElement(element) {
    const email = element.getAttribute('data-email');
    const text = element.innerText || "";
    const lines = text.split('\n').filter(t => t.trim().length > 0);
    
    // If no text and no email, it's nothing
    if (lines.length === 0 && !email) return null;

    const name = lines[0] || email || "Unknown";
    const id = (email || name).toLowerCase().replace(/\s/g, '-');

    return {
      id: id,
      name: name,
      isConfirmed: !!email,
      element: element
    };
  }

  function processAttendees(elements) {
    const attendees = [];
    
    const ignoreTerms = [
      "add guests", "join with", "suggested times", "location", "notification",
      "print", "duplicate", "publish", "report as spam", "attachment",
      "use a document", "minutes before", "joining virtually", "meeting room",
      "copy conference", "guests", "more actions", "calendar",
      "feedback", "laptop", "tqv-", "todo", "follow-up",
      // NEW BLOCKED TERMS:
      "people", "yes", "no", "maybe", "pending", "awaiting",
      "progress", "agenda", "notes", "action items"
    ];

    elements.forEach(el => {
      if (el.dataset.lateExtProcessed) return;

      const attendee = getAttendeeFromElement(el);
      if (!attendee) return;

      const lowerName = attendee.name.toLowerCase();

      // Filter 1: Exact ignore terms
      if (ignoreTerms.some(term => lowerName.includes(term))) return;

      // Filter 2: Starts with number
      if (/^\d/.test(attendee.name)) return;

      // Filter 3: "The" check (Notes often start with "The")
      if (lowerName.startsWith("the ") || lowerName.startsWith("a ")) return;

      // Filter 4: Word count (Notes are long)
      if (!attendee.isConfirmed && attendee.name.split(' ').length > 4) return;
      
      // Filter 5: Short junk check
      if (!attendee.isConfirmed && attendee.name.length <= 3) return;

      // Mark processed
      el.dataset.lateExtProcessed = "true";
      
      attendees.push(attendee);
      
      if (window.LateLabels.UI) {
        window.LateLabels.UI.injectChip(attendee);
      }
    });

    return attendees;
  }

  return {
    processAttendees: processAttendees
  };
})();