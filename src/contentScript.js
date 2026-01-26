// This file runs last, so all other modules (Observer, etc.) are loaded.

(function() {
  console.log('Late Labels: Content script started.');

  if (window.LateLabels && window.LateLabels.Observer) {
    window.LateLabels.Observer.init();
  } else {
    console.error('Late Labels: Observer module not found.');
  }
})();