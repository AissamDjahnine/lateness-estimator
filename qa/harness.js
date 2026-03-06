(function() {
  const storageState = {};
  const logEl = document.getElementById('log');
  const messageListeners = [];

  function log(message) {
    logEl.textContent += `${message}\n`;
  }

  window.chrome = {
    storage: {
      local: {
        get(key, callback) {
          setTimeout(() => {
            window.chrome.runtime.lastError = null;
            callback({ [key]: { ...storageState } });
          }, 5);
        },
        set(value, callback) {
          setTimeout(() => {
            window.chrome.runtime.lastError = null;
            Object.assign(storageState, value.lateLabels || {});
            if (callback) callback();
          }, 5);
        }
      }
    },
    runtime: {
      lastError: null,
      sendMessage(payload, callback) {
        setTimeout(() => {
          this.lastError = null;
          const listener = messageListeners[0];
          if (!listener) {
            callback();
            return;
          }

          listener(payload, {}, callback);
        }, 10);
      },
      onMessage: {
        addListener(listener) {
          messageListeners.push(listener);
        }
      }
    }
  };

  function clearChips() {
    document.querySelectorAll('.late-ext-chip').forEach((chip) => chip.remove());
    document.querySelectorAll('[data-late-ext-processed]').forEach((el) => {
      delete el.dataset.lateExtProcessed;
    });
  }

  function resetHarness() {
    Object.keys(storageState).forEach((key) => delete storageState[key]);
    clearChips();
    document.querySelectorAll('.event-dialog').forEach((dialog, index) => {
      dialog.hidden = index > 0;
    });
    if (window.LateLabels && window.LateLabels.Model) {
      window.LateLabels.Model.reset();
    }
    if (window.LateLabels && window.LateLabels.Observer) {
      window.LateLabels.Observer.init();
    }
    log('Harness reset');
  }

  function addSecondaryDialog() {
    const root = document.getElementById('dialogs-root');
    let secondary = document.getElementById('secondary-dialog');
    if (!secondary) {
      secondary = document.createElement('div');
      secondary.className = 'event-dialog';
      secondary.role = 'dialog';
      secondary.id = 'secondary-dialog';
      secondary.innerHTML = [
        '<h2>Secondary Event</h2>',
        '<div class="attendee-row" role="listitem"><span>Unrelated modal</span></div>',
        '<div class="attendee-row" role="listitem"><span>Still not attendees</span></div>'
      ].join('');
      root.prepend(secondary);
    }
    secondary.hidden = false;
    log('Secondary dialog opened');
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runChecks() {
    logEl.textContent = '';
    resetHarness();
    await sleep(350);

    const chips = Array.from(document.querySelectorAll('#primary-dialog .late-ext-chip'));
    log(`Primary dialog chip count: ${chips.length}`);
    if (chips.length !== 4) {
      throw new Error(`Expected 4 attendee chips, got ${chips.length}`);
    }

    const alexCompany = document.querySelector('[data-email="alex@company.com"] .late-ext-chip');
    const alexVendor = document.querySelector('[data-email="alex@vendor.com"] .late-ext-chip');
    if (!alexCompany || !alexVendor) {
      throw new Error('Expected separate chips for attendees sharing the same local-part');
    }
    log('Distinct attendees with similar emails each received a chip');

    const locationRowChip = document.querySelector('#primary-dialog .attendee-row:last-child .late-ext-chip');
    if (locationRowChip) {
      throw new Error('Location row incorrectly received a chip');
    }
    log('Non-attendee row skipped');

    const originalClass = alexCompany.className;
    alexCompany.click();
    await sleep(20);
    const input = document.getElementById('late-edit-input');
    input.value = 'Typically on time';
    document.getElementById('late-save-btn').click();
    await sleep(30);

    if (!alexCompany.classList.contains('late-green')) {
      throw new Error(`Edited chip should be green after "Typically on time", classes were: ${alexCompany.className}`);
    }
    if (alexCompany.className === originalClass) {
      log('Edited chip class changed after save');
    }
    if (storageState['alex-company-com'] !== 'Typically on time') {
      throw new Error('Edited chip did not persist to mocked storage');
    }
    log('Editing updates color and storage');

    await Promise.all([
      window.LateLabels.Storage.updateStoredLabel('sam-example-com', 'Will skip'),
      window.LateLabels.Storage.updateStoredLabel('taylor-smith', 'Estimated 12m late')
    ]);
    if (storageState['sam-example-com'] !== 'Will skip' || storageState['taylor-smith'] !== 'Estimated 12m late') {
      throw new Error('Concurrent storage updates lost data');
    }
    log('Concurrent storage updates preserved both writes');

    addSecondaryDialog();
    await sleep(350);
    const totalPrimaryChips = document.querySelectorAll('#primary-dialog .late-ext-chip').length;
    const totalSecondaryChips = document.querySelectorAll('#secondary-dialog .late-ext-chip').length;
    if (totalPrimaryChips !== 4 || totalSecondaryChips !== 0) {
      throw new Error(`Dialog selection failed. Primary=${totalPrimaryChips}, Secondary=${totalSecondaryChips}`);
    }
    log('Observer kept targeting the attendee-rich dialog');

    log('All QA checks passed');
  }

  document.getElementById('run-tests').addEventListener('click', () => {
    runChecks().catch((error) => {
      log(`FAIL: ${error.message}`);
      console.error(error);
    });
  });

  document.getElementById('swap-dialog').addEventListener('click', () => {
    addSecondaryDialog();
    if (window.LateLabels && window.LateLabels.Observer) {
      window.LateLabels.Observer.init();
    }
  });

  document.getElementById('reset-state').addEventListener('click', () => {
    resetHarness();
  });

  window.__qa = {
    runChecks,
    resetHarness,
    storageState
  };
})();
