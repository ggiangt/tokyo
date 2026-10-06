// Draggable polaroids (moved from index.html; same look and animation).
// Polaroids.show(key, cards) opens a set, Polaroids.hide() closes it.
// A card is { photo: 'url("...")', src: optional image URL, angle: degrees,
//             caption: optional text }.
// Tapping a polaroid (without dragging) enlarges it to the centre of the
// screen at the photo's real shape; tapping outside it puts it back.
// Polaroids.unfocus() puts an enlarged polaroid back (true if there was one).
(function () {
  var polaroidLayer = document.getElementById("polaroid-layer");
  var polaroidTray = document.createElement("div");
  polaroidTray.className = "polaroid-tray";
  polaroidLayer.appendChild(polaroidTray);
  var dragState = null;
  var activeKey = null;
  var focused = null;
  var backdrop = document.createElement("div");
  backdrop.className = "polaroid-backdrop";

  function enablePolaroidDragging(frame) {
    frame.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) {
        return;
      }

      event.stopPropagation();
      if (focused) {
        return;
      }
      dragState = {
        frame: frame,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - frame.offsetLeft,
        offsetY: event.clientY - frame.offsetTop,
      };
      frame.classList.add("is-dragging");
      frame.style.zIndex = String(Date.now());
      frame.setPointerCapture(event.pointerId);
    });

    frame.addEventListener("pointermove", function (event) {
      if (
        !dragState ||
        dragState.frame !== frame ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      var nextLeft = event.clientX - dragState.offsetX;
      var nextTop = event.clientY - dragState.offsetY;
      var maxLeft = polaroidTray.clientWidth - frame.offsetWidth;
      var maxTop = polaroidTray.clientHeight - frame.offsetHeight;

      frame.style.left = Math.max(0, Math.min(maxLeft, nextLeft)) + "px";
      frame.style.top = Math.max(0, Math.min(maxTop, nextTop)) + "px";
    });

    function releaseDrag(event) {
      if (
        !dragState ||
        dragState.frame !== frame ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      var moved = Math.hypot(
        event.clientX - dragState.startX,
        event.clientY - dragState.startY,
      );
      frame.classList.remove("is-dragging");
      frame.releasePointerCapture(event.pointerId);
      dragState = null;
      if (event.type === "pointerup" && moved < 6) {
        focus(frame);
      }
    }

    frame.addEventListener("pointerup", releaseDrag);
    frame.addEventListener("pointercancel", releaseDrag);
    // Stop the browser's follow-up click after a tap, which would land on
    // the backdrop behind the enlarged polaroid and shrink it straight away.
    frame.addEventListener(
      "touchend",
      function (event) {
        event.preventDefault();
      },
      { passive: false },
    );
  }

  // ---- Enlarging one polaroid ---------------------------------------------

  var FOCUS_MS = 460;

  // Size of the enlarged card: the photo at its own shape, as big as fits.
  function focusSize(frame) {
    var face = 12;
    var caption = frame.querySelector(".polaroid-caption") ? 40 : 0;
    var ratio = Number(frame.dataset.ratio) || 0.75;
    var maxWidth = Math.min(window.innerWidth - 32, 1100) - face * 2;
    var maxHeight = window.innerHeight - 56 - face * 2 - caption;
    var photoWidth = Math.min(maxWidth, maxHeight * ratio);
    var photoHeight = photoWidth / ratio;
    var width = Math.round(photoWidth + face * 2);
    var height = Math.round(photoHeight + face * 2 + caption);
    return {
      width: width,
      height: height,
      left: Math.round((window.innerWidth - width) / 2),
      top: Math.round((window.innerHeight - height) / 2),
    };
  }

  function applyBox(frame, box, angle) {
    frame.style.setProperty("--card-width", box.width + "px");
    frame.style.setProperty("--card-height", box.height + "px");
    frame.style.left = box.left + "px";
    frame.style.top = box.top + "px";
    frame.style.transform = "rotate(" + angle + ")";
  }

  function focus(frame) {
    if (focused) return;
    var style = frame.style;
    focused = {
      frame: frame,
      at: performance.now(),
      home: {
        width: parseFloat(style.getPropertyValue("--card-width")),
        height: parseFloat(style.getPropertyValue("--card-height")),
        left: frame.offsetLeft,
        top: frame.offsetTop,
      },
      angle: style.getPropertyValue("--settle-angle") || "0deg",
      zIndex: style.zIndex,
    };

    // Swap the pop animation for a plain transform so it can transition.
    style.animation = "none";
    style.transform = "rotate(" + focused.angle + ")";
    // Dragged polaroids carry huge z-indexes, so put the backdrop and this
    // polaroid last in the tray at the top z-index: last one wins.
    style.zIndex = "2147483647";
    polaroidTray.appendChild(backdrop);
    polaroidTray.appendChild(frame);
    void frame.offsetWidth;

    frame.classList.add("is-focused");
    backdrop.classList.add("is-visible");
    applyBox(frame, focusSize(frame), "0deg");
    Effects.playPaperSound();
  }

  function unfocus() {
    if (!focused) return false;
    var current = focused;
    focused = null;
    backdrop.classList.remove("is-visible");
    applyBox(current.frame, current.home, current.angle);
    setTimeout(function () {
      current.frame.classList.remove("is-focused");
      current.frame.style.zIndex = current.zIndex;
      if (!focused && backdrop.parentNode) backdrop.remove();
    }, FOCUS_MS);
    return true;
  }

  backdrop.addEventListener("click", function (event) {
    event.stopPropagation();
    // Ignore a click that arrives right after the tap that enlarged it.
    if (focused && performance.now() - focused.at > 350) unfocus();
  });

  window.addEventListener("resize", function () {
    if (focused) applyBox(focused.frame, focusSize(focused.frame), "0deg");
  });

  function renderPolaroids(key, cards) {
    polaroidTray.innerHTML = "";

    for (var i = 0; i < cards.length; i += 1) {
      var card = cards[i];
      var frame = document.createElement("div");
      var frontFace = document.createElement("div");
      var photo = document.createElement("div");
      var aspectVariants = [
        { width: 214, height: 286 },
        { width: 246, height: 296 },
        { width: 268, height: 252 },
        { width: 228, height: 316 },
        { width: 258, height: 278 },
      ];
      var aspect = aspectVariants[(i + key.length) % aspectVariants.length];

      frame.className = "polaroid";
      frontFace.className = "polaroid-face polaroid-face--front";
      photo.className = "polaroid-photo";

      frame.style.setProperty("--card-width", aspect.width + "px");
      frame.style.setProperty("--card-height", aspect.height + "px");
      frame.style.left = "calc(50% - 270px + " + i * 120 + "px)";
      frame.style.top =
        Math.round(window.innerHeight * 0.46 + (i % 2) * 18) + "px";
      frame.style.setProperty("--angle", card.angle + "deg");
      frame.style.setProperty(
        "--settle-angle",
        (card.angle + (Math.random() * 4 - 2)).toFixed(2) + "deg",
      );
      frame.style.setProperty(
        "--start-angle",
        (card.angle + (Math.random() * 10 - 5)).toFixed(2) + "deg",
      );
      frame.style.setProperty(
        "--overshoot-angle",
        (card.angle + (Math.random() * 12 - 6)).toFixed(2) + "deg",
      );
      frame.style.setProperty(
        "--delay",
        Math.round(i * 70 + Math.random() * 45) + "ms",
      );
      frame.style.transform =
        "translateY(180px) rotate(var(--start-angle)) scale(0.96)";
      photo.style.setProperty("--photo", card.photo);
      if (card.src) {
        // Remember the photo's real shape for when it's enlarged.
        (function (target, src) {
          var image = new Image();
          image.onload = function () {
            target.dataset.ratio = String(
              image.naturalWidth / image.naturalHeight,
            );
          };
          image.src = src;
        })(frame, card.src);
      }

      frontFace.appendChild(photo);
      if (card.caption) {
        var caption = document.createElement("div");
        caption.className = "polaroid-caption";
        caption.textContent = card.caption;
        frontFace.classList.add("has-caption");
        frontFace.appendChild(caption);
      }
      frame.appendChild(frontFace);
      enablePolaroidDragging(frame);
      polaroidTray.appendChild(frame);
    }
  }

  function show(key, cards) {
    if (activeKey === key) {
      return;
    }

    activeKey = key;
    focused = null;
    renderPolaroids(key, cards);
    Effects.playPaperSound();
    polaroidTray.classList.remove("is-visible");
    requestAnimationFrame(function () {
      polaroidTray.classList.add("is-visible");
    });
  }

  function hide() {
    if (focused) {
      focused = null;
      backdrop.classList.remove("is-visible");
      backdrop.remove();
    }
    activeKey = null;
    polaroidTray.classList.remove("is-visible");
  }

  polaroidTray.addEventListener("click", function (event) {
    if (event.target === polaroidTray) {
      hide();
    }
  });

  window.Polaroids = {
    show: show,
    hide: hide,
    unfocus: unfocus,
    isOpen: function () {
      return activeKey !== null;
    },
  };
})();
