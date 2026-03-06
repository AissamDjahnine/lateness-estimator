window.LateLabels = window.LateLabels || {};

window.LateLabels.UI = (function() {
  // In-memory lock to avoid concurrent injections for the same dedup id
  const injectingKeys = new Set();

  function applyChipColor(chip, label, templateType, fallbackLateHour) {
    chip.classList.remove('late-green', 'late-orange', 'late-red');

    let colorClass = null;
    if (templateType === 'ontime') {
      colorClass = 'late-green';
    } else if (templateType === 'will-skip') {
      colorClass = 'late-red';
    } else {
      const normalizedLabel = (label || '').toLowerCase();
      const minuteMatch = normalizedLabel.match(/(\d+)m/);

      if (normalizedLabel.includes('on time')) {
        colorClass = 'late-green';
      } else if (normalizedLabel.includes('skip')) {
        colorClass = 'late-red';
      } else if (minuteMatch) {
        colorClass = Number(minuteMatch[1]) <= 9 ? 'late-orange' : 'late-red';
      } else if (fallbackLateHour !== null && fallbackLateHour !== undefined && !isNaN(Number(fallbackLateHour))) {
        const hour = Number(fallbackLateHour);
        if (hour <= 8) colorClass = 'late-green';
        else if (hour <= 15) colorClass = 'late-orange';
        else colorClass = 'late-red';
      }
    }

    if (colorClass) chip.classList.add(colorClass);
  }

  async function injectChip(attendee, targetElement) {
    const { name, element, id } = attendee;
    // Use provided targetElement if available, otherwise fall back to attendee.element
    const parentEl = targetElement || element;
    if (!parentEl) {
      return;
    }
    
    let dedupId = id;
    if (!dedupId) {
      const fallbackSeed = `${name || ''}::${(parentEl.textContent || '').slice(0, 80)}`;
      dedupId = fallbackSeed
        ? `fallback-${fallbackSeed.split('').reduce((s, c) => s + c.charCodeAt(0), 0)}`
        : `fallback-${Date.now()}`;
    }
    const chipId = `late-chip-${dedupId}`;

    // STRICT DEDUPLICATION: Check a global chip marker and the row-specific class
    if (document.querySelector(`.late-ext-chip[data-late-key="${dedupId}"]`) || parentEl.querySelector('.late-ext-chip')) {
      return false;
    }

    // Avoid races: if another injection is in-flight for this id, skip
    if (injectingKeys.has(dedupId)) return false;
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
    if (normalizedAttName && nameTarget && nameTarget.textContent && nameTarget.textContent.toLowerCase().includes(normalizedAttName)) {
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
        return false;
      }
    }

      applyChipColor(chip, label, tpl && tpl.type, attendee ? attendee.lateHour : null);

      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        renderEditPopover(chip, id);
      });
      return true;
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
    const inner = document.createElement('div');
    inner.className = 'late-popover-inner';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'late-edit-input';
    input.value = anchor.textContent || '';
    input.autofocus = true;
    const button = document.createElement('button');
    button.id = 'late-save-btn';
    button.textContent = 'Save';
    inner.appendChild(input);
    inner.appendChild(button);
    popover.appendChild(inner);

    document.body.appendChild(popover);
    const rect = anchor.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 5}px`;
    popover.style.left = `${rect.left + window.scrollX}px`;

    const saveLabel = async () => {
      const newVal = input.value.trim();
      if (newVal && window.LateLabels.Storage) {
        const previousLabel = anchor.textContent || '';
        try {
          anchor.textContent = newVal;
          anchor.dataset.lateLabel = newVal;
          applyChipColor(anchor, newVal, null, null);
          await window.LateLabels.Storage.updateStoredLabel(id, newVal);
          popover.remove();
        } catch (err) {
          anchor.textContent = previousLabel;
          anchor.dataset.lateLabel = previousLabel;
          applyChipColor(anchor, previousLabel, null, null);
          // Keep the popover open so the user can retry
          console.error('[saveLabel] Failed to persist label:', err);
        }
      } else {
        popover.remove();
      }
    };

    button.onclick = saveLabel;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') saveLabel();
      if (e.key === 'Escape') popover.remove();
    };

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
