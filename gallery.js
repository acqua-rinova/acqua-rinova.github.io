// Acqua Rinova Group: gallery viewer.
// Opens gallery photographs in a larger view with previous/next and
// keyboard arrows. Photographs are embedded as backgrounds (see gallery/photo-*.css).
(function () {
  "use strict";

  var dialog = document.querySelector(".lightbox");
  var links = Array.prototype.slice.call(document.querySelectorAll(".gallery-link"));
  if (!dialog || !links.length || typeof dialog.showModal !== "function") return;

  var img = dialog.querySelector(".lightbox-img");
  var caption = dialog.querySelector(".lightbox-caption");
  var current = 0;

  function show(i) {
    current = (i + links.length) % links.length;
    var link = links[current];
    var thumb = link.querySelector(".gimg");
    var fig = link.closest("figure");
    var cap = fig && fig.querySelector("figcaption");
    img.className = "lightbox-img gimg gimg-" + link.getAttribute("data-photo");
    img.setAttribute("aria-label", thumb ? thumb.getAttribute("aria-label") : "");
    caption.innerHTML = cap ? cap.innerHTML : "";
  }

  links.forEach(function (link, i) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      show(i);
      dialog.showModal();
    });
  });

  dialog.querySelector(".lightbox-prev").addEventListener("click", function () { show(current - 1); });
  dialog.querySelector(".lightbox-next").addEventListener("click", function () { show(current + 1); });
  dialog.querySelector(".lightbox-close").addEventListener("click", function () { dialog.close(); });

  // Click on the dark backdrop closes the viewer
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });

  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });

  // Hide previous/next when there is only one photograph
  if (links.length < 2) dialog.classList.add("is-single");
})();
