// Small paper notes at the bottom of the screen.
//   Notice.toast(text, { duration })
(function () {
  var layer = document.getElementById("notice-layer");

  function toast(text, options) {
    options = options || {};
    var note = document.createElement("div");
    note.className = "notice";
    note.setAttribute("role", "status");
    note.textContent = text;
    layer.appendChild(note);
    requestAnimationFrame(function () {
      note.classList.add("is-visible");
    });

    function dismiss() {
      note.classList.remove("is-visible");
      setTimeout(function () {
        note.remove();
      }, 300);
    }
    note.addEventListener("click", dismiss);
    setTimeout(dismiss, options.duration || 5000);
    return dismiss;
  }

  window.Notice = { toast: toast };
})();
