window.LateLabels = window.LateLabels || {};

window.LateLabels.UI = (function() {
  
  async function injectChip(attendee) {
    const { name, element, id } = attendee;
    const chipId = `late-chip-${id}`;
    
    if (document.getElementById(chipId)) return;

    let label = "Might skip"; 
    if (window.LateLabels.Storage) {
      // Use the privacy-safe ID for storage lookup instead of raw name/email
      const stored = await window.LateLabels.Storage.getStoredLabel(id);
      if (stored) label = stored;
    }

    const chip = document.createElement('span');
    chip.className = 'late-ext-chip';
    chip.id = chipId;
    chip.textContent = label;

    const nameTarget = element.querySelector('div[id*="name"]') || 
                       element.querySelector('span') || 
                       element.querySelector('div') ||
                       element.firstChild;
    
    if (nameTarget && nameTarget.after) {
      nameTarget.after(chip);
    } else {
      element.appendChild(chip);
    }

    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      renderEditPopover(chip, id); // Pass ID for storage persistence
    });
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
        // Persist using the ID
        await window.LateLabels.Storage.updateStoredLabel(id, newVal);
      }
      popover.remove();
    };

    popover.querySelector('#late-save-btn').onclick = saveLabel;
    popover.querySelector('#late-edit-input').onkeydown = (e) => {
      if (e.key === 'Enter') saveLabel();
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

  return {
    injectChip: injectChip
  };
})();