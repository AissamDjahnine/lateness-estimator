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

    let label = "Might skip";
    try {
      if (window.LateLabels.Storage) {
        try {
          const stored = await window.LateLabels.Storage.getStoredLabel(id);
          if (stored) label = stored;
        } catch (err) {
          console.error('[injectChip] Error getting stored label:', err);
        }
      }

      const chip = document.createElement('span');
      chip.className = 'late-ext-chip';
      chip.id = chipId;
      chip.dataset.lateKey = dedupId;
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