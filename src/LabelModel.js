window.LateLabels = window.LateLabels || {};

window.LateLabels.Model = (function() {
  function getAttendeeFromElement(element) {
    const email = element.getAttribute('data-email');
    const text = (element.innerText || "").trim();
    const lines = text.split('\n').filter(t => t.trim().length > 0);
    
    if (lines.length === 0 && !email) return null;

    // Use name if available; if only email is found, use the part before '@' 
    // to avoid displaying the full email in the UI.
    let displayName = lines[0] || (email ? email.split('@')[0] : "Unknown");
    
    // Privacy: Create a persistent ID by cleaning the name/email 
    // without storing the full email string.
    const privacyId = (email || displayName)
      .toLowerCase()
      .replace(/@.*/, '') // Remove domain
      .replace(/[^a-z0-9]/g, '-');

    return {
      id: privacyId,
      name: displayName,
      isConfirmed: !!email,
      element: element
    };
  }

  function processAttendees(elements) {
    const ignoreTerms = [
      "add guests", "join with", "suggested times", "location", "notification",
      "print", "duplicate", "publish", "report as spam", "attachment",
      "use a document", "minutes before", "joining virtually", "meeting room",
      "copy conference", "guests", "more actions", "calendar",
      "feedback", "laptop", "tqv-", "todo", "follow-up",
      "people", "yes", "no", "maybe", "pending", "awaiting",
      "progress", "agenda", "notes", "action items"
    ];

    elements.forEach(el => {
      if (el.dataset.lateExtProcessed) return;

      const attendee = getAttendeeFromElement(el);
      if (!attendee) return;

      const lowerName = attendee.name.toLowerCase();

      if (ignoreTerms.some(term => lowerName.includes(term))) return;
      if (/^\d/.test(attendee.name)) return;
      if (lowerName.startsWith("the ") || lowerName.startsWith("a ")) return;
      if (!attendee.isConfirmed && attendee.name.split(' ').length > 4) return;
      if (!attendee.isConfirmed && attendee.name.length <= 3) return;

      el.dataset.lateExtProcessed = "true";
      
      if (window.LateLabels.UI) {
        window.LateLabels.UI.injectChip(attendee);
      }
    });
  }

  return {
    processAttendees: processAttendees
  };
})();