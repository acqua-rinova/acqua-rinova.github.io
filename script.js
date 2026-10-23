// Acqua Rinova Group: small enhancements only. The page works without JavaScript.
(function () {
  "use strict";

  // Keep the copyright year current.
  var year = String(new Date().getFullYear());
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = year;
  });

  // Pause the diagram animation when it is off screen, to save battery.
  var diagram = document.querySelector(".hub-diagram");
  if (diagram && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        diagram.style.setProperty("--play", entry.isIntersecting ? "running" : "paused");
      });
    });
    observer.observe(diagram);
  }
})();
