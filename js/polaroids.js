// Photo viewer. Tapping a photo pin on the map grows that pin into a large
// polaroid in the centre of the screen; tapping outside shrinks it back.
// Landmarks with several photos get arrows (and swipe) to step through them.
//   Polaroids.open(cards, fromEl, startIndex)
//       cards  - [{ src, caption }]
//       fromEl - the pin element it grows out of and shrinks back into
//   Polaroids.close()
//   Polaroids.isOpen()
//   Polaroids.preload(src)   learn a photo's shape ahead of time, so it can
//                            start growing the moment it's tapped
(function () {
  var layer = document.getElementById("polaroid-layer");
  var ZOOM_MS = 460;

  var root = document.createElement("div");
  root.className = "zoom";
  root.innerHTML =
    '<div class="zoom-backdrop"></div>' +
    '<div class="zoom-card">' +
    '<div class="polaroid-face has-caption">' +
    '<div class="polaroid-photo"></div>' +
    '<div class="polaroid-caption"></div>' +
    "</div></div>" +
    '<button class="zoom-arrow zoom-arrow--prev" type="button" aria-label="Previous photo">' +
    '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></button>' +
    '<button class="zoom-arrow zoom-arrow--next" type="button" aria-label="Next photo">' +
    '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>' +
    '<p class="zoom-counter"></p>';
  layer.appendChild(root);

  var backdrop = root.querySelector(".zoom-backdrop");
  var card = root.querySelector(".zoom-card");
  var photo = root.querySelector(".polaroid-photo");
  var caption = root.querySelector(".polaroid-caption");
  var prevButton = root.querySelector(".zoom-arrow--prev");
  var nextButton = root.querySelector(".zoom-arrow--next");
  var counter = root.querySelector(".zoom-counter");

  var state = null; // the open photo set
  var closing = null; // a set still shrinking back into its pin
  var ratios = {};

  // Photo shape (width / height), loaded once per photo.
  function ratioOf(src, done) {
    if (ratios[src]) {
      done(ratios[src]);
      return;
    }
    var image = new Image();
    image.onload = function () {
      ratios[src] = image.naturalWidth / image.naturalHeight;
      done(ratios[src]);
    };
    image.onerror = function () {
      done(0.75);
    };
    image.src = src;
  }

  // The big card: the photo at its own shape, as large as fits.
  function centreBox(ratio) {
    var face = 12;
    var captionHeight = 40;
    var narrow = window.innerWidth < 640;
    var maxWidth = Math.min(window.innerWidth - 32, 1100) - face * 2;
    var maxHeight =
      window.innerHeight - (narrow ? 140 : 100) - face * 2 - captionHeight;
    var photoWidth = Math.min(maxWidth, maxHeight * ratio);
    var width = Math.round(photoWidth + face * 2);
    var height = Math.round(photoWidth / ratio + face * 2 + captionHeight);
    return {
      left: Math.round((window.innerWidth - width) / 2),
      top: Math.round((window.innerHeight - height) / 2),
      width: width,
      height: height,
      angle: 0,
    };
  }

  // Where the pin card sits on screen (its unrotated box and its tilt).
  function pinBox(el) {
    var rect = el.getBoundingClientRect();
    var angle =
      parseFloat(getComputedStyle(el).getPropertyValue("--settle-angle")) || 0;
    var width = el.offsetWidth;
    var height = el.offsetHeight;
    return {
      left: rect.left + (rect.width - width) / 2,
      top: rect.top + (rect.height - height) / 2,
      width: width,
      height: height,
      angle: angle,
    };
  }

  function place(box) {
    card.style.left = box.left + "px";
    card.style.top = box.top + "px";
    card.style.width = box.width + "px";
    card.style.height = box.height + "px";
    card.style.transform = "rotate(" + box.angle + "deg)";
  }

  function showCard(index, animate) {
    var current = state.cards[index];
    state.index = index;
    photo.style.setProperty("--photo", 'url("' + current.src + '")');
    caption.textContent = current.caption || "";
    var many = state.cards.length > 1;
    prevButton.hidden = !many;
    nextButton.hidden = !many;
    counter.hidden = !many;
    counter.textContent = index + 1 + " / " + state.cards.length;
    ratioOf(current.src, function (ratio) {
      if (!state || state.index !== index) return;
      card.classList.toggle("is-moving", animate !== false);
      place(centreBox(ratio));
    });
  }

  function step(delta) {
    if (!state || state.cards.length < 2) return;
    var count = state.cards.length;
    showCard((state.index + delta + count) % count);
    Effects.playPaperSound();
  }

  // Ends a shrink that's still running, putting its pin back.
  function finishClosing() {
    if (!closing) return;
    clearTimeout(closing.timer);
    if (closing.fromEl) closing.fromEl.style.visibility = "";
    closing = null;
    root.classList.remove("is-closing");
  }

  function open(cards, fromEl, startIndex) {
    if (!cards.length) return;
    finishClosing();
    var index = Math.max(0, Math.min(cards.length - 1, startIndex || 0));
    state = {
      cards: cards,
      index: index,
      fromEl: fromEl,
      at: performance.now(),
    };

    // Start exactly on top of the pin, then grow to the centre.
    card.classList.remove("is-moving");
    if (fromEl) {
      place(pinBox(fromEl));
      fromEl.style.visibility = "hidden";
    } else {
      place({
        left: window.innerWidth / 2 - 60,
        top: window.innerHeight / 2 - 70,
        width: 120,
        height: 140,
        angle: 0,
      });
    }
    root.classList.add("is-open");
    void card.offsetWidth;
    backdrop.classList.add("is-visible");
    showCard(index, true);
    Effects.playPaperSound();
  }

  // Shrink back into the pin it came from.
  function close() {
    if (!state) return;
    closing = state;
    state = null;
    backdrop.classList.remove("is-visible");
    root.classList.add("is-closing");
    card.classList.add("is-moving");
    if (closing.fromEl && closing.fromEl.isConnected) {
      place(pinBox(closing.fromEl));
    }
    closing.timer = setTimeout(function () {
      finishClosing();
      if (!state) root.classList.remove("is-open");
    }, ZOOM_MS);
  }

  backdrop.addEventListener("click", function () {
    // Ignore a click that arrives right after the tap that opened it.
    if (state && performance.now() - state.at > 350) close();
  });
  prevButton.addEventListener("click", function () {
    step(-1);
  });
  nextButton.addEventListener("click", function () {
    step(1);
  });

  // Swipe left/right on the big photo to step through a landmark's photos.
  var swipe = null;
  card.addEventListener("pointerdown", function (event) {
    swipe = { x: event.clientX, y: event.clientY };
  });
  card.addEventListener("pointerup", function (event) {
    if (!swipe) return;
    var dx = event.clientX - swipe.x;
    var dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      step(dx < 0 ? 1 : -1);
    }
  });

  window.addEventListener(
    "keydown",
    function (event) {
      if (!state) return;
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
      else return;
      // Keep the map and gallery from also reacting to these keys.
      event.stopPropagation();
      event.preventDefault();
    },
    true,
  );

  window.addEventListener("resize", function () {
    if (state) showCard(state.index, false);
  });

  window.Polaroids = {
    open: open,
    close: close,
    hide: close,
    isOpen: function () {
      return !!state;
    },
    preload: function (src) {
      ratioOf(src, function () {});
    },
  };
})();
