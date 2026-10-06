// Draggable polaroids (moved from index.html; same look and animation).
// Polaroids.show(key, cards) opens a set, Polaroids.hide() closes it.
// A card is { photo: 'url("...")', angle: degrees }.
(function () {
  var polaroidLayer = document.getElementById("polaroid-layer");
  var polaroidTray = document.createElement("div");
  polaroidTray.className = "polaroid-tray";
  polaroidLayer.appendChild(polaroidTray);
  var dragState = null;
  var activeKey = null;

  function enablePolaroidDragging(frame) {
    frame.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) {
        return;
      }

      event.stopPropagation();
      dragState = {
        frame: frame,
        pointerId: event.pointerId,
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

      frame.classList.remove("is-dragging");
      frame.releasePointerCapture(event.pointerId);
      dragState = null;
    }

    frame.addEventListener("pointerup", releaseDrag);
    frame.addEventListener("pointercancel", releaseDrag);
  }

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

      frontFace.appendChild(photo);
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
    renderPolaroids(key, cards);
    Effects.playPaperSound();
    polaroidTray.classList.remove("is-visible");
    requestAnimationFrame(function () {
      polaroidTray.classList.add("is-visible");
    });
  }

  function hide() {
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
    isOpen: function () {
      return activeKey !== null;
    },
  };
})();
