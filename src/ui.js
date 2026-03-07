window.LateLabels = window.LateLabels || {};

window.LateLabels.UI = (function() {
  // In-memory lock to avoid concurrent injections for the same dedup id
  const injectingKeys = new Set();
  let settingsPromise = null;
  let activeDialogSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function normalizeText(value) {
    return (value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findNameTarget(parentEl, attendeeName) {
    const normalizedAttName = normalizeText(attendeeName);
    if (!normalizedAttName) return null;

    const candidates = Array.from(parentEl.querySelectorAll('span, div'))
      .filter((node) => {
        if (!node || node.classList.contains('late-ext-chip')) return false;
        if (node.querySelector('.late-ext-chip')) return false;
        if (node.querySelector('a, button, input, textarea')) return false;

        const text = normalizeText(node.textContent);
        if (!text) return false;
        if (!text.includes(normalizedAttName)) return false;
        if (text.length > Math.max(120, normalizedAttName.length + 80)) return false;

        return true;
      })
      .sort((a, b) => {
        const aTextLength = normalizeText(a.textContent).length;
        const bTextLength = normalizeText(b.textContent).length;
        const aChildren = a.querySelectorAll('span, div').length;
        const bChildren = b.querySelectorAll('span, div').length;

        return (aTextLength - bTextLength) || (aChildren - bChildren);
      });

    return candidates[0] || null;
  }

  function placeChipNearName(nameTarget, chip, parentEl) {
    if (!nameTarget) return false;

    if (nameTarget.parentNode) {
      nameTarget.insertAdjacentElement('afterend', chip);
      return true;
    }

    if (parentEl) {
      parentEl.appendChild(chip);
      return true;
    }

    return false;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function mixColor(start, end, weight) {
    const safeWeight = clamp(weight, 0, 1);
    return {
      r: Math.round(start.r + (end.r - start.r) * safeWeight),
      g: Math.round(start.g + (end.g - start.g) * safeWeight),
      b: Math.round(start.b + (end.b - start.b) * safeWeight)
    };
  }

  function toRgb(color) {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  function hashString(value) {
    let hash = 0;
    const input = String(value || '');
    for (let index = 0; index < input.length; index += 1) {
      hash = ((hash << 5) - hash) + input.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getEventFingerprint(parentEl) {
    const dialog = parentEl.closest('div[role="dialog"]');
    if (!dialog) return 'no-dialog';

    const titleNode = dialog.querySelector('h1, h2, [role="heading"]');
    const title = normalizeText(titleNode ? titleNode.textContent : '');
    const compactText = normalizeText(dialog.textContent).slice(0, 220);

    return title || compactText || 'untitled-event';
  }

  function startDialogSession() {
    activeDialogSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function getMode() {
    if (!settingsPromise) {
      settingsPromise = (async () => {
        if (window.LateLabels.Storage && typeof window.LateLabels.Storage.getSettings === 'function') {
          const settings = await window.LateLabels.Storage.getSettings();
          return settings && settings.mode ? settings.mode : 'playful';
        }
        return 'playful';
      })();
    }

    return settingsPromise;
  }

  function getTemplatesForMode(mode) {
    const normalizedMode = mode || 'playful';

    const templatesByMode = {
      playful: [
        { type: 'usually', fmt: (m) => `Usually ${m}m late` },
        { type: 'estimated', fmt: (m) => `Estimated ${m}m late` },
        { type: 'running-late', fmt: (m) => `Espresso delay +${m}m` },
        { type: 'dramatic', fmt: (m) => `Dramatic entrance +${m}m` },
        { type: 'chaotic', fmt: (m) => `Physics says +${m}m` },
        { type: 'ontime', fmt: () => `Shockingly on time` },
        { type: 'ontime', fmt: () => `Early just to flex` },
        { type: 'will-skip', fmt: () => `Skipping, blaming traffic` },
        { type: 'will-skip', fmt: () => `Ghosting respectfully` }
      ],
      savage: [
        { type: 'estimated', fmt: (m) => `Late by ${m}m and unbothered` },
        { type: 'dramatic', fmt: (m) => `Arriving ${m}m late for the plot` },
        { type: 'chaotic', fmt: (m) => `Time means nothing: +${m}m` },
        { type: 'usually', fmt: (m) => `Predictably ${m}m late` },
        { type: 'ontime', fmt: () => `Annoyingly punctual` },
        { type: 'ontime', fmt: () => `On time, somehow` },
        { type: 'will-skip', fmt: () => `Not coming, spiritually absent too` },
        { type: 'will-skip', fmt: () => `Skipping with full confidence` }
      ],
      professional: [
        { type: 'ontime', fmt: () => `On time` },
        { type: 'ontime', fmt: () => `Likely on schedule` },
        { type: 'estimated', fmt: (m) => `Estimated delay: ${m}m` },
        { type: 'usually', fmt: (m) => `Typically ${m}m late` },
        { type: 'running-late', fmt: (m) => `Running ${m}m behind` },
        { type: 'will-skip', fmt: () => `May miss this meeting` }
      ],
      minimal: [
        { type: 'ontime', fmt: () => `On time` },
        { type: 'estimated', fmt: (m) => `+${m}m` },
        { type: 'usually', fmt: (m) => `~${m}m` },
        { type: 'running-late', fmt: (m) => `Delay ${m}m` },
        { type: 'will-skip', fmt: () => `Skip` }
      ]
    };

    return templatesByMode[normalizedMode] || templatesByMode.playful;
  }

  function resolveSeverity(label, templateType, fallbackLateHour) {
    const normalizedLabel = (label || '').toLowerCase();
    const minuteMatch = normalizedLabel.match(/(\d+)m/);

    if (templateType === 'ontime' || normalizedLabel.includes('on time') || normalizedLabel.includes('shockingly') || normalizedLabel.includes('early') || normalizedLabel.includes('punctual')) {
      return 0;
    }

    if (templateType === 'will-skip' || normalizedLabel.includes('skip') || normalizedLabel.includes('ghosting')) {
      return 1;
    }

    if (minuteMatch) {
      return clamp(Number(minuteMatch[1]) / 18, 0.12, 0.95);
    }

    if (fallbackLateHour !== null && fallbackLateHour !== undefined && !isNaN(Number(fallbackLateHour))) {
      return clamp(Number(fallbackLateHour) / 23, 0, 1);
    }

    return 0.45;
  }

  function resolveStatus(label, templateType, fallbackLateHour) {
    const severity = resolveSeverity(label, templateType, fallbackLateHour);
    const normalizedLabel = (label || '').toLowerCase();

    if (templateType === 'will-skip' || normalizedLabel.includes('skip') || normalizedLabel.includes('ghosting')) {
      return { severity, tone: 'skip', icon: 'x' };
    }

    if (severity <= 0.12) {
      return { severity, tone: 'ontime', icon: 'o' };
    }

    return { severity, tone: 'late', icon: '~' };
  }

  function renderChipContent(chip, label, templateType, fallbackLateHour) {
    const status = resolveStatus(label, templateType, fallbackLateHour);

    chip.textContent = '';

    const icon = document.createElement('span');
    icon.className = `late-ext-chip-icon late-ext-chip-icon-${status.tone}`;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = status.icon;

    const text = document.createElement('span');
    text.className = 'late-ext-chip-label';
    text.textContent = label;

    chip.appendChild(icon);
    chip.appendChild(text);

    return status;
  }

  function applyChipColor(chip, label, templateType, fallbackLateHour) {
    const status = resolveStatus(label, templateType, fallbackLateHour);
    const severity = status.severity;
    const green = { r: 46, g: 204, b: 113 };
    const yellow = { r: 234, g: 179, b: 8 };
    const red = { r: 231, g: 76, b: 60 };
    const background = severity <= 0.5
      ? mixColor(green, yellow, severity * 2)
      : mixColor(yellow, red, (severity - 0.5) * 2);
    const border = severity <= 0.5
      ? mixColor(green, yellow, clamp(severity * 2 + 0.12, 0, 1))
      : mixColor(yellow, red, clamp((severity - 0.5) * 2 + 0.12, 0, 1));
    const text = mixColor({ r: 255, g: 255, b: 255 }, { r: 248, g: 250, b: 252 }, severity);

    chip.style.backgroundColor = toRgb(background);
    chip.style.borderColor = toRgb(border);
    chip.style.color = toRgb(text);
    chip.style.boxShadow = `0 1px 0 rgba(0,0,0,0.08), 0 0 0 1px rgba(${border.r}, ${border.g}, ${border.b}, 0.08) inset`;
    chip.style.setProperty('--late-chip-dot', toRgb(mixColor(border, { r: 255, g: 255, b: 255 }, 0.15)));
    chip.dataset.lateTone = status.tone;
  }

  function placeChipInline(nameTarget, chip, parentEl) {
    if (!nameTarget) return false;

    const inlineHost = nameTarget.closest('span, div') || nameTarget;
    if (inlineHost && inlineHost.parentNode) {
      inlineHost.insertAdjacentElement('afterend', chip);
      return true;
    }

    if (parentEl) {
      parentEl.appendChild(chip);
      return true;
    }

    return false;
  }

  function clearDialogLabels(dialog) {
    dialog.querySelectorAll('.late-ext-chip').forEach((chip) => chip.remove());
    dialog.querySelectorAll('[data-late-ext-processed]').forEach((element) => {
      delete element.dataset.lateExtProcessed;
    });
    const popover = document.querySelector('.late-ext-popover');
    if (popover) popover.remove();
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

    const mode = await getMode();
    const templates = getTemplatesForMode(mode);
    const minuteBuckets = [2,3,4,5,6,7,8,10,12,14,16,18];

    const eventFingerprint = getEventFingerprint(parentEl);
    const rotationSeed = `${id}::${eventFingerprint}::${activeDialogSeed}`;
    const templateIndex = hashString(`${rotationSeed}::template`) % templates.length;
    const minuteIndex = hashString(`${rotationSeed}::minute`) % minuteBuckets.length;
    const tpl = templates[templateIndex];
    const minute = minuteBuckets[minuteIndex];

    let label = tpl.fmt(minute);
    try {
      if (window.LateLabels.Storage) {
        const stored = await window.LateLabels.Storage.getStoredLabel(id);
        if (stored) label = stored;
      }
    } catch (e) {
      // ignore storage errors and keep deterministic label
    }

    const chip = document.createElement('span');
    chip.className = 'late-ext-chip';
    chip.id = chipId;
    chip.dataset.lateKey = dedupId;
    chip.dataset.lateLabel = label;
    chip.title = label;
    renderChipContent(chip, label, tpl && tpl.type, attendee ? attendee.lateHour : null);

    // Only attach the chip if we find a compact text node that credibly matches the attendee name.
    const nameTarget = findNameTarget(parentEl, name);
    if (!placeChipInline(nameTarget, chip, parentEl)) {
      chip.remove();
      return false;
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
    input.value = anchor.dataset.lateLabel || '';
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
    // Force the initial hidden state to paint before toggling visibility.
    popover.getBoundingClientRect();
    setTimeout(() => {
      popover.classList.add('late-ext-popover-visible');
    }, 24);

    const saveLabel = async () => {
      const newVal = input.value.trim();
      if (newVal && window.LateLabels.Storage) {
        const previousLabel = anchor.dataset.lateLabel || '';
        try {
          anchor.dataset.lateLabel = newVal;
          anchor.title = newVal;
          renderChipContent(anchor, newVal, null, null);
          applyChipColor(anchor, newVal, null, null);
          await window.LateLabels.Storage.updateStoredLabel(id, newVal);
          popover.remove();
        } catch (err) {
          anchor.dataset.lateLabel = previousLabel;
          anchor.title = previousLabel;
          renderChipContent(anchor, previousLabel, null, null);
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

  return {
    injectChip: injectChip,
    clearDialogLabels: clearDialogLabels,
    startDialogSession: startDialogSession
  };
})();
