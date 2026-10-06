// Home screen: one city at a time, swipe / arrows / keys to move between them.
//   Gallery.init({ cities, onOpen(city), onLockedTap(city) })
//   Gallery.update()          re-read photo counts and lock state
//   Gallery.goTo(index)       slide to a city
//   Gallery.setActive(bool)   whether the gallery is the visible screen
(function () {
  var root = document.getElementById("gallery");
  var viewport = document.getElementById("gallery-viewport");
  var track = document.getElementById("gallery-track");
  var dotsEl = document.getElementById("gallery-dots");
  var prevButton = document.getElementById("gallery-prev");
  var nextButton = document.getElementById("gallery-next");

  var cities = [];
  var cards = [];
  var dots = [];
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
    card.querySelector(".city-lock-text").textContent =
      "Add a photo from " + city.name + " to unlock.";
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
    if (index !== current) {
      goTo(index);
      return;
    }
    var city = cities[index];
    if (city.unlocked) {
      if (options.onOpen) options.onOpen(city);
    } else {
      var card = cards[index];
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
    if (!active || event.defaultPrevented) return;
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
  });

  window.Gallery = {
    init: function (cityList, opts) {
      cities = cityList;
      options = opts || {};
      track.innerHTML = "";
      dotsEl.innerHTML = "";
      cards = [];
      dots = [];

      for (var i = 0; i < cities.length; i += 1) {
        var card = buildCard(cities[i], i);
        track.appendChild(card);
        cards.push(card);

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
    },
    update: function () {
      for (var i = 0; i < cards.length; i += 1) {
        updateCard(cards[i], cities[i]);
        dots[i].classList.toggle("is-locked", !cities[i].unlocked);
      }
    },
    goTo: goTo,
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
