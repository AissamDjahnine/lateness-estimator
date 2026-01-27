window.LateLabels = window.LateLabels || {};

window.LateLabels.Model = (function() {
  // Session-level seen keys to avoid duplicate chips across repeated mutations
  let sessionSeen = new Set();
  let injectedAttendees = new Set(); // Track which attendees we've already injected for
  function getAttendeeFromElement(element) {
    // Prefer hovercard id when present, fall back to data-email attribute
    const emailRaw = element.getAttribute('data-hovercard-id') || element.getAttribute('data-email');
    const email = emailRaw ? emailRaw.trim() : null;
    const text = (element.innerText || "").trim();
    const lines = text.split('\n').filter(t => t.trim().length > 0);

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

  function processAttendees(elements) {
    const ignoreTerms = [
      "add guests", "join with", "location", "people", "yes", "no", "maybe", "agenda",
      "print", "duplicate", "publish", "report", "join by", "more phone", "minutes before",
      "10 minutes before", "tqv", "amsterdam", "room"
    ];

    // Deduplicate by a stable key for the session: prefer email, else use last-name fallback
    elements.forEach(el => {
      // Skip if element already has a chip attached
      if (el.querySelector('.late-ext-chip')) return;
      
      // Skip if this element has already been processed
      if (el.dataset.lateExtProcessed === 'true') return;

      // Allow processing even if this DOM node doesn't include an email attribute;
      // dedup will be handled below by comparing normalized keys across elements.

      const attendee = getAttendeeFromElement(el);
      if (!attendee) return;

      const nameLower = (attendee.name || '').toLowerCase().trim();

      // Normalize name to tokens (alphanumeric only) and skip if any token is an ignore term
      const nameTokens = nameLower.replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean);
      if (nameTokens.some(tok => ignoreTerms.includes(tok))) {
        return;
      }

      // Build a set of possible dedupe keys for this attendee so variants map to the same logical person.
      const keys = new Set();

      // Add canonical full-email (if present) and local-part as keys
      if (attendee.email) {
        const fullEmail = attendee.email.toLowerCase().trim();
        keys.add(fullEmail);
        const local = fullEmail.split('@')[0].replace(/[^a-z0-9]/g, '');
        if (local) keys.add(local);
      }

      // 2) privacy id (derived earlier) without separators
      if (attendee.id) {
        keys.add(attendee.id.toLowerCase().replace(/[^a-z0-9]/g, ''));
      }

      // 3) last-name token fallback
      const tokens = nameLower.split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        keys.add(tokens[tokens.length - 1].replace(/[^a-z0-9]/g, ''));
      }

      // Determine if any of these keys already indicate we've injected for this person
      let alreadyInjected = false;
      for (const k of keys) {
        if (!k) continue;
        if (injectedAttendees.has(k)) { alreadyInjected = true; break; }
        // Also check DOM: a chip may already exist with a data-late-key from another run
        try {
          if (document.querySelector(`.late-ext-chip[data-late-key="${k}"]`)) { alreadyInjected = true; break; }
        } catch (e) {
          // ignore selector errors
        }
      }
      const dedupKey = attendee.email ? attendee.email.toLowerCase() : attendee.id;
      console.log('[LabelModel] Processing attendee:', attendee.name, 'email:', attendee.email, 'keys:', Array.from(keys), 'already injected:', alreadyInjected);
      if (alreadyInjected && el.querySelector('.late-ext-chip')) {
        console.log('[LabelModel] SKIPPING - already injected for keys:', Array.from(keys));
        return;
      }

      // If any of these keys were already seen AND the chip still exists in the element, skip
      let already = false;
      for (const k of keys) {
        if (!k) continue;
        if (sessionSeen.has(k)) { already = true; break; }
      }
      
      // Only skip if we've already seen it AND the chip is still in the DOM
      if (already && el.querySelector('.late-ext-chip')) {
        return;
      }

      // Mark all keys as seen for future deduping
      for (const k of keys) if (k) sessionSeen.add(k);
      
      // Mark this attendee as injected to prevent duplicate chips from multiple elements
      for (const k of keys) if (k) injectedAttendees.add(k);
      if (attendee.email) injectedAttendees.add(attendee.email.toLowerCase());
      console.log('[LabelModel] INJECTING chip for:', attendee.name, 'keys:', Array.from(keys));

      // Mark the element to avoid re-processing this exact DOM node
      el.dataset.lateExtProcessed = "true";

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

        window.LateLabels.UI.injectChip(attendee, el);
      }
    });
  }

  function reset() {
    sessionSeen.clear();
    injectedAttendees.clear();
  }

  return { processAttendees: processAttendees, reset: reset };
})();