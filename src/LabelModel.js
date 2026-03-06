window.LateLabels = window.LateLabels || {};

window.LateLabels.Model = (function() {
  // Session-level seen keys to avoid duplicate chips across repeated mutations
  let sessionSeen = new Set();
  let injectedAttendees = new Set(); // Track which attendees we've already injected for

  function buildCanonicalKey(attendee) {
    if (attendee.email) {
      return `email:${attendee.email.toLowerCase().trim()}`;
    }

    const normalizedName = (attendee.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, '-');

    if (normalizedName) {
      return `name:${normalizedName}`;
    }

    return attendee.id ? `id:${attendee.id.toLowerCase()}` : null;
  }

  function getAttendeeFromElement(element) {
    // Prefer hovercard id when present, fall back to data-email attribute
    const emailRaw = element.getAttribute('data-hovercard-id') || element.getAttribute('data-email');
    const email = emailRaw ? emailRaw.trim() : null;
    const text = (element.innerText || "").trim();
    const lines = text.split('\n').filter(t => t.trim().length > 0);

    // Skip attachment rows (drive attachments) which can look like list items
    if (!email && /attachment/i.test(text)) {
      return null;
    }

    if (lines.length === 0 && !email) {
      return null;
    }

    // PRIVACY: If only an email is found, strip the domain. 
    // Never display or store the full email string.
    let displayName = lines[0] || (email ? email.split('@')[0] : "Unknown");
    if (displayName.includes('@')) displayName = displayName.split('@')[0];

    // PRIVACY: Create a masked ID for storage lookups
    const base = (email || displayName).toLowerCase();
    const sanitizedEmailId = email ? email.toLowerCase().replace(/[^a-z0-9]/g, '-') : null;
    const privacyId = base.replace(/@.*/, '').replace(/[^a-z0-9]/g, '-');
    const finalId = sanitizedEmailId || privacyId;

    return { id: finalId, name: displayName, element: element, email: email || null };
  }

  async function processAttendees(elements) {
    const ignoreTerms = [
      "add guests", "join with", "location", "people", "yes", "no", "maybe", "agenda",
      "print", "duplicate", "publish", "report", "join by", "more phone", "minutes before",
      "10 minutes before", "tqv", "amsterdam", "room"
    ];

    // Deduplicate by a stable key for the session: prefer full email, else use full normalized name.
    for (const el of elements) {
      // Skip if element already has a chip attached
      if (el.querySelector('.late-ext-chip')) continue;
      
      // Skip if this element has already been processed
      if (el.dataset.lateExtProcessed === 'true') continue;

      // Allow processing even if this DOM node doesn't include an email attribute;
      // dedup will be handled below by comparing normalized keys across elements.

      const attendee = getAttendeeFromElement(el);
      if (!attendee) continue;

      const nameLower = (attendee.name || '').toLowerCase().trim();
      if (!attendee.email && nameLower.includes('attachment')) {
        continue;
      }

      // Normalize name to tokens (alphanumeric only) and skip if any token is an ignore term
      const nameTokens = nameLower.replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean);
      if (nameTokens.some(tok => ignoreTerms.includes(tok))) {
        continue;
      }

      const canonicalKey = buildCanonicalKey(attendee);
      if (!canonicalKey) continue;

      if (injectedAttendees.has(canonicalKey) || sessionSeen.has(canonicalKey)) {
        continue;
      }

      if (window.LateLabels.UI && typeof window.LateLabels.UI.injectChip === 'function') {
        // Provide a lateHour for coloring: prefer an explicit attribute, otherwise
        // derive a deterministic pseudo-hour from the attendee id so color is stable per person.
        const lateHourAttr = el.getAttribute('data-late-hour');
        if (lateHourAttr && !isNaN(Number(lateHourAttr))) {
          attendee.lateHour = Number(lateHourAttr);
        } else {
          const hash = (attendee.id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          attendee.lateHour = Math.abs(hash) % 24;
        }

        const injected = await window.LateLabels.UI.injectChip(attendee, el);
        if (injected) {
          sessionSeen.add(canonicalKey);
          injectedAttendees.add(canonicalKey);
          el.dataset.lateExtProcessed = "true";
        }
      }
    }
  }

  function reset() {
    sessionSeen.clear();
    injectedAttendees.clear();
  }

  return { processAttendees: processAttendees, reset: reset };
})();
