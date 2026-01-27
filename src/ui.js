window.LateLabels = window.LateLabels || {};

window.LateLabels.UI = (function() {
  // In-memory lock to avoid concurrent injections for the same dedup id
  const injectingKeys = new Set();

  async function injectChip(attendee, targetElement) {
    const { name, element, id } = attendee;
    // Use provided targetElement if available, otherwise fall back to attendee.element
    const parentEl = targetElement || element;
    if (!parentEl) {
      return;
    }
    
    const dedupId = id;
    const chipId = `late-chip-${dedupId}`;

    // STRICT DEDUPLICATION: Check a global chip marker and the row-specific class
    if (document.querySelector(`.late-ext-chip[data-late-key="${dedupId}"]`) || parentEl.querySelector('.late-ext-chip')) {
      return;
    }

    // Avoid races: if another injection is in-flight for this id, skip
    if (injectingKeys.has(dedupId)) return;
    injectingKeys.add(dedupId);

    try {

    // Deterministic label templates similar to requested examples:
    // "Usually 4m late", "Usually 7m late", "Will skip", "Typically on time", "Estimated 12m late"
    const templates = [
      { type: 'usually', fmt: (m) => `Usually ${m}m late` },
      { type: 'usually', fmt: (m) => `Usually ${m}m late` },
      { type: 'will-skip', fmt: () => `Will skip` },
      { type: 'ontime', fmt: () => `Typically on time` },
      { type: 'estimated', fmt: (m) => `Estimated ${m}m late` }
    ];

    // A small list of plausible minute values (includes 4,7,12 from your examples)
    const minuteBuckets = [2,3,4,5,7,8,10,12,15];

    // Deterministic selection based on id so label is consistent per person
    const idHash = ('' + id).split('').reduce((s,c)=>s + c.charCodeAt(0), 0);
    const tpl = templates[idHash % templates.length];
    const minute = minuteBuckets[idHash % minuteBuckets.length];

    let label = tpl.fmt(minute);
    try {
      if (window.LateLabels.Storage) {
        try {
          const stored = await window.LateLabels.Storage.getStoredLabel(id);
          if (stored) label = stored;
        } catch (err) {
          console.error('[injectChip] Error getting stored label:', err);
        }
      }
    } catch (e) {
      // ignore storage errors and keep deterministic label
    }

    const chip = document.createElement('span');
    chip.className = 'late-ext-chip';
    chip.id = chipId;
    chip.dataset.lateKey = dedupId;
    chip.dataset.lateLabel = label;
    chip.textContent = label;

    // Try to find the most specific name container
    const nameTarget = parentEl.querySelector('span[aria-label]') || 
                       parentEl.querySelector('div[id*="name"]') || 
                       parentEl.querySelector('span:not(.late-ext-chip)');

    // Only attach the chip if we found a clear name container that appears to contain the attendee's name.
    // This prevents chips appearing for locations/rooms or other UI rows.
    const normalizedAttName = (name || '').toLowerCase().trim();
    if (nameTarget && nameTarget.textContent && nameTarget.textContent.toLowerCase().includes(normalizedAttName)) {
      nameTarget.style.display = 'inline-flex';
      nameTarget.style.alignItems = 'center';
      nameTarget.appendChild(chip);
    } else {
      // If we couldn't find a matching name target, don't inject into generic rows (likely location/room)
      // Append only as a last resort if the parent explicitly looks like a person row (avatar present)
      const hasAvatar = !!parentEl.querySelector('img, svg, [role="img"], .avatar');
      if (hasAvatar) {
        parentEl.appendChild(chip);
      } else {
        // Do not inject for non-person rows
        chip.remove();
        return;
      }
    }

      // Color rules:
      // - 'ontime' -> green
      // - 'will-skip' -> red
      // - 'usually' or 'estimated' -> orange if 1-9 minutes, red if >9 minutes
      let colorClass = null;
      try {
        if (typeof tpl !== 'undefined' && tpl && tpl.type) {
          if (tpl.type === 'ontime') colorClass = 'late-green';
          else if (tpl.type === 'will-skip') colorClass = 'late-red';
          else if (tpl.type === 'usually' || tpl.type === 'estimated') {
            // minute variable computed above; if label was overridden, try to parse minutes from it
            let m = typeof minute !== 'undefined' ? minute : null;
            const mMatch = (label || '').match(/(\d+)m/);
            if (mMatch) m = Number(mMatch[1]);
            if (m !== null) {
              if (m >= 1 && m <= 9) colorClass = 'late-orange';
              else if (m > 9) colorClass = 'late-red';
            } else {
              colorClass = 'late-orange';
            }
          }
        }
      } catch (err) {
        // fallback to attendee.lateHour if anything fails
        const lateHour = (attendee && attendee.lateHour !== undefined) ? attendee.lateHour : null;
        if (lateHour !== null && !isNaN(Number(lateHour))) {
          const h = Number(lateHour);
          if (h >= 0 && h <= 8) colorClass = 'late-green';
          else if (h >= 9 && h <= 15) colorClass = 'late-orange';
          else colorClass = 'late-red';
        }
      }

      if (colorClass) chip.classList.add(colorClass);

      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        renderEditPopover(chip, id);
      });
    } finally {
      // release lock
      injectingKeys.delete(dedupId);
    }
  }

  function renderEditPopover(anchor, id) {
    const existing = document.querySelector('.late-ext-popover');
    if (existing) existing.remove();

    const popover = document.createElement('div');
    popover.className = 'late-ext-popover';
    popover.innerHTML = `
        <div class="late-popover-inner">
            <input type="text" id="late-edit-input" value="${anchor.textContent}" autofocus />
            <button id="late-save-btn">Save</button>
        </div>
    `;

    document.body.appendChild(popover);
    const rect = anchor.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 5}px`;
    popover.style.left = `${rect.left + window.scrollX}px`;

    const saveLabel = async () => {
      const newVal = document.getElementById('late-edit-input').value.trim();
      if (newVal && window.LateLabels.Storage) {
        anchor.textContent = newVal;
        await window.LateLabels.Storage.updateStoredLabel(id, newVal);
      }
      popover.remove();
    };

    popover.querySelector('#late-save-btn').onclick = saveLabel;
    popover.querySelector('#late-edit-input').onkeydown = (e) => { if (e.key === 'Enter') saveLabel(); };

    setTimeout(() => {
      const closer = (e) => {
        if (!popover.contains(e.target)) {
          popover.remove();
          document.removeEventListener('click', closer);
        }
      };
      document.addEventListener('click', closer);
    }, 0);
  }

  return { injectChip: injectChip };
})();