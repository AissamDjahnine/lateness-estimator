// This file runs last, so all other modules (Observer, etc.) are loaded.

(function() {
  if (window.LateLabels && window.LateLabels.Observer) {
    window.LateLabels.Observer.init();
  }
})();