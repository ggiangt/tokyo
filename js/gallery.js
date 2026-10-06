// Home screen. Two views, switched at the top:
//   "One city"   - one city at a time; swipe / arrows / keys move between them
//   "All cities" - every city in a grid, with a dashed travel line joining
//                  the cities you've been to, numbered in the order you went
//   Gallery.init({ cities, onOpen(city), onLockedTap(city) })
//   Gallery.update()          re-read photo counts and lock state
//   Gallery.goTo(index)       slide to a city
//   Gallery.setActive(bool)   whether the gallery is the visible screen
//   Gallery.reveal(cityId, done)  slide to a newly unlocked city and play
//                                 the reveal: fog clears, colour fills in
(function () {
  var root = document.getElementById("gallery");
  var viewport = document.getElementById("gallery-viewport");
  var track = document.getElementById("gallery-track");
  var dotsEl = document.getElementById("gallery-dots");
  var prevButton = document.getElementById("gallery-prev");
  var nextButton = document.getElementById("gallery-next");
  var grid = document.getElementById("gallery-grid");
  var gridScroll = document.getElementById("gallery-grid-scroll");
  var route = document.getElementById("gallery-route");
  var viewButtons = root.querySelectorAll("[data-view]");

  var cities = [];
  var cards = [];
  var tiles = [];
  var dots = [];
  var mode = "one";
  var current = 0;
  var active = true;
  var options = {};
  var drag = null;

  function photoCountLabel(count) {
    if (!count) return "no photos yet";
    return count === 1 ? "1 photo" : count + " photos";
  }

  function buildCard(city, index) {
    var card = document.createElement("article");
    card.className = "city-card";
    card.dataset.index = String(index);
    card.innerHTML =
      '<div class="city-art" role="button" tabindex="-1">' +
      '<img class="city-img" draggable="false" alt="">' +
      '<span class="city-stop" hidden></span>' +
      '<div class="city-fog" aria-hidden="true">' +
      '<img class="city-cloud city-cloud--a" src="assets/cloud-1.png" alt="" draggable="false">' +
      '<img class="city-cloud city-cloud--b" src="assets/cloud-2.png" alt="" draggable="false">' +
      '<img class="city-cloud city-cloud--c" src="assets/cloud-1.png" alt="" draggable="false">' +
      "</div>" +
      "</div>" +
      '<div class="city-caption">' +
      '<p class="city-title"><span class="city-name"></span><span class="city-count-wrap"> · <span class="city-count"></span></span></p>' +
      '<p class="city-lock"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5A1 1 0 0 1 13 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h.5Zm1.5 0h4V5a2 2 0 0 0-4 0v2Z"/></svg><span class="city-lock-text"></span></p>' +
      "</div>";

    var img = card.querySelector(".city-img");
    img.src = city.gallery;
    img.alt = city.name + " diorama";
    card.querySelector(".city-name").textContent = city.name;
    return card;
  }

  function updateCard(card, city) {
    var count = city.photos ? city.photos.length : 0;
    card.classList.toggle("is-locked", !city.unlocked);
    card.querySelector(".city-count").textContent = photoCountLabel(
      city.unlocked ? count : 0,
    );
    // Locked but with photos waiting: the user chose "Not now" earlier.
    card.querySelector(".city-lock-text").textContent = count
      ? photoCountLabel(count) + " waiting. Tap to unlock."
      : "Add a photo from " + city.name + " to unlock.";
    card.querySelector(".city-art").setAttribute(
      "aria-label",
      city.unlocked
        ? "Open " + city.name
        : city.name + " (locked). Add a photo from " + city.name + " to unlock.",
    );
  }

  function layout(animate) {
    if (!cards.length) return;
    var cardWidth = cards[0].offsetWidth;
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    var offset =
      (viewport.clientWidth - cardWidth) / 2 - current * (cardWidth + gap);
    var dragOffset = drag && drag.moving ? drag.dx : 0;

    track.classList.toggle("is-animating", animate !== false && !drag);
    track.style.transform =
      "translate3d(" + (offset + dragOffset) + "px, 0, 0)";

    for (var i = 0; i < cards.length; i += 1) {
      cards[i].classList.toggle("is-current", i === current);
      cards[i].setAttribute("aria-hidden", i === current ? "false" : "true");
      dots[i].classList.toggle("is-current", i === current);
    }
    prevButton.disabled = current === 0;
    nextButton.disabled = current === cards.length - 1;
  }

  function goTo(index, animate) {
    current = Math.max(0, Math.min(cards.length - 1, index));
    layout(animate);
  }

  function tapCard(index) {
    if (mode === "one" && index !== current) {
      goTo(index);
      return;
    }
    var city = cities[index];
    if (city.unlocked) {
      if (options.onOpen) options.onOpen(city);
    } else {
      var card = mode === "one" ? cards[index] : tiles[index];
      card.classList.remove("is-nudging");
      void card.offsetWidth;
      card.classList.add("is-nudging");
      if (options.onLockedTap) options.onLockedTap(city);
    }
  }

  // Swipe: follow the finger/mouse, then settle on the nearest city.
  viewport.addEventListener("pointerdown", function (event) {
    if (event.button !== 0 || drag) return;
    var cardEl = event.target.closest(".city-card");
    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: performance.now(),
      dx: 0,
      moving: false,
      cardIndex: cardEl ? Number(cardEl.dataset.index) : -1,
    };
  });

  viewport.addEventListener("pointermove", function (event) {
    if (!drag || drag.id !== event.pointerId) return;
    var dx = event.clientX - drag.startX;
    var dy = event.clientY - drag.startY;
    if (!drag.moving && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      drag.moving = true;
      viewport.setPointerCapture(event.pointerId);
    }
    if (drag.moving) {
      // Resist at the ends.
      var atEdge =
        (current === 0 && dx > 0) ||
        (current === cards.length - 1 && dx < 0);
      drag.dx = atEdge ? dx * 0.3 : dx;
      layout(false);
    }
  });

  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    var finished = drag;
    drag = null;

    if (!finished.moving) {
      if (event.type === "pointerup" && finished.cardIndex >= 0) {
        tapCard(finished.cardIndex);
      }
      return;
    }

    var elapsed = Math.max(1, performance.now() - finished.startTime);
    var velocity = finished.dx / elapsed;
    var threshold = Math.min(90, viewport.clientWidth * 0.18);
    var next = current;
    if (finished.dx < -threshold || velocity < -0.5) next = current + 1;
    if (finished.dx > threshold || velocity > 0.5) next = current - 1;
    goTo(next);
  }

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  prevButton.addEventListener("click", function () {
    goTo(current - 1);
  });
  nextButton.addEventListener("click", function () {
    goTo(current + 1);
  });

  window.addEventListener("keydown", function (event) {
    if (!active || mode !== "one" || event.defaultPrevented) return;
    if (event.key === "ArrowLeft") {
      goTo(current - 1);
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      goTo(current + 1);
      event.preventDefault();
    } else if (
      (event.key === "Enter" || event.key === " ") &&
      (event.target === document.body || event.target.closest(".city-card"))
    ) {
      tapCard(current);
      event.preventDefault();
    }
  });

  window.addEventListener("resize", function () {
    layout(false);
    drawRoute();
  });

  // ---- "All cities" grid ---------------------------------------------------

  grid.addEventListener("click", function (event) {
    var tile = event.target.closest(".city-card");
    if (tile) tapCard(Number(tile.dataset.index));
  });

  // Cities you've been to, in the order you first took a photo there.
  function visitedInOrder() {
    function firstPhoto(city) {
      return city.photos.reduce(function (earliest, photo) {
        var t = photo.takenAt ? photo.takenAt.getTime() : Infinity;
        return Math.min(earliest, t);
      }, Infinity);
    }
    return cities
      .filter(function (city) {
        return city.unlocked && city.photos.length;
      })
      .sort(function (a, b) {
        return firstPhoto(a) - firstPhoto(b);
      });
  }

  // Number the visited tiles and join them with a dashed travel line.
  function drawRoute() {
    var visited = visitedInOrder();
    tiles.forEach(function (tile) {
      tile.querySelector(".city-stop").hidden = true;
    });
    visited.forEach(function (city, i) {
      var stop = tiles[cities.indexOf(city)].querySelector(".city-stop");
      stop.textContent = String(i + 1);
      stop.hidden = false;
    });

    route.innerHTML = "";
    if (mode !== "all" || visited.length < 2) return;
    // Layout positions (offsets), so tiles mid-animation don't skew the line.
    var width = grid.offsetWidth;
    var height = grid.offsetHeight;
    route.setAttribute("width", width);
    route.setAttribute("height", height);
    route.setAttribute("viewBox", "0 0 " + width + " " + height);

    var points = visited.map(function (city) {
      var tile = tiles[cities.indexOf(city)];
      var art = tile.querySelector(".city-art");
      return {
        x: tile.offsetLeft + art.offsetLeft + art.offsetWidth / 2,
        y: tile.offsetTop + art.offsetTop + art.offsetHeight / 2,
      };
    });
    // Gentle arcs between stops, bowing upward like a flight path.
    var d = "M" + points[0].x + " " + points[0].y;
    for (var i = 1; i < points.length; i += 1) {
      var a = points[i - 1];
      var b = points[i];
      var lift = Math.min(90, Math.hypot(b.x - a.x, b.y - a.y) * 0.25);
      d +=
        " Q" + (a.x + b.x) / 2 + " " + ((a.y + b.y) / 2 - lift) +
        " " + b.x + " " + b.y;
    }
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "gallery-route-line");
    route.appendChild(path);
  }

  var switchTimer = null;

  function setMode(next, remember) {
    var previous = mode;
    mode = next === "all" ? "all" : "one";
    root.classList.toggle("is-grid", mode === "all");
    root.querySelector(".view-switch").dataset.mode = mode;
    // When the user switches, the new view springs in (tiles one by one).
    if (remember && previous !== mode) {
      root.classList.remove("is-switching");
      void root.offsetWidth;
      root.classList.add("is-switching");
      clearTimeout(switchTimer);
      switchTimer = setTimeout(function () {
        root.classList.remove("is-switching");
      }, 900);
    }
    viewButtons.forEach(function (button) {
      var on = button.dataset.view === mode;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (remember) {
      try {
        localStorage.setItem("gallery-view", mode);
      } catch (error) {}
    }
    if (mode === "one") {
      layout(false);
    } else {
      requestAnimationFrame(drawRoute);
    }
  }

  viewButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setMode(button.dataset.view, true);
    });
  });

  // The reveal itself: fog clears, colour fills in, then the caption pops
  // in with the polaroid animation and the count ticks up.
  function playReveal(card, city, done) {
    card.classList.add("is-revealing");
    card.classList.remove("is-locked");
    card.querySelector(".city-lock-text").textContent = "";
    var countWrap = card.querySelector(".city-count-wrap");
    countWrap.style.visibility = "hidden";

    setTimeout(function () {
      var caption = card.querySelector(".city-caption");
      var countEl = card.querySelector(".city-count");
      var total = city.photos.length;
      var start = performance.now();
      countWrap.style.visibility = "";
      caption.classList.add("is-popping");
      Effects.playPaperSound();
      (function tick() {
        var t = Math.min(1, (performance.now() - start) / 700);
        countEl.textContent = photoCountLabel(Math.max(1, Math.round(total * t)));
        if (t < 1) requestAnimationFrame(tick);
      })();

      setTimeout(function () {
        card.classList.remove("is-revealing");
        caption.classList.remove("is-popping");
        updateCard(card, city);
        if (done) done();
      }, 1100);
    }, 900);
  }

  window.Gallery = {
    init: function (cityList, opts) {
      cities = cityList;
      options = opts || {};
      track.innerHTML = "";
      grid.querySelectorAll(".city-card").forEach(function (tile) {
        tile.remove();
      });
      dotsEl.innerHTML = "";
      cards = [];
      tiles = [];
      dots = [];

      for (var i = 0; i < cities.length; i += 1) {
        var card = buildCard(cities[i], i);
        track.appendChild(card);
        cards.push(card);

        var tile = buildCard(cities[i], i);
        tile.classList.add("city-card--tile");
        tile.style.setProperty("--i", String(i));
        tile.querySelector(".city-art").tabIndex = 0;
        grid.appendChild(tile);
        tiles.push(tile);

        var dot = document.createElement("button");
        dot.className = "gallery-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", "Show " + cities[i].name);
        dot.addEventListener(
          "click",
          (function (index) {
            return function () {
              goTo(index);
            };
          })(i),
        );
        dotsEl.appendChild(dot);
        dots.push(dot);
      }

      this.update();
      goTo(0, false);
      var saved = "one";
      try {
        saved = localStorage.getItem("gallery-view") || "one";
      } catch (error) {}
      setMode(saved, false);
      // Only animate the switch's pill after the first paint.
      requestAnimationFrame(function () {
        root.querySelector(".view-switch").classList.add("is-ready");
      });
    },
    update: function () {
      for (var i = 0; i < cards.length; i += 1) {
        updateCard(cards[i], cities[i]);
        updateCard(tiles[i], cities[i]);
        dots[i].classList.toggle("is-locked", !cities[i].unlocked);
      }
      drawRoute();
    },
    goTo: goTo,
    reveal: function (cityId, done) {
      var index = this.indexOf(cityId);
      var city = cities[index];
      dots[index].classList.remove("is-locked");
      goTo(index);

      // The view that isn't showing just switches to the unlocked look.
      var shown = mode === "one" ? cards[index] : tiles[index];
      updateCard(mode === "one" ? tiles[index] : cards[index], city);
      if (mode === "all") {
        shown.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }

      // Wait for the slide (or scroll) to settle, then play the reveal.
      setTimeout(function () {
        playReveal(shown, city, function () {
          drawRoute();
          if (done) done();
        });
      }, 600);
    },
    indexOf: function (cityId) {
      for (var i = 0; i < cities.length; i += 1) {
        if (cities[i].id === cityId) return i;
      }
      return -1;
    },
    cardFor: function (cityId) {
      return cards[this.indexOf(cityId)] || null;
    },
    setActive: function (isActive) {
      active = isActive;
      root.setAttribute("aria-hidden", isActive ? "false" : "true");
      if (isActive) layout(false);
    },
  };
})();
