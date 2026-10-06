// Small paper notes at the top of the screen, and the unlock prompt.
//   Notice.toast(text, { duration })
//   Notice.unlockPrompt(city, photoCount) -> Promise of true (unlock) / false
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

  function unlockPrompt(city, photoCount) {
    return new Promise(function (resolve) {
      var root = document.createElement("div");
      root.className = "unlock";
      root.innerHTML =
        '<div class="unlock-card" role="dialog" aria-modal="true" aria-labelledby="unlock-title">' +
        '<img class="unlock-art" alt="" draggable="false">' +
        '<p class="unlock-eyebrow">New city</p>' +
        '<h2 class="unlock-title" id="unlock-title"></h2>' +
        '<p class="unlock-count"></p>' +
        '<div class="unlock-buttons">' +
        '<button class="unlock-later" type="button">Not now</button>' +
        '<button class="unlock-go" type="button"></button>' +
        "</div></div>";
      root.querySelector(".unlock-art").src = city.gallery;
      root.querySelector(".unlock-title").textContent =
        "You're about to unlock " + city.name;
      root.querySelector(".unlock-count").textContent =
        city.name + " · " + photoCount + (photoCount === 1 ? " photo" : " photos");
      root.querySelector(".unlock-go").textContent = "Unlock " + city.name;
      document.body.appendChild(root);
      requestAnimationFrame(function () {
        root.classList.add("is-open");
        root.querySelector(".unlock-go").focus();
      });

      function finish(answer) {
        window.removeEventListener("keydown", onKey, true);
        root.classList.remove("is-open");
        setTimeout(function () {
          root.remove();
        }, 250);
        resolve(answer);
      }
      function onKey(event) {
        if (event.key === "Escape") finish(false);
        else if (event.key === "Enter") finish(true);
        else if (event.key.indexOf("Arrow") !== 0) return;
        event.stopPropagation();
        event.preventDefault();
      }
      window.addEventListener("keydown", onKey, true);
      root.querySelector(".unlock-go").addEventListener("click", function () {
        finish(true);
      });
      root.querySelector(".unlock-later").addEventListener("click", function () {
        finish(false);
      });
    });
  }

  window.Notice = { toast: toast, unlockPrompt: unlockPrompt };
})();
